import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import QRCode from 'qrcode';
import { VivoFacilService } from '../../services/vivofacil.service';
import { VisitorVisit, PaymentRequest, ExtractedOcrData, Debt, HousingComplex } from '../../models/vivofacil.models';
import { LeafletMapComponent } from '../shared/leaflet-map';

@Component({
  selector: 'app-resident-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LeafletMapComponent],
  template: `
    <div class="max-w-7xl mx-auto px-1 sm:px-3 lg:px-4 py-2 sm:py-4 space-y-4 sm:space-y-6">
      
      <!-- Welcome Banner -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 border border-[#E1E2E9] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-[#1A1A1A]">Panel de Residente</h1>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FE5615]/10 text-[#FE5615]">
              {{ user()?.viviendaNumero || 'Residente' }}
            </span>
          </div>
          <p class="text-xs text-[#637381] mt-1">
            Conjunto: <strong class="text-[#1A1A1A]">{{ currentComplex().nombre }}</strong> — {{ currentComplex().direccion }}
          </p>
        </div>
      </div>

      <!-- TAB 1: VISITAS Y GENERACIÓN DE CÓDIGO QR -->
      @if (activeTab() === 'visitas') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Column 1: New Visit Form & Location Map -->
          <div class="space-y-6">
            
            <!-- New Visit Form -->
            <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs">
              <div class="flex items-center gap-2 mb-4 pb-3 border-b border-[#E1E2E9]">
                <span class="material-icons text-[#FE5615]">person_add</span>
                <h2 class="font-bold text-[#1A1A1A] text-base">Registrar Nueva Visita</h2>
              </div>

              <form [formGroup]="visitForm" (ngSubmit)="onCreateVisit()" class="space-y-3">
                <div>
                  <label for="res-visitorName" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Nombre del Visitante *</label>
                  <input 
                    id="res-visitorName"
                    type="text" 
                    formControlName="visitorName"
                    placeholder="Ej. Roberto Hernández"
                    class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label for="res-birthDate" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Fecha de Nacimiento *</label>
                  <input 
                    id="res-birthDate"
                    type="date" 
                    [max]="todayStr"
                    formControlName="birthDate"
                    class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A]"
                  />
                  <p class="text-[10px] text-[#637381] mt-0.5">No se permiten fechas futuras.</p>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label for="res-visitDate" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Fecha Visita *</label>
                    <input 
                      id="res-visitDate"
                      type="date" 
                      [min]="todayStr"
                      formControlName="visitDate"
                      (change)="onVisitDateChange()"
                      (input)="onVisitDateChange()"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A]"
                    />
                    <p class="text-[10px] text-[#637381] mt-0.5">Mínimo hoy.</p>
                  </div>

                  <div>
                    <label for="res-estimatedTime" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Hora Estimada *</label>
                    <input 
                      id="res-estimatedTime"
                      type="time" 
                      [min]="minTimeForVisit"
                      formControlName="estimatedTime"
                      (change)="onVisitDateChange()"
                      (input)="onVisitDateChange()"
                      [class.border-red-500]="isPastTimeError"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A]"
                    />
                    @if (isPastTimeError) {
                      <p class="text-[10px] text-red-500 font-semibold mt-0.5">Esa hora ya pasó. Elige una posterior.</p>
                    }
                  </div>
                </div>

                <button 
                  type="submit"
                  [disabled]="visitForm.invalid"
                  class="w-full py-2.5 bg-[#FE5615] text-white font-semibold rounded-xl hover:bg-[#e0470b] transition-colors shadow-xs text-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
                >
                  <span class="material-icons text-sm">qr_code</span>
                  <span>Generar Código QR</span>
                </button>
              </form>
            </div>

            <!-- Housing Complex Map (Leaflet) -->
            <div class="bg-white rounded-2xl p-5 border border-[#E1E2E9] shadow-xs space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5">
                  <span class="material-icons text-[#FE5615] text-sm">map</span>
                  Ubicación para tus Visitantes
                </span>
                <span class="text-[10px] text-[#637381]">Leaflet + Google Maps</span>
              </div>
              
              @if (currentComplex(); as c) {
                <app-leaflet-map
                  [lat]="c.lat"
                  [lng]="c.lng"
                  [complexName]="c.nombre"
                  [address]="c.direccion + ', ' + c.ciudad"
                ></app-leaflet-map>
              }
            </div>

          </div>

          <!-- Column 2 & 3: List of Generated Visitor QR Codes -->
          <div class="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
            
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1E2E9]">
              <div>
                <h2 class="font-bold text-[#1A1A1A] text-base">Mis Códigos QR de Visita</h2>
                <p class="text-xs text-[#637381]">Cada código es único y solo puede ser utilizado una sola vez</p>
              </div>
              
              <!-- Filter Dropdown -->
              <div class="flex items-center gap-2">
                <label for="visit-status-filter" class="text-xs font-bold text-[#1A1A1A] flex items-center gap-1">
                  <span class="material-icons text-sm text-[#FE5615]">filter_list</span>
                  <span>Estatus:</span>
                </label>
                <select 
                  id="visit-status-filter"
                  [value]="visitStatusFilter()"
                  (change)="visitStatusFilter.set($any($event.target).value)"
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

            @if (filteredMyVisits().length === 0) {
              <div class="text-center py-12 text-[#637381] space-y-2">
                <span class="material-icons text-4xl text-[#E1E2E9]">qr_code_2</span>
                <p class="text-xs">
                  @if (visitStatusFilter() === 'Todos') {
                    No has generado códigos QR de acceso todavía.
                  } @else {
                    No hay códigos QR con el estatus "{{ visitStatusFilter() }}".
                  }
                </p>
              </div>
            } @else {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                @for (v of filteredMyVisits(); track v.id) {
                  <div class="bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-[#FE5615]/30 transition-all">
                    
                    <div class="flex items-start justify-between gap-2 overflow-hidden">
                      <div class="min-w-0 flex-1">
                        <div class="font-bold text-sm text-[#1A1A1A] truncate" [title]="v.visitorName">{{ v.visitorName }}</div>
                        <div class="text-[11px] text-[#637381] mt-0.5">
                          F. Nac: {{ v.birthDate }}
                        </div>
                      </div>

                      <!-- Status Badge -->
                      <span 
                        [class]="getStatusBadgeClass(v.status)"
                        class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap"
                      >
                        {{ v.status }}
                      </span>
                    </div>

                    <div class="text-xs text-[#1A1A1A] bg-white p-2.5 rounded-lg border border-[#E1E2E9] space-y-1">
                      <div class="flex justify-between">
                        <span class="text-[#637381]">Fecha Visita:</span>
                        <span class="font-semibold">{{ v.visitDate }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-[#637381]">Hora llegada:</span>
                        <span class="font-semibold">{{ v.estimatedTime }} hrs</span>
                      </div>
                      <div class="flex justify-between text-[11px] text-[#637381]">
                        <span>Código QR:</span>
                        <span class="font-mono text-[#FE5615] font-bold">{{ v.qrCode }}</span>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center gap-2 pt-1">
                      <button 
                        (click)="openQRModal(v)"
                        class="flex-1 py-1.5 bg-[#FE5615] text-white text-xs font-medium rounded-lg hover:bg-[#e0470b] transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      >
                        <span class="material-icons text-sm">qr_code_2</span>
                        <span>{{ v.status === 'Pendiente' ? 'Ver y Compartir' : 'Ver' }}</span>
                      </button>

                      <!-- Cancel Button: ONLY permitted if status === 'Pendiente' -->
                      @if (v.status === 'Pendiente') {
                        <button 
                          (click)="openCancelModal(v)"
                          class="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium rounded-lg transition-colors border border-red-200 cursor-pointer"
                          title="Cancelar código QR"
                        >
                          Cancelar
                        </button>
                      }
                    </div>

                  </div>
                }
              </div>
            }

          </div>

        </div>

        <!-- Access History -->
        <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E1E2E9]">
            <div>
              <h3 class="font-bold text-[#1A1A1A] text-base">Historial de Accesos de Visitantes</h3>
              <p class="text-xs text-[#637381]">Registro e historial detallado de entradas y validaciones en caseta de vigilancia</p>
            </div>

            <!-- Filters Bar -->
            <div class="flex flex-wrap items-center gap-2">
              <!-- Search Input -->
              <div class="relative flex-1 sm:w-56">
                <span class="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#637381]">search</span>
                <input 
                  type="text"
                  [value]="accessHistorySearch()"
                  (input)="accessHistorySearch.set($any($event.target).value)"
                  placeholder="Buscar por visitante, placas, pase..."
                  class="w-full pl-8 pr-7 py-1.5 bg-[#F7F7F8] border border-[#E1E2E9] text-[#1A1A1A] text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FE5615]/30"
                />
                @if (accessHistorySearch()) {
                  <button 
                    type="button" 
                    (click)="accessHistorySearch.set('')"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs flex items-center cursor-pointer"
                  >
                    <span class="material-icons text-sm">close</span>
                  </button>
                }
              </div>

              <!-- Status Dropdown Filter -->
              <div class="flex items-center gap-1.5">
                <label for="access-history-status-filter" class="text-xs font-bold text-[#1A1A1A] flex items-center gap-1">
                  <span class="material-icons text-sm text-[#FE5615]">filter_list</span>
                  <span class="hidden sm:inline">Estatus:</span>
                </label>
                <select 
                  id="access-history-status-filter"
                  [value]="visitStatusFilter()"
                  (change)="visitStatusFilter.set($any($event.target).value)"
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

          @if (filteredAccessHistory().length === 0) {
            <div class="text-center py-10 text-[#637381] space-y-2">
              <span class="material-icons text-4xl text-[#E1E2E9]">manage_search</span>
              <p class="text-xs font-semibold text-[#1A1A1A]">No se encontraron registros de accesos con los filtros actuales.</p>
              <button 
                type="button" 
                (click)="visitStatusFilter.set('Todos'); accessHistorySearch.set('');" 
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
                    <th class="p-3">Pase / Visitante</th>
                    <th class="p-3">Fecha y Hora Visita</th>
                    <th class="p-3">Escaneado el</th>
                    <th class="p-3">Validación INE</th>
                    <th class="p-3">Placas Auto</th>
                    <th class="p-3">Decisión Caseta</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E1E2E9]">
                  @for (v of filteredAccessHistory(); track v.id) {
                    <tr>
                      <td class="p-3">
                        <div class="font-bold text-[#1A1A1A]">{{ v.visitorName }}</div>
                        <div class="text-[10px] font-mono text-[#FE5615] font-semibold">{{ v.qrCode }}</div>
                      </td>
                      <td class="p-3 text-[#637381]">{{ v.visitDate }} {{ v.estimatedTime }}</td>
                      <td class="p-3 text-[#637381]">{{ v.scannedAt ? (v.scannedAt | date:'short') : '-' }}</td>
                      <td class="p-3">
                        @if (v.ineVerifiedManual) {
                          <span class="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <span class="material-icons text-xs">check_circle</span> Manual (INE)
                          </span>
                        } @else {
                          <span class="text-xs text-[#637381]">-</span>
                        }
                      </td>
                      <td class="p-3 font-mono font-semibold text-[#1A1A1A]">{{ v.vehiclePlates || 'Sin auto' }}</td>
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
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

      }

      <!-- TAB 2: PAGOS Y SUBIR COMPROBANTES -->
      @if (activeTab() === 'pagos') {
        <div class="space-y-6">
          
          <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 class="font-bold text-[#1A1A1A] text-lg">Solicitudes de Pago Pendientes</h2>
              <p class="text-xs text-[#637381]">Realiza tus pagos mediante transferencia bancaria o efectivo e ingresa tu comprobante.</p>
            </div>
          </div>

          @if (myPaymentRequests().length === 0) {
            <div class="bg-white rounded-2xl p-8 border border-[#E1E2E9] text-center text-xs text-emerald-600 font-semibold flex flex-col items-center gap-2 shadow-xs">
              <span class="material-icons text-3xl">task_alt</span>
              <span>¡Al día! No tienes solicitudes de pago pendientes por registrar.</span>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <!-- Payment Requests List -->
              @for (p of myPaymentRequests(); track p.id) {
                <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
                  
                  <div class="flex items-start justify-between gap-2 border-b border-[#E1E2E9] pb-3">
                    <div>
                      <div class="flex items-center gap-2">
                        <span 
                          [class]="p.type === 'Pago Fijo' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'"
                          class="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                        >
                          {{ p.type }}
                        </span>
                        <span class="text-xs text-[#637381] font-medium">{{ p.category }}</span>
                      </div>
                      <h3 class="font-bold text-base text-[#1A1A1A] mt-1">{{ p.title }}</h3>
                    </div>
                    <div class="text-right">
                      <div class="font-extrabold text-xl text-[#FE5615]">{{ '$' + p.amount.toFixed(2) }}</div>
                      <div class="text-[11px] text-[#637381]">MXN</div>
                    </div>
                  </div>

                  <p class="text-xs text-[#637381] leading-relaxed">{{ p.description }}</p>

                  <div class="flex items-center justify-between text-xs bg-[#F7F7F8] p-3 rounded-xl border border-[#E1E2E9]">
                    <span class="text-[#637381]">Fecha Límite de Pago:</span>
                    <span class="font-bold text-red-600">{{ p.dueDate }}</span>
                  </div>

                  <button 
                    (click)="openPayModal(p)"
                    class="w-full py-2.5 bg-[#FE5615] text-white font-semibold rounded-xl hover:bg-[#e0470b] transition-colors text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span class="material-icons text-base">payments</span>
                    <span>Registrar Pago</span>
                  </button>

                </div>
              }

            </div>
          }

          <!-- Submitted Vouchers Status -->
          <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1E2E9]">
              <h3 class="font-bold text-[#1A1A1A] text-base">Mis Comprobantes Enviados</h3>
              
              <!-- Filter Dropdown -->
              <div class="flex items-center gap-2">
                <label for="submission-status-filter" class="text-xs font-bold text-[#1A1A1A] flex items-center gap-1 shrink-0">
                  <span class="material-icons text-sm text-[#FE5615]">filter_list</span>
                  <span>Estatus:</span>
                </label>
                <select 
                  id="submission-status-filter"
                  [value]="submissionStatusFilter()"
                  (change)="submissionStatusFilter.set($any($event.target).value)"
                  class="px-3 py-1.5 bg-[#F7F7F8] border border-[#E1E2E9] text-[#1A1A1A] text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FE5615]/30 cursor-pointer"
                >
                  <option value="Todos">Todos ({{ getCountForSubmissionStatus('Todos') }})</option>
                  <option value="Pendiente">Pendientes ({{ getCountForSubmissionStatus('Pendiente') }})</option>
                  <option value="Aprobado">Aprobados ({{ getCountForSubmissionStatus('Aprobado') }})</option>
                  <option value="Rechazado">Rechazados ({{ getCountForSubmissionStatus('Rechazado') }})</option>
                </select>
              </div>
            </div>

            @if (mySubmissions().length === 0) {
              <div class="text-center py-8 text-xs text-[#637381]">
                Aún no has registrado comprobantes de pago.
              </div>
            } @else if (filteredMySubmissions().length === 0) {
              <div class="text-center py-8 text-xs text-[#637381]">
                No hay comprobantes con el estatus "{{ submissionStatusFilter() }}".
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-[#F9F9F9] text-[#637381] font-semibold border-b border-[#E1E2E9]">
                    <tr>
                      <th class="p-3">Concepto</th>
                      <th class="p-3">Método</th>
                      <th class="p-3">Monto</th>
                      <th class="p-3">Detalle / Referencia</th>
                      <th class="p-3">Estado</th>
                      <th class="p-3">Observación Admin</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#E1E2E9]">
                    @for (s of filteredMySubmissions(); track s.id) {
                      <tr>
                        <td class="p-3 font-medium text-[#1A1A1A]">{{ s.paymentTitle }}</td>
                        <td class="p-3 text-[#637381]">{{ s.method }}</td>
                        <td class="p-3 font-bold text-[#FE5615]">{{ '$' + s.amount.toFixed(2) }}</td>
                        <td class="p-3 text-[#637381]">
                          @if (s.method === 'Efectivo') {
                            <div class="text-[11px]">
                              <span class="font-semibold text-[#1A1A1A]">Recibió: {{ s.recibidoPor }}</span><br>
                              <span class="text-[10px]">Entrega: {{ s.fechaEntrega }}</span>
                            </div>
                          } @else if (s.extractedOcr) {
                            <div class="text-[11px]">
                              <span class="font-bold text-[#1A1A1A]">{{ s.extractedOcr.banco }}</span><br>
                              <span class="font-mono text-[10px]">Ref: {{ s.extractedOcr.referencia }}</span>
                            </div>
                          } @else {
                            <div class="text-[11px]">
                              <span>{{ s.banco || 'Banco' }}</span><br>
                              <span class="font-mono text-[10px]">{{ s.referencia || '-' }}</span>
                            </div>
                          }
                        </td>
                        <td class="p-3">
                          <span 
                            [class]="s.status === 'Aprobado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (s.status === 'Rechazado' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200')"
                            class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                          >
                            {{ s.status }}
                          </span>
                        </td>
                        <td class="p-3 text-[#637381] text-[11px]">
                          {{ s.adminObservation || 'En revisión' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

        </div>
      }

      <!-- TAB 3: ADEUDOS E HISTORIAL DE ACCESOS -->
      @if (activeTab() === 'adeudos') {
        <div class="space-y-6">
          
          <div class="p-4 bg-[#FE5615]/10 border border-[#FE5615]/30 rounded-2xl flex items-start gap-3">
            <span class="material-icons text-[#FE5615] text-2xl shrink-0">info</span>
            <div>
              <h3 class="font-bold text-xs text-[#1A1A1A]">Información Importante de Normativa</h3>
              <p class="text-xs text-[#1A1A1A] mt-0.5">
                La existencia de adeudos pendientes <strong>NO impide</strong> la generación de nuevos códigos QR para tus visitantes. Podrás seguir otorgando accesos con normalidad.
              </p>
            </div>
          </div>

          <!-- Active Debts -->
          <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
            <h3 class="font-bold text-[#1A1A1A] text-base pb-3 border-b border-[#E1E2E9] flex items-center justify-between">
              <span>Adeudos Registrados</span>
              <span class="text-xs font-normal text-[#637381]">Vivienda: {{ user()?.viviendaNumero }}</span>
            </h3>

            @if (myDebts().length === 0) {
              <div class="text-center py-8 text-xs text-emerald-600 font-semibold flex flex-col items-center gap-1">
                <span class="material-icons text-3xl">verified</span>
                <span>¡Felicidades! Tu vivienda no cuenta con adeudos registrados.</span>
              </div>
            } @else {
              <div class="space-y-3">
                @for (d of myDebts(); track d.id) {
                  <div 
                    [class]="d.status === 'En revisión' ? 'bg-amber-50/50 border-amber-200' : 'bg-red-50/50 border-red-200'"
                    class="p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div 
                        [class]="d.status === 'En revisión' ? 'text-amber-900' : 'text-red-900'"
                        class="font-bold text-sm"
                      >
                        {{ d.concept }}
                      </div>
                      <div 
                        [class]="d.status === 'En revisión' ? 'text-amber-700' : 'text-red-700'"
                        class="text-xs mt-0.5"
                      >
                        Vencimiento: {{ d.dueDate }} | {{ d.observations }}
                      </div>
                      @if (d.sanctionAmount) {
                        <div 
                          [class]="d.status === 'En revisión' ? 'text-amber-800' : 'text-red-800'"
                          class="text-[11px] font-semibold mt-1"
                        >
                          Sanción aplicada: {{ '$' + d.sanctionAmount }} MXN ({{ d.sanctionReason }})
                        </div>
                      }
                    </div>
                    <div class="text-right shrink-0 space-y-2">
                      <div 
                        [class]="d.status === 'En revisión' ? 'text-amber-700' : 'text-red-600'"
                        class="font-extrabold text-lg"
                      >
                        {{ '$' + (d.amount + (d.sanctionAmount || 0)).toFixed(2) }} MXN
                      </div>
                      <div class="flex items-center justify-end gap-2">
                        <span 
                          [class]="d.status === 'Liquidado' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : (d.status === 'En revisión' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-red-100 text-red-700 border-red-300')"
                          class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border"
                        >
                          {{ d.status }}
                        </span>
                        @if (d.status === 'En revisión') {
                          <button 
                            disabled
                            class="px-3 py-1 bg-amber-100/80 text-amber-800 border border-amber-200 font-bold text-xs rounded-lg flex items-center gap-1 opacity-80 cursor-not-allowed shadow-none"
                            title="Tu pago ha sido registrado y está en revisión por la administración."
                          >
                            <span class="material-icons text-xs text-amber-600">hourglass_top</span>
                            <span>En revisión</span>
                          </button>
                        } @else if (d.status !== 'Liquidado') {
                          <button 
                            (click)="payDebt(d)"
                            class="px-3 py-1 bg-[#FE5615] hover:bg-[#e0480f] text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <span class="material-icons text-xs">payments</span>
                            <span>Pagar Adeudo</span>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

        </div>
      }

      <!-- MODAL 1: VER CÓDIGO QR Y COMPARTIR -->
      @if (selectedQRVisit(); as visit) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div [class]="getModalSizeClass() + ' bg-white rounded-2xl p-6 space-y-4 text-center shadow-xl border border-[#E1E2E9] max-h-[92vh] flex flex-col min-h-0 overflow-y-auto'">
            
            <div class="flex items-center justify-between pb-2 border-b border-[#E1E2E9] gap-2 flex-wrap sm:flex-nowrap">
              <span class="font-bold text-sm text-[#1A1A1A]">Pase Digital de Acceso</span>
              
              <div class="flex items-center gap-2 shrink-0">
                <button (click)="closeQRModal()" class="text-[#637381] hover:text-[#1A1A1A] p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <span class="material-icons text-xl">close</span>
                </button>
              </div>
            </div>

            <div class="space-y-1">
              <h3 class="font-extrabold text-lg text-[#1A1A1A]">{{ visit.visitorName }}</h3>
              <p class="text-xs text-[#637381]">Residente: {{ visit.residentName }} ({{ visit.viviendaNumber }})</p>
              <div class="text-[11px] font-semibold text-[#FE5615]">{{ currentComplex().nombre }}</div>
            </div>

            <!-- Canvas Container for QR Code & Complete Details -->
            <div class="p-4 bg-white rounded-xl border-2 border-dashed border-[#FE5615]/40 inline-block space-y-2">
              <img [src]="qrDataUrl()" alt="QR Code" class="w-48 h-48 mx-auto shadow-2xs rounded-lg" />
              <div class="text-xs font-mono font-bold text-[#FE5615] tracking-wider bg-[#FE5615]/10 py-1 px-3 rounded-md border border-[#FE5615]/20">
                Código: {{ visit.qrCode }}
              </div>
            </div>

            <div class="text-[11px] text-[#637381] bg-[#F7F7F8] p-3 rounded-xl space-y-2 text-left border border-[#E1E2E9]">
              <div class="flex justify-between border-b border-[#E1E2E9] pb-1">
                <span class="font-semibold text-[#1A1A1A]">Conjunto Habitacional:</span>
                <span class="font-bold text-[#FE5615]">{{ currentComplex().nombre }}</span>
              </div>

              <!-- Ubicación para tus Visitantes -->
              <div class="border-b border-[#E1E2E9] pb-3 space-y-2">
                <div class="font-bold text-[#1A1A1A] flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <span class="material-icons text-xs text-[#FE5615]">place</span>
                    <span>Ubicación para tus Visitantes:</span>
                  </div>
                  <a 
                    [href]="getGoogleMapsUrl(currentComplex())" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200 inline-flex items-center gap-1 transition-colors"
                  >
                    <span class="material-icons text-xs">near_me</span>
                    <span>Abrir Maps</span>
                  </a>
                </div>
                <p class="text-[#1A1A1A] font-semibold pl-4 text-xs">
                  {{ currentComplex().direccion || 'Av. Juárez #100, CDMX' }}
                </p>

                <!-- Interactive Leaflet Map Preview -->
                <div class="mt-2 rounded-xl overflow-hidden border border-[#E1E2E9] shadow-2xs">
                  <app-leaflet-map
                    [lat]="currentComplex().lat"
                    [lng]="currentComplex().lng"
                    [complexName]="currentComplex().nombre"
                    [address]="currentComplex().direccion + ', ' + currentComplex().ciudad"
                    heightClass="h-40"
                    [compact]="true"
                  ></app-leaflet-map>
                </div>
              </div>

              <div class="flex justify-between border-b border-[#E1E2E9] pb-1">
                <span class="font-semibold text-[#1A1A1A]">Visitante:</span>
                <span class="font-bold text-[#1A1A1A]">{{ visit.visitorName }}</span>
              </div>
              <div class="flex justify-between border-b border-[#E1E2E9] pb-1">
                <span class="font-semibold text-[#1A1A1A]">Fecha y Hora:</span>
                <span class="font-bold text-[#1A1A1A]">{{ visit.visitDate }} - {{ visit.estimatedTime }} hrs</span>
              </div>
              <div class="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-semibold text-[10px] flex items-center gap-1.5 mt-1">
                <span class="material-icons text-sm text-amber-600">badge</span>
                <span>Presentar identificación oficial (INE) en caseta.</span>
              </div>
            </div>

            <!-- Share Buttons: Includes Composite QR Image + Location + Full Details -->
            @if (visit.status === 'Pendiente') {
              <div class="space-y-2 pt-1">
                <button 
                  (click)="sharePassWithImage(visit)" 
                  class="w-full py-2.5 px-3 bg-[#FE5615] text-white font-bold text-xs rounded-xl hover:bg-[#e0480f] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span class="material-icons text-base">share</span>
                  <span>Compartir</span>
                </button>

                <button 
                  (click)="downloadQRImage(visit)"
                  class="w-full py-2 px-3 bg-[#1A1A1A] text-white font-semibold text-xs rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span class="material-icons text-sm">file_download</span>
                  <span>Descargar Tarjeta</span>
                </button>
              </div>
            } @else {
              <div class="p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium">
                Este pase se encuentra en estado: <strong class="uppercase text-[#FE5615]">{{ visit.status }}</strong>.
              </div>
            }

            <div class="pt-2">
              <button 
                (click)="closeQRModal()" 
                class="w-full py-2 bg-[#F7F7F8] hover:bg-[#E1E2E9] border border-[#E1E2E9] text-[#1A1A1A] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      }

      <!-- MODAL 2: REGISTRAR PAGO (TRANSFERENCIA / EFECTIVO) -->
      @if (selectedPaymentToPay(); as pay) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div [class]="getModalSizeClass() + ' bg-white rounded-2xl p-6 space-y-4 shadow-xl border border-[#E1E2E9] max-h-[92vh] flex flex-col min-h-0 overflow-y-auto'">
            
            <div class="flex items-center justify-between pb-3 border-b border-[#E1E2E9] gap-2 flex-wrap sm:flex-nowrap">
              <h3 class="font-bold text-base text-[#1A1A1A]">Registrar Pago</h3>
              
              <div class="flex items-center gap-2 shrink-0">
                <button (click)="closePayModal()" class="text-[#637381] hover:text-[#1A1A1A] p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <span class="material-icons">close</span>
                </button>
              </div>
            </div>

            <div class="bg-[#F7F7F8] p-3 rounded-xl border border-[#E1E2E9] text-xs space-y-1">
              <div class="font-bold text-[#1A1A1A]">{{ pay.title }}</div>
              <div class="text-[#FE5615] font-extrabold text-base">{{ '$' + paymentForm.get('amount')?.value?.toFixed(2) }} MXN</div>
            </div>

            <form [formGroup]="paymentForm" (ngSubmit)="onSubmitPayment()" class="space-y-3">
              
              <div>
                <label for="pay-method" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Método de Pago *</label>
                <select 
                  id="pay-method"
                  formControlName="method"
                  (change)="onPaymentMethodChange()"
                  class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-medium text-[#1A1A1A]"
                >
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Efectivo">Pago en Efectivo</option>
                </select>
              </div>

              <!-- TRANSFERENCIA FIELDS -->
              @if (paymentForm.get('method')?.value === 'Transferencia') {
                
                <div>
                  <label for="pay-nombre-residente" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Nombre *</label>
                  <input 
                    id="pay-nombre-residente"
                    type="text" 
                    [value]="user()?.nombreCompleto"
                    readonly
                    class="w-full px-3 py-2 bg-[#E1E2E9]/40 border border-[#E1E2E9] rounded-xl text-xs font-semibold text-[#1A1A1A] cursor-not-allowed"
                  />
                  <p class="text-[10px] text-[#637381] mt-0.5">Nombre obtenido del perfil del usuario autenticado.</p>
                </div>

                <div class="space-y-2">
                  <label for="pay-voucher-file" class="block text-xs font-semibold text-[#1A1A1A]">Subir Comprobante de Pago *</label>
                  
                  <input 
                    #fileInput
                    id="pay-voucher-file"
                    type="file" 
                    accept="image/*"
                    (change)="onFileSelected($event)"
                    class="hidden"
                  />

                  <button 
                    type="button"
                    (click)="fileInput.click()"
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave($event)"
                    (drop)="onFileDropped($event)"
                    [class.border-[#FE5615]]="isDragging"
                    [class.bg-[#FE5615]/10]="isDragging"
                    [class.bg-[#F7F7F8]]="!isDragging"
                    class="w-full border-2 border-dashed border-[#E1E2E9] hover:border-[#FE5615] rounded-xl p-4 text-center cursor-pointer transition-all block"
                  >
                    @if (isOcrProcessing) {
                      <div class="text-xs text-[#FE5615] font-semibold flex items-center justify-center gap-2 py-2">
                        <span class="material-icons animate-spin text-base">autorenew</span>
                        <span>Extrayendo datos con OCR...</span>
                      </div>
                    } @else if (previewVoucherUrl) {
                      <div class="space-y-2">
                        <img [src]="previewVoucherUrl" alt="Baucher Preview" class="max-h-36 mx-auto rounded-lg shadow-xs border border-[#E1E2E9]" />
                        <span class="text-[10px] text-[#FE5615] font-semibold block">Arrastra o haz clic para cambiar imagen</span>
                      </div>
                    } @else {
                      <div class="space-y-1.5 py-1">
                        <div class="w-10 h-10 rounded-full bg-[#FE5615]/10 text-[#FE5615] mx-auto flex items-center justify-center">
                          <span class="material-icons text-xl">cloud_upload</span>
                        </div>
                        <p class="text-xs font-bold text-[#1A1A1A]">Arrastra y suelta tu comprobante aquí</p>
                        <p class="text-[11px] text-[#FE5615] font-semibold">o haz clic para seleccionar de tus archivos</p>
                        <p class="text-[10px] text-[#637381]">El sistema extraerá automáticamente la información por OCR.</p>
                      </div>
                    }
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="pay-date" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Fecha del Pago *</label>
                    <input 
                      id="pay-date"
                      type="date" 
                      [max]="todayStr"
                      formControlName="date"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs text-[#1A1A1A]"
                    />
                    <p class="text-[10px] text-[#637381] mt-0.5">No se permiten fechas posteriores al día de hoy.</p>
                  </div>

                  <div>
                    <label for="pay-concepto" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Concepto</label>
                    <input 
                      id="pay-concepto"
                      type="text" 
                      formControlName="concepto"
                      placeholder="Ej. Cuota Mantenimiento"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-medium text-[#1A1A1A]"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="pay-amount-trans" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Monto Depositado *</label>
                    <input 
                      id="pay-amount-trans"
                      type="number" 
                      formControlName="amount"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-bold text-[#FE5615]"
                    />
                  </div>

                  <div>
                    <label for="pay-referencia" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Folio / Referencia (Obtenido por OCR) *</label>
                    <input 
                      id="pay-referencia"
                      type="text" 
                      formControlName="referencia"
                      readonly
                      placeholder="Obtenido automáticamente por OCR"
                      class="w-full px-3 py-2 bg-[#EFEFF2] border border-[#E1E2E9] rounded-xl text-xs font-mono font-bold text-[#1A1A1A] cursor-not-allowed select-none opacity-90"
                    />
                    @if (paymentForm.get('method')?.value === 'Transferencia') {
                      @if (paymentForm.get('referencia')?.value) {
                        <p class="text-[11px] text-[#059669] mt-1 font-medium flex items-center gap-1">
                          <span>✓</span> Folio detectado por OCR (no modificable)
                        </p>
                      } @else {
                        <p class="text-[11px] text-[#DC2626] mt-1 font-medium flex items-center gap-1">
                          <span>⚠️</span> No se pudo obtener el folio del comprobante por OCR
                        </p>
                      }
                    }
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="pay-recibidopor-trans" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Recibido por (Personal / Administrador)</label>
                    <input 
                      id="pay-recibidopor-trans"
                      type="text" 
                      formControlName="recibidoPor"
                      placeholder="Nombre del beneficiario"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-medium text-[#1A1A1A]"
                    />
                  </div>

                  <div>
                    <label for="pay-banco" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Nombre del banco emisor *</label>
                    <input 
                      id="pay-banco"
                      type="text" 
                      formControlName="banco"
                      placeholder="Ej. BBVA / Santander"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-semibold text-[#1A1A1A]"
                    />
                  </div>

                  <div>
                    <label for="pay-banco-receptor" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Nombre del banco receptor</label>
                    <input 
                      id="pay-banco-receptor"
                      type="text" 
                      formControlName="bancoReceptor"
                      placeholder="Ej. BBVA / Banorte"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-semibold text-[#1A1A1A]"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="pay-cuenta-origen" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Cuenta de origen</label>
                    <input 
                      id="pay-cuenta-origen"
                      type="text" 
                      formControlName="cuentaOrigen"
                      placeholder="Ej. ****1234 / CLABE"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-medium text-[#1A1A1A]"
                    />
                  </div>

                  <div>
                    <label for="pay-cuenta-destino" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Cuenta destino</label>
                    <input 
                      id="pay-cuenta-destino"
                      type="text" 
                      formControlName="cuentaDestino"
                      placeholder="Ej. ****5678 / CLABE"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-medium text-[#1A1A1A]"
                    />
                  </div>
                </div>

              }

              <!-- EFECTIVO FIELDS -->
              @if (paymentForm.get('method')?.value === 'Efectivo') {
                
                <div>
                  <label for="pay-recibidopor" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Recibido por (Personal / Administrador) *</label>
                  <select 
                    id="pay-recibidopor"
                    formControlName="recibidoPor"
                    class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-semibold text-[#1A1A1A]"
                  >
                    <option value="" disabled>Selecciona un Administrador...</option>
                    @for (admin of adminUsers(); track admin.id) {
                      <option [value]="admin.nombreCompleto">{{ admin.nombreCompleto }} ({{ admin.correo }})</option>
                    }
                  </select>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="pay-fechaentrega" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Fecha de Entrega *</label>
                    <input 
                      id="pay-fechaentrega"
                      type="date" 
                      [max]="todayStr"
                      formControlName="fechaEntrega"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs text-[#1A1A1A]"
                    />
                  </div>

                  <div>
                    <label for="pay-amount-efec" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Monto Entregado *</label>
                    <input 
                      id="pay-amount-efec"
                      type="number" 
                      formControlName="amount"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-bold text-[#FE5615]"
                    />
                  </div>
                </div>

                <div>
                  <label for="pay-comentarios" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Comentarios / Observaciones</label>
                  <textarea 
                    id="pay-comentarios"
                    formControlName="comentarios"
                    rows="2"
                    placeholder="Notas adicionales sobre la entrega en efectivo..."
                    class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs text-[#1A1A1A]"
                  ></textarea>
                </div>

              }

              <div class="pt-2 flex items-center gap-2">
                <button 
                  type="button" 
                  (click)="closePayModal()" 
                  class="flex-1 py-2 bg-[#F7F7F8] text-[#1A1A1A] font-semibold text-xs rounded-xl border border-[#E1E2E9] cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="paymentForm.invalid"
                  class="flex-1 py-2.5 bg-[#FE5615] text-white font-bold text-xs rounded-xl hover:bg-[#e0470b] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Registrar Pago
                </button>
              </div>

            </form>

          </div>
        </div>
      }

      <!-- MODAL 3: CONFIRMACIÓN DE CANCELACIÓN DE VISITA -->
      @if (visitToCancel(); as visit) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div [class]="getModalSizeClass() + ' bg-white rounded-2xl p-6 space-y-5 border border-[#E1E2E9] shadow-xl text-center max-h-[92vh] flex flex-col min-h-0 overflow-y-auto'">
            
            <div class="flex items-center justify-between pb-2 border-b border-[#E1E2E9] gap-2 flex-wrap">
              <span class="font-bold text-xs text-[#637381]">Confirmación Requerida</span>
            </div>

            <div class="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <span class="material-icons text-2xl">warning</span>
            </div>

            <div class="space-y-2">
              <h3 class="font-bold text-base text-[#1A1A1A]">Confirmar Cancelación</h3>
              <p class="text-xs text-[#637381] leading-relaxed">
                Esta visita se cancelará. ¿Deseas continuar?
              </p>
              <div class="text-[11px] font-semibold text-[#1A1A1A] bg-[#F7F7F8] p-2 rounded-lg border border-[#E1E2E9]">
                Visitante: {{ visit.visitorName }}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <button 
                type="button"
                (click)="closeCancelModal()" 
                class="py-2.5 px-4 bg-[#F7F7F8] hover:bg-[#E1E2E9] border border-[#E1E2E9] text-[#1A1A1A] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button 
                type="button"
                (click)="confirmCancelVisit()" 
                class="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Aceptar
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class ResidentDashboardComponent {
  private vivoService = inject(VivoFacilService);
  private fb = inject(FormBuilder);

  user = this.vivoService.currentUser;
  currentComplex = this.vivoService.currentComplex;
  myVisits = this.vivoService.myVisits;
  myPaymentRequests = this.vivoService.myPaymentRequests;
  mySubmissions = this.vivoService.mySubmissions;
  myDebts = this.vivoService.myDebts;

  // Visit Status & History Filters
  visitStatusFilter = signal<string>('Todos');
  accessHistorySearch = signal<string>('');

  filteredMyVisits = computed(() => {
    const filter = this.visitStatusFilter();
    const visits = this.myVisits();
    if (filter === 'Todos') return visits;
    return visits.filter(v => {
      if (filter === 'Aprobado') return v.status === 'Aprobado' || v.status === 'Aprobada';
      if (filter === 'Rechazado') return v.status === 'Rechazado' || v.status === 'Rechazada';
      if (filter === 'Expirado') return v.status === 'Expirado' || v.status === 'Expirada';
      if (filter === 'Cancelado') return v.status === 'Cancelado' || v.status === 'Cancelada';
      return v.status === filter;
    });
  });

  filteredAccessHistory = computed(() => {
    const filter = this.visitStatusFilter();
    const search = this.accessHistorySearch().toLowerCase().trim();
    const visits = this.myVisits();

    return visits.filter(v => {
      // 1. Filter by status
      let matchesStatus = true;
      if (filter !== 'Todos') {
        if (filter === 'Aprobado') matchesStatus = v.status === 'Aprobado' || v.status === 'Aprobada';
        else if (filter === 'Rechazado') matchesStatus = v.status === 'Rechazado' || v.status === 'Rechazada';
        else if (filter === 'Expirado') matchesStatus = v.status === 'Expirado' || v.status === 'Expirada';
        else if (filter === 'Cancelado') matchesStatus = v.status === 'Cancelado' || v.status === 'Cancelada';
        else matchesStatus = v.status === filter;
      }

      if (!matchesStatus) return false;

      // 2. Filter by search text
      if (search) {
        const matchName = v.visitorName.toLowerCase().includes(search);
        const matchPlate = v.vehiclePlates ? v.vehiclePlates.toLowerCase().includes(search) : false;
        const matchCode = v.qrCode.toLowerCase().includes(search);
        const matchDate = v.visitDate.toLowerCase().includes(search);
        return matchName || matchPlate || matchCode || matchDate;
      }

      return true;
    });
  });

  getCountForVisitStatus(status: string): number {
    const visits = this.myVisits();
    if (status === 'Todos') return visits.length;
    return visits.filter(v => {
      if (status === 'Aprobado') return v.status === 'Aprobado' || v.status === 'Aprobada';
      if (status === 'Rechazado') return v.status === 'Rechazado' || v.status === 'Rechazada';
      if (status === 'Expirado') return v.status === 'Expirado' || v.status === 'Expirada';
      if (status === 'Cancelado') return v.status === 'Cancelado' || v.status === 'Cancelada';
      return v.status === status;
    }).length;
  }

  // Submission Status Filter
  submissionStatusFilter = signal<string>('Todos');

  filteredMySubmissions = computed(() => {
    const filter = this.submissionStatusFilter();
    const subs = this.mySubmissions();
    if (filter === 'Todos') return subs;
    return subs.filter(s => s.status === filter);
  });

  getCountForSubmissionStatus(status: string): number {
    const subs = this.mySubmissions();
    if (status === 'Todos') return subs.length;
    return subs.filter(s => s.status === status).length;
  }

  adminUsers = computed(() => {
    const complexId = this.currentComplex()?.id;
    return this.vivoService.users().filter(u => u.roles.includes('Administrador') && u.complexId === complexId);
  });

  navTab = this.vivoService.activeNavTab;
  
  activeTab = () => {
    const tab = this.navTab();
    if (tab === 'pagos' || tab === 'adeudos') {
      return tab;
    }
    return 'visitas';
  };

  setTab(tab: 'visitas' | 'pagos' | 'adeudos') {
    this.vivoService.activeNavTab.set(tab);
  }

  sameDayTimeValidator = (group: AbstractControl) => {
    if (!group) return null;
    const visitDate = group.get('visitDate')?.value;
    const estimatedTime = group.get('estimatedTime')?.value;

    if (!visitDate || !estimatedTime) return null;

    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    if (visitDate === today) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const currentTime = `${hours}:${minutes}`;

      if (estimatedTime < currentTime) {
        return { pastTime: true };
      }
    }

    return null;
  };

  getInitialEstimatedTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // New Visit Form
  visitForm = this.fb.group({
    visitorName: ['', [Validators.required, Validators.minLength(3)]],
    birthDate: ['1992-05-18', [Validators.required]],
    visitDate: [this.todayStr, [Validators.required]],
    estimatedTime: [this.getInitialEstimatedTime(), [Validators.required]]
  }, { validators: [this.sameDayTimeValidator] });

  get todayStr(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get currentMinTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  get isTodayVisit(): boolean {
    return this.visitForm.get('visitDate')?.value === this.todayStr;
  }

  get minTimeForVisit(): string | null {
    return this.isTodayVisit ? this.currentMinTime : null;
  }

  get isPastTimeError(): boolean {
    return !!(this.visitForm.errors?.['pastTime'] || this.visitForm.get('estimatedTime')?.errors?.['pastTime']);
  }

  onVisitDateChange() {
    this.visitForm.updateValueAndValidity();
  }

  // Modal Sizing State
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
      case 'lg': return 'max-w-3xl w-full transition-all duration-300 ease-in-out';
      case 'full': return 'max-w-[95vw] w-full max-h-[92vh] h-auto overflow-y-auto transition-all duration-300 ease-in-out';
      default: return 'max-w-md w-full transition-all duration-300 ease-in-out';
    }
  }

  // QR Modal State
  selectedQRVisit = signal<VisitorVisit | null>(null);
  visitToCancel = signal<VisitorVisit | null>(null);
  qrDataUrl = signal<string>('');

  // Payment Form & Modal State
  selectedPaymentToPay = signal<PaymentRequest | null>(null);
  activeDebtToPay = signal<Debt | null>(null);
  previewVoucherUrl: string | null = null;
  extractedOcrData: ExtractedOcrData | null = null;
  isOcrProcessing = false;

  maxTodayValidator = (control: AbstractControl) => {
    if (!control.value) return null;
    const today = new Date().toISOString().split('T')[0];
    if (control.value > today) {
      return { futureDate: true };
    }
    return null;
  };

  paymentForm = this.fb.group({
    method: ['Transferencia', [Validators.required]],
    banco: [''],
    bancoReceptor: [''],
    amount: [0, [Validators.required, Validators.min(1)]],
    date: ['', [Validators.required, this.maxTodayValidator]],
    referencia: [''],
    concepto: [''],
    recibidoPor: [''],
    cuentaOrigen: [''],
    cuentaDestino: [''],
    fechaEntrega: ['', [this.maxTodayValidator]],
    comentarios: ['']
  });

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Pendiente': return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'Aprobado':
      case 'Aprobada': return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'Rechazado':
      case 'Rechazada': return 'bg-red-100 text-red-800 border border-red-300';
      case 'Expirado':
      case 'Expirada': return 'bg-slate-200 text-slate-700 border border-slate-300';
      case 'Cancelado':
      case 'Cancelada': return 'bg-stone-800 text-white border border-stone-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  async onCreateVisit() {
    this.visitForm.updateValueAndValidity();

    if (this.visitForm.invalid) {
      if (this.isPastTimeError) {
        this.vivoService.showToast('Esa hora ya pasó. Elige una posterior.', 'error');
      } else {
        this.vivoService.showToast('Por favor completa todos los campos requeridos.', 'error');
      }
      return;
    }
    const val = this.visitForm.value;

    if (val.birthDate! > this.todayStr) {
      this.vivoService.showToast('La fecha de nacimiento no puede ser mayor a la fecha actual.', 'error');
      return;
    }

    if (val.visitDate! < this.todayStr) {
      this.vivoService.showToast('La fecha de visita no puede ser anterior al día de hoy.', 'error');
      return;
    }

    if (val.visitDate === this.todayStr && val.estimatedTime! < this.currentMinTime) {
      this.vivoService.showToast('Esa hora ya pasó. Elige una posterior.', 'error');
      return;
    }

    try {
      const visit = await this.vivoService.createVisit({
        visitorName: val.visitorName!,
        birthDate: val.birthDate!,
        visitDate: val.visitDate!,
        estimatedTime: val.estimatedTime!
      });
      this.visitForm.reset({
        visitorName: '',
        birthDate: '1992-05-18',
        visitDate: this.todayStr,
        estimatedTime: this.getInitialEstimatedTime()
      });
      this.openQRModal(visit);
      this.vivoService.showToast('Código QR generado con éxito.', 'success');
    } catch (err) {
      console.error('[onCreateVisit] Error al crear la visita:', err);
    }
  }

  async openQRModal(visit: VisitorVisit) {
    this.selectedQRVisit.set(visit);
    try {
      const url = await QRCode.toDataURL(visit.qrCode, {
        width: 300,
        margin: 2,
        color: { dark: '#1A1A1A', light: '#FFFFFF' }
      });
      this.qrDataUrl.set(url);
    } catch (e) {
      console.error('Error generating QR code:', e);
    }
  }

  closeQRModal() {
    this.selectedQRVisit.set(null);
  }

  openCancelModal(visit: VisitorVisit) {
    if (visit.status !== 'Pendiente') return;
    this.visitToCancel.set(visit);
  }

  closeCancelModal() {
    this.visitToCancel.set(null);
  }

  async confirmCancelVisit() {
    const visit = this.visitToCancel();
    if (!visit) return;

    await this.vivoService.cancelVisitQR(visit.id);
    this.closeCancelModal();
    if (this.selectedQRVisit()?.id === visit.id) {
      this.closeQRModal();
    }
    this.vivoService.showToast('La visita fue cancelada correctamente.', 'success');
  }

  getGoogleMapsUrl(complex: HousingComplex | null | undefined): string {
    const complexName = complex?.nombre || 'Conjunto Habitacional';
    const complexAddress = complex?.direccion || 'Av. Juárez #100, CDMX';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(complexName + ' ' + complexAddress)}`;
  }

  getWhatsappShareUrl(visit: VisitorVisit): string {
    const complex = this.currentComplex();
    const complexName = complex?.nombre || 'Conjunto Habitacional';
    const complexAddress = complex?.direccion || 'Av. Juárez #100, CDMX';
    const mapsUrl = this.getGoogleMapsUrl(complex);

    const text = encodeURIComponent(
      `*PASE DE ACCESO RESIDENCIAL VIVOFÁCIL*\n\n` +
      `📍 *Conjunto:* ${complexName}\n` +
      `📌 *Ubicación para tus Visitantes:* ${complexAddress}\n` +
      `🗺️ *Enlace Google Maps:* ${mapsUrl}\n\n` +
      `👤 *Visitante:* ${visit.visitorName}\n` +
      `🎫 *Código del Pase:* ${visit.qrCode}\n` +
      `📅 *Fecha Visita:* ${visit.visitDate}\n` +
      `⏰ *Hora Estimada:* ${visit.estimatedTime} hrs\n` +
      `🏠 *Vivienda:* ${visit.viviendaNumber}\n\n` +
      `⚠️ *REQUISITO OBLIGATORIO:* Es indispensable presentar identificación oficial (INE) en la caseta de vigilancia para autorizar tu acceso.`
    );
    return `https://wa.me/?text=${text}`;
  }

  async generatePassCompositeImage(visit: VisitorVisit, qrDataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const complex = this.currentComplex();
      const complexName = complex?.nombre || 'Conjunto Habitacional';
      const complexAddress = complex?.direccion || 'Av. Juárez #100, CDMX';
      const mapsUrl = this.getGoogleMapsUrl(complex);

      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 880;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(qrDataUrl);

      // Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 600, 880);

      // Header Banner
      ctx.fillStyle = '#FE5615';
      ctx.fillRect(0, 0, 600, 100);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VivoFácil', 300, 50);

      ctx.font = '15px sans-serif';
      ctx.fillText('PASE DIGITAL DE ACCESO', 300, 78);

      // Complex Name
      ctx.fillStyle = '#1A1A1A';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(complexName, 300, 135);

      // Draw QR Image
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 180, 150, 240, 240);

        // Code Box
        ctx.fillStyle = '#FFF1EC';
        ctx.fillRect(175, 400, 250, 40);
        ctx.strokeStyle = '#FE5615';
        ctx.lineWidth = 2;
        ctx.strokeRect(175, 400, 250, 40);

        ctx.fillStyle = '#FE5615';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`CÓDIGO: ${visit.qrCode}`, 300, 426);

        // Info Table Box
        ctx.fillStyle = '#F7F7F8';
        ctx.fillRect(40, 455, 520, 150);
        ctx.strokeStyle = '#E1E2E9';
        ctx.lineWidth = 1;
        ctx.strokeRect(40, 455, 520, 150);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#637381';
        ctx.font = '14px sans-serif';
        ctx.fillText('Visitante:', 70, 490);
        ctx.fillText('Fecha Visita:', 70, 525);
        ctx.fillText('Hora Estimada:', 70, 560);
        ctx.fillText('Vivienda:', 70, 590);

        ctx.fillStyle = '#1A1A1A';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(visit.visitorName, 200, 490);
        ctx.fillText(visit.visitDate, 200, 525);
        ctx.fillText(`${visit.estimatedTime} hrs`, 200, 560);
        ctx.fillText(visit.viviendaNumber || 'Residencia', 200, 590);

        // Ubicación para Visitantes Box
        ctx.fillStyle = '#EFF6FF';
        ctx.fillRect(40, 620, 520, 115);
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 1;
        ctx.strokeRect(40, 620, 520, 115);

        ctx.fillStyle = '#1E40AF';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('📍 UBICACIÓN PARA TUS VISITANTES', 60, 645);

        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(complexAddress, 60, 675);

        ctx.fillStyle = '#2563EB';
        ctx.font = '12px sans-serif';
        ctx.fillText(`Google Maps: ${mapsUrl}`, 60, 705);

        // INE Warning Banner
        ctx.fillStyle = '#FEF3C7';
        ctx.fillRect(40, 750, 520, 100);
        ctx.strokeStyle = '#F59E0B';
        ctx.strokeRect(40, 750, 520, 100);

        ctx.fillStyle = '#92400E';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('REQUISITO OBLIGATORIO DE SEGURIDAD', 300, 775);

        ctx.font = '12px sans-serif';
        ctx.fillText('Es indispensable presentar identificación oficial (INE)', 300, 805);
        ctx.fillText('vigente en caseta para autorizar el acceso.', 300, 825);

        resolve(canvas.toDataURL('image/png'));
      };
      qrImg.onerror = () => resolve(qrDataUrl);
      qrImg.src = qrDataUrl;
    });
  }

  async downloadQRImage(visit: VisitorVisit) {
    const rawQr = this.qrDataUrl();
    if (!rawQr) return;
    const compositeUrl = await this.generatePassCompositeImage(visit, rawQr);

    const a = document.createElement('a');
    a.href = compositeUrl;
    a.download = `Pase_Completo_${visit.visitorName.replace(/\s+/g, '_')}_${visit.qrCode}.png`;
    a.click();
    this.vivoService.showToast('Imagen completa del pase con ubicación descargada.', 'success');
  }

  async sharePassWithImage(visit: VisitorVisit) {
    const rawQr = this.qrDataUrl();
    const compositeUrl = await this.generatePassCompositeImage(visit, rawQr);

    const complex = this.currentComplex();
    const complexName = complex?.nombre || 'Conjunto Habitacional';
    const complexAddress = complex?.direccion || 'Av. Juárez #100, CDMX';
    const mapsUrl = this.getGoogleMapsUrl(complex);

    const textMessage = 
      `*PASE DE ACCESO RESIDENCIAL VIVOFÁCIL*\n\n` +
      `📍 *Conjunto:* ${complexName}\n` +
      `📌 *Ubicación para tus Visitantes:* ${complexAddress}\n` +
      `🗺️ *Google Maps:* ${mapsUrl}\n\n` +
      `👤 *Visitante:* ${visit.visitorName}\n` +
      `🎫 *Código del Pase:* ${visit.qrCode}\n` +
      `📅 *Fecha:* ${visit.visitDate}\n` +
      `⏰ *Hora:* ${visit.estimatedTime} hrs\n` +
      `🏠 *Vivienda:* ${visit.viviendaNumber}\n\n` +
      `⚠️ *REQUISITO OBLIGATORIO:* Presentar identificación oficial (INE) en caseta de vigilancia.`;

    try {
      if (compositeUrl && navigator.share) {
        const response = await fetch(compositeUrl);
        const blob = await response.blob();
        const file = new File([blob], `Pase_Completo_${visit.qrCode}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Pase de Acceso y Ubicación - ${visit.visitorName}`,
            text: textMessage,
            files: [file]
          });
          this.vivoService.showToast('Pase completo con ubicación compartido con éxito.', 'success');
          return;
        }
      }
    } catch (e) {
      console.warn('Native share failed or dismissed:', e);
    }

    // Fallback if native file share is unavailable
    const a = document.createElement('a');
    a.href = compositeUrl;
    a.download = `Pase_Completo_${visit.qrCode}.png`;
    a.click();

    navigator.clipboard.writeText(textMessage);
    this.vivoService.showToast('Se descargó la tarjeta del pase con ubicación y se copió la información con el enlace de Google Maps.', 'success');
  }

  // --- Payment Modal & OCR Handling ---

  openPayModal(pay: PaymentRequest) {
    this.selectedPaymentToPay.set(pay);
    this.activeDebtToPay.set(null);
    this.previewVoucherUrl = null;
    this.extractedOcrData = null;
    const today = new Date().toISOString().split('T')[0];
    this.paymentForm.patchValue({
      method: 'Transferencia',
      banco: '',
      bancoReceptor: '',
      amount: pay.amount || 0,
      date: today,
      referencia: '',
      concepto: '',
      recibidoPor: '',
      cuentaOrigen: '',
      cuentaDestino: '',
      fechaEntrega: today,
      comentarios: ''
    });
    this.onPaymentMethodChange();
  }

  payDebt(debt: Debt) {
    const totalAmount = debt.amount + (debt.sanctionAmount || 0);
    const mockRequest: PaymentRequest = {
      id: debt.paymentRequestId || `debt-${debt.id}`,
      complexId: debt.complexId,
      title: `Pago de Adeudo: ${debt.concept}`,
      type: 'Pago Extraordinario',
      category: 'Mantenimiento',
      amount: totalAmount,
      dueDate: debt.dueDate,
      description: debt.observations,
      viviendaId: debt.viviendaId,
      viviendaNumero: debt.viviendaNumero,
      status: 'Pendiente',
      createdAt: debt.createdAt
    };

    this.activeDebtToPay.set(debt);
    this.openPayModal(mockRequest);
  }

  closePayModal() {
    this.selectedPaymentToPay.set(null);
    this.activeDebtToPay.set(null);
  }

  onPaymentMethodChange() {
    const method = this.paymentForm.get('method')?.value;
    if (method === 'Transferencia') {
      this.paymentForm.get('banco')?.setValidators([Validators.required]);
      this.paymentForm.get('referencia')?.setValidators([Validators.required]);
      this.paymentForm.get('recibidoPor')?.clearValidators();
      this.paymentForm.get('fechaEntrega')?.clearValidators();
    } else {
      this.paymentForm.get('recibidoPor')?.setValidators([Validators.required]);
      this.paymentForm.get('fechaEntrega')?.setValidators([Validators.required]);
      this.paymentForm.get('banco')?.clearValidators();
      this.paymentForm.get('referencia')?.clearValidators();
    }
    this.paymentForm.get('banco')?.updateValueAndValidity();
    this.paymentForm.get('referencia')?.updateValueAndValidity();
    this.paymentForm.get('recibidoPor')?.updateValueAndValidity();
    this.paymentForm.get('fechaEntrega')?.updateValueAndValidity();
  }

  isDragging = false;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        this.processVoucherFile(file);
      } else {
        this.vivoService.showToast('Por favor, selecciona o arrastra una imagen de comprobante válida.', 'error');
      }
    }
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.processVoucherFile(file);
  }

  async processVoucherFile(file: File) {
    this.isOcrProcessing = true;
    const reader = new FileReader();
    reader.onload = async () => {
      this.previewVoucherUrl = reader.result as string;
      
      const ocrRes = await this.vivoService.runOcrOnVoucher(this.previewVoucherUrl);
      this.extractedOcrData = ocrRes;
      this.isOcrProcessing = false;

      const ocrDate = (ocrRes.fecha && ocrRes.fecha <= this.todayStr) ? ocrRes.fecha : this.todayStr;
      const extractedRef = ocrRes.referencia ? ocrRes.referencia.trim() : '';

      this.paymentForm.patchValue({
        banco: ocrRes.banco || '',
        bancoReceptor: ocrRes.bancoReceptor || ocrRes.banco || '',
        amount: (ocrRes.monto && ocrRes.monto > 0) ? ocrRes.monto : (this.selectedPaymentToPay()?.amount || 0),
        date: ocrDate,
        referencia: extractedRef,
        concepto: ocrRes.concepto || '',
        recibidoPor: ocrRes.beneficiario || '',
        cuentaOrigen: ocrRes.cuentaOrigen || '',
        cuentaDestino: ocrRes.cuentaDestino || ''
      });

      if (extractedRef) {
        this.vivoService.showToast(`Comprobante analizado por OCR. Folio detectado: ${extractedRef}`, 'info');
      } else {
        this.vivoService.showToast('No se pudo obtener el folio/referencia del comprobante mediante OCR. Por favor sube una imagen clara donde el folio sea legible.', 'error');
      }
    };
    reader.readAsDataURL(file);
  }

  async onSubmitPayment() {
    const pay = this.selectedPaymentToPay();
    if (!pay || this.paymentForm.invalid) return;

    const val = this.paymentForm.value;
    const debt = this.activeDebtToPay();

    if (val.method === 'Transferencia') {
      if (!val.referencia || !val.referencia.trim()) {
        this.vivoService.showToast('No se pudo obtener el folio/referencia del comprobante mediante OCR. No es posible registrar el pago sin un folio detectado.', 'error');
        return;
      }
    }
console.log('DEBUG FECHAS:', {
  valDate: val.date,
  fechaEntrega: val.fechaEntrega,
  todayStr: this.todayStr,
  metodo: val.method
});

    if (val.method === 'Transferencia' && val.date && val.date > this.todayStr) {
      this.vivoService.showToast('La fecha del pago no puede ser posterior al día de hoy.', 'error');
      return;
    }

    if (val.method === 'Efectivo' && val.fechaEntrega && val.fechaEntrega > this.todayStr) {
      this.vivoService.showToast('La fecha de entrega no puede ser posterior al día de hoy.', 'error');
      return;
    }

    try {
      await this.vivoService.submitPaymentVoucher({
        paymentRequestId: pay.id,
        paymentTitle: pay.title,
        method: val.method as 'Transferencia' | 'Efectivo',
        amount: val.amount!,
        date: val.method === 'Efectivo'
          ? (val.fechaEntrega || this.todayStr)
          : (val.date || this.todayStr),
        voucherUrl: this.previewVoucherUrl || undefined,
        extractedOcr: this.extractedOcrData || undefined,
        banco: val.banco || undefined,
        bancoReceptor: val.bancoReceptor || undefined,
        referencia: val.referencia || undefined,
        concepto: val.concepto || undefined,
        recibidoPor: val.recibidoPor || undefined,
        cuentaOrigen: val.cuentaOrigen || undefined,
        cuentaDestino: val.cuentaDestino || undefined,
        fechaEntrega: val.fechaEntrega || undefined,
        comentarios: val.comentarios || undefined,
        debtId: debt?.id || undefined
      });

      this.closePayModal();
    } catch (err) {
      console.error('Error al registrar comprobante:', err);
    }
  }
}
