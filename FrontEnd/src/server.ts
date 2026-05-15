/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import compression from 'compression';
import { dirname, join } from 'node:path';
import rateLimit from 'express-rate-limit';
import { readFile } from 'node:fs/promises';
import { County, CountyCSVItem, StateCSVItem, StateInfo } from './app/models/gov/models';
import { geoContains } from 'd3-geo';
import { quadtree } from 'd3-quadtree';
import { feature } from 'topojson-client';
import { fileURLToPath } from 'node:url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = join(__dirname, '../browser');

// Serve preloaded CSVs as JSON
let statesCSVCache: StateCSVItem[] = [];
let countiesCSVCache: CountyCSVItem[] = [];

const statesByFip = new Map<number, StateCSVItem>();
const countiesByKey = new Map<string, CountyCSVItem>();

function countyKey(stateFip: number, countyFip: string): string {
  return `${stateFip}-${countyFip}`;
}

async function preloadCSV() {
  const statesContent = await readFile(join(browserDistFolder, 'assets/statesFipsInfo.csv'), 'utf-8');
  statesCSVCache = statesContent
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map(line => {
      const [fip, abbrev, name, gnisid] = line.split(',');
      const state = <StateCSVItem>{
        fip: parseInt(fip, 10),
        abbrev,
        name,
        gnisid,
      };

      statesByFip.set(state.fip, state);
      return state;
    });

  const countiesContent = await readFile(join(browserDistFolder, 'assets/countyInfo.csv'), 'utf-8');
  countiesCSVCache = countiesContent
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map(line => {
      const fields = line.split(',');
      const county = <CountyCSVItem>{
        stateAbbrev: fields[0],
        stateFip: parseInt(fields[1], 10),
        countyFip: fields[2],
        countyName: fields[4],
      };

      countiesByKey.set(
        countyKey(county.stateFip, county.countyFip),
        county
      );

      return county;
    });
}

let usStatesGeometries: any[] = [];
let usCountyQuadtree: any;
let usCountiesGeometries: any[] = [];

function getBBox(geometry: any) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0, count = 0;

  const collect = (arr: any) => {
    if (typeof arr[0] === 'number') {
      if (arr[0] < minX) minX = arr[0];
      if (arr[0] > maxX) maxX = arr[0];
      if (arr[1] < minY) minY = arr[1];
      if (arr[1] > maxY) maxY = arr[1];
      sumX += arr[0];
      sumY += arr[1];
      count++;
    } else {
      arr.forEach(collect);
    }
  };
  collect(geometry.coordinates);

  return {
    minX, maxX, minY, maxY,
    centroid: [sumX / count, sumY / count] as [number, number],
  };
}

async function preloadGeometry() {
  const topo = JSON.parse(
    await readFile(join(browserDistFolder, 'assets/counties-10m.json'), 'utf-8')
  );

  usStatesGeometries = (feature(topo, topo.objects.states) as any).features;
  usCountiesGeometries = (feature(topo, topo.objects.counties) as any).features;

  // Compute bounding box for each county
  usCountiesGeometries.forEach(county => {
    const { centroid, ...bbox } = getBBox(county.geometry);
    county.bbox = bbox;
    county.centroid = centroid
  });

  // Build quadtree using centroids
  usCountyQuadtree = quadtree()
    .x((d: any) => d.centroid[0])
    .y((d: any) => d.centroid[1])
    .addAll(usCountiesGeometries);

  console.log('US geometry preloaded');
}

function getCandidateCounties(pos: GeolocationCoordinates): any[] {
  // Use accuracy or minimum 1km radius (whichever is larger)
  const searchRadius = Math.min(Math.max(pos.accuracy || 0, 1000), 10_000); // cap at 10km
  const radiusLat: number = searchRadius / 111_000; // meters → degrees latitude
  const radiusLon: number = searchRadius / (111_000 * Math.cos(pos.latitude * Math.PI / 180)); // meters → degrees longitude

  const candidates: any[] = [];
  usCountyQuadtree.visit((node: { length: any; data: any; }, x0: number, y0: number, x1: number, y1: number) => {
    if (x1 < pos.longitude - radiusLon || x0 > pos.longitude + radiusLon ||
      y1 < pos.latitude - radiusLat || y0 > pos.latitude + radiusLat) {
      return true; // skip node
    }
    if (!node.length && node.data) candidates.push(node.data);
    return false;
  });

  return candidates;
}

/**
 * Check if a point is inside a GeoJSON feature using d3-geo
 * @param point [longitude, latitude]
 * @param feature GeoJSON feature
 * @returns boolean
 */
function isPointInFeature(point: GeolocationCoordinates, feature: any): boolean {
  try {
    // Handle different geometry types
    if (feature.geometry.type === 'Polygon') {
      return geoContains(feature, [point.longitude, point.latitude]);
    } else if (feature.geometry.type === 'MultiPolygon') {
      return geoContains(feature, [point.longitude, point.latitude]);
    }

    throw new Error('Invalid feature geometry type ' + feature.geometry.type);
  } catch (error) {
    console.error('Error checking point in feature:', error);
    return false;
  }
}

function getCountyCSVItem(requestedStateFip: number, requestedCountyFip: string): CountyCSVItem | undefined {
  return countiesByKey.get(countyKey(requestedStateFip, requestedCountyFip));
}

function getStateCSVItem(requestedStateFip: number): StateCSVItem | undefined {
  return statesByFip.get(requestedStateFip);
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

const app = express();
app.use(compression({
  filter: (req, res) => {
    if (req.path === '/sitemap.xml') return false;
    return compression.filter(req, res);
  }
}), express.json());

const angularApp = new AngularNodeAppEngine();

// Add i18n - serve directly from browser folder
app.use('/assets', express.static(join(browserDistFolder, 'assets'), {
  maxAge: '1y',
  immutable: true
}));

app.use(
  createProxyMiddleware({
    target: process.env['API_URL'] || 'http://api:8080',
    changeOrigin: true,
    pathFilter: '/api/FileData',
  })
);

// API endpoints
app.get('/api/states', (_, res) => {
  res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  res.json(statesCSVCache);
});

app.get('/api/states/:stateFip', (req, res) => {
  const requestedStateFip = Number(req.params.stateFip);
  const stateCsvItem = getStateCSVItem(requestedStateFip);
  res.json(stateCsvItem);
});

app.get('/api/counties', (_, res) => {
  res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  return res.json(countiesCSVCache);
});

app.get('/api/counties/:stateFip/:countyFip', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  const requestedStateFip = Number(req.params.stateFip);
  const requestedCountyFip = req.params.countyFip;
  const countyCsvItem = getCountyCSVItem(requestedStateFip, requestedCountyFip)
  res.json(countyCsvItem);
});


app.use('/api/geolocation', apiLimiter);

app.post('/api/geolocation/state', async (req, res) => {
  const pos: GeolocationCoordinates = req.body
  if (!pos || isNaN(pos.latitude) || isNaN(pos.longitude)) {
    return res.status(400).json({ error: 'Invalid coords' });
  }

  try {
    const state = usStatesGeometries.find(x => isPointInFeature(pos, x));
    if (state == undefined || state == null)
      return res.json(null);
    const stateCsv = getStateCSVItem(state.id as number)
    if (stateCsv == undefined || stateCsv == null)
      return res.json(null);

    const stateInfo = <StateInfo>{
      fip: state.id,
      abbreviation: stateCsv.abbrev,
      name: stateCsv.name,
      properties: state.properties,
      gnisid: stateCsv.gnisid
    };
    return res.json({ stateInfo });
  } catch (error) {
    console.error('State lookup error:', error);
    return res.status(500).json({ error: 'State lookup failed' });
  }
});

app.post<County | undefined>('/api/geolocation/county', async (req, res) => {
  const pos: GeolocationCoordinates = req.body
  if (!pos || isNaN(pos.latitude) || isNaN(pos.longitude)) {
    return res.status(400).json({ error: 'Invalid coords' });
  }

  try {
    // Step 1: get candidate counties using quadtree
    const candidates: any[] = getCandidateCounties(pos);

    // If quadtree returned nothing, retry with a larger radius
    const effectiveCandidates = candidates.length > 0
      ? candidates
      : getCandidateCounties({ ...pos, accuracy: 50_000 }); // ~50km fallback

    // Step 2: filter by bounding box
    const BBOX_TOLERANCE = 0.001; // ~1000 meters
    const bboxCandidates = effectiveCandidates.filter(c => {
      const { minX, minY, maxX, maxY } = c.bbox;
      return pos.longitude >= minX - BBOX_TOLERANCE &&
        pos.longitude <= maxX + BBOX_TOLERANCE &&
        pos.latitude >= minY - BBOX_TOLERANCE &&
        pos.latitude <= maxY + BBOX_TOLERANCE;
    });
    const county = bboxCandidates.find(x => isPointInFeature(pos, x));
    if (county == undefined || county == null)
      return res.json(null);

    const stateFip = parseInt(county.id.substring(0, 2));
    const countyFip = county.id.substring(2);
    const countyCsvItem: County | undefined = getCountyCSVItem(stateFip, countyFip);
    // TODO this should almost always return a county but sometimes i get nothing or some bug in some areas? idk it breaks the site i think tho. some sort of check issue? or maybe a faulty county in the data

    return res.json(countyCsvItem);
  } catch (error) {
    console.error('County lookup error:', error);
    return res.status(500).json({ error: 'County lookup failed' });
  }
});


app.get('/sitemap.xml', async (_, res) => {
  const countyUrls = countiesCSVCache.map(c =>
    `  <url><loc>https://whatgrowsnativehere.us.com/${c.stateAbbrev}/${encodeURIComponent(c.countyName)}</loc><priority>0.8</priority></url>`
  ).join('\n');

  // TODO every plant overview url
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://whatgrowsnativehere.us.com/</loc><priority>1.0</priority></url>
  <url><loc>https://whatgrowsnativehere.us.com/about</loc><priority>0.4</priority></url>
${countyUrls}
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
});

// DEBUG PROXY
console.log('Setting up proxy with target:', process.env['API_URL'] || 'http://api:8080');

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */


app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
    redirect: false,
  }),
);


/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port: number = Number.parseInt(process.env['PORT'] ?? '') || 4000;

  await preloadCSV();
  await preloadGeometry();

  app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      throw error;
    }

  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

