import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WebServices } from '../services/web-services';
import { AuthService } from '../services/auth-service';

@Component({
  selector: 'app-watchlist',
  imports: [RouterModule, CommonModule],
  providers: [WebServices],
  templateUrl: './watchlist.html',
})
export class Watchlist {
  movies: any[] = [];
  isLoading = false;

  constructor(
    public authService: AuthService,
    private webService: WebServices,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.isLoading = true;
    this.webService.getWatchlistMovies().subscribe({
      next: (r) => { this.movies = r; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  remove(movieId: string, event: Event) {
    event.stopPropagation();
    this.webService.removeFromWatchlist(movieId).subscribe(() => {
      this.authService.removeFromWatchlistLocal(movieId);
      this.movies = this.movies.filter(m => m._id !== movieId);
    });
  }

  posterUrl(filename: string): string {
    return `/assets/images/posters/${encodeURIComponent(filename)}`;
  }

  parseNames(jsonStr: string): string {
    try {
      return JSON.parse(jsonStr).map((i: any) => i.name).join(', ');
    } catch { return jsonStr || ''; }
  }
}
