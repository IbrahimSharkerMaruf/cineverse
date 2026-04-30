/*
 * Angular core, routing, form, and project service imports needed
 * by the movie detail page component.
 */
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

  /** The loaded movie document returned from the API. */
  movie: any = null;
  /** List of reviews for the current movie. */
  reviews_list: any[] = [];
  /** Reactive form group for submitting a new review. */
  reviewForm: any;
  /** Error message shown when review submission fails. */
  submitError = '';
  /** True after a review is successfully submitted. */
  submitSuccess = false;
  /** Tracks which star index the user is hovering over in the rating picker. */
  hoveredStar = 0;

  /** True when the current movie is in the logged-in user's watchlist. */
  isInWatchlist = false;

  /** The _id of the review currently open in the inline edit form, or null. */
  editingReviewId: string | null = null;
  /** Reactive form group for the inline review edit inputs. */
  editForm: any;
  /** Error message shown when a review edit fails. */
  editError = '';
  /** Error message shown when a review delete fails. */
  deleteReviewError = '';
  /** The _id of the review awaiting delete confirmation, or null. */
  confirmDeleteReviewId: string | null = null;

  /** The _id of the review whose reply compose box is open, or null. */
  replyingToReviewId: string | null = null;
  /** Text currently typed into the reply compose box. */
  replyText = '';
  /** Error message shown when posting a reply fails. */
  replyError = '';
  /** The _id of the reply awaiting delete confirmation, or null. */
  confirmDeleteReplyId: string | null = null;
  /** The _id of the parent review for the reply pending deletion. */
  confirmDeleteReplyReviewId: string | null = null;

  /** True when the admin movie delete confirmation prompt is visible. */
  confirmDeleteMovie = false;
  /** Error message shown when the movie delete request fails. */
  deleteMovieError = '';
  /** True when the admin inline movie edit panel is open. */
  editingMovie = false;
  /** Reactive form group for the admin movie edit inputs. */
  editMovieForm: any;
  /** Error message shown when the movie update request fails. */
  editMovieError = '';
  /** True briefly after a successful movie update to show a success banner. */
  editMovieSuccess = false;
  /** Poster file selected by admin for upload, or null if unchanged. */
  posterFile: File | null = null;

  /*
   * Dependency injection — route gives the movie ID from the URL,
   * router is used to redirect after a movie deletion.
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private webService: WebServices,
    public authService: AuthService,
    private formBuilder: FormBuilder
  ) {}

  /**
   * Lifecycle — loads the movie, reviews, and watchlist status on init.
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

  /**
   * Fetches all reviews for the current movie.
   * Called on init and after any create, edit, or delete action.
   */
  loadReviews() {
    const id = this.route.snapshot.paramMap.get('id');
    this.webService.getReviews(id).subscribe((response) => {
      this.reviews_list = response;
    });
  }

  /**
   * Average of all user star scores on a 0–5 scale.
   * Returns null when there are no reviews yet.
   */
  get communityRating(): number | null {
    if (!this.reviews_list.length) return null;
    const avg = this.reviews_list.reduce((s: number, r: any) => s + r.star, 0) / this.reviews_list.length;
    return Math.round(avg * 10) / 10;
  }

  /** TMDb vote_average converted from the 0–10 scale to 0–5. */
  get officialRating5(): number {
    return this.movie ? Math.round((this.movie.vote_average / 2) * 10) / 10 : 0;
  }

  /**
   * Adds or removes this movie from the user's watchlist and updates
   * the local AuthService cache optimistically without a page reload.
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

  /**
   * Opens the inline edit form pre-filled with the existing review text and star rating.
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

  /** Submits the edited review and reloads the review list on success. */
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

  /**
   * Posts a new review for the current movie.
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

  /** Shows the inline delete confirmation prompt for the given review. */
  confirmDelete(reviewId: string) {
    this.confirmDeleteReviewId = reviewId;
  }

  /** Dismisses the review delete confirmation without deleting. */
  cancelDelete() {
    this.confirmDeleteReviewId = null;
  }

  /** Deletes the review and reloads the list; shows an error banner on failure. */
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

  /**
   * Reply system — startReply opens the compose box for a given review;
   * submitReply posts the reply and reloads; confirmDeleteReply / deleteReply
   * handle the two-step delete confirmation for replies.
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

  /** Posts the composed reply text to the given review and reloads. */
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

  /** Shows the inline delete confirmation prompt for the given reply. */
  confirmDeleteReply(reviewId: string, replyId: string) {
    this.confirmDeleteReplyReviewId = reviewId;
    this.confirmDeleteReplyId = replyId;
  }

  /** Dismisses the reply delete confirmation without deleting. */
  cancelDeleteReply() {
    this.confirmDeleteReplyId = null;
    this.confirmDeleteReplyReviewId = null;
  }

  /** Deletes the reply and reloads the review list. */
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
   * Opens the admin edit panel pre-filled with the current movie field values.
   * submitEditMovie sends only non-null fields and updates the local object on success.
   */
  startEditMovie() {
    this.editingMovie = true;
    this.editMovieError = '';
    this.editMovieSuccess = false;

    let genreValue = '';
    try {
      const parsed = JSON.parse(this.movie.genres);
      genreValue = parsed[0]?.name || '';
    } catch { genreValue = this.movie.genres || ''; }

    let keywordsValue = '';
    try {
      const parsed = JSON.parse(this.movie.keywords);
      keywordsValue = parsed.map((k: any) => k.name).join(', ');
    } catch { keywordsValue = this.movie.keywords || ''; }

    this.editMovieForm = this.formBuilder.group({
      title:        [this.movie.title],
      release_date: [this.movie.release_date],
      overview:     [this.movie.overview],
      genres:       [genreValue],
      keywords:     [keywordsValue],
      runtime:      [this.movie.runtime],
      vote_average: [this.movie.vote_average],
      vote_count:   [this.movie.vote_count],
      budget:       [this.movie.budget],
      revenue:      [this.movie.revenue],
      popularity:   [this.movie.popularity],
    });
  }

  /** Stores the poster file chosen by the admin in the edit form. */
  onPosterSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.posterFile = input.files[0];
    }
  }

  /** Closes the admin edit panel without saving. */
  cancelEditMovie() {
    this.editingMovie = false;
    this.editMovieError = '';
    this.editMovieSuccess = false;
    this.posterFile = null;
  }

  /** Sends the edited movie fields to the PUT endpoint and reflects changes locally on success. */
  submitEditMovie() {
    const id = this.route.snapshot.paramMap.get('id')!;
    const fd = new FormData();
    const v = this.editMovieForm.value;
    if (v.title        != null) fd.append('title',        v.title);
    if (v.release_date != null) fd.append('release_date', v.release_date);
    if (v.overview     != null) fd.append('overview',     v.overview);
    if (v.genres) fd.append('genres', JSON.stringify([{ name: v.genres }]));
    if (v.keywords) {
      const kwArray = v.keywords.split(',')
        .map((k: string) => k.trim()).filter((k: string) => k)
        .map((k: string) => ({ name: k }));
      fd.append('keywords', JSON.stringify(kwArray));
    }
    if (v.runtime      != null) fd.append('runtime',      String(v.runtime));
    if (v.vote_average != null) fd.append('vote_average', String(v.vote_average));
    if (v.vote_count   != null) fd.append('vote_count',   String(v.vote_count));
    if (v.budget       != null) fd.append('budget',       String(v.budget));
    if (v.revenue      != null) fd.append('revenue',      String(v.revenue));
    if (v.popularity   != null) fd.append('popularity',   String(v.popularity));
    if (this.posterFile)        fd.append('poster',       this.posterFile, this.posterFile.name);
    this.webService.updateMovie(id, fd).subscribe({
      next: (res: any) => {
        const simple = ['title', 'release_date', 'overview', 'runtime', 'vote_average', 'vote_count', 'budget', 'revenue', 'popularity'];
        simple.forEach(f => { if (v[f] != null) this.movie[f] = v[f]; });
        if (v.genres) this.movie.genres = JSON.stringify([{ name: v.genres }]);
        if (v.keywords) {
          const kwArray = v.keywords.split(',')
            .map((k: string) => k.trim()).filter((k: string) => k)
            .map((k: string) => ({ name: k }));
          this.movie.keywords = JSON.stringify(kwArray);
        }
        if (res?.poster) this.movie.poster = res.poster;
        this.editingMovie = false;
        this.posterFile = null;
        this.editMovieSuccess = true;
        setTimeout(() => this.editMovieSuccess = false, 3000);
      },
      error: (err) => { this.editMovieError = err?.error?.error || 'Failed to update movie.'; }
    });
  }

  /**
   * Deletes the current movie and navigates back to /movies on success.
   */
  deleteMovie() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.webService.deleteMovie(id).subscribe({
      next: () => this.router.navigate(['/movies']),
      error: () => { this.deleteMovieError = 'Failed to delete movie.'; },
    });
  }

  /** Returns true when the given form control is invalid and has been touched. */
  isInvalid(control: string) {
    return (
      this.reviewForm.controls[control].invalid &&
      this.reviewForm.controls[control].touched
    );
  }

  /** Builds the asset URL for a poster image filename. */
  posterUrl(filename: string): string {
    return `/assets/images/posters/${encodeURIComponent(filename)}`;
  }

  /** Parses a JSON array string into a plain array; returns empty array on failure. */
  parseJson(jsonStr: string): any[] {
    try { return JSON.parse(jsonStr); } catch { return []; }
  }

  /** Returns an array of genre name strings parsed from the stored JSON. */
  genreList(jsonStr: string): string[] {
    return this.parseJson(jsonStr).map((i: any) => i.name);
  }

  /** Returns up to 15 keyword name strings parsed from the stored JSON. */
  keywordList(jsonStr: string): string[] {
    return this.parseJson(jsonStr).map((i: any) => i.name).slice(0, 15);
  }

  /** Converts a numeric star count to a filled/empty star glyph string. */
  starString(n: number): string {
    return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  }

  /** Returns genre names as a comma-separated string. */
  parseNames(jsonStr: string): string {
    return this.genreList(jsonStr).join(', ');
  }
}
