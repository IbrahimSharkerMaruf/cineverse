import { Component } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { WebServices } from '../services/web-services';
import { AuthService } from '../services/auth-service';

@Component({
  selector: 'app-movies',
  imports: [RouterModule, CommonModule, ReactiveFormsModule, FormsModule],
  providers: [WebServices],
  templateUrl: './movies.html',
  styleUrl: './movies.css',
})
export class Movies {
  movie_list: any[] = [];
  page = 1;
  isLastPage = false;
  isLoading = false;
  filterForm: any;

  showAddForm = false;
  showFilters = false;
  jumpPage: number | null = null;
  addMovieForm: any;
  addSuccess = false;
  addError = '';

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

  loadMovies() {
    this.isLoading = true;
    this.webService.getMovies(this.page, this.filterForm?.value || {}).subscribe({
      next: (response: any[]) => {
        this.movie_list = response;
        this.isLastPage = response.length < this.webService.pageSize;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  submitAddMovie() {
    this.addSuccess = false;
    this.addError = '';
    const formData = new FormData();
    Object.entries(this.addMovieForm.value).forEach(([key, val]) => {
      if (val !== '' && val !== null && val !== undefined) {
        formData.append(key, val as string);
      }
    });
    this.webService.addMovie(formData).subscribe({
      next: () => {
        this.addSuccess = true;
        this.addMovieForm.reset();
        this.loadMovies();
      },
      error: (err) => {
        this.addError = err?.error?.error || 'Failed to add movie. Make sure you are logged in as admin.';
      },
    });
  }

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

  filterByGenre(genre: string, event: Event) {
    event.stopPropagation();
    this.filterForm.patchValue({ genre });
    this.page = 1;
    sessionStorage['page'] = 1;
    this.loadMovies();
  }

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
    this.page = Math.floor(this.jumpPage);
    this.jumpPage = null;
    sessionStorage['page'] = this.page;
    this.loadMovies();
  }
}
