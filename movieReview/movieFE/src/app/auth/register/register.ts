import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { AuthService } from '../../services/auth-service';

/**
 * Sign-up page component.
 * Redirects already-authenticated users to `/movies` and provides an Auth0 sign-up button.
 */
@Component({
  selector: 'app-register',
  imports: [RouterModule],
  templateUrl: './register.html',
})
export class Register {
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

  /** Opens the Auth0 universal login screen pre-set to the sign-up tab. */
  signUp() {
    this.auth0.loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });
  }
}
