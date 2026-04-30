/*
 * Angular router and Auth0 guard import, plus all page components
 * referenced in the route definitions below.
 */
import { Routes } from '@angular/router';
import { authGuardFn } from '@auth0/auth0-angular';
import { Home } from './home/home';
import { Movies } from './movies/movies';
import { Movie } from './movies/movie/movie';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Profile } from './profile/profile';
import { Watchlist } from './watchlist/watchlist';

/**
 * Application route definitions.
 *
 * Public routes (no login required):
 *  - `/`            → Home landing page
 *  - `/movies`      → Paginated, filterable movie catalogue
 *  - `/movies/:id`  → Individual movie detail page
 *  - `/login`       → Auth0 login entry point
 *  - `/register`    → Auth0 sign-up entry point
 *
 * Protected routes (Auth0 login required via `authGuardFn`):
 *  - `/profile`     → Logged-in user's profile, reviews, and admin panel
 *  - `/watchlist`   → Logged-in user's saved movie watchlist
 *
 * Any unknown path redirects to the home page (`**` → `''`).
 */
export const routes: Routes = [
  { path: '', component: Home },
  { path: 'movies', component: Movies },
  { path: 'movies/:id', component: Movie },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'profile', component: Profile, canActivate: [authGuardFn] },
  { path: 'watchlist', component: Watchlist, canActivate: [authGuardFn] },
  { path: '**', redirectTo: '' }, // catch-all fallback
];
