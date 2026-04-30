import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { WebServices } from '../services/web-services';
import { AuthService } from '../services/auth-service';

/**
 * User profile page component.
 * Shows the logged-in user's info, their reviews and replies, and avatar selection.
 * Admins additionally see a user management panel with moderator controls and user deletion.
 */
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

  
  showAvatarPicker = false;
  avatarOptions = ['profile.png','rabbit.png','panda.png','man.png','cat.png','woman.png','hacker.png','boy.png'];
  showDeleteConfirm = false;
  deleteAccountError = '';

  
  activeTab: 'reviews' | 'replies' | 'users' = 'reviews';

  
  editingReviewId: string | null = null;
  editReviewForm: any;
  editReviewError = '';

  /** All users loaded for the admin management panel. */
  allUsers: any[] = [];
  usersLoading = false;
  userSearch = '';
  /** Username whose review list is currently expanded in the admin panel, or null. */
  expandedUsername: string | null = null;
  expandedReviews: any[] = [];
  expandedReviewsLoading = false;
  deleteUserError = '';
  /** Username awaiting admin delete confirmation, or null. */
  confirmDeleteUsername: string | null = null;

  /** Users filtered by the current `userSearch` string. */
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

  /** Loads the user's profile, reviews, replies, and (if admin) all users on init. */
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

  /**
   * Opens the inline edit form for a review in the My Reviews tab.
   * @param r Review object to edit.
   */
  startEditReview(r: any) {
    this.editingReviewId = r.review_id;
    this.editReviewError = '';
    this.editReviewForm = this.fb.group({
      comment: [r.comment, Validators.required],
      stars:   [r.star],
    });
  }

  /** Closes the inline review edit form without saving. */
  cancelEditReview() {
    this.editingReviewId = null;
    this.editReviewError = '';
  }

  /**
   * Saves an edited review and updates the local list optimistically on success.
   * @param r Review object containing `movie_id` and `review_id`.
   */
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

  // ── Avatar ─────────────────────────────────────────────────────────────────

  /**
   * Updates the user's avatar and syncs the change to the auth service.
   * @param avatar Avatar filename to set (e.g. `'rabbit.png'`).
   */
  selectAvatar(avatar: string) {
    this.webService.updateAvatar(avatar).subscribe({
      next: () => {
        this.user.avatar = avatar;
        this.authService.updateAvatar(avatar);
        this.showAvatarPicker = false;
      }
    });
  }

  // ── Self-delete ────────────────────────────────────────────────────────────

  /** Permanently deletes the current user's account and triggers logout. */
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

  /** Fetches all registered users for the admin management panel. */
  loadAllUsers() {
    this.usersLoading = true;
    this.webService.getAllUsers().subscribe({
      next: (u) => { this.allUsers = u; this.usersLoading = false; },
      error: () => { this.usersLoading = false; }
    });
  }

  /**
   * Expands or collapses the review list for a user in the admin panel.
   * @param username Username whose reviews to toggle.
   */
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

  /**
   * Grants or revokes the moderator role for a user and updates the local list.
   * @param username Target username.
   * @param value `true` to grant moderator, `false` to revoke.
   */
  setModerator(username: string, value: boolean) {
    this.webService.setModerator(username, value).subscribe({
      next: () => {
        const u = this.allUsers.find(u => u.username === username);
        if (u) u.moderator = value;
      }
    });
  }

  /**
   * Deletes a user account as admin and removes them from the local list.
   * @param username Username of the account to delete.
   */
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

  /**
   * Builds the asset URL for a movie poster file.
   * @param filename Poster filename stored in the database.
   */
  posterUrl(filename: string): string {
    return `/assets/images/posters/${encodeURIComponent(filename)}`;
  }

  /**
   * Converts a numeric rating to a filled/empty star string (e.g. `"★★★☆☆"`).
   * @param n Rating value (0–5).
   */
  starString(n: number): string {
    return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  }
}
