import { Routes } from '@angular/router';
import { authGuard } from './core/guards';
import { breederGuard } from './core/guards';
import { adminGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'discover' },
  { path: 'login', loadComponent: () => import('./features/auth/login.page').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./features/auth/register.page').then(m => m.RegisterPage) },
  { path: 'discover', loadComponent: () => import('./features/discover/discover.page').then(m => m.DiscoverPage) },
  { path: 'explore', loadComponent: () => import('./features/discover/explore.page').then(m => m.ExplorePage) },
  { path: 'listing/:id', loadComponent: () => import('./features/listings/listing-detail.page').then(m => m.ListingDetailPage) },
  { path: 'add', canActivate: [breederGuard], loadComponent: () => import('./features/listings/add-listing.page').then(m => m.AddListingPage) },
  { path: 'messenger', canActivate: [authGuard], loadComponent: () => import('./features/messenger/messenger.page').then(m => m.MessengerPage) },
  { path: 'arcade', loadComponent: () => import('./features/arcade/arcade.page').then(m => m.ArcadePage) },
  { path: 'wallet', canActivate: [authGuard], loadComponent: () => import('./features/wallet/wallet.page').then(m => m.WalletPage) },
  { path: 'verification', canActivate: [authGuard], loadComponent: () => import('./features/verification/verification.page').then(m => m.VerificationPage) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./features/profile/profile.page').then(m => m.ProfilePage) },
  { path: 'admin/verifications', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin-verifications.page').then(m => m.AdminVerificationsPage) },
  { path: '**', redirectTo: 'discover' }
];