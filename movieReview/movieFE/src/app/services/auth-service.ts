import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  watchlistIds: string[] = [];
  watchlistLoaded = false;

  isLoggedIn(): boolean {
    return !!sessionStorage.getItem('token');
  }

  isAdmin(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.admin === true;
    } catch {
      return false;
    }
  }

  isModerator(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.moderator === true && payload?.admin !== true;
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  getUsername(): string | null {
    return sessionStorage.getItem('username');
  }

  getAvatar(): string {
    return sessionStorage.getItem('avatar') || '/assets/images/avatar/profile.png';
  }

  setSession(token: string, username: string, avatar: string = 'profile.png'): void {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('avatar', `/assets/images/avatar/${avatar}`);
  }

  clearSession(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('avatar');
    this.watchlistIds = [];
    this.watchlistLoaded = false;
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
