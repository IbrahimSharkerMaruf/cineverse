import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Movies } from './movies/movies';
import { Movie } from './movies/movie/movie';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'movies', component: Movies },
  { path: 'movies/:id', component: Movie },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: '**', redirectTo: '' },
];
