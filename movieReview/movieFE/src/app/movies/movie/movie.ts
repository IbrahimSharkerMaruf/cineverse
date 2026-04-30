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
  confirmDeleteMovie = false;

  isInWatchlist = false;

  editingReviewId: string | null = null;
  editForm: any;
  editError = '';
  deleteReviewError = '';
  confirmDeleteReviewId: string | null = null;

  replyingToReviewId: string | null = null;
  replyText = '';
  replyError = '';
  confirmDeleteReplyId: string | null = null;
  confirmDeleteReplyReviewId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private webService: WebServices,
    public authService: AuthService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.reviewForm = this.formBuilder.group({
      comment: ['', Validators.required],
      stars: [5],
    });

    const id = this.route.snapshot.paramMap.get('id');

    this.webService.getMovie(id).subscribe((response) => {
      this.movie = response;
    });

    this.loadReviews();

    if (this.authService.isLoggedIn()) {
      if (this.authService.watchlistLoaded) {
        this.isInWatchlist = this.authService.isInWatchlist(id!);
      } else {
        this.webService.getWatchlistIds().subscribe(ids => {
          this.authService.setWatchlist(ids);
          this.isInWatchlist = this.authService.isInWatchlist(id!);
        });
      }
    }
  }

  loadReviews() {
    const id = this.route.snapshot.paramMap.get('id');
    this.webService.getReviews(id).subscribe((response) => {
      this.reviews_list = response;
    });
  }

  get communityRating(): number | null {
    if (!this.reviews_list.length) return null;
    const avg = this.reviews_list.reduce((s: number, r: any) => s + r.star, 0) / this.reviews_list.length;
    return Math.round(avg * 10) / 10;
  }

  get officialRating5(): number {
    return this.movie ? Math.round((this.movie.vote_average / 2) * 10) / 10 : 0;
  }

  toggleWatchlist() {
    const id = this.route.snapshot.paramMap.get('id')!;
    if (this.isInWatchlist) {
      this.webService.removeFromWatchlist(id).subscribe(() => {
        this.isInWatchlist = false;
        this.authService.removeFromWatchlistLocal(id);
      });
    } else {
      this.webService.addToWatchlist(id).subscribe(() => {
        this.isInWatchlist = true;
        this.authService.addToWatchlistLocal(id);
      });
    }
  }

  startEdit(review: any) {
    this.editingReviewId = review._id;
    this.editError = '';
    this.editForm = this.formBuilder.group({
      comment: [review.comment, Validators.required],
      stars: [review.star],
    });
  }

  cancelEdit() {
    this.editingReviewId = null;
    this.editError = '';
  }

  submitEdit(reviewId: string) {
    const movieId = this.route.snapshot.paramMap.get('id')!;
    this.webService.editReview(movieId, reviewId, this.editForm.value).subscribe({
      next: () => {
        this.editingReviewId = null;
        this.loadReviews();
      },
      error: () => { this.editError = 'Failed to update review.'; }
    });
  }

  onSubmit() {
    this.submitError = '';
    this.submitSuccess = false;
    const id = this.route.snapshot.paramMap.get('id');
    this.webService.postReview(id, this.reviewForm.getRawValue()).subscribe({
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

  confirmDelete(reviewId: string) {
    this.confirmDeleteReviewId = reviewId;
  }

  cancelDelete() {
    this.confirmDeleteReviewId = null;
  }

  deleteReview(reviewId: string) {
    const movieId = this.route.snapshot.paramMap.get('id')!;
    this.deleteReviewError = '';
    this.confirmDeleteReviewId = null;
    this.webService.deleteReview(movieId, reviewId).subscribe({
      next: () => this.loadReviews(),
      error: (err) => {
        this.deleteReviewError = err?.error?.error || 'Failed to delete review.';
        setTimeout(() => this.deleteReviewError = '', 4000);
      }
    });
  }

  deleteMovie() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.webService.deleteMovie(id).subscribe({
      next: () => this.router.navigate(['/movies']),
      error: () => { this.deleteMovieError = 'Failed to delete movie.'; },
    });
  }

  startReply(reviewId: string) {
    this.replyingToReviewId = reviewId;
    this.replyText = '';
    this.replyError = '';
  }

  cancelReply() {
    this.replyingToReviewId = null;
    this.replyText = '';
    this.replyError = '';
  }

  submitReply(reviewId: string) {
    if (!this.replyText.trim()) return;
    const movieId = this.route.snapshot.paramMap.get('id')!;
    this.webService.postReply(movieId, reviewId, this.replyText.trim()).subscribe({
      next: () => {
        this.replyingToReviewId = null;
        this.replyText = '';
        this.loadReviews();
      },
      error: (err) => { this.replyError = err?.error?.error || 'Failed to post reply.'; }
    });
  }

  confirmDeleteReply(reviewId: string, replyId: string) {
    this.confirmDeleteReplyReviewId = reviewId;
    this.confirmDeleteReplyId = replyId;
  }

  cancelDeleteReply() {
    this.confirmDeleteReplyId = null;
    this.confirmDeleteReplyReviewId = null;
  }

  deleteReply(reviewId: string, replyId: string) {
    const movieId = this.route.snapshot.paramMap.get('id')!;
    this.webService.deleteReply(movieId, reviewId, replyId).subscribe({
      next: () => {
        this.confirmDeleteReplyId = null;
        this.confirmDeleteReplyReviewId = null;
        this.loadReviews();
      },
      error: () => {}
    });
  }

  isInvalid(control: string) {
    return (
      this.reviewForm.controls[control].invalid &&
      this.reviewForm.controls[control].touched
    );
  }

  posterUrl(filename: string): string {
    return `/assets/images/posters/${encodeURIComponent(filename)}`;
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
