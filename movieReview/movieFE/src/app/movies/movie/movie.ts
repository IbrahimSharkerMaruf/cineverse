import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WebServices } from '../../services/web-services';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-movie',
  imports: [RouterLink, CommonModule, ReactiveFormsModule],
  providers: [WebServices],
  templateUrl: './movie.html',
  styleUrl: './movie.css',
})
export class Movie {
  movie: any = null;
  reviews_list: any[] = [];
  reviewForm: any;
  submitError = '';
  submitSuccess = false;
  hoveredStar = 0;
  deleteMovieError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private webService: WebServices,
    public authService: AuthService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.reviewForm = this.formBuilder.group({
      username: [
        { value: this.authService.getUsername() || '', disabled: this.authService.isLoggedIn() },
        Validators.required,
      ],
      comment: ['', Validators.required],
      stars: [5],
    });

    const id = this.route.snapshot.paramMap.get('id');
    this.webService.getMovie(id).subscribe((response) => {
      this.movie = response;
    });
    this.loadReviews();
  }

  loadReviews() {
    const id = this.route.snapshot.paramMap.get('id');
    this.webService.getReviews(id).subscribe((response) => {
      this.reviews_list = response;
    });
  }

  onSubmit() {
    this.submitError = '';
    this.submitSuccess = false;
    const id = this.route.snapshot.paramMap.get('id');
    const formValue = {
      ...this.reviewForm.getRawValue(),
      username: this.authService.isLoggedIn()
        ? this.authService.getUsername()
        : this.reviewForm.value.username,
    };
    this.webService.postReview(id, formValue).subscribe({
      next: () => {
        this.submitSuccess = true;
        this.reviewForm.patchValue({ comment: '', stars: 5 });
        this.reviewForm.markAsPristine();
        this.loadReviews();
      },
      error: () => {
        this.submitError = 'Failed to submit review. Please try again.';
      },
    });
  }

  deleteReview(reviewId: string) {
    const movieId = this.route.snapshot.paramMap.get('id')!;
    this.webService.deleteReview(movieId, reviewId).subscribe({
      next: () => this.loadReviews(),
    });
  }

  deleteMovie() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.webService.deleteMovie(id).subscribe({
      next: () => this.router.navigate(['/movies']),
      error: () => {
        this.deleteMovieError = 'Failed to delete movie.';
      },
    });
  }

  isInvalid(control: string) {
    return (
      this.reviewForm.controls[control].invalid &&
      this.reviewForm.controls[control].touched
    );
  }

  parseJson(jsonStr: string): any[] {
    try { return JSON.parse(jsonStr); } catch { return []; }
  }

  genreList(jsonStr: string): string[] {
    return this.parseJson(jsonStr).map((i: any) => i.name);
  }

  keywordList(jsonStr: string): string[] {
    return this.parseJson(jsonStr).map((i: any) => i.name).slice(0, 15);
  }

  starString(n: number): string {
    return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  }

  parseNames(jsonStr: string): string {
    return this.genreList(jsonStr).join(', ');
  }
}
