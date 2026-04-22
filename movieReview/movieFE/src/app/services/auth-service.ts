import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

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

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  getUsername(): string | null {
    return sessionStorage.getItem('username');
  }

  setSession(token: string, username: string): void {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('username', username);
  }

  clearSession(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
  }
}
