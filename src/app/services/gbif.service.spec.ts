import { TestBed } from '@angular/core/testing';

import { GbifService } from './gbif.service';

describe('GbifService', () => {
  let service: GbifService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GbifService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
