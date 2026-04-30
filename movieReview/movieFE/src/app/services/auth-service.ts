import { Injectable } from '@angular/core';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _profile: any = null;

  watchlistIds: string[] = [];
  watchlistLoaded = false;

  constructor(private auth0: Auth0Service) {}

  isLoggedIn(): boolean {
    return this._profile !== null;
  }

  isAdmin(): boolean {
    return this._profile?.admin === true;
  }

  isModerator(): boolean {
    return this._profile?.moderator === true && !this.isAdmin();
  }

  getUsername(): string | null {
    return this._profile?.username ?? null;
  }

  getAvatar(): string {
    return `/assets/images/avatar/${this._profile?.avatar || 'profile.png'}`;
  }

  setProfile(profile: any): void {
    this._profile = profile;
    this.watchlistIds = profile?.watchlist || [];
    this.watchlistLoaded = true;
  }

  clearSession(): void {
    this._profile = null;
    this.watchlistIds = [];
    this.watchlistLoaded = false;
    this.auth0.logout({ logoutParams: { returnTo: window.location.origin } });
  }

  setWatchlist(ids: string[]): void {
    this.watchlistIds = ids;
    this.watchlistLoaded = true;
  }

  isInWatchlist(movieId: string): boolean {
    return this.watchlistIds.includes(movieId);
  }

  addToWatchlistLocal(movieId: string): void {
    if (!this.isInWatchlist(movieId)) {
      this.watchlistIds = [...this.watchlistIds, movieId];
    }
  }

  removeFromWatchlistLocal(movieId: string): void {
    this.watchlistIds = this.watchlistIds.filter(id => id !== movieId);
  }
}
