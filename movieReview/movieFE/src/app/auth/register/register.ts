import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WebServices } from '../../services/web-services';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  registerForm: any;
  errorMessage = '';
  successMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private webService: WebServices,
    private router: Router
  ) {}

  ngOnInit() {
    this.registerForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit() {
    this.errorMessage = '';
    this.webService
      .register(this.registerForm.value.username, this.registerForm.value.password)
      .subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Registration failed. Username may already be taken.';
        },
      });
  }

  isInvalid(control: string) {
    return (
      this.registerForm.controls[control].invalid &&
      this.registerForm.controls[control].touched
    );
  }
}
