import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class INaturalistService {
  // TODO make 24 hour refresh auth token for things
  // TODO pull images from the amazon bucket for freesies
  // profit

  //https://inaturalist-open-data.s3.amazonaws.com/photos/[photo_id]/medium.[extension]

  /**
   * original - 2048px
   * large - 1024px
   * medium - 500px
   * small - 240px
   * thumb - 100px
   * square - exactly 75x75px, cropped to be square
   * 
   * srcsets
   * 
   * If the photos in this dataset are used in any way that requires attributing the photographer, 
   * the license, observer name, and observer login can be used to create an attribution statement. 
   * Unless the photo license specifies the photo is in the public domain, all photographers retain 
   * copyright of their photos, and the license under which the photo is shared dictates how the 
   * photo can be used. Please ensure that any use of these photos is in compliance with their 
   * Creative Commons license terms.
   * 
   * 
   * Photos with a CC0 license can be attributed as "[observer name, or observer login], no rights 
   * reserved (CC0)". For example "Name, no rights reserved (CC0)", or "Login, no rights reserved 
   * (CC0)". Photos with other Creative Commons licenses can be attributed as "© [observer name,
   *  or observer login], some rights reserved ([license abbreviation])". For example "© Name, 
   * some rights reserved (CC-BY)", or "© Login, some rights reserved (CC-BY-NC)"
   */
  // TODO turn plant acceptedSymbol to photoId 
  // acceptedSymbol => plantId within inaturalist => observation => photo => photoid

  private static readonly _SIZES = [
    { name: 'small', width: 240 },
    { name: 'medium', width: 500 },
    { name: 'large', width: 1024 },
    { name: 'original', width: 2048 },  
  ];

  private static readonly _baseImgUrl = `https://inaturalist-open-data.s3.amazonaws.com/photos/`;

  public getSrcSet(photoId: number | string, ext = 'jpg'): { src: string, srcset: string } {
    const base = INaturalistService._baseImgUrl + photoId;
    return {
      src: `${base}/medium.${ext}`,
      srcset: INaturalistService._SIZES.map(s => `${base}/${s.name}.${ext} ${s.width}w`).join(', ')
    };
  }

  public getOriginal(photoId: number | string, ext: string = 'jpg') : string{
    const base = INaturalistService._baseImgUrl + photoId;
    return base + '/original.' + ext;
  }
  

  public getSquare(photoId: number | string, ext: string = 'jpg'): string {
    const base = INaturalistService._baseImgUrl + photoId;
    return base + '/square.' + ext;
  }

}
