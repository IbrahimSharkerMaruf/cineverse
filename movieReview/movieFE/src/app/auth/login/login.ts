import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WebServices } from '../../services/web-services';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  loginForm: any;
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private webService: WebServices,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/movies']);
    }
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onSubmit() {
    this.errorMessage = '';
    this.webService
      .login(this.loginForm.value.username, this.loginForm.value.password)
      .subscribe({
        next: (response) => {
          this.authService.setSession(response.token, this.loginForm.value.username);
          this.router.navigate(['/movies']);
        },
        error: () => {
          this.errorMessage = 'Invalid username or password.';
        },
      });
  }

  isInvalid(control: string) {
    return (
      this.loginForm.controls[control].invalid &&
      this.loginForm.controls[control].touched
    );
  }
}
