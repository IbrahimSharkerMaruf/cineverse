import { Routes } from '@angular/router';
import { authGuardFn } from '@auth0/auth0-angular';
import { Home } from './home/home';
import { Movies } from './movies/movies';
import { Movie } from './movies/movie/movie';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Profile } from './profile/profile';
import { Watchlist } from './watchlist/watchlist';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'movies', component: Movies },
  { path: 'movies/:id', component: Movie },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'profile', component: Profile, canActivate: [authGuardFn] },
  { path: 'watchlist', component: Watchlist, canActivate: [authGuardFn] },
  { path: '**', redirectTo: '' },
];
