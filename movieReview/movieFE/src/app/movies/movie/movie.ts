import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WebServices } from '../../services/web-services';
import { AuthService } from '../../services/auth-service';

/**
 * Movie detail page component.
 * Shows full movie info, community reviews, reply threads,
 * watchlist toggle, and admin controls for editing or deleting the movie.
 */
@Component({
  selector: 'app-movie',
  imports: [RouterLink, CommonModule, ReactiveFormsModule],
  providers: [WebServices],
  templateUrl: './movie.html',
  styleUrl: './movie.css',
})
export class Movie {

  /*
   * Core movie data and review submission form state.
   * hoveredStar tracks which star the user is hovering in the rating picker.
   */
  movie: any = null;
  reviews_list: any[] = [];
  reviewForm: any;
  submitError = '';
  submitSuccess = false;
  hoveredStar = 0;

  /*
   * Watchlist state for the currently loaded movie.
   * Populated on init either from the cached watchlist or a fresh API call.
   */
  isInWatchlist = false;

  /*
   * Inline review editing state.
   * editingReviewId is the _id of the review currently open in the edit form.
   * confirmDeleteReviewId is the _id waiting for the user to confirm deletion.
   */
  editingReviewId: string | null = null;
  editForm: any;
  editError = '';
  deleteReviewError = '';
  confirmDeleteReviewId: string | null = null;

  /*
   * Reply compose and delete state.
   * replyingToReviewId is the review whose reply box is currently open.
   * confirmDeleteReplyId + confirmDeleteReplyReviewId track the pending reply deletion.
   */
  replyingToReviewId: string | null = null;
  replyText = '';
  replyError = '';
  confirmDeleteReplyId: string | null = null;
  confirmDeleteReplyReviewId: string | null = null;

  /*
   * Admin-only movie management state.
   * Covers both the delete confirmation flow and the inline edit panel.
   */
  confirmDeleteMovie = false;
  deleteMovieError = '';
  editingMovie = false;
  editMovieForm: any;
  editMovieError = '';
  editMovieSuccess = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private webService: WebServices,
    public authService: AuthService,
    private formBuilder: FormBuilder
  ) {}

  /*
   * Lifecycle — load movie, reviews, and watchlist status on component init.
   * Watchlist is read from the local cache when available to avoid an extra request.
   */
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

  /*
   * Computed ratings shown in the comparison bar.
   * communityRating averages all user star scores (0–5 scale).
   * officialRating5 converts the TMDb vote_average from 0–10 to 0–5.
   */
  get communityRating(): number | null {
    if (!this.reviews_list.length) return null;
    const avg = this.reviews_list.reduce((s: number, r: any) => s + r.star, 0) / this.reviews_list.length;
    return Math.round(avg * 10) / 10;
  }

  get officialRating5(): number {
    return this.movie ? Math.round((this.movie.vote_average / 2) * 10) / 10 : 0;
  }

  /*
   * Watchlist toggle — adds or removes this movie from the user's watchlist
   * and updates the local AuthService cache optimistically without a page reload.
   */
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

  /*
   * Inline review editing — startEdit opens the form pre-filled with the
   * existing review text and star rating; submitEdit saves and refreshes the list.
   */
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

  /*
   * Review submission — posts a new review for the current movie.
   * Resets the form on success and reloads the review list.
   */
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

  /*
   * Review deletion — confirmDelete shows the inline confirmation prompt;
   * deleteReview performs the actual delete and refreshes the list.
   */
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

  /*
   * Reply system — startReply opens the compose box for a given review;
   * submitReply posts the reply and reloads; confirmDeleteReply / deleteReply
   * handle the two-step delete confirmation for replies.
   */
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

  /*
   * Admin — movie edit panel.
   * startEditMovie builds a reactive form pre-filled with the current movie values.
   * submitEditMovie sends only non-null fields to the PUT endpoint and updates
   * the local movie object on success so the page reflects changes immediately.
   */
  startEditMovie() {
    this.editingMovie = true;
    this.editMovieError = '';
    this.editMovieSuccess = false;
    this.editMovieForm = this.formBuilder.group({
      title:        [this.movie.title],
      release_date: [this.movie.release_date],
      overview:     [this.movie.overview],
      genres:       [this.movie.genres],
      keywords:     [this.movie.keywords],
      runtime:      [this.movie.runtime],
      vote_average: [this.movie.vote_average],
      vote_count:   [this.movie.vote_count],
      budget:       [this.movie.budget],
      revenue:      [this.movie.revenue],
      popularity:   [this.movie.popularity],
    });
  }

  cancelEditMovie() {
    this.editingMovie = false;
    this.editMovieError = '';
    this.editMovieSuccess = false;
  }

  submitEditMovie() {
    const id = this.route.snapshot.paramMap.get('id')!;
    const fd = new FormData();
    const v = this.editMovieForm.value;
    if (v.title        != null) fd.append('title',        v.title);
    if (v.release_date != null) fd.append('release_date', v.release_date);
    if (v.overview     != null) fd.append('overview',     v.overview);
    if (v.genres       != null) fd.append('genres',       v.genres);
    if (v.keywords     != null) fd.append('keywords',     v.keywords);
    if (v.runtime      != null) fd.append('runtime',      String(v.runtime));
    if (v.vote_average != null) fd.append('vote_average', String(v.vote_average));
    if (v.vote_count   != null) fd.append('vote_count',   String(v.vote_count));
    if (v.budget       != null) fd.append('budget',       String(v.budget));
    if (v.revenue      != null) fd.append('revenue',      String(v.revenue));
    if (v.popularity   != null) fd.append('popularity',   String(v.popularity));
    this.webService.updateMovie(id, fd).subscribe({
      next: () => {
        Object.assign(this.movie, v);
        this.editingMovie = false;
        this.editMovieSuccess = true;
        setTimeout(() => this.editMovieSuccess = false, 3000);
      },
      error: (err) => { this.editMovieError = err?.error?.error || 'Failed to update movie.'; }
    });
  }

  /*
   * Admin — movie deletion.
   * Navigates back to /movies on success so the deleted movie is no longer accessible.
   */
  deleteMovie() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.webService.deleteMovie(id).subscribe({
      next: () => this.router.navigate(['/movies']),
      error: () => { this.deleteMovieError = 'Failed to delete movie.'; },
    });
  }

  /*
   * Template helpers — used directly in movie.html for display formatting.
   * posterUrl builds the asset path; genreList / keywordList parse the JSON
   * arrays stored in the database; starString converts a number to a star glyph string.
   */
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
