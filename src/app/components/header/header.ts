import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VivoFacilService } from '../../services/vivofacil.service';
import { UserRole } from '../../models/vivofacil.models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-white border-b border-[#E1E2E9] sticky top-0 z-40 shadow-xs">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          
          <!-- Logo & Brand -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#FE5615] text-white flex items-center justify-center font-bold text-xl shadow-xs">
              VF
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-xl tracking-tight text-[#1A1A1A]">Vivo<span class="text-[#FE5615]">Fácil</span></span>
                <span class="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[#FE5615]/10 text-[#FE5615]">SaaS</span>
              </div>
              
              <!-- Multi-tenant Complex Name Badge -->
              @if (currentComplex(); as complex) {
                <div class="flex items-center gap-1 text-xs text-[#637381]">
                  <span class="material-icons text-xs text-[#FE5615]">domain</span>
                  <span class="font-medium truncate max-w-[180px] sm:max-w-xs">{{ complex.nombre }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Right Controls / User Info -->
          @if (currentUser(); as user) {
            <div class="flex items-center gap-3">

              <!-- Housing Complex Badge (Single Complex per Account) -->
              @if (currentComplex(); as complex) {
                <div class="hidden md:flex items-center gap-1.5 px-3 py-1 bg-[#F7F7F8] border border-[#E1E2E9] rounded-lg text-xs font-semibold text-[#1A1A1A]">
                  <span class="material-icons text-xs text-[#FE5615]">domain</span>
                  <span>{{ complex.nombre }}</span>
                </div>
              }

              <!-- Pending User Alerts for Admin -->
              @if (activeRole() === 'Administrador' && pendingCount() > 0) {
                <div class="relative flex items-center" title="Usuarios pendientes de aprobación">
                  <span class="material-icons text-amber-500 text-xl animate-pulse">notifications_active</span>
                  <span class="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {{ pendingCount() }}
                  </span>
                </div>
              }

              <!-- Role Selector if Multi-Role -->
              @if (user.roles.length > 1) {
                <div class="relative">
                  <div class="flex items-center gap-1 bg-[#FE5615]/10 text-[#FE5615] px-3 py-1.5 rounded-lg border border-[#FE5615]/20 text-xs font-semibold">
                    <span class="material-icons text-sm">swap_horiz</span>
                    <span>Rol: {{ activeRole() }}</span>
                    <select 
                      [value]="activeRole()"
                      (change)="onRoleSelect($event)"
                      class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      title="Cambiar rol de usuario"
                    >
                      @for (r of user.roles; track r) {
                        <option [value]="r">{{ r }}</option>
                      }
                    </select>
                  </div>
                </div>
              } @else {
                <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FE5615]/10 text-[#FE5615]">
                  {{ activeRole() }}
                </span>
              }

              <!-- User Profile & Sign Out -->
              <div class="flex items-center gap-2 pl-2 border-l border-[#E1E2E9]">
                <div class="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-semibold text-xs">
                  {{ user.nombreCompleto.charAt(0) }}
                </div>
                <div class="hidden sm:block text-left text-xs">
                  <div class="font-semibold text-[#1A1A1A] leading-tight">{{ user.nombreCompleto }}</div>
                  <div class="text-[#637381] leading-tight">{{ user.viviendaNumero || 'Sin vivienda' }}</div>
                </div>
                <button 
                  (click)="logout()"
                  class="p-1.5 text-[#637381] hover:text-[#FE5615] rounded-lg hover:bg-[#F7F7F8] transition-colors"
                  title="Cerrar Sesión"
                >
                  <span class="material-icons text-lg">logout</span>
                </button>
              </div>

            </div>
          } @else {
            <div class="text-xs text-[#637381]">
              Acceso Digital VivoFácil
            </div>
          }

        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  private vivoService = inject(VivoFacilService);

  currentUser = this.vivoService.currentUser;
  activeRole = this.vivoService.activeRole;
  currentComplex = this.vivoService.currentComplex;
  pendingCount = () => this.vivoService.pendingUsersForComplex().length;

  onRoleSelect(event: Event) {
    const val = (event.target as HTMLSelectElement).value as UserRole;
    if (val) {
      this.vivoService.switchRole(val);
    }
  }

  logout() {
    this.vivoService.logout();
  }
}
