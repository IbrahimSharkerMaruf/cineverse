import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { of } from 'rxjs';

import { App } from './app';
import { AuthService } from './services/auth-service';
import { WebServices } from './services/web-services';

const auth0Mock = {
  isAuthenticated$: of(false),
  isLoading$:       of(false),
  error$:           of(null),
  user$:            of(null),
  idTokenClaims$:   of(null),
  loginWithRedirect: jasmine.createSpy('loginWithRedirect'),
  logout:            jasmine.createSpy('logout'),
};

const authServiceMock = {
  isLoggedIn:    jasmine.createSpy('isLoggedIn').and.returnValue(false),
  isAdmin:       jasmine.createSpy('isAdmin').and.returnValue(false),
  isModerator:   jasmine.createSpy('isModerator').and.returnValue(false),
  getUsername:   jasmine.createSpy('getUsername').and.returnValue('testuser'),
  getAvatar:     jasmine.createSpy('getAvatar').and.returnValue('/assets/images/avatar/profile.png'),
  watchlistLoaded: false,
  setWatchlist:  jasmine.createSpy('setWatchlist'),
  clearSession:  jasmine.createSpy('clearSession'),
};

const webServicesMock = {
  getWatchlistIds: jasmine.createSpy('getWatchlistIds').and.returnValue(of([])),
  pageSize: 8,
};

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem('theme');

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: Auth0Service, useValue: auth0Mock },
        { provide: AuthService,  useValue: authServiceMock },
        { provide: WebServices,  useValue: webServicesMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
