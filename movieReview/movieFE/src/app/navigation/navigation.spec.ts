import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { of } from 'rxjs';

import { Navigation } from './navigation';
import { AuthService } from '../services/auth-service';
import { WebServices } from '../services/web-services';

const auth0Mock = {
  isAuthenticated$: of(false),
  isLoading$: of(false),
  error$: of(null),
  user$: of(null),
  idTokenClaims$: of(null),
  loginWithRedirect: jasmine.createSpy('loginWithRedirect'),
  logout: jasmine.createSpy('logout'),
};

const authServiceMock = {
  isLoggedIn:              jasmine.createSpy('isLoggedIn').and.returnValue(false),
  isAdmin:                 jasmine.createSpy('isAdmin').and.returnValue(false),
  isModerator:             jasmine.createSpy('isModerator').and.returnValue(false),
  getUsername:             jasmine.createSpy('getUsername').and.returnValue('testuser'),
  getAvatar:               jasmine.createSpy('getAvatar').and.returnValue('/assets/images/avatar/profile.png'),
  watchlistLoaded:         false,
  setWatchlist:            jasmine.createSpy('setWatchlist'),
  clearSession:            jasmine.createSpy('clearSession'),
};

const webServicesMock = {
  getWatchlistIds: jasmine.createSpy('getWatchlistIds').and.returnValue(of([])),
  pageSize: 8,
};

describe('Navigation', () => {
  let component: Navigation;
  let fixture: ComponentFixture<Navigation>;

  beforeEach(async () => {
    localStorage.removeItem('theme');

    await TestBed.configureTestingModule({
      imports: [Navigation],
      providers: [
        provideRouter([]),
        { provide: Auth0Service, useValue: auth0Mock },
        { provide: AuthService,  useValue: authServiceMock },
        { provide: WebServices,  useValue: webServicesMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Navigation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to dark mode when no theme is saved', () => {
    expect(component.isDarkMode).toBeTrue();
  });

  it('toggleTheme should flip isDarkMode', () => {
    const before = component.isDarkMode;
    component.toggleTheme();
    expect(component.isDarkMode).toBe(!before);
  });

  it('toggleTheme called twice should restore original mode', () => {
    const before = component.isDarkMode;
    component.toggleTheme();
    component.toggleTheme();
    expect(component.isDarkMode).toBe(before);
  });

  it('login should call auth0 loginWithRedirect', () => {
    component.login();
    expect(auth0Mock.loginWithRedirect).toHaveBeenCalled();
  });

  it('logout should call authService clearSession', () => {
    component.logout();
    expect(authServiceMock.clearSession).toHaveBeenCalled();
  });
});
