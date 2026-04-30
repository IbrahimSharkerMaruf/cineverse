import { Injectable } from '@angular/core';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';

/**
 * Application-level session service.
 * Holds the user's profile, role flags, and watchlist IDs in memory after login.
 * Acts as the single source of truth for client-side auth state.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _profile: any = null;

  /** IDs of movies in the current user's watchlist. */
  watchlistIds: string[] = [];

  /** True once watchlist IDs have been fetched from the backend. */
  watchlistLoaded = false;

  constructor(private auth0: Auth0Service) {}

  /** Returns true if a user profile is loaded (i.e. user is logged in). */
  isLoggedIn(): boolean {
    return this._profile !== null;
  }

  /** Returns true if the current user has the admin role. */
  isAdmin(): boolean {
    return this._profile?.admin === true;
  }

  /** Returns true if the current user is a moderator (but not admin). */
  isModerator(): boolean {
    return this._profile?.moderator === true && !this.isAdmin();
  }

  /** Returns the current user's username, or null if not logged in. */
  getUsername(): string | null {
    return this._profile?.username ?? null;
  }

  /** Returns the URL path to the current user's avatar image. */
  getAvatar(): string {
    return `/assets/images/avatar/${this._profile?.avatar || 'profile.png'}`;
  }

  /**
   * Stores the backend profile and seeds the watchlist cache.
   * Called after a successful `/profile` API response.
   * @param profile Raw profile object from the backend.
   */
  setProfile(profile: any): void {
    this._profile = profile;
    this.watchlistIds = profile?.watchlist || [];
    this.watchlistLoaded = true;
  }

  /** Clears session state and triggers Auth0 logout with a redirect to the app root. */
  clearSession(): void {
    this._profile = null;
    this.watchlistIds = [];
    this.watchlistLoaded = false;
    this.auth0.logout({ logoutParams: { returnTo: window.location.origin } });
  }

  /**
   * Updates the avatar in the in-memory profile without a full reload.
   * @param avatar New avatar filename.
   */
  updateAvatar(avatar: string): void {
    if (this._profile) this._profile.avatar = avatar;
  }

  /**
   * Replaces the cached watchlist IDs with a fresh list from the backend.
   * @param ids Array of movie ID strings.
   */
  setWatchlist(ids: string[]): void {
    this.watchlistIds = ids;
    this.watchlistLoaded = true;
  }

  /**
   * Returns true if the given movie ID is in the user's watchlist.
   * @param movieId Movie ID to check.
   */
  isInWatchlist(movieId: string): boolean {
    return this.watchlistIds.includes(movieId);
  }

  /**
   * Optimistically adds a movie ID to the local watchlist cache.
   * @param movieId Movie ID to add.
   */
  addToWatchlistLocal(movieId: string): void {
    if (!this.isInWatchlist(movieId)) {
      this.watchlistIds = [...this.watchlistIds, movieId];
    }
  }

  /**
   * Optimistically removes a movie ID from the local watchlist cache.
   * @param movieId Movie ID to remove.
   */
  removeFromWatchlistLocal(movieId: string): void {
    this.watchlistIds = this.watchlistIds.filter(id => id !== movieId);
  }
}
