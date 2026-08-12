import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VivoFacilService } from '../../services/vivofacil.service';

@Component({
  selector: 'app-account-status-notice',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[75vh] flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-2xl border border-[#E1E2E9] shadow-md p-8 text-center space-y-4">
        
        @if (user()?.status === 'Pendiente') {
          <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl mx-auto flex items-center justify-center">
            <span class="material-icons text-3xl">hourglass_top</span>
          </div>
          <h2 class="text-xl font-bold text-[#1A1A1A]">Cuenta Pendiente de Aprobación</h2>
          <p class="text-xs text-[#637381] leading-relaxed">
            Hola <strong class="text-[#1A1A1A]">{{ user()?.nombreCompleto }}</strong>. Tu solicitud de registro para la vivienda <strong>{{ user()?.viviendaNumero }}</strong> está actualmente en revisión por el Administrador del conjunto.
          </p>
          <div class="p-3 bg-[#F7F7F8] rounded-xl text-xs text-[#637381]">
            <div>Una vez aprobada tu cuenta por el Administrador del conjunto, podrás ingresar para generar accesos QR, revisar pagos y adeudos.</div>
          </div>
        }

        @if (user()?.status === 'Rechazada') {
          <div class="w-16 h-16 bg-red-100 text-red-600 rounded-2xl mx-auto flex items-center justify-center">
            <span class="material-icons text-3xl">cancel</span>
          </div>
          <h2 class="text-xl font-bold text-[#1A1A1A]">Solicitud Rechazada</h2>
          <p class="text-xs text-[#637381] leading-relaxed">
            Tu solicitud de acceso para la vivienda {{ user()?.viviendaNumero }} no fue aprobada por la administración.
          </p>
          <p class="text-xs text-[#637381]">
            Si consideras que fue un error, ponte en contacto directo con la administración de tu conjunto habitacional.
          </p>
        }

        @if (user()?.status === 'Desactivada') {
          <div class="w-16 h-16 bg-gray-100 text-gray-600 rounded-2xl mx-auto flex items-center justify-center">
            <span class="material-icons text-3xl">no_accounts</span>
          </div>
          <h2 class="text-xl font-bold text-[#1A1A1A]">Cuenta Desactivada</h2>
          <p class="text-xs text-[#637381] leading-relaxed">
            Tu cuenta ha sido desactivada temporalmente por la administración del conjunto.
          </p>
        }

        <div class="pt-4 border-t border-[#E1E2E9] flex justify-center">
          <button 
            (click)="logout()"
            class="px-5 py-2.5 bg-[#FE5615] hover:bg-[#e0470b] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span class="material-icons text-sm">arrow_back</span>
            regresar al inicio
          </button>
        </div>

      </div>
    </div>
  `
})
export class AccountStatusNoticeComponent {
  private vivoService = inject(VivoFacilService);
  user = this.vivoService.currentUser;

  logout() {
    this.vivoService.logout();
  }
}
