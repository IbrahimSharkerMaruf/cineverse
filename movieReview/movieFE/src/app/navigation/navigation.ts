import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { AuthService } from '../services/auth-service';
import { WebServices } from '../services/web-services';

/**
 * Top navigation bar component.
 * Handles theme toggling (dark/light mode), Auth0 login/logout, and nav link display.
 */
@Component({
  selector: 'app-navigation',
  imports: [RouterModule, CommonModule],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})
export class Navigation implements OnInit {
  /** True when the app is in dark mode (default). */
  isDarkMode = true;

  constructor(
    public authService: AuthService,
    public auth0: Auth0Service,
    private webService: WebServices,
  ) {}

  /** Reads saved theme from localStorage and applies it on load. */
  ngOnInit() {
    const saved = localStorage.getItem('theme');
    this.isDarkMode = saved !== 'light';
    this.applyTheme();

    this.auth0.error$.subscribe(err => {
      console.error('[Auth0 SDK error]', err);
    });

    this.auth0.isLoading$.subscribe(loading => {
      console.log('[Auth0] isLoading:', loading);
    });

    this.auth0.isAuthenticated$.subscribe(auth => {
      console.log('[Auth0] isAuthenticated$:', auth);
    });

    if (this.authService.isLoggedIn() && !this.authService.watchlistLoaded) {
      this.webService.getWatchlistIds().subscribe(ids => {
        this.authService.setWatchlist(ids);
      });
    }
  }

  /** Toggles between dark and light mode and persists the preference. */
  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    document.body.classList.toggle('light-mode', !this.isDarkMode);
  }

  /** Triggers Auth0 login redirect. */
  login() {
    this.auth0.loginWithRedirect();
  }

  /** Clears the local session and triggers Auth0 logout. */
  logout() {
    this.authService.clearSession();
  }
}
