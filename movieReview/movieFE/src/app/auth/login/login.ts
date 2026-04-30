import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { AuthService } from '../../services/auth-service';

/**
 * Login page component.
 * Redirects already-authenticated users to `/movies` and provides an Auth0 login button.
 */
@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  constructor(
    public auth0: Auth0Service,
    private authService: AuthService,
    private router: Router,
  ) {}

  /** Redirects to `/movies` if the user is already logged in. */
  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/movies']);
    }
  }

  /** Initiates the Auth0 universal login redirect. */
  loginWithAuth0() {
    this.auth0.loginWithRedirect();
  }
}
