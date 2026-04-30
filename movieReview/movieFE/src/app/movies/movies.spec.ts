import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { Movies } from './movies';
import { WebServices } from '../services/web-services';
import { AuthService } from '../services/auth-service';

const webServicesMock = {
  getMovies:           jasmine.createSpy('getMovies').and.returnValue(of({ movies: [], total: 0 })),
  getWatchlistIds:     jasmine.createSpy('getWatchlistIds').and.returnValue(of([])),
  addMovie:            jasmine.createSpy('addMovie').and.returnValue(of({})),
  addToWatchlist:      jasmine.createSpy('addToWatchlist').and.returnValue(of({})),
  removeFromWatchlist: jasmine.createSpy('removeFromWatchlist').and.returnValue(of({})),
  pageSize: 8,
};

const authServiceMock = {
  isLoggedIn:              jasmine.createSpy('isLoggedIn').and.returnValue(false),
  isAdmin:                 jasmine.createSpy('isAdmin').and.returnValue(false),
  isModerator:             jasmine.createSpy('isModerator').and.returnValue(false),
  getUsername:             jasmine.createSpy('getUsername').and.returnValue('testuser'),
  getAvatar:               jasmine.createSpy('getAvatar').and.returnValue('/assets/images/avatar/profile.png'),
  watchlistLoaded:         false,
  setWatchlist:            jasmine.createSpy('setWatchlist'),
  isInWatchlist:           jasmine.createSpy('isInWatchlist').and.returnValue(false),
  addToWatchlistLocal:     jasmine.createSpy('addToWatchlistLocal'),
  removeFromWatchlistLocal: jasmine.createSpy('removeFromWatchlistLocal'),
};

const activatedRouteMock = {
  snapshot: { queryParamMap: { get: (_: string) => null } },
};

describe('Movies', () => {
  let component: Movies;
  let fixture: ComponentFixture<Movies>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Movies],
      providers: [
        provideRouter([]),
        { provide: AuthService,    useValue: authServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    })
    .overrideComponent(Movies, {
      set: { providers: [{ provide: WebServices, useValue: webServicesMock }] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(Movies);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getMovies on init', () => {
    expect(webServicesMock.getMovies).toHaveBeenCalled();
  });

  it('activeFilterCount should be 0 when no filters are set', () => {
    expect(component.activeFilterCount).toBe(0);
  });

  it('activeFilterCount should increase when a filter is applied', () => {
    component.filterForm.patchValue({ genre: 'Action' });
    expect(component.activeFilterCount).toBe(1);
  });

  it('posterUrl should return the correct asset path', () => {
    expect(component.posterUrl('inception.jpg')).toBe('/assets/images/posters/inception.jpg');
  });

  it('parseNames should return a comma-separated genre string from valid JSON', () => {
    const json = JSON.stringify([{ name: 'Action' }, { name: 'Drama' }]);
    expect(component.parseNames(json)).toBe('Action, Drama');
  });

  it('parseNames should return the raw string when JSON is invalid', () => {
    expect(component.parseNames('not-json')).toBe('not-json');
  });

  it('genreList should return an array of genre names from valid JSON', () => {
    const json = JSON.stringify([{ name: 'Comedy' }, { name: 'Romance' }]);
    expect(component.genreList(json)).toEqual(['Comedy', 'Romance']);
  });

  it('genreList should return an empty array when JSON is invalid', () => {
    expect(component.genreList('bad')).toEqual([]);
  });

  it('searchByTitle should reset page to 1', () => {
    component.page = 5;
    component.searchByTitle();
    expect(component.page).toBe(1);
  });

  it('clearFilters should reset genre filter to empty string', () => {
    component.filterForm.patchValue({ genre: 'Comedy' });
    component.clearFilters();
    expect(component.filterForm.get('genre')?.value).toBe('');
  });

  it('previousPage should not go below page 1', () => {
    component.page = 1;
    component.previousPage();
    expect(component.page).toBe(1);
  });

  it('nextPage should not advance past the last page', () => {
    component.page = 3;
    component.totalPages = 3;
    component.isLastPage = true;
    component.nextPage();
    expect(component.page).toBe(3);
  });
});
