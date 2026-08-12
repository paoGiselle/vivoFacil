import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VivoFacilService } from './services/vivofacil.service';
import { SupabaseService } from './services/supabase.service';
import { SidenavComponent } from './components/shared/sidenav';
import { LoginComponent } from './components/auth/login';
import { RegisterComponent } from './components/auth/register';
import { AccountStatusNoticeComponent } from './components/auth/account-status-notice';
import { ResidentDashboardComponent } from './components/resident/resident-dashboard';
import { AdminDashboardComponent } from './components/admin/admin-dashboard';
import { VigilanteDashboardComponent } from './components/vigilante/vigilante-dashboard';
import { ProfileComponent } from './components/shared/profile';
import { NotificationsComponent } from './components/shared/notifications';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SidenavComponent,
    LoginComponent,
    RegisterComponent,
    AccountStatusNoticeComponent,
    ResidentDashboardComponent,
    AdminDashboardComponent,
    VigilanteDashboardComponent,
    ProfileComponent,
    NotificationsComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private vivoService = inject(VivoFacilService);
  private supabaseService = inject(SupabaseService);

  currentUser = this.vivoService.currentUser;
  activeRole = this.vivoService.activeRole;
  activeNavTab = this.vivoService.activeNavTab;
  toast = this.vivoService.toast;

  authScreen = signal<'login' | 'register'>('login');

  ngOnInit() {
    this.supabaseService.testConnection();
  }

  showRegister() {
    this.authScreen.set('register');
  }

  showLogin() {
    this.authScreen.set('login');
  }
}
