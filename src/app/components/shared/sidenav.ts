import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VivoFacilService } from '../../services/vivofacil.service';
import { UserRole } from '../../models/vivofacil.models';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Mobile Top Navigation Header / Toggle Bar -->
    <div class="md:hidden sticky top-0 z-40 bg-white border-b border-[#E1E2E9] px-4 py-3 flex items-center justify-between shadow-xs">
      <div class="flex items-center gap-2">
        <button 
          (click)="toggleMobileMenu()" 
          class="p-2 text-[#1A1A1A] hover:bg-[#F7F7F8] rounded-xl transition-colors cursor-pointer"
          aria-label="Abrir menú de navegación"
        >
          <span class="material-icons text-2xl">menu</span>
        </button>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-[#FE5615] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            VF
          </div>
          <span class="font-bold text-lg text-[#1A1A1A]">Vivo<span class="text-[#FE5615]">Fácil</span></span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button 
          type="button"
          (click)="setTab('notificaciones')"
          class="relative p-2 text-[#637381] hover:text-[#FE5615] rounded-xl transition-colors cursor-pointer"
          title="Notificaciones"
        >
          <span class="material-icons text-xl">notifications</span>
          @if (unreadNotificationCount() > 0) {
            <span class="absolute top-1 right-1 bg-[#FE5615] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {{ unreadNotificationCount() > 9 ? '9+' : unreadNotificationCount() }}
            </span>
          }
        </button>

        <span class="px-2.5 py-1 text-[11px] font-bold rounded-full bg-[#FE5615]/10 text-[#FE5615]">
          {{ activeRole() }}
        </span>
      </div>
    </div>

    <!-- Mobile Backdrop -->
    @if (mobileOpen()) {
      <div 
        (click)="closeMobileMenu()" 
        (keyup.escape)="closeMobileMenu()"
        tabindex="0"
        role="button"
        aria-label="Cerrar menú lateral"
        class="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-xs transition-opacity cursor-pointer"
      ></div>
    }

    <!-- Side Navigation Sidebar Container -->
    <aside 
      [class.translate-x-0]="mobileOpen()"
      [class.-translate-x-full]="!mobileOpen()"
      class="fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64 lg:w-72 xl:w-80 bg-white border-r border-[#E1E2E9] flex flex-col justify-between h-full transition-transform duration-200 ease-in-out md:translate-x-0 shrink-0 shadow-sm md:shadow-none"
    >
      
      <div class="flex flex-col h-full overflow-y-auto">
        
        <!-- Sidenav Top Branding -->
        <div class="p-5 border-b border-[#E1E2E9] flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#FE5615] text-white flex items-center justify-center font-bold text-lg shadow-xs">
              VF
            </div>
            <div>
              <div class="font-bold text-lg tracking-tight text-[#1A1A1A]">Vivo<span class="text-[#FE5615]">Fácil</span></div>
              <div class="text-[10px] text-[#637381] font-medium uppercase tracking-wider">Gestión Residencial</div>
            </div>
          </div>

          <button 
            (click)="closeMobileMenu()" 
            class="md:hidden p-1.5 text-[#637381] hover:text-[#1A1A1A] rounded-lg cursor-pointer"
          >
            <span class="material-icons text-xl">close</span>
          </button>
        </div>

        <!-- Housing Complex Display (Single Complex per Account) -->
        @if (currentUser(); as user) {
          <div class="p-4 border-b border-[#E1E2E9] bg-[#F7F7F8]">
            <span class="block text-[10px] uppercase font-bold text-[#637381] mb-1">Conjunto Habitacional</span>
            
            <div class="bg-white border border-[#E1E2E9] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] flex items-center gap-2 shadow-xs">
              <span class="material-icons text-sm text-[#FE5615]">domain</span>
              <span class="truncate">{{ currentComplex()?.nombre || 'Conjunto Residencial' }}</span>
            </div>

            @if (currentComplex(); as c) {
              <div class="text-[10px] text-[#637381] mt-1.5 flex items-center gap-1 truncate">
                <span class="material-icons text-xs text-[#FE5615]">location_on</span>
                <span class="truncate">{{ c.ciudad }}</span>
              </div>
            }
          </div>

          <!-- Role Switcher (Requirement 5) -->
          <div class="px-4 py-3 border-b border-[#E1E2E9]">
            <div class="text-[10px] uppercase font-bold text-[#637381] mb-1.5 flex items-center justify-between">
              <span>Rol de Usuario Activo</span>
              @if (userRoles().length > 1) {
                <span class="text-[9px] text-[#FE5615] font-semibold">{{ userRoles().length }} Roles Asignados</span>
              }
            </div>
            
            <div class="relative">
              <div class="flex items-center justify-between bg-[#FE5615]/10 border border-[#FE5615]/30 rounded-xl px-3 py-2 text-xs font-bold text-[#FE5615]">
                <div class="flex items-center gap-2">
                  <span class="material-icons text-sm">badge</span>
                  <span>{{ activeRole() }}</span>
                </div>
                @if (userRoles().length > 1) {
                  <span class="material-icons text-xs">arrow_drop_down</span>
                }
              </div>

              <!-- Only allow selecting assigned user roles -->
              @if (userRoles().length > 1) {
                <select 
                  [value]="activeRole()"
                  (change)="onRoleSelect($event)"
                  class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  title="Cambiar rol activo"
                >
                  @for (r of userRoles(); track r) {
                    <option [value]="r">{{ r }}</option>
                  }
                </select>
              }
            </div>
          </div>

          <!-- Navigation Links Section (Requirement 4) -->
          <nav class="p-3 space-y-1 flex-1">
            
            <div class="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#637381]">
              Menú Principal
            </div>

            <!-- Residente Menu Items -->
            @if (activeRole() === 'Residente') {
              <button 
                (click)="setTab('visitas')"
                [class.bg-[#FE5615]]="activeTab() === 'visitas' || activeTab() === 'default'"
                [class.text-white]="activeTab() === 'visitas' || activeTab() === 'default'"
                [class.text-[#1A1A1A]]="activeTab() !== 'visitas' && activeTab() !== 'default'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'visitas' && activeTab() !== 'default'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">qr_code_scanner</span>
                <span class="flex-1 text-left font-semibold">Visitas y Pase QR</span>
              </button>

              <button 
                (click)="setTab('pagos')"
                [class.bg-[#FE5615]]="activeTab() === 'pagos'"
                [class.text-white]="activeTab() === 'pagos'"
                [class.text-[#1A1A1A]]="activeTab() !== 'pagos'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'pagos'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">payments</span>
                <span class="flex-1 text-left font-semibold">Pagos y Comprobantes</span>
              </button>

              <button 
                (click)="setTab('adeudos')"
                [class.bg-[#FE5615]]="activeTab() === 'adeudos'"
                [class.text-white]="activeTab() === 'adeudos'"
                [class.text-[#1A1A1A]]="activeTab() !== 'adeudos'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'adeudos'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">account_balance_wallet</span>
                <span class="flex-1 text-left font-semibold">Adeudos y Sanciones</span>
              </button>

              <button 
                (click)="setTab('notificaciones')"
                [class.bg-[#FE5615]]="activeTab() === 'notificaciones'"
                [class.text-white]="activeTab() === 'notificaciones'"
                [class.text-[#1A1A1A]]="activeTab() !== 'notificaciones'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'notificaciones'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">notifications</span>
                <span class="flex-1 text-left font-semibold">Notificaciones</span>
                @if (unreadNotificationCount() > 0) {
                  <span 
                    [class.bg-white]="activeTab() === 'notificaciones'"
                    [class.text-[#FE5615]]="activeTab() === 'notificaciones'"
                    [class.bg-[#FE5615]]="activeTab() !== 'notificaciones'"
                    [class.text-white]="activeTab() !== 'notificaciones'"
                    class="font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center justify-center shrink-0"
                  >
                    {{ unreadNotificationCount() }}
                  </span>
                }
              </button>

              <button 
                (click)="setTab('perfil')"
                [class.bg-[#FE5615]]="activeTab() === 'perfil'"
                [class.text-white]="activeTab() === 'perfil'"
                [class.text-[#1A1A1A]]="activeTab() !== 'perfil'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'perfil'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">account_circle</span>
                <span class="flex-1 text-left font-semibold">Mi Perfil</span>
              </button>
            }

            <!-- Administrador Menu Items -->
            @if (activeRole() === 'Administrador') {
              <button 
                (click)="setTab('aprobaciones')"
                [class.bg-[#FE5615]]="activeTab() === 'aprobaciones' || activeTab() === 'default'"
                [class.text-white]="activeTab() === 'aprobaciones' || activeTab() === 'default'"
                [class.text-[#1A1A1A]]="activeTab() !== 'aprobaciones' && activeTab() !== 'default'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'aprobaciones' && activeTab() !== 'default'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">how_to_reg</span>
                <span class="flex-1 text-left font-semibold">Solicitudes de Registro</span>
                @if (pendingCount() > 0) {
                  <span 
                    [class.bg-white]="activeTab() === 'aprobaciones' || activeTab() === 'default'"
                    [class.text-[#FE5615]]="activeTab() === 'aprobaciones' || activeTab() === 'default'"
                    [class.bg-amber-500]="activeTab() !== 'aprobaciones' && activeTab() !== 'default'"
                    [class.text-white]="activeTab() !== 'aprobaciones' && activeTab() !== 'default'"
                    class="font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  >
                    {{ pendingCount() }}
                  </span>
                }
              </button>

              <button 
                (click)="setTab('usuarios')"
                [class.bg-[#FE5615]]="activeTab() === 'usuarios'"
                [class.text-white]="activeTab() === 'usuarios'"
                [class.text-[#1A1A1A]]="activeTab() !== 'usuarios'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'usuarios'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">people</span>
                <span class="flex-1 text-left font-semibold">Usuarios y Roles</span>
              </button>

              <button 
                (click)="setTab('pagos')"
                [class.bg-[#FE5615]]="activeTab() === 'pagos'"
                [class.text-white]="activeTab() === 'pagos'"
                [class.text-[#1A1A1A]]="activeTab() !== 'pagos'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'pagos'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">payments</span>
                <span class="flex-1 text-left font-semibold">Gestión de Pagos</span>
              </button>

              <button 
                (click)="setTab('adeudos')"
                [class.bg-[#FE5615]]="activeTab() === 'adeudos'"
                [class.text-white]="activeTab() === 'adeudos'"
                [class.text-[#1A1A1A]]="activeTab() !== 'adeudos'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'adeudos'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">account_balance_wallet</span>
                <span class="flex-1 text-left font-semibold">Registro de Adeudos</span>
              </button>

              <button 
                (click)="setTab('historial')"
                [class.bg-[#FE5615]]="activeTab() === 'historial' || activeTab() === 'visitas'"
                [class.text-white]="activeTab() === 'historial' || activeTab() === 'visitas'"
                [class.text-[#1A1A1A]]="activeTab() !== 'historial' && activeTab() !== 'visitas'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'historial' && activeTab() !== 'visitas'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">list_alt</span>
                <span class="flex-1 text-left font-semibold">Historial de Visitas</span>
              </button>

              <button 
                (click)="setTab('notificaciones')"
                [class.bg-[#FE5615]]="activeTab() === 'notificaciones'"
                [class.text-white]="activeTab() === 'notificaciones'"
                [class.text-[#1A1A1A]]="activeTab() !== 'notificaciones'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'notificaciones'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">notifications</span>
                <span class="flex-1 text-left font-semibold">Notificaciones</span>
                @if (unreadNotificationCount() > 0) {
                  <span 
                    [class.bg-white]="activeTab() === 'notificaciones'"
                    [class.text-[#FE5615]]="activeTab() === 'notificaciones'"
                    [class.bg-[#FE5615]]="activeTab() !== 'notificaciones'"
                    [class.text-white]="activeTab() !== 'notificaciones'"
                    class="font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center justify-center shrink-0"
                  >
                    {{ unreadNotificationCount() }}
                  </span>
                }
              </button>

              <button 
                (click)="setTab('perfil')"
                [class.bg-[#FE5615]]="activeTab() === 'perfil'"
                [class.text-white]="activeTab() === 'perfil'"
                [class.text-[#1A1A1A]]="activeTab() !== 'perfil'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'perfil'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">account_circle</span>
                <span class="flex-1 text-left font-semibold">Mi Perfil</span>
              </button>
            }

            <!-- Vigilante Menu Items -->
            @if (activeRole() === 'Vigilante') {
              <button 
                (click)="setTab('escanear')"
                [class.bg-[#FE5615]]="activeTab() === 'escanear' || activeTab() === 'default'"
                [class.text-white]="activeTab() === 'escanear' || activeTab() === 'default'"
                [class.text-[#1A1A1A]]="activeTab() !== 'escanear' && activeTab() !== 'default'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'escanear' && activeTab() !== 'default'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">qr_code_scanner</span>
                <span class="flex-1 text-left font-semibold">Escanear QR</span>
              </button>

              <button 
                (click)="setTab('historial')"
                [class.bg-[#FE5615]]="activeTab() === 'historial'"
                [class.text-white]="activeTab() === 'historial'"
                [class.text-[#1A1A1A]]="activeTab() !== 'historial'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'historial'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">history</span>
                <span class="flex-1 text-left font-semibold">Historial de Entradas</span>
              </button>

              <button 
                (click)="setTab('perfil')"
                [class.bg-[#FE5615]]="activeTab() === 'perfil'"
                [class.text-white]="activeTab() === 'perfil'"
                [class.text-[#1A1A1A]]="activeTab() !== 'perfil'"
                [class.hover:bg-[#F7F7F8]]="activeTab() !== 'perfil'"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <span class="material-icons text-lg">account_circle</span>
                <span class="flex-1 text-left font-semibold">Mi Perfil</span>
              </button>
            }

          </nav>
        }

        <!-- Bottom User Card & Logout (Requirement 8) -->
        @if (currentUser(); as user) {
          <div class="p-4 border-t border-[#E1E2E9] bg-[#F7F7F8] space-y-3 mt-auto">
            <button 
              type="button"
              (click)="setTab('perfil')" 
              class="w-full flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity text-left"
              title="Ver mi perfil"
            >
              <div class="w-9 h-9 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                @if (user.avatarUrl) {
                  <img [src]="user.avatarUrl" alt="Avatar" class="w-full h-full object-cover" />
                } @else {
                  {{ user.nombreCompleto.charAt(0) }}
                }
              </div>
              <div class="overflow-hidden text-xs">
                <div class="font-bold text-[#1A1A1A] truncate">{{ user.nombreCompleto }}</div>
                <div class="text-[10px] text-[#637381] truncate">{{ user.viviendaNumero || user.correo }}</div>
              </div>
            </button>

            <button 
              (click)="openLogoutConfirm()" 
              class="w-full py-2 bg-white border border-[#E1E2E9] text-red-600 hover:bg-red-50 hover:border-red-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span class="material-icons text-sm">logout</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        }

      </div>

    </aside>

    <!-- Logout Confirmation Dialog (Requirement 8) -->
    @if (showLogoutConfirm()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
        <div [class]="getModalSizeClass() + ' bg-white rounded-2xl border border-[#E1E2E9] shadow-2xl p-6 space-y-4 max-h-[92vh] flex flex-col min-h-0 overflow-y-auto'">
          <div class="flex items-center justify-between pb-2 border-b border-[#E1E2E9] gap-2 flex-wrap">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                <span class="material-icons text-xl">logout</span>
              </div>
              <div>
                <h3 class="font-bold text-base text-[#1A1A1A]">Cerrar Sesión</h3>
                <p class="text-xs text-[#637381]">Confirmación requerida</p>
              </div>
            </div>

          </div>

          <p class="text-xs text-[#1A1A1A] leading-relaxed">
            ¿Estás seguro de que deseas cerrar sesión?
          </p>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#E1E2E9]">
            <button 
              (click)="showLogoutConfirm.set(false)" 
              class="px-4 py-2 bg-[#F7F7F8] text-[#1A1A1A] text-xs font-semibold rounded-xl border border-[#E1E2E9] hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button 
              (click)="confirmLogout()" 
              class="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span class="material-icons text-sm">check</span>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './sidenav.css'
})
export class SidenavComponent {
  private vivoService = inject(VivoFacilService);

  currentUser = this.vivoService.currentUser;
  activeRole = this.vivoService.activeRole;
  currentComplex = this.vivoService.currentComplex;
  userAccessibleComplexes = this.vivoService.userAccessibleComplexes;
  activeTab = this.vivoService.activeNavTab;
  pendingCount = () => this.vivoService.pendingUsersForComplex().length;
  unreadNotificationCount = this.vivoService.unreadNotificationCount;

  mobileOpen = signal<boolean>(false);
  showLogoutConfirm = signal<boolean>(false);
  modalSize = signal<'sm' | 'md' | 'lg' | 'full'>('md');

  setModalSize(size: 'sm' | 'md' | 'lg' | 'full') {
    this.modalSize.set(size);
  }

  cycleModalSize() {
    const current = this.modalSize();
    if (current === 'sm') this.modalSize.set('md');
    else if (current === 'md') this.modalSize.set('lg');
    else if (current === 'lg') this.modalSize.set('full');
    else this.modalSize.set('sm');
  }

  getModalSizeClass(): string {
    switch (this.modalSize()) {
      case 'sm': return 'max-w-sm w-full transition-all duration-300 ease-in-out';
      case 'md': return 'max-w-md w-full transition-all duration-300 ease-in-out';
      case 'lg': return 'max-w-2xl w-full transition-all duration-300 ease-in-out';
      case 'full': return 'max-w-[95vw] w-full max-h-[92vh] h-auto overflow-y-auto transition-all duration-300 ease-in-out';
      default: return 'max-w-sm w-full transition-all duration-300 ease-in-out';
    }
  }

  userRoles = () => this.currentUser()?.roles || [];

  toggleMobileMenu() {
    this.mobileOpen.set(!this.mobileOpen());
  }

  closeMobileMenu() {
    this.mobileOpen.set(false);
  }

  setTab(tab: string) {
    this.vivoService.activeNavTab.set(tab);
    this.closeMobileMenu();
  }

  onRoleSelect(event: Event) {
    const val = (event.target as HTMLSelectElement).value as UserRole;
    if (val) {
      this.vivoService.switchRole(val);
      this.closeMobileMenu();
    }
  }

  openLogoutConfirm() {
    this.showLogoutConfirm.set(true);
  }

  confirmLogout() {
    this.showLogoutConfirm.set(false);
    this.vivoService.logout();
    this.closeMobileMenu();
  }
}
