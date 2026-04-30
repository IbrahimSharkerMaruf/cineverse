import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { AuthService } from '../../services/auth-service';

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

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/movies']);
    }
  }

  signUp() {
    this.auth0.loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });
  }
}
