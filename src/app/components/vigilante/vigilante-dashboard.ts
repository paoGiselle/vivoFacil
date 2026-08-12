import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Html5Qrcode } from 'html5-qrcode';
import { VivoFacilService } from '../../services/vivofacil.service';
import { VisitorVisit } from '../../models/vivofacil.models';

@Component({
  selector: 'app-vigilante-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-1 sm:px-3 lg:px-4 py-2 sm:py-4 space-y-4 sm:space-y-6">
      
      <!-- Guard House Header -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 border border-[#E1E2E9] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-[#1A1A1A]">Caseta de Vigilancia y Control de Accesos</h1>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-white">
              Vigilante
            </span>
          </div>
          <p class="text-xs text-[#637381] mt-1">
            Conjunto: <strong class="text-[#1A1A1A]">{{ currentComplex().nombre }}</strong> — {{ currentComplex().direccion }}
          </p>
        </div>
      </div>

      <!-- SUBTAB 1: ESCANEAR Y VALIDAR QR -->
      @if (activeSubtab() === 'escanear') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Column 1: QR Scanner / Manual Input -->
          <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
            
            <div class="flex items-center gap-2 pb-3 border-b border-[#E1E2E9]">
              <span class="material-icons text-[#FE5615]">qr_code_scanner</span>
              <h2 class="font-bold text-[#1A1A1A] text-base">Escanear Código QR</h2>
            </div>

            <!-- Camera Scanner View / Toggle -->
            @if (!isScanning()) {
              <button 
                type="button"
                (click)="startCameraScan()"
                class="w-full p-6 bg-[#1A1A1A] hover:bg-black text-white rounded-2xl text-center space-y-3 relative overflow-hidden transition-all border border-[#FE5615]/30 cursor-pointer group shadow-xs"
              >
                <div class="w-16 h-16 rounded-2xl bg-[#FE5615]/20 text-[#FE5615] mx-auto flex items-center justify-center border border-[#FE5615]/40 group-hover:scale-105 transition-transform">
                  <span class="material-icons text-3xl">photo_camera</span>
                </div>
                <div>
                  <div class="font-bold text-sm text-white flex items-center justify-center gap-1.5">
                    <span>Escáner Activo de Caseta</span>
                    <span class="material-icons text-xs text-[#FE5615]">center_focus_strong</span>
                  </div>
                  <p class="text-[10px] text-gray-400 mt-1">Clic para abrir la cámara y escanear el pase en vivo</p>
                </div>
              </button>
            } @else {
              <div class="p-4 bg-[#1A1A1A] text-white rounded-2xl space-y-3 border-2 border-[#FE5615] shadow-md">
                <div class="flex items-center justify-between border-b border-gray-800 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span class="font-bold text-xs text-white">Escaneando Cámara...</span>
                  </div>
                  <button 
                    type="button" 
                    (click)="stopCameraScan()" 
                    class="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span class="material-icons text-sm">close</span>
                    <span>Cerrar Cámara</span>
                  </button>
                </div>

                <!-- Video Viewport for Html5Qrcode -->
                <div id="qr-reader" class="w-full rounded-xl overflow-hidden bg-black min-h-[200px] border border-gray-700"></div>

                @if (cameraError()) {
                  <div class="p-3 bg-red-900/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-start gap-2">
                    <span class="material-icons text-base shrink-0">error</span>
                    <div>
                      <div class="font-bold">Error al acceder a la cámara</div>
                      <p class="text-[10px] text-red-300 mt-0.5">{{ cameraError() }}</p>
                    </div>
                  </div>
                }

                <p class="text-[10px] text-center text-gray-400">
                  Apunta el código QR del pase a la cámara. Se detectará y buscará automáticamente.
                </p>
              </div>
            }

            <!-- Search or Select QR Code from list for simulation/testing -->
            <div class="space-y-3 pt-2">
              <div>
                <label for="vigilante-qr-input" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Ingresar Código QR Manualmente o Probar *</label>
                <div class="flex gap-2">
                  <input 
                    id="vigilante-qr-input"
                    type="text" 
                    [(ngModel)]="qrInput"
                    (keyup.enter)="searchQR()"
                    placeholder="Ej. VF-QR-849201"
                    class="flex-1 px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-mono focus:outline-none focus:border-[#FE5615]"
                  />
                  <button 
                    (click)="searchQR()"
                    class="px-4 py-2 bg-[#FE5615] text-white text-xs font-semibold rounded-xl hover:bg-[#e0470b] transition-colors cursor-pointer"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <!-- Quick List of Pending QRs in complex to easily click & test -->
              <div>
                <span class="text-[11px] font-semibold text-[#637381] block mb-1.5">Códigos Activos en el Conjunto:</span>
                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  @for (v of visitsForComplex(); track v.id) {
                    <button 
                      (click)="selectQR(v.qrCode)"
                      class="w-full p-2 bg-[#F7F7F8] hover:bg-[#FE5615]/10 border border-[#E1E2E9] rounded-xl text-left text-xs transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <span class="font-bold text-[#1A1A1A]">{{ v.visitorName }}</span>
                        <span class="text-[10px] text-[#637381] block">{{ v.viviendaNumber }} | {{ v.visitDate }} {{ v.estimatedTime }}</span>
                      </div>
                      <span 
                        [class]="v.status === 'Pendiente' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'"
                        class="px-1.5 py-0.5 text-[9px] font-bold rounded font-mono"
                      >
                        {{ v.qrCode }}
                      </span>
                    </button>
                  }
                </div>
              </div>
            </div>

          </div>

          <!-- Column 2 & 3: QR Inspection Card, Manual INE Identity Check & Decision -->
          <div class="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
            
            <div class="flex items-center justify-between pb-3 border-b border-[#E1E2E9]">
              <h2 class="font-bold text-[#1A1A1A] text-base">Verificación de Pase e Identidad</h2>
              <span class="text-xs text-[#637381]">Consulta de Pase por Identificador Único</span>
            </div>

            @if (alertMessage() && !isInvalidComplexPass()) {
              <div class="p-4 bg-red-100 border-2 border-red-400 text-red-900 rounded-2xl font-bold text-xs space-y-1 flex items-start gap-2">
                <span class="material-icons text-xl text-red-600 shrink-0">warning</span>
                <div>
                  <div class="text-sm">¡INFORMACIÓN DEL PASE DE ACCESO!</div>
                  <div class="font-normal">{{ alertMessage() }}</div>
                </div>
              </div>
            }

            @if (!selectedVisit()) {
              <div class="text-center py-16 text-[#637381] space-y-2">
                <span class="material-icons text-5xl text-[#E1E2E9]">qr_code_2</span>
                <p class="text-xs font-semibold text-[#1A1A1A]">Escanea o ingresa el identificador único del pase para consultar la información actualizada de la visita.</p>
              </div>
            } @else if (isInvalidComplexPass()) {
              <div class="bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-center space-y-4">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 shadow-xs">
                  <span class="material-icons text-3xl">gpp_bad</span>
                </div>
                <div class="space-y-2">
                  <h3 class="text-lg font-extrabold text-red-900">Pase no válido para este conjunto de vivienda.</h3>
                  <p class="text-xs text-red-700 max-w-md mx-auto leading-relaxed">
                    Este pase de acceso pertenece a otro conjunto residencial y no se permite consultar sus datos privados ni autorizar el acceso en esta caseta.
                  </p>
                </div>
                <div class="pt-2">
                  <button 
                    (click)="resetSelection()"
                    class="px-5 py-2.5 bg-red-600 text-white font-extrabold rounded-xl text-xs hover:bg-red-700 transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span class="material-icons text-base">qr_code_scanner</span>
                    <span>Regresar al escáner</span>
                  </button>
                </div>
              </div>
            } @else {
              @let visit = selectedVisit()!;

              <div class="bg-[#F7F7F8] border-2 border-[#FE5615]/30 rounded-2xl p-6 space-y-6">
                
                <!-- Display Visit Data per Specification -->
                <div>
                  <div class="flex items-center justify-between border-b border-[#E1E2E9] pb-3 mb-4">
                    <div>
                      <span class="text-[10px] uppercase font-bold tracking-wider text-[#637381]">Nombre del Visitante:</span>
                      <h3 class="text-xl font-extrabold text-[#1A1A1A]">{{ visit.visitorName }}</h3>
                      <span class="text-xs font-mono text-[#FE5615] font-bold">Pase: {{ visit.qrCode }}</span>
                    </div>
                    <span 
                      [class]="
                        visit.status === 'Pendiente' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        visit.status === 'Aprobado' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        visit.status === 'Rechazado' ? 'bg-red-100 text-red-800 border-red-300' :
                        visit.status === 'Expirado' ? 'bg-gray-200 text-gray-800 border-gray-400' :
                        'bg-rose-100 text-rose-800 border-rose-300'
                      "
                      class="px-3 py-1 rounded-full text-xs font-extrabold border"
                    >
                      ESTADO: {{ visit.status.toUpperCase() }}
                    </span>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div class="bg-white p-3 rounded-xl border border-[#E1E2E9]">
                      <span class="text-[#637381] block text-[10px]">Fecha Nacimiento:</span>
                      <span class="font-bold text-[#1A1A1A]">{{ visit.birthDate }}</span>
                    </div>

                    <div class="bg-white p-3 rounded-xl border border-[#E1E2E9]">
                      <span class="text-[#637381] block text-[10px]">Fecha y Hora Visita:</span>
                      <span class="font-bold text-[#1A1A1A]">{{ visit.visitDate }} {{ visit.estimatedTime }} hrs</span>
                    </div>

                    <div class="bg-white p-3 rounded-xl border border-[#E1E2E9]">
                      <span class="text-[#637381] block text-[10px]">Nombre del Residente:</span>
                      <span class="font-bold text-[#1A1A1A]">{{ visit.residentName }}</span>
                    </div>

                    <div class="bg-white p-3 rounded-xl border border-[#E1E2E9]">
                      <span class="text-[#637381] block text-[10px]">Vivienda a Visitar:</span>
                      <span class="font-bold text-[#FE5615] text-sm">{{ visit.viviendaNumber }}</span>
                    </div>
                  </div>
                </div>

                <!-- Mandatory Specification Step: Manual INE Validation -->
                <div class="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2 text-xs text-amber-900">
                  <div class="font-bold flex items-center gap-1.5 text-amber-900 text-sm">
                    <span class="material-icons text-base">badge</span>
                    Validación de Identidad Oficial (INE)
                  </div>
                  <p class="text-[11px] leading-relaxed">
                    Solicita la identificación oficial (INE) al visitante y compara manualmente la información en pantalla antes de tomar una decisión.
                  </p>
                  <label for="ine-confirm-checkbox" class="flex items-center gap-2 pt-1 font-semibold cursor-pointer text-[#1A1A1A]">
                    <input 
                      id="ine-confirm-checkbox"
                      type="checkbox" 
                      [(ngModel)]="ineConfirmed" 
                      class="w-4 h-4 accent-[#FE5615]"
                    />
                    <span>He solicitado la INE física y verifiqué manualmente que la identidad coincide.</span>
                  </label>
                </div>

                <!-- Decision & Observations Form -->
                <div class="bg-white p-4 rounded-xl border border-[#E1E2E9] space-y-4">
                  
                  <div>
                    <label for="vigilante-plates" class="block text-xs font-semibold text-[#1A1A1A] mb-1">
                      Placas del Vehículo (en caso de llegar en auto)
                    </label>
                    <input 
                      id="vigilante-plates"
                      type="text" 
                      [(ngModel)]="vehiclePlates"
                      (input)="onPlatesInput($event)"
                      maxlength="10"
                      placeholder="Ej. JMX 8921"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#FE5615]"
                    />
                  </div>

                  <div>
                    <label for="vigilante-obs" class="block text-xs font-semibold text-[#1A1A1A] mb-1">
                      Anotaciones y Observaciones / Motivo de Rechazo <span class="text-red-500 font-bold">*</span>
                    </label>
                    <textarea 
                      id="vigilante-obs"
                      [(ngModel)]="observations"
                      rows="2"
                      placeholder="Obligatorio al negar el acceso: especifica el motivo del rechazo"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs focus:outline-none focus:border-[#FE5615]"
                    ></textarea>
                  </div>

                  <!-- Decision buttons: Non-modifiable once selected per rule -->
                  <div class="pt-2 flex flex-col sm:flex-row items-center gap-3">
                    <button 
                      (click)="makeDecision('Aprobado')"
                      [disabled]="!ineConfirmed || visit.status !== 'Pendiente'"
                      class="w-full sm:flex-1 py-3 bg-emerald-600 text-white font-extrabold rounded-xl hover:bg-emerald-700 transition-all text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 cursor-pointer"
                    >
                      <span class="material-icons text-base">check_circle</span>
                      <span>Aprobar Acceso</span>
                    </button>

                    <button 
                      (click)="makeDecision('Rechazado')"
                      [disabled]="!ineConfirmed || visit.status !== 'Pendiente'"
                      class="w-full sm:flex-1 py-3 bg-red-600 text-white font-extrabold rounded-xl hover:bg-red-700 transition-all text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 cursor-pointer"
                    >
                      <span class="material-icons text-base">block</span>
                      <span>Negar Acceso</span>
                    </button>
                  </div>

                  <p class="text-[10px] text-center text-[#637381] italic">
                    Una vez registrada la decisión (Aprobado o Rechazado), esta NO podrá ser modificada posteriormente.
                  </p>

                </div>

              </div>

            }

          </div>

        </div>
      }

      <!-- SUBTAB 2: HISTORIAL DE ENTRADAS REGISTRADAS -->
      @if (activeSubtab() === 'historial') {
        <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E1E2E9]">
            <div>
              <h2 class="font-bold text-[#1A1A1A] text-base">Historial de Accesos de Caseta</h2>
              <p class="text-xs text-[#637381]">Registro de entradas procesadas, placas de vehículos y motivos de observación.</p>
            </div>

            <!-- Filters Bar -->
            <div class="flex flex-wrap items-center gap-2">
              <!-- Search Input -->
              <div class="relative flex-1 sm:w-64">
                <span class="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#637381]">search</span>
                <input 
                  type="text"
                  [value]="historySearch()"
                  (input)="historySearch.set($any($event.target).value)"
                  placeholder="Buscar visitante, casa, placas, obs..."
                  class="w-full pl-8 pr-7 py-1.5 bg-[#F7F7F8] border border-[#E1E2E9] text-[#1A1A1A] text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FE5615]/30"
                />
                @if (historySearch()) {
                  <button 
                    type="button" 
                    (click)="historySearch.set('')"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs flex items-center cursor-pointer"
                  >
                    <span class="material-icons text-sm">close</span>
                  </button>
                }
              </div>

              <!-- Status Dropdown Filter -->
              <div class="flex items-center gap-1.5">
                <label for="vigilante-history-status-filter" class="text-xs font-bold text-[#1A1A1A] flex items-center gap-1">
                  <span class="material-icons text-sm text-[#FE5615]">filter_list</span>
                  <span class="hidden sm:inline">Estatus:</span>
                </label>
                <select 
                  id="vigilante-history-status-filter"
                  [value]="historyStatusFilter()"
                  (change)="historyStatusFilter.set($any($event.target).value)"
                  class="px-3 py-1.5 bg-[#F7F7F8] border border-[#E1E2E9] text-[#1A1A1A] text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FE5615]/30 cursor-pointer"
                >
                  <option value="Todos">Todos ({{ getCountForVisitStatus('Todos') }})</option>
                  <option value="Pendiente">Pendientes ({{ getCountForVisitStatus('Pendiente') }})</option>
                  <option value="Aprobado">Aprobados ({{ getCountForVisitStatus('Aprobado') }})</option>
                  <option value="Rechazado">Rechazados ({{ getCountForVisitStatus('Rechazado') }})</option>
                  <option value="Expirado">Expirados ({{ getCountForVisitStatus('Expirado') }})</option>
                  <option value="Cancelado">Cancelados ({{ getCountForVisitStatus('Cancelado') }})</option>
                </select>
              </div>
            </div>
          </div>

          @if (filteredVisits().length === 0) {
            <div class="text-center py-10 text-[#637381] space-y-2">
              <span class="material-icons text-4xl text-[#E1E2E9]">search_off</span>
              <p class="text-xs font-semibold text-[#1A1A1A]">No se encontraron entradas registradas con los filtros seleccionados.</p>
              <button 
                type="button" 
                (click)="historyStatusFilter.set('Todos'); historySearch.set('');" 
                class="px-3 py-1 bg-[#FE5615]/10 text-[#FE5615] text-xs font-bold rounded-lg hover:bg-[#FE5615]/20 transition-colors cursor-pointer"
              >
                Limpiar Filtros
              </button>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#F9F9F9] text-[#637381] font-semibold border-b border-[#E1E2E9]">
                  <tr>
                    <th class="p-3">Hora Escaneo</th>
                    <th class="p-3">Pase / Visitante</th>
                    <th class="p-3">Vivienda</th>
                    <th class="p-3">INE Validada</th>
                    <th class="p-3">Placas Auto</th>
                    <th class="p-3">Decisión Permanencia</th>
                    <th class="p-3">Observaciones / Motivo</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E1E2E9]">
                  @for (v of filteredVisits(); track v.id) {
                    <tr>
                      <td class="p-3 font-semibold text-[#1A1A1A]">
                        {{ v.scannedAt ? (v.scannedAt | date:'mediumTime') : '-' }}
                      </td>
                      <td class="p-3">
                        <div class="font-bold text-[#1A1A1A]">{{ v.visitorName }}</div>
                        <div class="text-[10px] font-mono text-[#FE5615] font-semibold">{{ v.qrCode }}</div>
                      </td>
                      <td class="p-3 font-semibold text-[#FE5615]">{{ v.viviendaNumber }}</td>
                      <td class="p-3 text-emerald-700 font-semibold">
                        @if (v.ineVerifiedManual) {
                          <span class="flex items-center gap-1"><span class="material-icons text-xs">check</span> Sí (Manual)</span>
                        } @else {
                          <span>-</span>
                        }
                      </td>
                      <td class="p-3 font-mono font-bold text-[#1A1A1A]">{{ v.vehiclePlates || 'Sin auto' }}</td>
                      <td class="p-3">
                        <span 
                          [class]="
                            v.status === 'Aprobado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            v.status === 'Rechazado' ? 'bg-red-50 text-red-700 border-red-200' : 
                            v.status === 'Expirado' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                            v.status === 'Cancelado' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          "
                          class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        >
                          {{ v.status }}
                        </span>
                      </td>
                      <td class="p-3 text-[#637381] text-[11px] max-w-xs">{{ v.observations || '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

        </div>
      }

    </div>
  `
})
export class VigilanteDashboardComponent implements OnDestroy {
  private vivoService = inject(VivoFacilService);

  currentComplex = this.vivoService.currentComplex;
  visitsForComplex = this.vivoService.visitsForComplex;

  navTab = this.vivoService.activeNavTab;

  activeSubtab = () => {
    const tab = this.navTab();
    if (tab === 'historial') {
      return 'historial';
    }
    return 'escanear';
  };

  setSubtab(tab: 'escanear' | 'historial') {
    this.vivoService.activeNavTab.set(tab);
  }

  // Filters for Historial de Accesos de Caseta
  historySearch = signal<string>('');
  historyStatusFilter = signal<string>('Todos');

  filteredVisits = computed(() => {
    const filter = this.historyStatusFilter();
    const search = this.historySearch().toLowerCase().trim();
    const visits = this.visitsForComplex();

    return visits.filter(v => {
      let matchesStatus = true;
      if (filter !== 'Todos') {
        if (filter === 'Aprobado') matchesStatus = v.status === 'Aprobado' || v.status === 'Aprobada';
        else if (filter === 'Rechazado') matchesStatus = v.status === 'Rechazado' || v.status === 'Rechazada';
        else if (filter === 'Expirado') matchesStatus = v.status === 'Expirado' || v.status === 'Expirada';
        else if (filter === 'Cancelado') matchesStatus = v.status === 'Cancelado' || v.status === 'Cancelada';
        else matchesStatus = v.status === filter;
      }

      if (!matchesStatus) return false;

      if (search) {
        const matchVisitor = v.visitorName.toLowerCase().includes(search);
        const matchResident = v.residentName ? v.residentName.toLowerCase().includes(search) : false;
        const matchVivienda = v.viviendaNumber ? v.viviendaNumber.toLowerCase().includes(search) : false;
        const matchPlates = v.vehiclePlates ? v.vehiclePlates.toLowerCase().includes(search) : false;
        const matchCode = v.qrCode ? v.qrCode.toLowerCase().includes(search) : false;
        const matchObs = v.observations ? v.observations.toLowerCase().includes(search) : false;
        return matchVisitor || matchResident || matchVivienda || matchPlates || matchCode || matchObs;
      }

      return true;
    });
  });

  getCountForVisitStatus(status: string): number {
    const visits = this.visitsForComplex();
    if (status === 'Todos') return visits.length;
    return visits.filter(v => {
      if (status === 'Aprobado') return v.status === 'Aprobado' || v.status === 'Aprobada';
      if (status === 'Rechazado') return v.status === 'Rechazado' || v.status === 'Rechazada';
      if (status === 'Expirado') return v.status === 'Expirado' || v.status === 'Expirada';
      if (status === 'Cancelado') return v.status === 'Cancelado' || v.status === 'Cancelada';
      return v.status === status;
    }).length;
  }

  // Camera scanner state
  isScanning = signal<boolean>(false);
  cameraError = signal<string | null>(null);
  private html5QrCode: Html5Qrcode | null = null;
  private isHandlingScan = false;

  qrInput = '';
  selectedCode = signal<string | null>(null);

  // Computed signal to always get the LATEST state of the visit from database
  selectedVisit = computed(() => {
    const code = this.selectedCode();
    if (!code) return null;
    return this.vivoService.getVisitByCode(code) || null;
  });

  isInvalidComplexPass = computed(() => {
    const visit = this.selectedVisit();
    const complex = this.currentComplex();
    if (!visit || !complex) return false;
    return !this.vivoService.isSameComplex(visit.complexId, complex.id);
  });

  resetSelection() {
    this.selectedCode.set(null);
    this.qrInput = '';
    this.ineConfirmed = false;
    this.vehiclePlates = '';
    this.observations = '';
    this.alertMessage.set(null);
  }

  onPlatesInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    let cleanValue = input.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    if (cleanValue.length > 10) {
      cleanValue = cleanValue.substring(0, 10);
    }
    this.vehiclePlates = cleanValue;
    input.value = cleanValue;
  }

  ineConfirmed = false;
  vehiclePlates = '';
  observations = '';
  alertMessage = signal<string | null>(null);

  startCameraScan() {
    if (this.isScanning()) return;
    this.isHandlingScan = false;
    this.isScanning.set(true);
    this.cameraError.set(null);

    // Give DOM time to render <div id="qr-reader">
    setTimeout(() => {
      this.initHtml5Qrcode();
    }, 150);
  }

  private initHtml5Qrcode() {
    try {
      const readerEl = document.getElementById('qr-reader');
      if (!readerEl) {
        this.cameraError.set('No se encontró el contenedor del visor de cámara.');
        return;
      }

      const qrScanner = new Html5Qrcode('qr-reader');
      this.html5QrCode = qrScanner;

      qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          if (this.isHandlingScan) return;
          this.isHandlingScan = true;

          // Immediately stop scan and turn off camera
          await this.stopCameraScan();

          // Extract code and search
          this.qrInput = decodedText;
          this.searchQR();
        },
        () => {
          // Ignore individual frame parsing errors
        }
      ).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.cameraError.set(msg || 'No se pudo acceder a la cámara del dispositivo. Por favor verifica los permisos o ingresa el código manualmente.');
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.cameraError.set(msg || 'Error al iniciar el escáner de cámara.');
    }
  }

  async stopCameraScan() {
    const qrInstance = this.html5QrCode;
    this.html5QrCode = null;

    if (qrInstance) {
      try {
        if (qrInstance.isScanning) {
          await qrInstance.stop();
        }
        qrInstance.clear();
      } catch {
        // Ignore cleanup errors
      }
    }

    this.isScanning.set(false);
    this.cameraError.set(null);
    this.isHandlingScan = false;
  }

  ngOnDestroy() {
    this.stopCameraScan();
  }

  selectQR(code: string) {
    this.qrInput = code;
    this.searchQR();
  }

  async searchQR() {
    this.alertMessage.set(null);
    const rawInput = this.qrInput.trim();
    if (!rawInput) {
      this.selectedCode.set(null);
      return;
    }

    // Extract identifier from raw input (scan or typing)
    const extractedId = this.vivoService.extractPassId(rawInput);
    let visit = this.vivoService.getVisitByCode(extractedId);

    // If not found locally, attempt to fetch from Supabase
    if (!visit && this.vivoService.supabaseService.isConfigured) {
      visit = (await this.vivoService.getVisitByCodeRemote(extractedId)) || undefined;
    }

    if (!visit) {
      this.selectedCode.set(null);
      this.alertMessage.set(`Código de pase "${extractedId || rawInput}" no encontrado en la base de datos.`);
      return;
    }

    this.selectedCode.set(visit.qrCode);
    this.ineConfirmed = false;
    this.vehiclePlates = visit.vehiclePlates || '';
    this.observations = visit.observations || '';

    // Check if visit complex matches current complex
    const currentComp = this.currentComplex();
    if (currentComp && !this.vivoService.isSameComplex(visit.complexId, currentComp.id)) {
      this.alertMessage.set(null);
      return;
    }

    // Check pass status dynamically
    this.updateAlertMessage(visit);
  }

  updateAlertMessage(visit: VisitorVisit) {
    if (visit.status === 'Cancelada' || visit.status === 'Cancelado') {
      this.alertMessage.set(`¡ATENCIÓN! Este pase de acceso fue CANCELADO por el residente. No se permite el ingreso.`);
    } else if (visit.status === 'Expirado') {
      this.alertMessage.set(`¡ATENCIÓN! Este código QR ha EXPIRADO (han transcurrido más de 2 horas desde la hora programada: ${visit.visitDate} ${visit.estimatedTime} hrs).`);
    } else if (visit.status === 'Aprobado') {
      this.alertMessage.set(`¡ATENCIÓN! Este código QR ya fue APROBADO anteriormente. Estado actual: APROBADO. No se puede reutilizar.`);
    } else if (visit.status === 'Rechazado') {
      this.alertMessage.set(`¡ATENCIÓN! Este pase fue RECHAZADO anteriormente en caseta (${visit.observations ? 'Motivo: ' + visit.observations : 'Acceso denegado'}). No se puede reutilizar.`);
    } else {
      this.alertMessage.set(null);
    }
  }

  async makeDecision(decision: 'Aprobado' | 'Rechazado') {
    const visit = this.selectedVisit();
    if (!visit) return;

    if (!this.ineConfirmed) {
      this.vivoService.showToast('Debes confirmar haber solicitado la INE oficial física y comparado la identidad.', 'error');
      return;
    }

    if (decision === 'Rechazado' && !this.observations.trim()) {
      this.vivoService.showToast('El campo "Motivo de Rechazo" es obligatorio al negar el acceso.', 'error');
      return;
    }

    const res = await this.vivoService.processQRScanByVigilante(
      visit.qrCode,
      decision,
      this.vehiclePlates,
      this.observations
    );

    if (res.success) {
      this.vivoService.showToast(`Acceso guardado exitosamente como: ${decision.toUpperCase()}`, 'success');
      this.selectedCode.set(null);
      this.qrInput = '';
      this.ineConfirmed = false;
      this.vehiclePlates = '';
      this.observations = '';
      this.alertMessage.set(null);
    } else {
      this.vivoService.showToast(res.message, 'error');
      if (res.visit) {
        this.updateAlertMessage(res.visit);
      }
    }
  }
}

