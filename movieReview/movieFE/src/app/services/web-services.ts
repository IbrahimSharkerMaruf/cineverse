import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class WebServices {

  baseUrl = 'http://127.0.0.1:5001';
  pageSize: number = 8;

  constructor(private http: HttpClient) { }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': sessionStorage.getItem('token') || '' });
  }

  getMovies(page: number, filters: any = {}) {
    let url = `${this.baseUrl}/movies?pn=${page}&ps=${this.pageSize}`;
    if (filters.title)      url += `&title=${encodeURIComponent(filters.title)}`;
    if (filters.genre)      url += `&genre=${encodeURIComponent(filters.genre)}`;
    if (filters.year)       url += `&year=${filters.year}`;
    if (filters.min_rating) url += `&min_rating=${filters.min_rating}`;
    if (filters.max_rating) url += `&max_rating=${filters.max_rating}`;
    if (filters.sort)       url += `&sort=${filters.sort}&order=${filters.order || 'desc'}`;
    return this.http.get<any>(url);
  }

  getMovie(id: any) {
    return this.http.get<any>(`${this.baseUrl}/movies/${id}`);
  }

  getReviews(id: any) {
    return this.http.get<any>(`${this.baseUrl}/movies/${id}/reviews`);
  }

  postReview(id: any, review: any) {
    const postData = new FormData();
    postData.append('username', review.username);
    postData.append('comment', review.comment);
    postData.append('star', review.stars);
    postData.append('avatar', review.avatar || 'profile.png');
    return this.http.post<any>(`${this.baseUrl}/movies/${id}/reviews`, postData);
  }

  editReview(movieId: string, reviewId: string, data: any) {
    const postData = new FormData();
    postData.append('comment', data.comment);
    postData.append('star', String(data.stars));
    return this.http.put<any>(`${this.baseUrl}/movies/${movieId}/reviews/${reviewId}`, postData, { headers: this.authHeaders() });
  }

  deleteReview(movieId: string, reviewId: string) {
    return this.http.delete<any>(`${this.baseUrl}/movies/${movieId}/reviews/${reviewId}`, { headers: this.authHeaders() });
  }

  login(username: string, password: string) {
    const postData = new FormData();
    postData.append('username', username);
    postData.append('password', password);
    return this.http.post<any>(`${this.baseUrl}/login`, postData);
  }

  register(username: string, password: string, avatar: string = 'profile.png') {
    const postData = new FormData();
    postData.append('username', username);
    postData.append('password', password);
    postData.append('avatar', avatar);
    return this.http.post<any>(`${this.baseUrl}/register`, postData);
  }

  logout(token: string) {
    const headers = new HttpHeaders({ 'x-access-token': token });
    return this.http.get<any>(`${this.baseUrl}/logout`, { headers });
  }

  addMovie(formData: FormData) {
    return this.http.post<any>(`${this.baseUrl}/movies`, formData, { headers: this.authHeaders() });
  }

  deleteMovie(id: string) {
    return this.http.delete<any>(`${this.baseUrl}/movies/${id}`, { headers: this.authHeaders() });
  }

  getProfile() {
    return this.http.get<any>(`${this.baseUrl}/profile`, { headers: this.authHeaders() });
  }

  updateProfile(data: { current_password: string; new_username?: string; new_password?: string }) {
    const fd = new FormData();
    fd.append('current_password', data.current_password);
    if (data.new_username) fd.append('new_username', data.new_username);
    if (data.new_password) fd.append('new_password', data.new_password);
    return this.http.put<any>(`${this.baseUrl}/profile`, fd, { headers: this.authHeaders() });
  }

  getMyReviews() {
    return this.http.get<any[]>(`${this.baseUrl}/my-reviews`, { headers: this.authHeaders() });
  }

  getWatchlistIds() {
    return this.http.get<string[]>(`${this.baseUrl}/watchlist`, { headers: this.authHeaders() });
  }

  getWatchlistMovies() {
    return this.http.get<any[]>(`${this.baseUrl}/watchlist/movies`, { headers: this.authHeaders() });
  }

  addToWatchlist(movieId: string) {
    return this.http.post<any>(`${this.baseUrl}/watchlist/${movieId}`, null, { headers: this.authHeaders() });
  }

  removeFromWatchlist(movieId: string) {
    return this.http.delete<any>(`${this.baseUrl}/watchlist/${movieId}`, { headers: this.authHeaders() });
  }

  getAllUsers() {
    return this.http.get<any[]>(`${this.baseUrl}/admin/users`, { headers: this.authHeaders() });
  }

  getUserReviews(username: string) {
    return this.http.get<any[]>(`${this.baseUrl}/admin/users/${encodeURIComponent(username)}/reviews`, { headers: this.authHeaders() });
  }

  setModerator(username: string, value: boolean) {
    const data = new FormData();
    data.append('moderator', String(value));
    return this.http.put<any>(`${this.baseUrl}/admin/users/${encodeURIComponent(username)}/moderator`, data, { headers: this.authHeaders() });
  }

  adminDeleteUser(username: string) {
    return this.http.delete<any>(`${this.baseUrl}/admin/users/${encodeURIComponent(username)}`, { headers: this.authHeaders() });
  }

  deleteMyAccount() {
    return this.http.delete<any>(`${this.baseUrl}/delete-account`, { headers: this.authHeaders() });
  }
}
