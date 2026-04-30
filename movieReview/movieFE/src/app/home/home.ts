import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Landing page component.
 * Displays the hero section and entry points to the movie catalogue.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
