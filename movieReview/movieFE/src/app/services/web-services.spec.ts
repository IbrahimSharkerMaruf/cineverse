import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { of } from 'rxjs';

import { WebServices } from './web-services';

const auth0Mock = {
  idTokenClaims$: of(null),
  isAuthenticated$: of(false),
  isLoading$: of(false),
  error$: of(null),
  loginWithRedirect: jasmine.createSpy('loginWithRedirect'),
  logout: jasmine.createSpy('logout'),
};

describe('WebServices', () => {
  let service: WebServices;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WebServices,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth0Service, useValue: auth0Mock },
      ],
    });
    service = TestBed.inject(WebServices);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have pageSize of 8', () => {
    expect(service.pageSize).toBe(8);
  });

  it('getMovies should call the movies endpoint with page number', () => {
    service.getMovies(1, {}).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/movies'));
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toContain('pn=1');
    req.flush({ movies: [], total: 0 });
  });

  it('getMovies should append q param when title filter is provided', () => {
    service.getMovies(1, { title: 'comedy' }).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/movies'));
    expect(req.request.urlWithParams).toContain('q=comedy');
    req.flush({ movies: [], total: 0 });
  });

  it('getMovies should append genre param when genre filter is provided', () => {
    service.getMovies(1, { genre: 'Action' }).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/movies'));
    expect(req.request.urlWithParams).toContain('genre=Action');
    req.flush({ movies: [], total: 0 });
  });

  it('getMovies should append year param when year filter is provided', () => {
    service.getMovies(1, { year: 2020 }).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/movies'));
    expect(req.request.urlWithParams).toContain('year=2020');
    req.flush({ movies: [], total: 0 });
  });

  it('getMovie should call the correct endpoint for a given id', () => {
    service.getMovie('abc123').subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/movies/abc123'));
    expect(req.request.method).toBe('GET');
    req.flush({ title: 'Test Movie' });
  });

  it('getReviews should call the reviews endpoint for a given movie id', () => {
    service.getReviews('abc123').subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/movies/abc123/reviews'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
