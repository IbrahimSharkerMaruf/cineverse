import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { Movie } from './movie';
import { WebServices } from '../../services/web-services';
import { AuthService } from '../../services/auth-service';

const webServicesMock = {
  getMovie:            jasmine.createSpy('getMovie').and.returnValue(of({ title: 'Test', vote_average: 8 })),
  getReviews:          jasmine.createSpy('getReviews').and.returnValue(of([])),
  getWatchlistIds:     jasmine.createSpy('getWatchlistIds').and.returnValue(of([])),
  postReview:          jasmine.createSpy('postReview').and.returnValue(of({})),
  editReview:          jasmine.createSpy('editReview').and.returnValue(of({})),
  deleteReview:        jasmine.createSpy('deleteReview').and.returnValue(of({})),
  addToWatchlist:      jasmine.createSpy('addToWatchlist').and.returnValue(of({})),
  removeFromWatchlist: jasmine.createSpy('removeFromWatchlist').and.returnValue(of({})),
  deleteMovie:         jasmine.createSpy('deleteMovie').and.returnValue(of({})),
  updateMovie:         jasmine.createSpy('updateMovie').and.returnValue(of({})),
  postReply:           jasmine.createSpy('postReply').and.returnValue(of({})),
  deleteReply:         jasmine.createSpy('deleteReply').and.returnValue(of({})),
  pageSize: 8,
};

const authServiceMock = {
  isLoggedIn:               jasmine.createSpy('isLoggedIn').and.returnValue(false),
  isAdmin:                  jasmine.createSpy('isAdmin').and.returnValue(false),
  isModerator:              jasmine.createSpy('isModerator').and.returnValue(false),
  getUsername:              jasmine.createSpy('getUsername').and.returnValue('testuser'),
  getAvatar:                jasmine.createSpy('getAvatar').and.returnValue('/assets/images/avatar/profile.png'),
  watchlistLoaded:          true,
  setWatchlist:             jasmine.createSpy('setWatchlist'),
  isInWatchlist:            jasmine.createSpy('isInWatchlist').and.returnValue(false),
  addToWatchlistLocal:      jasmine.createSpy('addToWatchlistLocal'),
  removeFromWatchlistLocal: jasmine.createSpy('removeFromWatchlistLocal'),
};

const activatedRouteMock = {
  snapshot: { paramMap: { get: (_: string) => 'abc123' } },
};

describe('Movie', () => {
  let component: Movie;
  let fixture: ComponentFixture<Movie>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Movie],
      providers: [
        provideRouter([]),
        { provide: AuthService,    useValue: authServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    })
    .overrideComponent(Movie, {
      set: { providers: [{ provide: WebServices, useValue: webServicesMock }] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(Movie);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the movie on init', () => {
    expect(webServicesMock.getMovie).toHaveBeenCalledWith('abc123');
  });

  it('should load reviews on init', () => {
    expect(webServicesMock.getReviews).toHaveBeenCalledWith('abc123');
  });

  it('communityRating should return null when there are no reviews', () => {
    component.reviews_list = [];
    expect(component.communityRating).toBeNull();
  });

  it('communityRating should average star scores correctly', () => {
    component.reviews_list = [{ star: 4 }, { star: 3 }, { star: 5 }];
    expect(component.communityRating).toBe(4);
  });

  it('communityRating should round to one decimal place', () => {
    component.reviews_list = [{ star: 4 }, { star: 3 }];
    expect(component.communityRating).toBe(3.5);
  });

  it('officialRating5 should convert vote_average from 0–10 scale to 0–5', () => {
    component.movie = { vote_average: 8 };
    expect(component.officialRating5).toBe(4);
  });

  it('officialRating5 should return 0 when movie is null', () => {
    component.movie = null;
    expect(component.officialRating5).toBe(0);
  });

  it('starString should build the correct filled and empty star string', () => {
    expect(component.starString(3)).toBe('★★★☆☆');
    expect(component.starString(5)).toBe('★★★★★');
    expect(component.starString(0)).toBe('☆☆☆☆☆');
  });

  it('posterUrl should return the correct asset path', () => {
    expect(component.posterUrl('batman.jpg')).toBe('/assets/images/posters/batman.jpg');
  });

  it('parseJson should return a parsed array from valid JSON', () => {
    const json = JSON.stringify([{ name: 'Action' }]);
    expect(component.parseJson(json)).toEqual([{ name: 'Action' }]);
  });

  it('parseJson should return an empty array when JSON is invalid', () => {
    expect(component.parseJson('not-json')).toEqual([]);
  });

  it('genreList should return genre name strings from JSON', () => {
    const json = JSON.stringify([{ name: 'Drama' }, { name: 'Thriller' }]);
    expect(component.genreList(json)).toEqual(['Drama', 'Thriller']);
  });

  it('keywordList should limit results to 15 items', () => {
    const keywords = Array.from({ length: 20 }, (_, i) => ({ name: `kw${i}` }));
    expect(component.keywordList(JSON.stringify(keywords)).length).toBe(15);
  });

  it('parseNames should return genre names as a comma-separated string', () => {
    const json = JSON.stringify([{ name: 'Action' }, { name: 'Comedy' }]);
    expect(component.parseNames(json)).toBe('Action, Comedy');
  });

  it('isInvalid should return false when review comment is untouched', () => {
    expect(component.isInvalid('comment')).toBeFalse();
  });
});
