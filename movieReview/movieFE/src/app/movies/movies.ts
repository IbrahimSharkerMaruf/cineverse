import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { WebServices } from '../services/web-services';
import { AuthService } from '../services/auth-service';

@Component({
  selector: 'app-movies',
  imports: [RouterModule, CommonModule, ReactiveFormsModule],
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
  addMovieForm: any;
  addSuccess = false;
  addError = '';

  constructor(
    public webService: WebServices,
    public authService: AuthService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    if (sessionStorage['page']) {
      this.page = Number(sessionStorage['page']);
    }

    this.filterForm = this.formBuilder.group({
      title:      [''],
      genre:      [''],
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

  parseNames(jsonStr: string): string {
    try {
      const arr = JSON.parse(jsonStr);
      return arr.map((item: any) => item.name).join(', ');
    } catch {
      return jsonStr || '';
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
}
