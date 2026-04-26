import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth-service';
import { WebServices } from '../services/web-services';

@Component({
  selector: 'app-navigation',
  imports: [RouterModule, CommonModule],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})
export class Navigation implements OnInit {
  isDarkMode = true;

  constructor(
    public authService: AuthService,
    private webService: WebServices,
    private router: Router
  ) {}

  ngOnInit() {
    const saved = localStorage.getItem('theme');
    this.isDarkMode = saved !== 'light';
    this.applyTheme();

    if (this.authService.isLoggedIn() && !this.authService.watchlistLoaded) {
      this.webService.getWatchlistIds().subscribe(ids => {
        this.authService.setWatchlist(ids);
      });
    }
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    document.body.classList.toggle('light-mode', !this.isDarkMode);
  }

  logout() {
    const token = this.authService.getToken();
    if (token) {
      this.webService.logout(token).subscribe({
        next: () => this.clearAndRedirect(),
        error: () => this.clearAndRedirect(),
      });
    } else {
      this.clearAndRedirect();
    }
  }

  private clearAndRedirect() {
    this.authService.clearSession();
    this.router.navigate(['/login']);
  }
}
