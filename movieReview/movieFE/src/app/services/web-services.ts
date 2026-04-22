import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class WebServices {

  baseUrl = 'http://127.0.0.1:5001';
  pageSize: number = 6;

  constructor(private http: HttpClient) { }

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

  getStatsByYear() {
    return this.http.get<any>(`${this.baseUrl}/movies/stats/by-year`);
  }

  getTopMovies(by: string, n: number = 10) {
    return this.http.get<any>(`${this.baseUrl}/movies/stats/top?by=${by}&n=${n}`);
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
    return this.http.post<any>(`${this.baseUrl}/movies/${id}/reviews`, postData);
  }

  login(username: string, password: string) {
    const postData = new FormData();
    postData.append('username', username);
    postData.append('password', password);
    return this.http.post<any>(`${this.baseUrl}/login`, postData);
  }

  register(username: string, password: string) {
    const postData = new FormData();
    postData.append('username', username);
    postData.append('password', password);
    return this.http.post<any>(`${this.baseUrl}/register`, postData);
  }

  logout(token: string) {
    const headers = new HttpHeaders({ 'x-access-token': token });
    return this.http.get<any>(`${this.baseUrl}/logout`, { headers });
  }

  private adminHeaders(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': sessionStorage.getItem('token') || '' });
  }

  addMovie(formData: FormData) {
    return this.http.post<any>(`${this.baseUrl}/movies`, formData, { headers: this.adminHeaders() });
  }

  updateMovie(id: string, formData: FormData) {
    return this.http.put<any>(`${this.baseUrl}/movies/${id}`, formData, { headers: this.adminHeaders() });
  }

  deleteMovie(id: string) {
    return this.http.delete<any>(`${this.baseUrl}/movies/${id}`, { headers: this.adminHeaders() });
  }

  deleteReview(movieId: string, reviewId: string) {
    return this.http.delete<any>(`${this.baseUrl}/movies/${movieId}/reviews/${reviewId}`, { headers: this.adminHeaders() });
  }

  getStats() {
    return this.http.get<any>(`${this.baseUrl}/movies/stats/ratings`);
  }
}
