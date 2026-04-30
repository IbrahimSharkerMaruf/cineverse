import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { switchMap, take } from 'rxjs';

/**
 * Central HTTP service for all CineVerse API calls.
 * Public endpoints are unauthenticated; protected endpoints attach a Bearer token via Auth0.
 */
@Injectable({
  providedIn: 'root',
})
export class WebServices {

  /** Base URL of the Flask backend. */
  baseUrl = 'http://127.0.0.1:5001';

  /** Number of movies returned per page. */
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

  /** Syncs the Auth0 user with the backend database after login. */
  syncAuth() {
    return this.withAuth(headers => this.http.post<any>(`${this.baseUrl}/auth/sync`, {}, { headers }));
  }

  // ── Public endpoints (no auth needed) ──────────────────────────────────────

  /**
   * Fetches a paginated, filtered list of movies.
   * @param page Current page number (1-based).
   * @param filters Optional filter/sort parameters (title, genre, year, ratings, sort order).
   */
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

  /**
   * Fetches a single movie by ID.
   * @param id MongoDB ObjectId of the movie.
   */
  getMovie(id: any) {
    return this.http.get<any>(`${this.baseUrl}/movies/${id}`);
  }

  /**
   * Fetches all reviews for a movie.
   * @param id MongoDB ObjectId of the movie.
   */
  getReviews(id: any) {
    return this.http.get<any>(`${this.baseUrl}/movies/${id}/reviews`);
  }

  // ── Protected endpoints ─────────────────────────────────────────────────────

  /**
   * Submits a new review for a movie. Requires authentication.
   * @param id Movie ID.
   * @param review Object containing `comment` and `stars`.
   */
  postReview(id: any, review: any) {
    const postData = new FormData();
    postData.append('comment', review.comment);
    postData.append('star', review.stars);
    return this.withAuth(headers => this.http.post<any>(`${this.baseUrl}/movies/${id}/reviews`, postData, { headers }));
  }

  /**
   * Updates an existing review. Requires authentication.
   * @param movieId Movie ID.
   * @param reviewId Review ID to update.
   * @param data Updated `comment` and `stars`.
   */
  editReview(movieId: string, reviewId: string, data: any) {
    const postData = new FormData();
    postData.append('comment', data.comment);
    postData.append('star', String(data.stars));
    return this.withAuth(headers => this.http.put<any>(`${this.baseUrl}/movies/${movieId}/reviews/${reviewId}`, postData, { headers }));
  }

  /**
   * Deletes a review. Requires authentication (owner or moderator).
   * @param movieId Movie ID.
   * @param reviewId Review ID to delete.
   */
  deleteReview(movieId: string, reviewId: string) {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/movies/${movieId}/reviews/${reviewId}`, { headers }));
  }

  /**
   * Adds a new movie. Requires admin authentication.
   * @param formData FormData containing movie fields and optional poster file.
   */
  addMovie(formData: FormData) {
    return this.withAuth(headers => this.http.post<any>(`${this.baseUrl}/movies`, formData, { headers }));
  }

  /**
   * Deletes a movie and all its reviews. Requires admin authentication.
   * @param id Movie ID to delete.
   */
  deleteMovie(id: string) {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/movies/${id}`, { headers }));
  }

  /** Fetches the current user's profile. Requires authentication. */
  getProfile() {
    return this.withAuth(headers => this.http.get<any>(`${this.baseUrl}/profile`, { headers }));
  }

  /** Fetches all reviews written by the current user. Requires authentication. */
  getMyReviews() {
    return this.withAuth(headers => this.http.get<any[]>(`${this.baseUrl}/my-reviews`, { headers }));
  }

  /** Fetches all replies written by the current user. Requires authentication. */
  getMyReplies() {
    return this.withAuth(headers => this.http.get<any[]>(`${this.baseUrl}/my-replies`, { headers }));
  }

  /** Returns the list of movie IDs in the current user's watchlist. Requires authentication. */
  getWatchlistIds() {
    return this.withAuth(headers => this.http.get<string[]>(`${this.baseUrl}/watchlist`, { headers }));
  }

  /** Returns full movie objects for every item in the current user's watchlist. Requires authentication. */
  getWatchlistMovies() {
    return this.withAuth(headers => this.http.get<any[]>(`${this.baseUrl}/watchlist/movies`, { headers }));
  }

  /**
   * Adds a movie to the current user's watchlist. Requires authentication.
   * @param movieId Movie ID to add.
   */
  addToWatchlist(movieId: string) {
    return this.withAuth(headers => this.http.post<any>(`${this.baseUrl}/watchlist/${movieId}`, null, { headers }));
  }

  /**
   * Removes a movie from the current user's watchlist. Requires authentication.
   * @param movieId Movie ID to remove.
   */
  removeFromWatchlist(movieId: string) {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/watchlist/${movieId}`, { headers }));
  }

  /** Returns all registered users. Requires admin authentication. */
  getAllUsers() {
    return this.withAuth(headers => this.http.get<any[]>(`${this.baseUrl}/admin/users`, { headers }));
  }

  /**
   * Returns all reviews written by a specific user. Requires admin authentication.
   * @param username Target username.
   */
  getUserReviews(username: string) {
    return this.withAuth(headers => this.http.get<any[]>(`${this.baseUrl}/admin/users/${encodeURIComponent(username)}/reviews`, { headers }));
  }

  /**
   * Grants or revokes moderator role for a user. Requires admin authentication.
   * @param username Target username.
   * @param value `true` to grant moderator, `false` to revoke.
   */
  setModerator(username: string, value: boolean) {
    const data = new FormData();
    data.append('moderator', String(value));
    return this.withAuth(headers => this.http.put<any>(`${this.baseUrl}/admin/users/${encodeURIComponent(username)}/moderator`, data, { headers }));
  }

  /**
   * Deletes a user account as admin. Requires admin authentication.
   * @param username Username of the account to delete.
   */
  adminDeleteUser(username: string) {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/admin/users/${encodeURIComponent(username)}`, { headers }));
  }

  /**
   * Updates the current user's avatar. Requires authentication.
   * @param avatar Avatar filename (e.g. `'rabbit.png'`).
   */
  updateAvatar(avatar: string) {
    const fd = new FormData();
    fd.append('avatar', avatar);
    return this.withAuth(headers => this.http.put<any>(`${this.baseUrl}/profile/avatar`, fd, { headers }));
  }

  /** Permanently deletes the current user's own account. Requires authentication. */
  deleteMyAccount() {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/delete-account`, { headers }));
  }

  /**
   * Posts a reply to a review. Requires authentication.
   * @param movieId Movie ID.
   * @param reviewId Review ID being replied to.
   * @param comment Reply text.
   */
  postReply(movieId: string, reviewId: string, comment: string) {
    const fd = new FormData();
    fd.append('comment', comment);
    return this.withAuth(headers => this.http.post<any>(`${this.baseUrl}/movies/${movieId}/reviews/${reviewId}/replies`, fd, { headers }));
  }

  /**
   * Deletes a reply from a review. Requires authentication (owner or moderator).
   * @param movieId Movie ID.
   * @param reviewId Review ID the reply belongs to.
   * @param replyId Reply ID to delete.
   */
  deleteReply(movieId: string, reviewId: string, replyId: string) {
    return this.withAuth(headers => this.http.delete<any>(`${this.baseUrl}/movies/${movieId}/reviews/${reviewId}/replies/${replyId}`, { headers }));
  }
}
