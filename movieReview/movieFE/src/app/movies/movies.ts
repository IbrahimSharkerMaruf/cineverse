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

  /*
   * Pagination and movie list state.
   * page is 1-based and persisted in sessionStorage so it survives navigation.
   */
  movie_list: any[] = [];
  page = 1;
  totalPages = 1;
  isLastPage = false;
  isLoading = false;
  filterForm: any;

  /*
   * Admin "Add Movie" panel state.
   * posterFile / posterPreview handle the optional poster upload and its local preview.
   */
  showAddForm = false;
  showFilters = false;
  jumpPage: number | null = null;
  addMovieForm: any;
  addSuccess = false;
  addError = '';
  posterFile: File | null = null;
  posterPreview: string | null = null;

  /*
   * Counts how many filter fields are currently active (non-empty).
   * Used to display a badge on the filters button.
   */
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

  /*
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

  /*
   * Data loading — fetches the current page using the active filter values.
   * totalPages and isLastPage are recalculated on every response.
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

  /*
   * Admin — add movie form.
   * onPosterChange reads the selected file and generates a local preview URL.
   * submitAddMovie builds a FormData payload (genres is serialised to JSON array)
   * and reloads the list on success.
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

  /*
   * Filter actions — each resets to page 1 before reloading.
   * searchByTitle clears all filters except title so they don't conflict.
   * filterByGenre is triggered by clicking a genre tag on a movie card.
   */
  searchByTitle() {
    const title = this.filterForm.get('title')?.value || '';
    this.filterForm.reset({ title, genre: '', year: '', min_rating: '', max_rating: '', sort: '', order: 'desc' });
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  applyFilters() {
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  clearFilters() {
    this.filterForm.reset({ title: '', genre: '', year: '', min_rating: '', max_rating: '', sort: '', order: 'desc' });
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  filterByGenre(genre: string, event: Event) {
    event.stopPropagation();
    this.filterForm.patchValue({ genre });
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

  /*
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

  nextPage() {
    if (!this.isLastPage) {
      this.page++;
      sessionStorage['page'] = this.page;
      this.loadMovies();
    }
  }

  goToPage() {
    if (!this.jumpPage || this.jumpPage < 1) return;
    this.page = Math.min(Math.floor(this.jumpPage), this.totalPages);
    this.jumpPage = null;
    sessionStorage['page'] = this.page;
    this.loadMovies();
  }

  /*
   * Watchlist toggle — event.stopPropagation prevents the card click
   * from navigating to the movie detail page at the same time.
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

  /*
   * Template helpers — used directly in movies.html for display formatting.
   */
  posterUrl(filename: string): string {
    return `/assets/images/posters/${encodeURIComponent(filename)}`;
  }

  parseNames(jsonStr: string): string {
    try {
      return JSON.parse(jsonStr).map((item: any) => item.name).join(', ');
    } catch {
      return jsonStr || '';
    }
  }

  genreList(jsonStr: string): string[] {
    try {
      return JSON.parse(jsonStr).map((i: any) => i.name);
    } catch { return []; }
  }
}
