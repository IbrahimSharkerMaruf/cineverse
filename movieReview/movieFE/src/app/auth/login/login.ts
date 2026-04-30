import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { AuthService } from '../../services/auth-service';

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

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/movies']);
    }
  }

  loginWithAuth0() {
    this.auth0.loginWithRedirect();
  }
}
