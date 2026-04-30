/*
 * Angular core, routing, form modules, and project services needed
 * by the movie list page component.
 */
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

  /** Loaded movie records for the current page. */
  movie_list: any[] = [];
  /** Current 1-based page number, persisted in sessionStorage. */
  page = 1;
  /** Total number of pages for the active query. */
  totalPages = 1;
  /** True when the current page is the last available page. */
  isLastPage = false;
  /** True while an HTTP request is in flight. */
  isLoading = false;
  /** Reactive form group holding all active filter values. */
  filterForm: any;

  /** Controls visibility of the admin add-movie panel. */
  showAddForm = false;
  /** Controls visibility of the filters panel. */
  showFilters = false;
  /** Target page number typed into the jump-to-page input. */
  jumpPage: number | null = null;
  /** Reactive form group for the admin add-movie inputs. */
  addMovieForm: any;
  /** True after a movie is successfully added. */
  addSuccess = false;
  /** Error message shown when the add-movie request fails. */
  addError = '';
  /** Poster image file selected for upload. */
  posterFile: File | null = null;
  /** Object URL used to preview the selected poster before upload. */
  posterPreview: string | null = null;

  /**
   * Number of filter fields currently active (non-empty).
   * Used to display a badge on the filters button.
   */
  get activeFilterCount(): number {
    const v = this.filterForm?.value || {};
    return [v.genre, v.year, v.min_rating, v.max_rating, v.sort].filter(x => x !== '' && x != null).length;
  }

  /*
   * Dependency injection — route is used to read the optional genre query
   * parameter when the page is opened from a genre tag link.
   */
  constructor(
    public webService: WebServices,
    public authService: AuthService,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute
  ) {}

  /**
   * Lifecycle — initialises filter and add-movie forms, restores the saved page
   * from sessionStorage, then loads the first batch of movies.
   * Also pre-fetches the watchlist so movie cards show the correct saved state.
   */
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

  /**
   * Fetches the current page using the active filter values.
   * Recalculates totalPages and isLastPage on every response.
   */
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
   * Reads the selected poster file and generates a local preview URL.
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

  /**
   * Builds a FormData payload and submits a new movie.
   * Genres is serialised to a JSON array; reloads the list on success.
   */
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
   * Submits a cross-field search; clears all other filters so they don't conflict.
   * Resets to page 1 before reloading.
   */
  searchByTitle() {
    const title = this.filterForm.get('title')?.value || '';
    this.filterForm.reset({ title, genre: '', year: '', min_rating: '', max_rating: '', sort: '', order: 'desc' });
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  /** Applies the current filter panel values and resets to page 1. */
  applyFilters() {
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  /** Clears all active filters and reloads from page 1. */
  clearFilters() {
    this.filterForm.reset({ title: '', genre: '', year: '', min_rating: '', max_rating: '', sort: '', order: 'desc' });
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  /** Filters the list to the clicked genre tag and resets to page 1. */
  filterByGenre(genre: string, event: Event) {
    event.stopPropagation();
    this.filterForm.patchValue({ genre });
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  /**
   * Pagination controls — page is saved to sessionStorage so returning from
   * a movie detail page lands back on the same page.
   */
  previousPage() {
    if (this.page > 1) {
      this.page--;
      sessionStorage['page'] = this.page;
      this.loadMovies();
    }
  }

  /** Advances to the next page if one exists. */
  nextPage() {
    if (!this.isLastPage) {
      this.page++;
      sessionStorage['page'] = this.page;
      this.loadMovies();
    }
  }

  /** Jumps directly to the page number entered in the input field. */
  goToPage() {
    if (!this.jumpPage || this.jumpPage < 1) return;
    this.page = Math.min(Math.floor(this.jumpPage), this.totalPages);
    this.jumpPage = null;
    sessionStorage['page'] = this.page;
    this.loadMovies();
  }

  /**
   * Toggles the current movie in or out of the user's watchlist.
   * stopPropagation prevents the card click from navigating to the detail page.
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

  /** Builds the asset URL for a poster image filename. */
  posterUrl(filename: string): string {
    return `/assets/images/posters/${encodeURIComponent(filename)}`;
  }

  /** Parses a JSON array of name objects and returns a comma-separated string. */
  parseNames(jsonStr: string): string {
    try {
      return JSON.parse(jsonStr).map((item: any) => item.name).join(', ');
    } catch {
      return jsonStr || '';
    }
  }

  /** Parses a JSON genres string and returns an array of genre name strings. */
  genreList(jsonStr: string): string[] {
    try {
      return JSON.parse(jsonStr).map((i: any) => i.name);
    } catch { return []; }
  }
}
