import { PlantData } from "../models/gov/models";
import { ndJsonTransformStream } from "./ndjsonstream.worker";


addEventListener('message', async ({ data: url }: MessageEvent<string>) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      postMessage({ error: `${response.status} | ${response.statusText}` });
      return;
    }

    if (!response.body) {
      postMessage({ error: 'Response body is null' });
      return;
    }

    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(ndJsonTransformStream<PlantData[]>())
      .getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        postMessage({ done: true });
        break;
      }

      postMessage({ batch: value });
    }
  } catch (err) {
    postMessage({ error: String(err) });
  }
});