import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WebServices } from '../services/web-services';
import { AuthService } from '../services/auth-service';

/**
 * Watchlist page component.
 * Displays all movies saved to the current user's watchlist and allows removal.
 */
@Component({
  selector: 'app-watchlist',
  imports: [RouterModule, CommonModule],
  providers: [WebServices],
  templateUrl: './watchlist.html',
})
export class Watchlist {
  /** Full movie objects in the user's watchlist. */
  movies: any[] = [];
  /** True while the watchlist is being fetched from the backend. */
  isLoading = false;

  constructor(
    public authService: AuthService,
    private webService: WebServices,
  ) {}

  /** Loads the user's watchlist movies on component init. */
  ngOnInit() {
    this.load();
  }

  /** Fetches the full watchlist movie objects from the backend. */
  load() {
    this.isLoading = true;
    this.webService.getWatchlistMovies().subscribe({
      next: (r) => { this.movies = r; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  /**
   * Removes a movie from the watchlist and updates the local cache.
   * @param movieId Movie ID to remove.
   * @param event Click event (propagation stopped to avoid card navigation).
   */
  remove(movieId: string, event: Event) {
    event.stopPropagation();
    this.webService.removeFromWatchlist(movieId).subscribe(() => {
      this.authService.removeFromWatchlistLocal(movieId);
      this.movies = this.movies.filter(m => m._id !== movieId);
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
      return JSON.parse(jsonStr).map((i: any) => i.name).join(', ');
    } catch { return jsonStr || ''; }
  }
}
