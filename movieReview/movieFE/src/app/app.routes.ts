import { Routes } from '@angular/router';
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
  { path: 'profile', component: Profile },
  { path: 'watchlist', component: Watchlist },
  { path: '**', redirectTo: '' },
];
