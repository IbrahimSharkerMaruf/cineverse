import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { WebServices } from '../services/web-services';
import { AuthService } from '../services/auth-service';

@Component({
  selector: 'app-profile',
  imports: [RouterModule, CommonModule, FormsModule, ReactiveFormsModule],
  providers: [WebServices],
  templateUrl: './profile.html',
})
export class Profile {
  user: any = null;
  myReviews: any[] = [];
  myReplies: any[] = [];
  isLoading = true;

  // self-delete
  showDeleteConfirm = false;
  deleteAccountError = '';

  // tabs
  activeTab: 'reviews' | 'replies' | 'users' = 'reviews';

  // inline review editing (from My Reviews tab)
  editingReviewId: string | null = null;
  editReviewForm: any;
  editReviewError = '';

  // admin: user management
  allUsers: any[] = [];
  usersLoading = false;
  userSearch = '';
  expandedUsername: string | null = null;
  expandedReviews: any[] = [];
  expandedReviewsLoading = false;
  deleteUserError = '';
  confirmDeleteUsername: string | null = null;

  get filteredUsers(): any[] {
    if (!this.userSearch.trim()) return this.allUsers;
    const q = this.userSearch.toLowerCase();
    return this.allUsers.filter(u => u.username.toLowerCase().includes(q));
  }

  constructor(
    public authService: AuthService,
    private webService: WebServices,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.webService.getProfile().subscribe({
      next: (u) => {
        this.user = u;
        this.authService.setWatchlist(u.watchlist || []);
        this.isLoading = false;
        if (u.admin) this.loadAllUsers();
      },
      error: () => { this.isLoading = false; }
    });
    this.webService.getMyReviews().subscribe(r => this.myReviews = r);
    this.webService.getMyReplies().subscribe(r => this.myReplies = r);
  }

  // ── Inline review editing (My Reviews tab) ─────────────────────────────────

  startEditReview(r: any) {
    this.editingReviewId = r.review_id;
    this.editReviewError = '';
    this.editReviewForm = this.fb.group({
      comment: [r.comment, Validators.required],
      stars:   [r.star],
    });
  }

  cancelEditReview() {
    this.editingReviewId = null;
    this.editReviewError = '';
  }

  submitEditReview(r: any) {
    this.webService.editReview(r.movie_id, r.review_id, this.editReviewForm.value).subscribe({
      next: () => {
        const review = this.myReviews.find(x => x.review_id === r.review_id);
        if (review) {
          review.comment = this.editReviewForm.value.comment;
          review.star    = this.editReviewForm.value.stars;
        }
        this.editingReviewId = null;
      },
      error: () => { this.editReviewError = 'Failed to update review.'; }
    });
  }

  // ── Self-delete ────────────────────────────────────────────────────────────

  confirmDeleteAccount() {
    this.deleteAccountError = '';
    this.webService.deleteMyAccount().subscribe({
      next: () => {
        this.authService.clearSession();
      },
      error: () => { this.deleteAccountError = 'Failed to delete account. Please try again.'; }
    });
  }

  // ── Admin: user management ─────────────────────────────────────────────────

  loadAllUsers() {
    this.usersLoading = true;
    this.webService.getAllUsers().subscribe({
      next: (u) => { this.allUsers = u; this.usersLoading = false; },
      error: () => { this.usersLoading = false; }
    });
  }

  toggleUserReviews(username: string) {
    if (this.expandedUsername === username) {
      this.expandedUsername = null;
      this.expandedReviews = [];
      return;
    }
    this.expandedUsername = username;
    this.expandedReviews = [];
    this.expandedReviewsLoading = true;
    this.webService.getUserReviews(username).subscribe({
      next: (r) => { this.expandedReviews = r; this.expandedReviewsLoading = false; },
      error: () => { this.expandedReviewsLoading = false; }
    });
  }

  setModerator(username: string, value: boolean) {
    this.webService.setModerator(username, value).subscribe({
      next: () => {
        const u = this.allUsers.find(u => u.username === username);
        if (u) u.moderator = value;
      }
    });
  }

  deleteUser(username: string) {
    this.deleteUserError = '';
    this.confirmDeleteUsername = null;
    this.webService.adminDeleteUser(username).subscribe({
      next: () => {
        this.allUsers = this.allUsers.filter(u => u.username !== username);
        if (this.expandedUsername === username) {
          this.expandedUsername = null;
          this.expandedReviews = [];
        }
      },
      error: () => { this.deleteUserError = `Failed to delete ${username}.`; }
    });
  }

  posterUrl(filename: string): string {
    return `/assets/images/posters/${encodeURIComponent(filename)}`;
  }

  starString(n: number): string {
    return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  }
}
