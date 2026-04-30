import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { switchMap, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebServices {

  baseUrl = 'http://127.0.0.1:5001';
  pageSize: number = 8;

  constructor(private http: HttpClient, private auth0: Auth0Service) { }

  private withAuth<T>(call: (headers: HttpHeaders) => import('rxjs').Observable<T>) {
    return this.auth0.idTokenClaims$.pipe(
      take(1),
      switchMap(claims => {
        const token = claims?.__raw ?? '';
        return call(new HttpHeaders({ Authorization: `Bearer ${token}` }));
      })
    );
  }

  // ── Auth0 sync ──────────────────────────────────────────────────────────────
  syncAuth() {
    return this.withAuth(headers => this.http.post<any>(`${this.baseUrl}/auth/sync`, {}, { headers }));
  }

  // ── Public endpoints (no auth needed) ──────────────────────────────────────
  getMovies(page: number, filters: any = {}) {
    let url = `${this.baseUrl}/movies?pn=${page}&ps=${this.pageSize}`;
    if (filters.title)      url += `&title=${encodeURIComponent(filters.title)}`;
    if (filters.genre)      url += `&genre=${encodeURIComponent(filters.genre)}`;
    if (filters.year)       url += `&year=${filters.year}`;
    if (filters.min_rating) url += `&min_rating=${filters.min_rating}`;
    if (filters.max_rating) url += `&max_rating=${filters.max_rating}`;
    if (filters.sort)       url += `&sort=${filters.sort}&order=${filters.order || 'desc'}`;
    return this.http.get<{ movies: any[]; total: number }>(url);
  }

  getMovie(id: any) {
    return this.http.get<any>(`${this.baseUrl}/movies/${id}`);
  }

  getReviews(id: any) {
    return this.http.get<any>(`${this.baseUrl}/movies/${id}/reviews`);
  }

  // ── Protected endpoints ─────────────────────────────────────────────────────
  postReview(id: any, review: any) {
    const postData = new FormData();
    postData.append('comment', review.comment);
    postData.append('star', review.stars);
    return this.withAuth(headers => this.http.post<any>(`${this.baseUrl}/movies/${id}/reviews`, postData, { headers }));
  }

  editReview(movieId: string, reviewId: string, data: any) {
    const postData = new FormData();
    postData.append('comment', data.comment);
    postData.append('star', String(data.stars));
    return this.withAuth(headers => this.http.put<any>(`${this.baseUrl}/movies/${movieId}/reviews/${reviewId}`, postData, { headers }));
  }

  deleteReview(movieId: string, reviewId: string) {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/movies/${movieId}/reviews/${reviewId}`, { headers }));
  }

  addMovie(formData: FormData) {
    return this.withAuth(headers => this.http.post<any>(`${this.baseUrl}/movies`, formData, { headers }));
  }

  deleteMovie(id: string) {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/movies/${id}`, { headers }));
  }

  getProfile() {
    return this.withAuth(headers => this.http.get<any>(`${this.baseUrl}/profile`, { headers }));
  }

  getMyReviews() {
    return this.withAuth(headers => this.http.get<any[]>(`${this.baseUrl}/my-reviews`, { headers }));
  }

  getMyReplies() {
    return this.withAuth(headers => this.http.get<any[]>(`${this.baseUrl}/my-replies`, { headers }));
  }

  getWatchlistIds() {
    return this.withAuth(headers => this.http.get<string[]>(`${this.baseUrl}/watchlist`, { headers }));
  }

  getWatchlistMovies() {
    return this.withAuth(headers => this.http.get<any[]>(`${this.baseUrl}/watchlist/movies`, { headers }));
  }

  addToWatchlist(movieId: string) {
    return this.withAuth(headers => this.http.post<any>(`${this.baseUrl}/watchlist/${movieId}`, null, { headers }));
  }

  removeFromWatchlist(movieId: string) {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/watchlist/${movieId}`, { headers }));
  }

  getAllUsers() {
    return this.withAuth(headers => this.http.get<any[]>(`${this.baseUrl}/admin/users`, { headers }));
  }

  getUserReviews(username: string) {
    return this.withAuth(headers => this.http.get<any[]>(`${this.baseUrl}/admin/users/${encodeURIComponent(username)}/reviews`, { headers }));
  }

  setModerator(username: string, value: boolean) {
    const data = new FormData();
    data.append('moderator', String(value));
    return this.withAuth(headers => this.http.put<any>(`${this.baseUrl}/admin/users/${encodeURIComponent(username)}/moderator`, data, { headers }));
  }

  adminDeleteUser(username: string) {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/admin/users/${encodeURIComponent(username)}`, { headers }));
  }

  deleteMyAccount() {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/delete-account`, { headers }));
  }

  postReply(movieId: string, reviewId: string, comment: string) {
    const fd = new FormData();
    fd.append('comment', comment);
    return this.withAuth(headers => this.http.post<any>(`${this.baseUrl}/movies/${movieId}/reviews/${reviewId}/replies`, fd, { headers }));
  }

  deleteReply(movieId: string, reviewId: string, replyId: string) {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/movies/${movieId}/reviews/${reviewId}/replies/${replyId}`, { headers }));
  }
}
