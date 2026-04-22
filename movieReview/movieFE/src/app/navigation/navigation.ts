import { Component } from '@angular/core';
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
export class Navigation {
  constructor(
    public authService: AuthService,
    private webService: WebServices,
    private router: Router
  ) {}

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
