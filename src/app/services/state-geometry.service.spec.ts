import { TestBed } from '@angular/core/testing';

import { StateGeometryService } from './state-geometry.service';

describe('StateGeometryService', () => {
  let service: StateGeometryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StateGeometryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
