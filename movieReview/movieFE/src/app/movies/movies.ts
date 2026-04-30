import { Component } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { WebServices } from '../services/web-services';
import { AuthService } from '../services/auth-service';

/**
 * Movie list page component.
 * Displays a paginated, searchable, filterable grid of movies.
 * Admins see an "Add Movie" form; authenticated users can toggle watchlist entries.
 */
@Component({
  selector: 'app-movies',
  imports: [RouterModule, CommonModule, ReactiveFormsModule, FormsModule],
  providers: [WebServices],
  templateUrl: './movies.html',
  styleUrl: './movies.css',
})
export class Movies {
  /** Currently loaded page of movies. */
  movie_list: any[] = [];
  /** Current page number (1-based). */
  page = 1;
  /** Total number of pages based on backend total count. */
  totalPages = 1;
  /** True when the current page is the last available page. */
  isLastPage = false;
  /** True while an API request is in flight. */
  isLoading = false;
  /** Reactive form for search and filter controls. */
  filterForm: any;

  /** Controls visibility of the admin Add Movie form. */
  showAddForm = false;
  /** Controls visibility of the advanced filters panel. */
  showFilters = false;
  /** Value typed into the page-jump input. */
  jumpPage: number | null = null;
  /** Reactive form for the Add Movie fields. */
  addMovieForm: any;
  /** True after a movie is successfully added. */
  addSuccess = false;
  /** Error message from a failed add-movie request. */
  addError = '';
  /** Poster image file chosen by the admin. */
  posterFile: File | null = null;
  /** Data URL preview of the chosen poster file. */
  posterPreview: string | null = null;

  /** Number of active (non-empty) filter values, shown as a badge. */
  get activeFilterCount(): number {
    const v = this.filterForm?.value || {};
    return [v.genre, v.year, v.min_rating, v.max_rating, v.sort].filter(x => x !== '' && x != null).length;
  }

  constructor(
    public webService: WebServices,
    public authService: AuthService,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute
  ) {}

  /** Initialises forms, reads page from sessionStorage, and loads the first page of movies. */
  ngOnInit() {
    if (this.authService.isLoggedIn() && !this.authService.watchlistLoaded) {
      this.webService.getWatchlistIds().subscribe(ids => {
        this.authService.setWatchlist(ids);
      });
    }

    const genreParam = this.route.snapshot.queryParamMap.get('genre') || '';

    if (sessionStorage['page']) {
      this.page = Number(sessionStorage['page']);
    }

    this.filterForm = this.formBuilder.group({
      title:      [''],
      genre:      [genreParam],
      year:       [''],
      min_rating: [''],
      max_rating: [''],
      sort:       [''],
      order:      ['desc'],
    });

    this.addMovieForm = this.formBuilder.group({
      title:        ['', Validators.required],
      release_date: ['', Validators.required],
      overview:     [''],
      runtime:      [''],
      budget:       [''],
      revenue:      [''],
      vote_average: [''],
      vote_count:   [''],
      popularity:   [''],
      genres:       [''],
      keywords:     [''],
    });

    this.loadMovies();
  }

  /** Fetches the current page of movies from the backend using active filter values. */
  loadMovies() {
    this.isLoading = true;
    this.webService.getMovies(this.page, this.filterForm?.value || {}).subscribe({
      next: (response) => {
        this.movie_list = response.movies;
        this.totalPages = Math.max(1, Math.ceil(response.total / this.webService.pageSize));
        this.isLastPage = this.page >= this.totalPages;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  /**
   * Handles poster file selection and generates a local preview URL.
   * @param event File input change event.
   */
  onPosterChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.posterFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { this.posterPreview = reader.result as string; };
      reader.readAsDataURL(file);
    } else {
      this.posterPreview = null;
    }
  }

  /** Submits the Add Movie form to the backend. Reloads the movie list on success. */
  submitAddMovie() {
    this.addSuccess = false;
    this.addError = '';
    const formData = new FormData();
    Object.entries(this.addMovieForm.value).forEach(([key, val]) => {
      if (key === 'genres') return;
      if (val !== '' && val !== null && val !== undefined) {
        formData.append(key, val as string);
      }
    });
    const selectedGenre: string = this.addMovieForm.value.genres || '';
    if (selectedGenre) {
      formData.append('genres', JSON.stringify([{ name: selectedGenre }]));
    }
    if (this.posterFile) {
      formData.append('poster', this.posterFile);
    }
    this.webService.addMovie(formData).subscribe({
      next: () => {
        this.addSuccess = true;
        this.addMovieForm.reset();
        this.posterFile = null;
        this.posterPreview = null;
        this.loadMovies();
      },
      error: (err) => {
        this.addError = err?.error?.error || 'Failed to add movie. Make sure you are logged in as admin.';
      },
    });
  }

  /**
   * Builds the asset URL for a movie poster file.
   * @param filename Poster filename stored in the database.
   */
  posterUrl(filename: string): string {
    return `/assets/images/posters/${encodeURIComponent(filename)}`;
  }

  /**
   * Parses a JSON array string and returns a comma-separated list of `name` values.
   * @param jsonStr JSON string like `[{"name":"Action"},...]`.
   */
  parseNames(jsonStr: string): string {
    try {
      return JSON.parse(jsonStr).map((item: any) => item.name).join(', ');
    } catch {
      return jsonStr || '';
    }
  }

  /**
   * Parses a JSON genre array and returns an array of genre name strings.
   * @param jsonStr JSON string like `[{"name":"Action"},...]`.
   */
  genreList(jsonStr: string): string[] {
    try {
      return JSON.parse(jsonStr).map((i: any) => i.name);
    } catch { return []; }
  }

  /**
   * Sets the genre filter to the clicked genre tag and reloads page 1.
   * @param genre Genre name to filter by.
   * @param event Click event (propagation stopped to avoid card navigation).
   */
  filterByGenre(genre: string, event: Event) {
    event.stopPropagation();
    this.filterForm.patchValue({ genre });
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  /**
   * Adds or removes a movie from the user's watchlist and updates the local cache.
   * @param movieId Movie ID to toggle.
   * @param event Click event (propagation stopped to avoid card navigation).
   */
  toggleWatchlist(movieId: string, event: Event) {
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) return;
    if (this.authService.isInWatchlist(movieId)) {
      this.webService.removeFromWatchlist(movieId).subscribe(() => {
        this.authService.removeFromWatchlistLocal(movieId);
      });
    } else {
      this.webService.addToWatchlist(movieId).subscribe(() => {
        this.authService.addToWatchlistLocal(movieId);
      });
    }
  }

  /** Resets all filters except title and reloads from page 1. */
  searchByTitle() {
    const title = this.filterForm.get('title')?.value || '';
    this.filterForm.reset({ title, genre: '', year: '', min_rating: '', max_rating: '', sort: '', order: 'desc' });
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  /** Applies the current filter panel values and reloads from page 1. */
  applyFilters() {
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  /** Resets all filter fields and reloads from page 1. */
  clearFilters() {
    this.filterForm.reset({ title: '', genre: '', year: '', min_rating: '', max_rating: '', sort: '', order: 'desc' });
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  /** Navigates to the previous page if not already on page 1. */
  previousPage() {
    if (this.page > 1) {
      this.page--;
      sessionStorage['page'] = this.page;
      this.loadMovies();
    }
  }

  /** Navigates to the next page if not already on the last page. */
  nextPage() {
    if (!this.isLastPage) {
      this.page++;
      sessionStorage['page'] = this.page;
      this.loadMovies();
    }
  }

  /** Jumps directly to the page number entered in the page-jump input. */
  goToPage() {
    if (!this.jumpPage || this.jumpPage < 1) return;
    this.page = Math.min(Math.floor(this.jumpPage), this.totalPages);
    this.jumpPage = null;
    sessionStorage['page'] = this.page;
    this.loadMovies();
  }
}
