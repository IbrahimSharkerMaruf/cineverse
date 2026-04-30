import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WebServices } from '../../services/web-services';
import { AuthService } from '../../services/auth-service';

/**
 * Movie detail page component.
 * Shows full movie information, community reviews, and a review submission form.
 * Supports inline review editing, reply threads, watchlist toggle, and admin movie deletion.
 */
@Component({
  selector: 'app-movie',
  imports: [RouterLink, CommonModule, ReactiveFormsModule],
  providers: [WebServices],
  templateUrl: './movie.html',
  styleUrl: './movie.css',
})
export class Movie {
  /** Full movie object returned by the backend. */
  movie: any = null;
  /** List of reviews for the current movie. */
  reviews_list: any[] = [];
  /** Reactive form for submitting a new review. */
  reviewForm: any;
  /** Error message shown when review submission fails. */
  submitError = '';
  /** True after a review is successfully submitted. */
  submitSuccess = false;
  /** Star rating index currently hovered in the star picker (0 = none). */
  hoveredStar = 0;
  /** Error message shown when movie deletion fails. */
  deleteMovieError = '';
  /** True when the admin movie-delete confirmation prompt is visible. */
  confirmDeleteMovie = false;

  /** True when the current movie is in the user's watchlist. */
  isInWatchlist = false;

  /** Review ID currently being edited inline, or null if none. */
  editingReviewId: string | null = null;
  /** Reactive form for editing an existing review. */
  editForm: any;
  /** Error message shown when a review edit fails. */
  editError = '';
  /** Error message shown when a review deletion fails. */
  deleteReviewError = '';
  /** Review ID awaiting delete confirmation, or null if none. */
  confirmDeleteReviewId: string | null = null;

  /** Review ID for which the reply compose box is open, or null if none. */
  replyingToReviewId: string | null = null;
  /** Draft text for a reply being composed. */
  replyText = '';
  /** Error message shown when posting a reply fails. */
  replyError = '';
  /** Reply ID awaiting delete confirmation, or null if none. */
  confirmDeleteReplyId: string | null = null;
  /** Review ID that owns the reply awaiting delete confirmation. */
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

  /** Fetches and refreshes the review list for the current movie. */
  loadReviews() {
    const id = this.route.snapshot.paramMap.get('id');
    this.webService.getReviews(id).subscribe((response) => {
      this.reviews_list = response;
    });
  }

  /** Average star rating from all user reviews, rounded to 1 decimal. Null if no reviews. */
  get communityRating(): number | null {
    if (!this.reviews_list.length) return null;
    const avg = this.reviews_list.reduce((s: number, r: any) => s + r.star, 0) / this.reviews_list.length;
    return Math.round(avg * 10) / 10;
  }

  /** Official TMDb rating converted from a 0–10 scale to a 0–5 star scale. */
  get officialRating5(): number {
    return this.movie ? Math.round((this.movie.vote_average / 2) * 10) / 10 : 0;
  }

  /** Adds or removes this movie from the user's watchlist, updating local cache optimistically. */
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

  /**
   * Opens the inline edit form pre-filled with the review's current values.
   * @param review Review object to edit.
   */
  startEdit(review: any) {
    this.editingReviewId = review._id;
    this.editError = '';
    this.editForm = this.formBuilder.group({
      comment: [review.comment, Validators.required],
      stars: [review.star],
    });
  }

  /** Closes the inline edit form without saving. */
  cancelEdit() {
    this.editingReviewId = null;
    this.editError = '';
  }

  /**
   * Saves the edited review and reloads the review list on success.
   * @param reviewId Review ID being updated.
   */
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

  /** Submits the new review form and reloads reviews on success. */
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

  /**
   * Shows the delete confirmation prompt for a review.
   * @param reviewId Review ID to confirm deletion for.
   */
  confirmDelete(reviewId: string) {
    this.confirmDeleteReviewId = reviewId;
  }

  /** Dismisses the review delete confirmation prompt. */
  cancelDelete() {
    this.confirmDeleteReviewId = null;
  }

  /**
   * Deletes a review and refreshes the list.
   * @param reviewId Review ID to delete.
   */
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

  /** Deletes the current movie (admin only) and navigates back to the movie list. */
  deleteMovie() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.webService.deleteMovie(id).subscribe({
      next: () => this.router.navigate(['/movies']),
      error: () => { this.deleteMovieError = 'Failed to delete movie.'; },
    });
  }

  /**
   * Opens the reply compose box for a specific review.
   * @param reviewId Review ID to reply to.
   */
  startReply(reviewId: string) {
    this.replyingToReviewId = reviewId;
    this.replyText = '';
    this.replyError = '';
  }

  /** Closes the reply compose box without posting. */
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

  /**
   * Shows the delete confirmation prompt for a reply.
   * @param reviewId Review the reply belongs to.
   * @param replyId Reply ID to confirm deletion for.
   */
  confirmDeleteReply(reviewId: string, replyId: string) {
    this.confirmDeleteReplyReviewId = reviewId;
    this.confirmDeleteReplyId = replyId;
  }

  /** Dismisses the reply delete confirmation prompt. */
  cancelDeleteReply() {
    this.confirmDeleteReplyId = null;
    this.confirmDeleteReplyReviewId = null;
  }

  /**
   * Deletes a reply and refreshes the review list.
   * @param reviewId Review the reply belongs to.
   * @param replyId Reply ID to delete.
   */
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

  /**
   * Returns true if a review form control is invalid and has been touched.
   * @param control Form control name to check.
   */
  isInvalid(control: string) {
    return (
      this.reviewForm.controls[control].invalid &&
      this.reviewForm.controls[control].touched
    );
  }

  /**
   * Builds the asset URL for a movie poster file.
   * @param filename Poster filename stored in the database.
   */
  posterUrl(filename: string): string {
    return `/assets/images/posters/${encodeURIComponent(filename)}`;
  }

  /**
   * Safely parses a JSON string into an array.
   * @param jsonStr JSON string to parse.
   */
  parseJson(jsonStr: string): any[] {
    try { return JSON.parse(jsonStr); } catch { return []; }
  }

  /**
   * Returns an array of genre name strings from a JSON genre array.
   * @param jsonStr JSON string like `[{"name":"Action"},...]`.
   */
  genreList(jsonStr: string): string[] {
    return this.parseJson(jsonStr).map((i: any) => i.name);
  }

  /**
   * Returns up to 15 keyword name strings from a JSON keyword array.
   * @param jsonStr JSON string like `[{"name":"hero"},...]`.
   */
  keywordList(jsonStr: string): string[] {
    return this.parseJson(jsonStr).map((i: any) => i.name).slice(0, 15);
  }

  /**
   * Converts a numeric rating to a filled/empty star string (e.g. `"★★★☆☆"`).
   * @param n Rating value (0–5).
   */
  starString(n: number): string {
    return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  }

  parseNames(jsonStr: string): string {
    return this.genreList(jsonStr).join(', ');
  }
}
