import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class INaturalistService {
  // TODO make 24 hour refresh auth token for things
  // TODO pull images from the amazon bucket for freesies
  // profit

  //s3://inaturalist-open-data/photos/[photo_id]/medium.[extension]
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
}
