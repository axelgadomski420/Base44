import { Routes } from '@angular/router';
import { authGuard, breederGuard, adminGuard, moderatorGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'discover' },
  { path: 'login', loadComponent: () => import('./features/auth/login.page').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./features/auth/register.page').then(m => m.RegisterPage) },
  { path: 'discover', loadComponent: () => import('./features/discover/discover.page').then(m => m.DiscoverPage) },
  { path: 'explore', loadComponent: () => import('./features/discover/explore.page').then(m => m.ExplorePage) },
  { path: 'feed', loadComponent: () => import('./features/feed/feed.page').then(m => m.FeedPage) },
  { path: 'posts', loadComponent: () => import('./features/posts/posts.page').then(m => m.PostsPage) },
  { path: 'create', canActivate: [authGuard], loadComponent: () => import('./features/posts/create-post.page').then(m => m.CreatePostPage) },
  { path: 'paywall', canActivate: [authGuard], loadComponent: () => import('./features/posts/paywall.page').then(m => m.PaywallPage) },
  { path: 'listing/:id', loadComponent: () => import('./features/listings/listing-detail.page').then(m => m.ListingDetailPage) },
  { path: 'add', canActivate: [breederGuard], loadComponent: () => import('./features/listings/add-listing.page').then(m => m.AddListingPage) },
  { path: 'my-ads', canActivate: [breederGuard], loadComponent: () => import('./features/ads/breeder-ads.page').then(m => m.BreederAdsPage) },
  { path: 'messenger', canActivate: [authGuard], loadComponent: () => import('./features/messenger/messenger.page').then(m => m.MessengerPage) },
  { path: 'arcade', loadComponent: () => import('./features/arcade/arcade.page').then(m => m.ArcadePage) },
  { path: 'wallet', canActivate: [authGuard], loadComponent: () => import('./features/wallet/wallet.page').then(m => m.WalletPage) },
  { path: 'verification', canActivate: [authGuard], loadComponent: () => import('./features/verification/verification.page').then(m => m.VerificationPage) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./features/profile/profile.page').then(m => m.ProfilePage) },
  { path: 'video-editor', canActivate: [authGuard], loadComponent: () => import('./features/video/video-editor.page').then(m => m.VideoEditorPage) },
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin-hub.page').then(m => m.AdminHubPage) },
  { path: 'admin/verifications', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin-verifications.page').then(m => m.AdminVerificationsPage) },
  { path: 'admin/ads', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin-ads.page').then(m => m.AdminAdsPage) },
  { path: 'moderation', canActivate: [moderatorGuard], loadComponent: () => import('./features/moderation/moderation.page').then(m => m.ModerationPage) },
  { path: 'assistant', loadComponent: () => import('./features/assistant/assistant.page').then(m => m.AssistantPage) },
  { path: '**', redirectTo: 'discover' }
];
