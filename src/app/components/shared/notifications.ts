import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VivoFacilService } from '../../services/vivofacil.service';
import { NotificationItem } from '../../models/vivofacil.models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4 sm:space-y-6 max-w-5xl mx-auto px-1 sm:px-3 py-2 sm:py-4">
      
      <!-- Module Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E1E2E9] shadow-xs">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-[#FE5615]/10 text-[#FE5615] flex items-center justify-center font-bold relative">
            <span class="material-icons text-2xl">notifications</span>
            @if (unreadCount() > 0) {
              <span class="absolute -top-1 -right-1 w-4 h-4 bg-[#FE5615] rounded-full border-2 border-white animate-pulse"></span>
            }
          </div>
          <div>
            <h1 class="text-xl font-bold text-[#1A1A1A]">Centro de Notificaciones</h1>
            <p class="text-xs text-[#637381]">
              Avisos y eventos en tiempo real de tu conjunto residencial {{ currentComplex().nombre }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          @if (unreadCount() > 0) {
            <button 
              type="button"
              (click)="markAllAsRead()"
              class="px-3.5 py-2 bg-[#F7F7F8] hover:bg-[#E1E2E9] border border-[#E1E2E9] text-[#1A1A1A] font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span class="material-icons text-sm text-[#FE5615]">done_all</span>
              <span>Marcar todas como leídas</span>
            </button>
          }
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E1E2E9] shadow-xs">
        
        <!-- Filter Tabs: All / Unread / Read -->
        <div class="flex items-center gap-1 bg-[#F7F7F8] p-1 rounded-xl border border-[#E1E2E9]">
          <button 
            type="button"
            (click)="filterStatus.set('all')"
            [class.bg-white]="filterStatus() === 'all'"
            [class.shadow-xs]="filterStatus() === 'all'"
            [class.font-bold]="filterStatus() === 'all'"
            [class.text-[#1A1A1A]]="filterStatus() === 'all'"
            [class.text-[#637381]]="filterStatus() !== 'all'"
            class="px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer"
          >
            Todas ({{ userNotifications().length }})
          </button>

          <button 
            type="button"
            (click)="filterStatus.set('unread')"
            [class.bg-white]="filterStatus() === 'unread'"
            [class.shadow-xs]="filterStatus() === 'unread'"
            [class.font-bold]="filterStatus() === 'unread'"
            [class.text-[#FE5615]]="filterStatus() === 'unread'"
            [class.text-[#637381]]="filterStatus() !== 'unread'"
            class="px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>No leídas</span>
            @if (unreadCount() > 0) {
              <span class="px-1.5 py-0.2 bg-[#FE5615] text-white font-bold text-[10px] rounded-full">
                {{ unreadCount() }}
              </span>
            }
          </button>

          <button 
            type="button"
            (click)="filterStatus.set('read')"
            [class.bg-white]="filterStatus() === 'read'"
            [class.shadow-xs]="filterStatus() === 'read'"
            [class.font-bold]="filterStatus() === 'read'"
            [class.text-[#1A1A1A]]="filterStatus() === 'read'"
            [class.text-[#637381]]="filterStatus() !== 'read'"
            class="px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer"
          >
            Leídas
          </button>
        </div>

        <!-- Category Chip Selector -->
        <div class="flex items-center gap-1.5 overflow-x-auto py-1">
          <button 
            type="button"
            (click)="filterCategory.set('all')"
            [class.bg-[#FE5615]]="filterCategory() === 'all'"
            [class.text-white]="filterCategory() === 'all'"
            [class.bg-[#F7F7F8]]="filterCategory() !== 'all'"
            [class.text-[#637381]]="filterCategory() !== 'all'"
            class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-[#E1E2E9] transition-colors cursor-pointer shrink-0"
          >
            Todas las categorías
          </button>

          <button 
            type="button"
            (click)="filterCategory.set('pago')"
            [class.bg-emerald-600]="filterCategory() === 'pago'"
            [class.text-white]="filterCategory() === 'pago'"
            [class.bg-[#F7F7F8]]="filterCategory() !== 'pago'"
            [class.text-[#637381]]="filterCategory() !== 'pago'"
            class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-[#E1E2E9] transition-colors cursor-pointer shrink-0"
          >
            Pagos
          </button>

          <button 
            type="button"
            (click)="filterCategory.set('visita')"
            [class.bg-blue-600]="filterCategory() === 'visita'"
            [class.text-white]="filterCategory() === 'visita'"
            [class.bg-[#F7F7F8]]="filterCategory() !== 'visita'"
            [class.text-[#637381]]="filterCategory() !== 'visita'"
            class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-[#E1E2E9] transition-colors cursor-pointer shrink-0"
          >
            Visitas
          </button>

          <button 
            type="button"
            (click)="filterCategory.set('adeudo')"
            [class.bg-amber-600]="filterCategory() === 'adeudo'"
            [class.text-white]="filterCategory() === 'adeudo'"
            [class.bg-[#F7F7F8]]="filterCategory() !== 'adeudo'"
            [class.text-[#637381]]="filterCategory() !== 'adeudo'"
            class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-[#E1E2E9] transition-colors cursor-pointer shrink-0"
          >
            Adeudos
          </button>

          @if (activeRole() === 'Administrador') {
            <button 
              type="button"
              (click)="filterCategory.set('usuario')"
              [class.bg-purple-600]="filterCategory() === 'usuario'"
              [class.text-white]="filterCategory() === 'usuario'"
              [class.bg-[#F7F7F8]]="filterCategory() !== 'usuario'"
              [class.text-[#637381]]="filterCategory() !== 'usuario'"
              class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-[#E1E2E9] transition-colors cursor-pointer shrink-0"
            >
              Usuarios
            </button>
          }

          @if (activeRole() !== 'Administrador') {
            <button 
              type="button"
              (click)="filterCategory.set('recordatorio')"
              [class.bg-purple-600]="filterCategory() === 'recordatorio'"
              [class.text-white]="filterCategory() === 'recordatorio'"
              [class.bg-[#F7F7F8]]="filterCategory() !== 'recordatorio'"
              [class.text-[#637381]]="filterCategory() !== 'recordatorio'"
              class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-[#E1E2E9] transition-colors cursor-pointer shrink-0"
            >
              Recordatorios
            </button>
          }
        </div>

      </div>

      <!-- Notifications Feed List -->
      <div class="space-y-3">
        @if (filteredNotifications().length === 0) {
          <div class="bg-white rounded-2xl p-12 text-center border border-[#E1E2E9] shadow-xs space-y-3">
            <div class="w-16 h-16 mx-auto rounded-full bg-[#F7F7F8] flex items-center justify-center text-[#637381]">
              <span class="material-icons text-3xl">notifications_off</span>
            </div>
            <h3 class="font-bold text-base text-[#1A1A1A]">No hay notificaciones</h3>
            <p class="text-xs text-[#637381] max-w-md mx-auto">
              No tienes avisos en esta sección por el momento. Las nuevas notificaciones de pagos, visitas, adeudos y solicitudes aparecerán aquí.
            </p>
          </div>
        } @else {
          @for (n of filteredNotifications(); track n.id) {
            <button 
              type="button"
              (click)="navigateToPanel(n)"
              [class.bg-white]="n.read"
              [class.bg-[#FE5615]/5]="!n.read"
              [class.border-[#FE5615]/40]="!n.read"
              [class.border-[#E1E2E9]]="n.read"
              class="w-full text-left p-4 sm:p-5 rounded-2xl border shadow-xs transition-all flex flex-col sm:flex-row items-start gap-4 hover:shadow-md hover:border-[#FE5615]/60 relative cursor-pointer group"
            >
              
              <!-- Unread Indicator Dot -->
              @if (!n.read) {
                <span class="absolute top-4 right-4 w-2.5 h-2.5 bg-[#FE5615] rounded-full"></span>
              }

              <!-- Icon Container -->
              <div 
                [class]="getIconBgClass(n.category)"
                class="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform"
              >
                <span class="material-icons text-xl">{{ n.icon }}</span>
              </div>

              <!-- Content Area -->
              <div class="flex-1 min-w-0 pr-6 space-y-2">
                
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-sm text-[#1A1A1A] group-hover:text-[#FE5615] transition-colors">{{ n.title }}</span>
                  <span 
                    [class]="getCategoryBadgeClass(n.category)"
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                  >
                    {{ n.category }}
                  </span>
                </div>

                <p class="text-xs text-[#637381] leading-relaxed">
                  {{ n.description }}
                </p>

                <div class="flex flex-wrap items-center justify-between pt-2 gap-3 border-t border-[#E1E2E9]/60 text-[11px] text-[#637381]">
                  <div class="flex items-center gap-1 font-medium">
                    <span class="material-icons text-xs text-[#637381]">schedule</span>
                    <span>{{ n.createdAt }}</span>
                  </div>

                  <div class="flex items-center gap-2">
                    @if (!n.read) {
                      <button 
                        type="button"
                        (click)="markAsRead(n.id, $event)"
                        class="text-[#637381] hover:text-[#1A1A1A] font-semibold cursor-pointer text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Marcar como leída sin cambiar de panel"
                      >
                        <span class="material-icons text-xs">done</span>
                        <span>Marcar leída</span>
                      </button>
                    } @else {
                      <span class="text-emerald-700 font-medium flex items-center gap-0.5 text-[10px] px-1">
                        <span class="material-icons text-xs">done_all</span>
                        <span>Leída</span>
                      </span>
                    }

                    <!-- Direct Panel Redirection Button -->
                    <button 
                      type="button"
                      (click)="navigateToPanel(n, $event)"
                      class="px-3 py-1.5 bg-[#FE5615] hover:bg-[#e0470b] text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <span>{{ getRedirectLabel(n) }}</span>
                      <span class="material-icons text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>

              </div>

            </button>
          }
        }
      </div>

    </div>
  `,
})
export class NotificationsComponent {
  private vivoService = inject(VivoFacilService);

  currentComplex = this.vivoService.currentComplex;
  userNotifications = this.vivoService.userNotifications;
  unreadCount = this.vivoService.unreadNotificationCount;
  activeRole = this.vivoService.activeRole;

  filterStatus = signal<'all' | 'unread' | 'read'>('all');
  filterCategory = signal<'all' | 'pago' | 'visita' | 'adeudo' | 'usuario' | 'recordatorio'>('all');

  filteredNotifications = computed(() => {
    let list = this.userNotifications();

    if (this.filterStatus() === 'unread') {
      list = list.filter(n => !n.read);
    } else if (this.filterStatus() === 'read') {
      list = list.filter(n => n.read);
    }

    if (this.filterCategory() !== 'all') {
      list = list.filter(n => n.category === this.filterCategory());
    }

    return list;
  });

  markAsRead(id: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.vivoService.markNotificationAsRead(id);
  }

  markAllAsRead() {
    this.vivoService.markAllNotificationsAsRead();
  }

  getRedirectTab(n: NotificationItem): string {
    const role = this.activeRole();
    const cat = n.category;

    if (role === 'Residente') {
      switch (cat) {
        case 'pago':
        case 'recordatorio':
          return 'pagos'; // Panel "Pagos y comprobantes"
        case 'visita':
          return 'visitas'; // Panel "Visitas y pase QR"
        case 'adeudo':
          return 'adeudos'; // Panel "Adeudos y sanciones"
        default:
          return 'visitas';
      }
    }

    if (role === 'Administrador') {
      switch (cat) {
        case 'pago':
        case 'recordatorio':
          return 'pagos'; // Panel "Gestión de pagos"
        case 'usuario':
          return 'aprobaciones'; // Panel "Solicitudes de registro"
        case 'adeudo':
          return 'adeudos'; // Panel "Registro de adeudos"
        case 'visita':
          return 'historial'; // Panel "Historial de visitas"
        default:
          return 'aprobaciones';
      }
    }

    if (role === 'Vigilante') {
      return 'escanear';
    }

    return 'visitas';
  }

  getRedirectLabel(n: NotificationItem): string {
    const role = this.activeRole();
    const cat = n.category;

    if (role === 'Residente') {
      switch (cat) {
        case 'pago':
        case 'recordatorio':
          return 'Pagos y comprobantes';
        case 'visita':
          return 'Visitas y pase QR';
        case 'adeudo':
          return 'Adeudos y sanciones';
        default:
          return 'Ver panel';
      }
    }

    if (role === 'Administrador') {
      switch (cat) {
        case 'pago':
        case 'recordatorio':
          return 'Gestión de pagos';
        case 'usuario':
          return 'Solicitudes de registro';
        case 'adeudo':
          return 'Registro de adeudos';
        case 'visita':
          return 'Historial de visitas';
        default:
          return 'Ver panel';
      }
    }

    if (role === 'Vigilante') {
      return 'Escanear QR';
    }

    return 'Ver panel';
  }

  navigateToPanel(n: NotificationItem, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.markAsRead(n.id);
    const targetTab = this.getRedirectTab(n);
    this.vivoService.activeNavTab.set(targetTab);
  }

  getIconBgClass(category: string): string {
    switch (category) {
      case 'pago': return 'bg-emerald-600';
      case 'visita': return 'bg-blue-600';
      case 'adeudo': return 'bg-amber-600';
      case 'usuario': return 'bg-purple-600';
      case 'recordatorio': return 'bg-[#FE5615]';
      default: return 'bg-gray-700';
    }
  }

  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'pago': return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'visita': return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'adeudo': return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'usuario': return 'bg-purple-100 text-purple-800 border border-purple-300';
      case 'recordatorio': return 'bg-orange-100 text-orange-800 border border-orange-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
