import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { VivoFacilService } from '../../services/vivofacil.service';
import { User, UserRole, AccountStatus, PaymentSubmission, Debt } from '../../models/vivofacil.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-1 sm:px-3 lg:px-4 py-2 sm:py-4 space-y-4 sm:space-y-6">
      
      <!-- Welcome Header -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 border border-[#E1E2E9] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-[#1A1A1A]">Panel de Administración</h1>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FE5615] text-white">
              Administrador
            </span>
          </div>
          <p class="text-xs text-[#637381] mt-1">
            Gestión Centralizada para <strong class="text-[#1A1A1A]">{{ currentComplex().nombre }}</strong> — {{ currentComplex().direccion }}
          </p>
        </div>
      </div>

      <!-- SUBTAB 1: APROBACIÓN DE CUENTAS DE REGISTRO LIBRE -->
      @if (activeSubtab() === 'aprobaciones') {
        <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-[#E1E2E9]">
            <div>
              <h2 class="font-bold text-[#1A1A1A] text-base">Solicitudes de Registro Pendientes</h2>
              <p class="text-xs text-[#637381]">Nuevos usuarios que han creado su cuenta solicitando unirse a este conjunto habitacional.</p>
            </div>
            <span class="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-lg border border-amber-200">
              Pendientes: {{ pendingUsers().length }}
            </span>
          </div>

          @if (pendingUsers().length === 0) {
            <div class="text-center py-12 text-[#637381] space-y-2">
              <span class="material-icons text-4xl text-emerald-500">task_alt</span>
              <p class="text-xs font-semibold text-[#1A1A1A]">No hay solicitudes pendientes de aprobación.</p>
              <p class="text-[11px]">Todas las cuentas de registro libre están atendidas.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (u of pendingUsers(); track u.id) {
                <div class="p-4 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl space-y-3">
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="font-bold text-sm text-[#1A1A1A]">{{ u.nombreCompleto }}</div>
                      <div class="text-xs text-[#637381]">{{ u.correo }} | {{ u.telefono }}</div>
                    </div>
                    <span class="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                      Pendiente
                    </span>
                  </div>

                  <div class="text-xs bg-white p-2.5 rounded-lg border border-[#E1E2E9]">
                    <span class="text-[#637381]">Vivienda Solicitada:</span>
                    <strong class="text-[#FE5615] ml-1">{{ u.viviendaNumero }}</strong>
                  </div>

                  <div class="flex items-center gap-2 pt-1">
                    <button 
                      (click)="approveUser(u.id)"
                      class="flex-1 py-1.5 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 transition-colors shadow-xs flex items-center justify-center gap-1"
                    >
                      <span class="material-icons text-sm">check</span>
                      <span>Aprobar Cuenta</span>
                    </button>

                    <button 
                      (click)="rejectUser(u.id)"
                      class="flex-1 py-1.5 bg-red-50 text-red-700 font-semibold text-xs rounded-lg hover:bg-red-100 transition-colors border border-red-200 flex items-center justify-center gap-1"
                    >
                      <span class="material-icons text-sm">close</span>
                      <span>Rechazar</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- SUBTAB 2: ADMINISTRACIÓN DE USUARIOS Y ROLES -->
      @if (activeSubtab() === 'usuarios') {
        <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#E1E2E9] gap-3">
            <div>
              <h2 class="font-bold text-[#1A1A1A] text-base">Directorio de Usuarios y Gestión de Roles</h2>
              <p class="text-xs text-[#637381]">Modifica roles (Administrador, Residente, Vigilante) y estados de cuenta.</p>
            </div>

            <!-- Filtro por Rol -->
            <div class="flex items-center gap-2 bg-[#F7F7F8] border border-[#E1E2E9] px-3 py-1.5 rounded-xl">
              <span class="material-icons text-sm text-[#FE5615]">filter_list</span>
              <label for="role-filter-select" class="text-xs font-semibold text-[#637381]">Filtrar Rol:</label>
              <select 
                id="role-filter-select"
                [value]="selectedRoleFilter()" 
                (change)="onRoleFilterChange($event)"
                class="bg-transparent text-xs font-bold text-[#1A1A1A] focus:outline-none cursor-pointer"
              >
                <option value="Todos">Todos los roles</option>
                <option value="Administrador">Administrador</option>
                <option value="Residente">Residente</option>
                <option value="Vigilante">Vigilante</option>
              </select>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-[#F9F9F9] text-[#637381] font-semibold border-b border-[#E1E2E9]">
                <tr>
                  <th class="p-3">Nombre Completo</th>
                  <th class="p-3">Contacto</th>
                  <th class="p-3">Vivienda</th>
                  <th class="p-3">Roles Asignados</th>
                  <th class="p-3">Estado</th>
                  <th class="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E1E2E9]">
                @for (u of filteredComplexUsers(); track u.id) {
                  <tr>
                    <td class="p-3 font-bold text-[#1A1A1A]">{{ u.nombreCompleto }}</td>
                    <td class="p-3 text-[#637381]">{{ u.correo }}<br>{{ u.telefono }}</td>
                    <td class="p-3 font-semibold text-[#FE5615]">{{ u.viviendaNumero }}</td>
                    <td class="p-3">
                      <div class="flex flex-wrap gap-1">
                        @for (r of u.roles; track r) {
                          <span class="px-2 py-0.5 bg-[#FE5615]/10 text-[#FE5615] font-semibold rounded-md text-[10px]">
                            {{ r }}
                          </span>
                        }
                      </div>
                    </td>
                    <td class="p-3">
                      <span 
                        [class]="u.status === 'Activa' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (u.status === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200')"
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      >
                        {{ u.status }}
                      </span>
                    </td>
                    <td class="p-3">
                      <button 
                        (click)="openEditUserModal(u)"
                        class="px-2.5 py-1 bg-[#1A1A1A] text-white text-[11px] font-semibold rounded-lg hover:bg-black transition-colors cursor-pointer"
                      >
                        Editar Roles / Estado
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- SUBTAB 3: CREAR PAGOS, PAGOS PENDIENTES DEL MES Y REVISAR COMPROBANTES CON OCR -->
      @if (activeSubtab() === 'pagos') {
        <div class="space-y-6">

          <!-- SECCIÓN: PAGOS PENDIENTES DEL MES -->
          <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-5">
            <div class="flex flex-col gap-4 pb-4 border-b border-[#E1E2E9]">
              <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="material-icons text-[#FE5615] text-xl">pending_actions</span>
                    <h3 class="font-bold text-[#1A1A1A] text-base">Pagos Pendientes del Mes</h3>
                  </div>
                  <p class="text-xs text-[#637381] mt-0.5">Control de solicitudes activas, estado de pago por vivienda, adeudos y avisos de cobro del periodo.</p>
                </div>

                <!-- Filtro de Mes y Recordatorio Masivo lado a lado -->
                <div class="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  <!-- Filtro de Mes -->
                  <div class="flex items-center gap-1.5 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl px-3 py-2 shadow-2xs shrink-0">
                    <span class="material-icons text-sm text-[#FE5615]">calendar_month</span>
                    <label for="month-filter-select" class="text-xs font-semibold text-[#637381] whitespace-nowrap">Mes:</label>
                    <select 
                      id="month-filter-select"
                      [value]="selectedPaymentMonth()" 
                      (change)="onMonthChange($event)"
                      class="bg-transparent text-xs font-bold text-[#1A1A1A] focus:outline-none cursor-pointer"
                    >
                      @for (m of availablePaymentMonths(); track m.value) {
                        <option [value]="m.value">{{ m.label }}</option>
                      }
                    </select>
                  </div>

                  <!-- Botón Recordatorio Masivo -->
                  <button
                    type="button"
                    (click)="sendMassReminders()"
                    class="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    title="Enviar notificación a todos los residentes con pagos pendientes del periodo"
                  >
                    <span class="material-icons text-sm">notifications_active</span>
                    <span>Recordatorio Masivo</span>
                  </button>
                </div>
              </div>

              <!-- Filtro por Estado (Todos | Activos | Históricos) -->
              <div class="flex items-center gap-2 overflow-x-auto pt-1 pb-1 scrollbar-none">
                <span class="text-xs font-semibold text-[#637381] mr-1 flex items-center gap-1 shrink-0">
                  <span class="material-icons text-xs">filter_list</span>
                  Filtro:
                </span>

                <button
                  type="button"
                  (click)="paymentStatusFilter.set('Todos')"
                  [class]="paymentStatusFilter() === 'Todos' ? 'bg-[#FE5615] text-white font-bold' : 'bg-[#F7F7F8] hover:bg-slate-200 text-[#637381] font-semibold'"
                  class="px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 border border-[#E1E2E9]"
                >
                  <span>Todos</span>
                  <span class="px-1.5 py-0.2 rounded-full text-[10px]" [class]="paymentStatusFilter() === 'Todos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#637381]'">
                    {{ getPaymentStatusFilterCount('Todos') }}
                  </span>
                </button>

                <button
                  type="button"
                  (click)="paymentStatusFilter.set('Activos')"
                  [class]="paymentStatusFilter() === 'Activos' ? 'bg-emerald-600 text-white font-bold' : 'bg-[#F7F7F8] hover:bg-emerald-50 text-[#637381] font-semibold'"
                  class="px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 border border-[#E1E2E9]"
                >
                  <span class="material-icons text-xs text-emerald-600" [class.text-white]="paymentStatusFilter() === 'Activos'">event_available</span>
                  <span>Activos</span>
                  <span class="px-1.5 py-0.2 rounded-full text-[10px]" [class]="paymentStatusFilter() === 'Activos' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'">
                    {{ getPaymentStatusFilterCount('Activos') }}
                  </span>
                </button>

                <button
                  type="button"
                  (click)="paymentStatusFilter.set('Históricos')"
                  [class]="paymentStatusFilter() === 'Históricos' ? 'bg-slate-700 text-white font-bold' : 'bg-[#F7F7F8] hover:bg-slate-200 text-[#637381] font-semibold'"
                  class="px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 border border-[#E1E2E9]"
                >
                  <span class="material-icons text-xs text-slate-600" [class.text-white]="paymentStatusFilter() === 'Históricos'">history</span>
                  <span>Históricos</span>
                  <span class="px-1.5 py-0.2 rounded-full text-[10px]" [class]="paymentStatusFilter() === 'Históricos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'">
                    {{ getPaymentStatusFilterCount('Históricos') }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Lista de Solicitudes de Pago del Mes -->
            @if (filteredMonthlyPendingPayments().length === 0) {
              <div class="text-center py-8 bg-[#F7F7F8] rounded-xl border border-[#E1E2E9] text-xs text-[#637381]">
                @if (paymentStatusFilter() === 'Todos') {
                  No hay solicitudes de pago registradas para este mes.
                } @else if (paymentStatusFilter() === 'Activos') {
                  No hay solicitudes de pago activas (con fecha límite hoy o futura) para este mes.
                } @else {
                  No hay solicitudes de pago históricas (con fecha límite anterior a hoy) para este mes.
                }
              </div>
            } @else {
              <div class="space-y-4">
                @for (item of filteredMonthlyPendingPayments(); track item.request.id) {
                  <div class="border border-[#E1E2E9] rounded-xl overflow-hidden bg-[#F7F7F8] transition-all shadow-2xs">
                    <!-- Encabezado de la solicitud -->
                    <div class="p-4 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div class="space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-extrabold text-sm text-[#1A1A1A]">{{ item.request.title }}</span>
                          <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F7F7F8] border border-[#E1E2E9] text-[#637381]">
                            {{ item.request.category }}
                          </span>
                          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            {{ item.request.type }}
                          </span>

                          <!-- Tag de Estado basado únicamente en fecha_limite -->
                          @if (isDueDateActive(item.request.dueDate)) {
                            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <span class="material-icons text-[12px]">event_available</span>
                              Activo
                            </span>
                          } @else {
                            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                              <span class="material-icons text-[12px]">history</span>
                              Histórico
                            </span>
                          }
                        </div>

                        <div class="text-xs text-[#637381] flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Fecha Límite: <strong class="text-[#1A1A1A]">{{ item.request.dueDate }}</strong></span>
                          <span>Monto por Vivienda: <strong class="text-[#FE5615]">{{ '$' + item.request.amount.toLocaleString() + ' MXN' }}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- FILA INFERIOR: CREAR NUEVA SOLICITUD Y REVISAR COMPROBANTES CON OCR -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Column 1: Create Payment Form -->
            <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
              <h3 class="font-bold text-[#1A1A1A] text-base pb-2 border-b border-[#E1E2E9] flex items-center gap-1.5">
                <span class="material-icons text-[#FE5615]">add_card</span>
                Crear Nueva Solicitud de Pago
              </h3>

              <form [formGroup]="createPaymentForm" (ngSubmit)="onCreatePaymentSubmit()" class="space-y-3">
                <div>
                  <label for="pago-title" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Título del Pago *</label>
                  <input 
                    id="pago-title"
                    type="text" 
                    formControlName="title"
                    placeholder="Ej. Cuota Mantenimiento Septiembre"
                    class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs focus:outline-none focus:border-[#FE5615]"
                  />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label for="pago-type" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Tipo *</label>
                    <select 
                      id="pago-type"
                      formControlName="type"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs"
                    >
                      <option value="Pago Fijo">Pago Fijo</option>
                      <option value="Pago Extraordinario">Pago Extraordinario</option>
                    </select>
                  </div>

                  <div>
                    <label for="pago-category" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Categoría *</label>
                    <select 
                      id="pago-category"
                      formControlName="category"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs"
                    >
                      <option value="Cuota mensual">Cuota mensual</option>
                      <option value="Seguridad">Seguridad</option>
                      <option value="Limpieza">Limpieza</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Reparaciones">Reparaciones</option>
                      <option value="Renovaciones">Renovaciones</option>
                      <option value="Obras">Obras</option>
                      <option value="Mantenimiento especial">Mantenimiento especial</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label for="pago-amount" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Monto (MXN) *</label>
                    <input 
                      id="pago-amount"
                      type="number" 
                      formControlName="amount"
                      placeholder="1250"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-bold text-[#FE5615]"
                    />
                  </div>

                  <div>
                    <label for="pago-dueDate" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Fecha Límite *</label>
                    <input 
                      id="pago-dueDate"
                      type="date" 
                      formControlName="dueDate"
                      [min]="todayStr"
                      class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label for="pago-description" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Descripción / Notas</label>
                  <textarea 
                    id="pago-description"
                    formControlName="description"
                    rows="2"
                    placeholder="Detalles del concepto de cobro"
                    class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  [disabled]="createPaymentForm.invalid"
                  class="w-full py-2.5 bg-[#FE5615] text-white font-semibold rounded-xl hover:bg-[#e0470b] transition-colors text-xs flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <span class="material-icons text-sm">save</span>
                  <span>Publicar Solicitud de Pago</span>
                </button>
              </form>
            </div>

            <!-- Column 2 & 3: Resident Submitted Vouchers Review -->
            <div class="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
              <div class="border-b border-[#E1E2E9] pb-3 space-y-3">
                <h3 class="font-bold text-[#1A1A1A] text-base flex items-center justify-between">
                  <span>Revisión de Comprobantes de Residentes</span>
                  <span class="text-xs font-normal text-[#637381]">Extracción OCR incluida</span>
                </h3>

                <!-- Filter Bar by Status -->
                <div class="flex flex-wrap items-center gap-2 pt-1">
                  <span class="text-xs font-bold text-[#1A1A1A] flex items-center gap-1 mr-1">
                    <span class="material-icons text-sm text-[#FE5615]">filter_list</span>
                    Estatus:
                  </span>

                  <button
                    type="button"
                    (click)="submissionStatusFilter.set('Todos')"
                    [class]="submissionStatusFilter() === 'Todos' 
                      ? 'px-3 py-1.5 bg-[#FE5615] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer' 
                      : 'px-3 py-1.5 bg-[#F7F7F8] hover:bg-[#E1E2E9] text-[#637381] text-xs font-semibold rounded-xl transition-colors cursor-pointer'"
                  >
                    Todos ({{ submissionsForComplex().length }})
                  </button>

                  <button
                    type="button"
                    (click)="submissionStatusFilter.set('Pendientes')"
                    [class]="submissionStatusFilter() === 'Pendientes' 
                      ? 'px-3 py-1.5 bg-[#FE5615] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer' 
                      : 'px-3 py-1.5 bg-[#F7F7F8] hover:bg-[#E1E2E9] text-[#637381] text-xs font-semibold rounded-xl transition-colors cursor-pointer'"
                  >
                    Pendientes ({{ getSubmissionCountByStatus('Pendiente') }})
                  </button>

                  <button
                    type="button"
                    (click)="submissionStatusFilter.set('Aprobados')"
                    [class]="submissionStatusFilter() === 'Aprobados' 
                      ? 'px-3 py-1.5 bg-[#FE5615] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer' 
                      : 'px-3 py-1.5 bg-[#F7F7F8] hover:bg-[#E1E2E9] text-[#637381] text-xs font-semibold rounded-xl transition-colors cursor-pointer'"
                  >
                    Aprobados ({{ getSubmissionCountByStatus('Aprobado') }})
                  </button>

                  <button
                    type="button"
                    (click)="submissionStatusFilter.set('Rechazados')"
                    [class]="submissionStatusFilter() === 'Rechazados' 
                      ? 'px-3 py-1.5 bg-[#FE5615] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer' 
                      : 'px-3 py-1.5 bg-[#F7F7F8] hover:bg-[#E1E2E9] text-[#637381] text-xs font-semibold rounded-xl transition-colors cursor-pointer'"
                  >
                    Rechazados ({{ getSubmissionCountByStatus('Rechazado') }})
                  </button>
                </div>
              </div>

              @if (filteredSubmissionsForComplex().length === 0) {
                <div class="text-center py-12 text-xs text-[#637381]">
                  @if (submissionStatusFilter() === 'Todos') {
                    No hay comprobantes registrados.
                  } @else {
                    No hay comprobantes con el estado "{{ submissionStatusFilter() }}".
                  }
                </div>
              } @else {
                <div class="space-y-4">
                  @for (s of filteredSubmissionsForComplex(); track s.id) {
                    <div class="bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl p-4 space-y-3">
                      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#E1E2E9] pb-2">
                        <div>
                          <div class="font-bold text-sm text-[#1A1A1A]">{{ s.residentName }} ({{ s.viviendaNumero }})</div>
                          <div class="text-xs text-[#637381]">{{ s.paymentTitle }} • Método: <span class="font-semibold text-[#1A1A1A]">{{ s.method }}</span></div>
                        </div>
                        <div class="text-right">
                          <div class="font-extrabold text-base text-[#FE5615]">{{ '$' + s.amount.toFixed(2) }} MXN</div>
                          <span 
                            class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            [class.bg-amber-100]="s.status === 'Pendiente'"
                            [class.text-amber-800]="s.status === 'Pendiente'"
                            [class.bg-emerald-100]="s.status === 'Aprobado'"
                            [class.text-emerald-800]="s.status === 'Aprobado'"
                            [class.bg-red-100]="s.status === 'Rechazado'"
                            [class.text-red-800]="s.status === 'Rechazado'"
                          >
                            {{ s.status }}
                          </span>
                        </div>
                      </div>

                      <!-- Details & OCR Section -->
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        
                        <!-- Datos del Registro (Efectivo o Transferencia) -->
                        <div class="bg-white p-3 rounded-lg border border-[#E1E2E9] space-y-1">
                          <div class="font-bold text-[#1A1A1A] text-xs flex items-center gap-1 border-b border-[#F0F0F4] pb-1 mb-1">
                            <span class="material-icons text-sm text-[#FE5615]">payments</span>
                            Detalles del Registro ({{ s.method }}):
                          </div>
                          @if (s.method === 'Efectivo') {
                            <div>Recibido por: <strong>{{ s.recibidoPor || 'No especificado' }}</strong></div>
                            <div>Fecha: <strong>{{ s.fechaEntrega || s.date }}</strong></div>
                            <div>Monto: <strong>{{ '$' + s.amount.toFixed(2) + ' MXN' }}</strong></div>
                            <div>Comentario: <strong>{{ s.comentarios || 'Sin comentarios' }}</strong></div>
                          } @else {
                            <div>Banco: <strong>{{ s.bancoReceptor || s.banco || 'No especificado' }}</strong></div>
                            <div>Folio / Referencia: <strong class="font-mono text-[#FE5615]">{{ s.referencia || 'No especificada' }}</strong></div>
                            <div>Concepto: <strong>{{ s.concepto || s.paymentTitle || 'No especificado' }}</strong></div>
                            <div>Fecha: <strong>{{ s.date }}</strong></div>
                            <div>Monto: <strong>{{ '$' + s.amount.toFixed(2) + ' MXN' }}</strong></div>
                            @if (s.comentarios) {
                              <div>Comentario: <strong>{{ s.comentarios }}</strong></div>
                            }
                          }
                        </div>

                        <!-- Image preview with zoom modal (for transfer or image uploads) -->
                        @if (s.voucherUrl) {
                          <div>
                            <span class="text-[10px] text-[#637381] font-semibold block mb-1">Comprobante / Baucher:</span>
                            <button 
                              type="button"
                              (click)="openVoucherModal(s.voucherUrl)" 
                              class="relative group cursor-pointer inline-block overflow-hidden rounded-lg border border-[#E1E2E9] text-left p-0 bg-transparent border-none"
                            >
                              <img [src]="s.voucherUrl" alt="Baucher" class="max-h-36 rounded-lg object-cover group-hover:scale-105 transition-transform duration-200" />
                              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 rounded-lg">
                                <span class="material-icons text-sm">zoom_in</span>
                                <span>Clic para ampliar</span>
                              </div>
                            </button>
                          </div>
                        }

                        <!-- Extracted OCR details -->
                        @if (s.extractedOcr; as ocr) {
                          <div class="bg-white p-3 rounded-lg border border-[#E1E2E9] space-y-1">
                            <div class="font-bold text-[#FE5615] text-xs flex items-center gap-1">
                              <span class="material-icons text-sm">auto_awesome</span>
                              Datos Extraídos por OCR:
                            </div>
                            <div>Banco: <strong>{{ ocr.banco }}</strong></div>
                            <div>Fecha/Hora: <strong>{{ ocr.fecha }} {{ ocr.hora }}</strong></div>
                            <div>Monto OCR: <strong>{{ '$' + ocr.monto }}</strong></div>
                            <div>Referencia/Folio: <strong class="font-mono text-[#FE5615]">{{ ocr.referencia }}</strong></div>
                          </div>
                        }
                      </div>

                      <!-- Actions -->
                      @if (s.status === 'Pendiente') {
                        <div class="flex items-center gap-2 pt-2 border-t border-[#E1E2E9]">
                          <button 
                            (click)="approveSubmission(s.id)"
                            class="flex-1 py-1.5 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span class="material-icons text-sm">check_circle</span>
                            Aprobar Pago
                          </button>

                          <button 
                            (click)="openRejectModal(s)"
                            class="flex-1 py-1.5 bg-red-50 text-red-700 font-semibold text-xs rounded-lg hover:bg-red-100 transition-colors border border-red-200 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span class="material-icons text-sm">cancel</span>
                            Rechazar
                          </button>
                        </div>
                      } @else {
                        <div class="text-[11px] text-[#637381] italic">
                          Atendido: {{ s.adminObservation }}
                        </div>
                      }

                    </div>
                  }
                </div>
              }

            </div>

          </div>

        </div>
      }

      <!-- SUBTAB 4: REGISTRO DE ADEUDOS Y SANCIONES -->
      @if (activeSubtab() === 'adeudos') {
        <div class="space-y-6">
          
          <!-- Section 1: NUEVOS ADEUDOS (PAGOS VENCIDOS) -->
          <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-[#E1E2E9]">
              <h3 class="font-bold text-[#1A1A1A] text-base flex items-center gap-2">
                <span class="material-icons text-amber-600">warning</span>
                <span>Nuevos Adeudos por Pagos Vencidos</span>
              </h3>
              <span class="text-xs px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-full">
                {{ newDebtsForComplex().length }} {{ newDebtsForComplex().length === 1 ? 'pendiente' : 'pendientes' }}
              </span>
            </div>

            @if (newDebtsForComplex().length === 0) {
              <div class="text-center py-8 text-xs text-[#637381] flex flex-col items-center gap-2">
                <span class="material-icons text-3xl text-emerald-500">check_circle</span>
                <span>No hay nuevos adeudos por pagos vencidos pendientes de evaluar sanción.</span>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (d of newDebtsForComplex(); track d.id) {
                  <div class="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-bold text-sm text-[#1A1A1A]">{{ d.viviendaNumero }}</span>
                        <span class="text-xs font-extrabold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md">
                          Vencido
                        </span>
                      </div>
                      <div class="text-xs text-[#1A1A1A] font-semibold mt-1.5">{{ d.concept }}</div>
                      <div class="text-[11px] text-[#637381] mt-1 space-y-0.5">
                        <div>Creado: <span class="font-medium text-[#1A1A1A]">{{ getPaymentRequestCreatedAt(d) }}</span></div>
                        <div>Fecha límite: <span class="font-medium text-[#1A1A1A]">{{ d.dueDate }}</span></div>
                      </div>
                      <div class="mt-2 text-xs font-bold text-red-600">
                        Monto Base: {{ '$' + d.amount.toFixed(2) }} MXN
                      </div>
                    </div>

                    <div class="pt-2 border-t border-amber-200/60 flex items-center gap-2">
                      <button 
                        (click)="openApplySanctionModal(d)"
                        class="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span class="material-icons text-xs">gavel</span>
                        <span>Aplicar Sanción</span>
                      </button>

                      <button 
                        (click)="openNoSanctionModal(d)"
                        class="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span class="material-icons text-xs">block</span>
                        <span>No Aplicar Sanción</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Section 2: LISTADO DE ADEUDOS EN REVISIÓN -->
          <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
            <h3 class="font-bold text-[#1A1A1A] text-base pb-2 border-b border-[#E1E2E9] flex items-center gap-2">
              <span class="material-icons text-amber-600">rate_review</span>
              <span>Listado de Adeudos en revisión</span>
            </h3>

            @if (debtsInReviewForComplex().length === 0) {
              <div class="text-center py-10 text-xs text-[#637381]">
                No hay adeudos actualmente en revisión.
              </div>
            } @else {
              <div class="space-y-3">
                @for (d of debtsInReviewForComplex(); track d.id) {
                  @let sub = getPendingSubmissionForDebt(d);
                  <div 
                    [class]="(d.status === 'En revisión' || sub) ? 'bg-amber-50/40 border-amber-200' : 'bg-red-50/40 border-red-200'"
                    class="p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div class="font-bold text-sm text-[#1A1A1A]">
                        {{ d.residentName }} ({{ d.viviendaNumero }})
                      </div>
                      <div class="text-xs text-[#1A1A1A] font-semibold mt-0.5">{{ d.concept }}</div>
                      <div class="text-[11px] text-[#637381]">
                        Vencimiento: {{ d.dueDate }} | Obs: {{ d.observations }}
                      </div>
                      @if (d.sanctionAmount && d.sanctionAmount > 0) {
                        <div class="text-[11px] font-bold text-red-700 mt-1">
                          Sanción: {{ '$' + d.sanctionAmount }} MXN — {{ d.sanctionReason }}
                        </div>
                      } @else if (d.sanctionReason) {
                        <div class="text-[11px] font-medium text-slate-600 mt-1">
                          {{ d.sanctionReason }}
                        </div>
                      }
                    </div>
                    <div class="text-right shrink-0 space-y-2">
                      <div class="font-extrabold text-base text-[#1A1A1A]">
                        {{ '$' + (d.amount + (d.sanctionAmount || 0)).toFixed(2) }} MXN
                      </div>
                      <div class="flex items-center justify-end gap-1.5 flex-wrap">
                        <span 
                          [class]="(d.status === 'En revisión' || sub) ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'"
                          class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        >
                          {{ sub ? 'En revisión' : d.status }}
                        </span>

                        @if (sub) {
                          <button 
                            (click)="approveSubmission(sub.id)"
                            class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Aprobar pago recibido"
                          >
                            <span class="material-icons text-xs">check_circle</span>
                            <span>Aprobar</span>
                          </button>
                          <button 
                            (click)="openRejectModal(sub)"
                            class="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Rechazar pago (especificar motivo)"
                          >
                            <span class="material-icons text-xs">cancel</span>
                            <span>Rechazar</span>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Section 3: HISTORIAL DE ADEUDOS -->
          <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
            <h3 class="font-bold text-[#1A1A1A] text-base pb-2 border-b border-[#E1E2E9] flex items-center gap-2">
              <span class="material-icons text-slate-700">history</span>
              <span>Historial de adeudos</span>
            </h3>

            @if (debtsHistoryForComplex().length === 0) {
              <div class="text-center py-10 text-xs text-[#637381]">
                No hay adeudos en el historial.
              </div>
            } @else {
              <div class="space-y-3">
                @for (d of debtsHistoryForComplex(); track d.id) {
                  <div 
                    [class]="d.status === 'Liquidado' ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/40 border-red-200'"
                    class="p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div class="font-bold text-sm text-[#1A1A1A]">
                        {{ d.residentName }} ({{ d.viviendaNumero }})
                      </div>
                      <div class="text-xs text-[#1A1A1A] font-semibold mt-0.5">{{ d.concept }}</div>
                      <div class="text-[11px] text-[#637381]">
                        Vencimiento original: {{ d.dueDate }} | Obs: {{ d.observations }}
                      </div>
                      @if (d.sanctionAmount && d.sanctionAmount > 0) {
                        <div class="text-[11px] font-bold text-slate-700 mt-1">
                          Sanción incluida: {{ '$' + d.sanctionAmount }} MXN — {{ d.sanctionReason }}
                        </div>
                      } @else if (d.sanctionReason) {
                        <div class="text-[11px] font-medium text-slate-600 mt-1">
                          {{ d.sanctionReason }}
                        </div>
                      }
                    </div>
                    <div class="text-right shrink-0 space-y-1.5">
                      <div class="font-extrabold text-base text-[#1A1A1A]">
                        {{ '$' + (d.amount + (d.sanctionAmount || 0)).toFixed(2) }} MXN
                      </div>
                      <div class="flex items-center justify-end">
                        <span 
                          [class]="d.status === 'Liquidado' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                          class="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                        >
                          <span class="material-icons text-xs">{{ d.status === 'Liquidado' ? 'check_circle' : 'cancel' }}</span>
                          <span>{{ d.status === 'Liquidado' ? 'Aprobado / Liquidado' : 'Rechazado' }}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

        </div>
      }

      <!-- SUBTAB 5: CONSULTA DE HISTORIAL DE ACCESOS Y OBSERVACIONES -->
      @if (activeSubtab() === 'historial') {
        <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E1E2E9]">
            <div>
              <h2 class="font-bold text-[#1A1A1A] text-base">Historial Global de Accesos</h2>
              <p class="text-xs text-[#637381]">Consulta las visitas registradas, fechas de escaneo, placas registradas y observaciones de caseta.</p>
            </div>

            <!-- Filters Bar -->
            <div class="flex flex-wrap items-center gap-2">
              <!-- Search Input -->
              <div class="relative flex-1 sm:w-64">
                <span class="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#637381]">search</span>
                <input 
                  type="text"
                  [value]="globalAccessSearch()"
                  (input)="globalAccessSearch.set($any($event.target).value)"
                  placeholder="Buscar visitante, residente, casa, placas..."
                  class="w-full pl-8 pr-7 py-1.5 bg-[#F7F7F8] border border-[#E1E2E9] text-[#1A1A1A] text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FE5615]/30"
                />
                @if (globalAccessSearch()) {
                  <button 
                    type="button" 
                    (click)="globalAccessSearch.set('')"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs flex items-center cursor-pointer"
                  >
                    <span class="material-icons text-sm">close</span>
                  </button>
                }
              </div>

              <!-- Status Dropdown Filter -->
              <div class="flex items-center gap-1.5">
                <label for="global-access-status-filter" class="text-xs font-bold text-[#1A1A1A] flex items-center gap-1">
                  <span class="material-icons text-sm text-[#FE5615]">filter_list</span>
                  <span class="hidden sm:inline">Estatus:</span>
                </label>
                <select 
                  id="global-access-status-filter"
                  [value]="globalAccessStatusFilter()"
                  (change)="globalAccessStatusFilter.set($any($event.target).value)"
                  class="px-3 py-1.5 bg-[#F7F7F8] border border-[#E1E2E9] text-[#1A1A1A] text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FE5615]/30 cursor-pointer"
                >
                  <option value="Todos">Todos ({{ getCountForGlobalVisitStatus('Todos') }})</option>
                  <option value="Pendiente">Pendientes ({{ getCountForGlobalVisitStatus('Pendiente') }})</option>
                  <option value="Aprobado">Aprobados ({{ getCountForGlobalVisitStatus('Aprobado') }})</option>
                  <option value="Rechazado">Rechazados ({{ getCountForGlobalVisitStatus('Rechazado') }})</option>
                  <option value="Expirado">Expirados ({{ getCountForGlobalVisitStatus('Expirado') }})</option>
                  <option value="Cancelado">Cancelados ({{ getCountForGlobalVisitStatus('Cancelado') }})</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Permisos Disclaimer -->
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <span class="material-icons text-amber-600 text-lg">info</span>
            <span>
              <strong>Nota de Permisos:</strong> El Administrador únicamente consulta historiales y observaciones. No tiene permisos para escanear códigos QR ni aprobar accesos en caseta (exclusivo del Vigilante).
            </span>
          </div>

          @if (filteredGlobalVisits().length === 0) {
            <div class="text-center py-10 text-[#637381] space-y-2">
              <span class="material-icons text-4xl text-[#E1E2E9]">search_off</span>
              <p class="text-xs font-semibold text-[#1A1A1A]">No se encontraron accesos registrados con los filtros aplicados.</p>
              <button 
                type="button" 
                (click)="globalAccessStatusFilter.set('Todos'); globalAccessSearch.set('');" 
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
                    <th class="p-3">Visitante</th>
                    <th class="p-3">Residente / Vivienda</th>
                    <th class="p-3">Fecha / Hora Programada</th>
                    <th class="p-3">Placas Auto</th>
                    <th class="p-3">Decisión Caseta</th>
                    <th class="p-3">Observaciones Vigilante</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E1E2E9]">
                  @for (v of filteredGlobalVisits(); track v.id) {
                    <tr>
                      <td class="p-3">
                        <div class="font-bold text-[#1A1A1A]">{{ v.visitorName }}</div>
                        <div class="text-[10px] font-mono text-[#FE5615] font-semibold">{{ v.qrCode }}</div>
                      </td>
                      <td class="p-3 text-[#637381]">{{ v.residentName }}<br><strong class="text-[#FE5615]">{{ v.viviendaNumber }}</strong></td>
                      <td class="p-3 text-[#637381]">{{ v.visitDate }} {{ v.estimatedTime }}</td>
                      <td class="p-3 font-mono font-semibold text-[#1A1A1A]">{{ v.vehiclePlates || '-' }}</td>
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

      <!-- MODAL PARA EDITAR ROLES Y ESTADO DE USUARIO -->
      @if (editUserModal(); as user) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div [class]="getModalSizeClass() + ' bg-white rounded-2xl p-6 space-y-4 shadow-xl border border-[#E1E2E9] max-h-[92vh] flex flex-col min-h-0 overflow-y-auto'">
            
            <div class="flex items-center justify-between pb-3 border-b border-[#E1E2E9] gap-2 flex-wrap sm:flex-nowrap">
              <h3 class="font-bold text-base text-[#1A1A1A]">Editar Roles y Estado de Usuario</h3>
              
              <div class="flex items-center gap-2 shrink-0">
                <button (click)="editUserModal.set(null)" class="text-[#637381] hover:text-[#1A1A1A] p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <span class="material-icons text-xl">close</span>
                </button>
              </div>
            </div>

            <div class="bg-[#F7F7F8] p-3 rounded-xl border border-[#E1E2E9] text-xs space-y-1">
              <div class="font-bold text-[#1A1A1A]">{{ user.nombreCompleto }}</div>
              <div class="text-[#637381]">{{ user.correo }} | {{ user.viviendaNumero }}</div>
              <div class="flex items-center gap-2 pt-1 text-[11px]">
                <span class="text-[#637381] font-medium">Estado actual:</span>
                <span 
                  [class]="user.status === 'Activa' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (user.status === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200')"
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                >
                  {{ user.status }}
                </span>
              </div>
            </div>

            <div class="space-y-3 text-xs">
              
              <div>
                <label for="edit-roles-group" class="block font-semibold text-[#1A1A1A] mb-1">Asignar Roles *</label>
                <div id="edit-roles-group" class="space-y-1 bg-[#F7F7F8] p-3 rounded-xl border border-[#E1E2E9]">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [checked]="tempRoles.includes('Residente')" (change)="toggleRole('Residente')" />
                    <span>Residente</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [checked]="tempRoles.includes('Administrador')" (change)="toggleRole('Administrador')" />
                    <span>Administrador</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [checked]="tempRoles.includes('Vigilante')" (change)="toggleRole('Vigilante')" />
                    <span>Vigilante</span>
                  </label>
                </div>
              </div>

              <div>
                <label for="edit-account-status" class="block font-semibold text-[#1A1A1A] mb-1">Estado de la Cuenta *</label>
                <select 
                  id="edit-account-status"
                  [value]="tempStatus"
                  (change)="onStatusChange($event)"
                  class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs"
                >
                  <option value="Activa">Activa</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Rechazada">Rechazada</option>
                  <option value="Desactivada">Desactivada</option>
                </select>
              </div>

              <div class="pt-2 flex items-center gap-2">
                <button 
                  (click)="editUserModal.set(null)" 
                  class="flex-1 py-2 bg-[#F7F7F8] text-[#1A1A1A] font-semibold text-xs rounded-xl border border-[#E1E2E9]"
                >
                  Cancelar
                </button>
                <button 
                  (click)="saveUserEdits(user.id)" 
                  class="flex-1 py-2 bg-[#FE5615] text-white font-semibold text-xs rounded-xl hover:bg-[#e0470b]"
                >
                  Guardar Cambios
                </button>
              </div>

            </div>

          </div>
        </div>
      }

      <!-- REJECT PAYMENT MODAL -->
      @if (rejectModalSubmission(); as submission) {
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div [class]="getModalSizeClass() + ' bg-white rounded-2xl p-6 space-y-4 shadow-xl border border-[#E1E2E9] max-h-[92vh] flex flex-col min-h-0 overflow-y-auto'">
            
            <div class="flex items-start justify-between pb-3 border-b border-[#E1E2E9] gap-2 flex-wrap sm:flex-nowrap">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">
                  <span class="material-icons text-xl">cancel</span>
                </div>
                <div>
                  <h3 class="font-bold text-base text-[#1A1A1A]">Rechazar Comprobante de Pago</h3>
                  <p class="text-xs text-[#637381]">
                    {{ submission.residentName }} ({{ submission.viviendaNumero }}) - {{ '$' + submission.amount.toFixed(2) }} MXN
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  (click)="closeRejectModal()"
                  class="text-[#637381] hover:text-[#1A1A1A] p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span class="material-icons text-lg">close</span>
                </button>
              </div>
            </div>

            <div class="space-y-3">
              <label for="rejection-reason-input" class="block text-xs font-semibold text-[#1A1A1A]">
                Motivo del Rechazo <span class="text-red-500">*</span>
              </label>
              <textarea 
                id="rejection-reason-input"
                [value]="rejectionReason()"
                (input)="onRejectionReasonInput($event)"
                rows="4"
                placeholder="Escribe el motivo por el cual se rechaza el pago (ej. Comprobante ilegible, monto incorrecto, fecha no coincide...)"
                class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl text-xs text-[#1A1A1A] outline-none resize-none"
              ></textarea>
              <p class="text-[11px] text-[#637381]">
                El motivo redactado se enviará en una notificación al residente.
              </p>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#E1E2E9]">
              <button 
                type="button"
                (click)="closeRejectModal()"
                class="px-4 py-2 bg-[#F7F7F8] hover:bg-[#E1E2E9] border border-[#E1E2E9] text-[#1A1A1A] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                (click)="confirmRejection()"
                [disabled]="!rejectionReason().trim()"
                class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                <span class="material-icons text-sm">cancel</span>
                <span>Confirmar Rechazo</span>
              </button>
            </div>

          </div>
        </div>
      }

      <!-- Modal Aplicar Sanción -->
      @if (applySanctionModalOpen() && selectedDebtForSanction()) {
        <div class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div [class]="getModalSizeClass() + ' bg-white rounded-2xl p-6 shadow-xl space-y-4 max-h-[92vh] flex flex-col min-h-0 overflow-y-auto'">
            <div class="flex items-center justify-between border-b pb-3 border-[#E1E2E9] gap-2 flex-wrap sm:flex-nowrap">
              <h3 class="font-bold text-base text-red-600 flex items-center gap-1.5">
                <span class="material-icons">gavel</span>
                Aplicar Sanción a Adeudo
              </h3>
              
              <div class="flex items-center gap-2 shrink-0">
                <button (click)="closeApplySanctionModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <span class="material-icons text-sm">close</span>
                </button>
              </div>
            </div>

            <div class="bg-red-50 p-3 rounded-xl text-xs space-y-1">
              <div class="font-bold text-red-900">{{ selectedDebtForSanction()?.residentName }} ({{ selectedDebtForSanction()?.viviendaNumero }})</div>
              <div class="text-slate-700">{{ selectedDebtForSanction()?.concept }}</div>
              <div class="font-extrabold text-red-600">Monto Base: {{ '$' + selectedDebtForSanction()?.amount }} MXN</div>
            </div>

            <form [formGroup]="applySanctionForm" (ngSubmit)="confirmApplySanction()" class="space-y-3">
              <div>
                <label for="sanction-reason" class="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Motivo de la Sanción *
                </label>
                <input 
                  id="sanction-reason"
                  type="text" 
                  formControlName="sanctionReason"
                  placeholder="Ej. Recargo por pago extemporáneo (10%)"
                  class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs"
                />
              </div>

              <div>
                <label for="sanction-amount" class="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Monto de la Sanción (MXN) *
                </label>
                <input 
                  id="sanction-amount"
                  type="number" 
                  formControlName="sanctionAmount"
                  placeholder="150"
                  class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-bold text-red-600"
                />
              </div>

              <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#E1E2E9]">
                <button 
                  type="button" 
                  (click)="closeApplySanctionModal()"
                  class="px-4 py-2 border border-[#E1E2E9] text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="applySanctionForm.invalid"
                  class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  <span class="material-icons text-xs">gavel</span>
                  <span>Guardar Sanción</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal No Aplicar Sanción -->
      @if (noSanctionModalOpen() && selectedDebtForNoSanction()) {
        <div class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div [class]="getModalSizeClass() + ' bg-white rounded-2xl p-6 shadow-xl space-y-4 max-h-[92vh] flex flex-col min-h-0 overflow-y-auto'">
            <div class="flex items-center justify-between border-b pb-3 border-[#E1E2E9] gap-2 flex-wrap sm:flex-nowrap">
              <h3 class="font-bold text-base text-[#1A1A1A] flex items-center gap-1.5">
                <span class="material-icons text-slate-600">block</span>
                No Aplicar Sanción
              </h3>
              
              <div class="flex items-center gap-2 shrink-0">
                <button (click)="closeNoSanctionModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <span class="material-icons text-sm">close</span>
                </button>
              </div>
            </div>

            <div class="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <div class="font-bold text-[#1A1A1A]">{{ selectedDebtForNoSanction()?.residentName }} ({{ selectedDebtForNoSanction()?.viviendaNumero }})</div>
              <div class="text-slate-700">{{ selectedDebtForNoSanction()?.concept }}</div>
              <div class="font-extrabold text-[#1A1A1A]">Monto Base: {{ '$' + selectedDebtForNoSanction()?.amount }} MXN</div>
            </div>

            <form [formGroup]="noSanctionForm" (ngSubmit)="confirmNoSanction()" class="space-y-3">
              <div>
                <label for="no-sanction-reason" class="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Escribe el motivo por el cual se decidió NO aplicar sanción *
                </label>
                <textarea 
                  id="no-sanction-reason"
                  formControlName="noSanctionReason"
                  rows="3"
                  placeholder="Ej. Condonación aprobada por la mesa directiva debido a falla en sistema bancario."
                  class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs"
                ></textarea>
              </div>

              <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#E1E2E9]">
                <button 
                  type="button" 
                  (click)="closeNoSanctionModal()"
                  class="px-4 py-2 border border-[#E1E2E9] text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="noSanctionForm.invalid"
                  class="px-4 py-2 bg-[#1A1A1A] hover:bg-slate-800 text-white font-semibold text-xs rounded-xl disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  <span class="material-icons text-xs">check</span>
                  <span>Confirmar Sin Sanción</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Ampliar Comprobante / Lightbox (Req 12) -->
      @if (previewVoucherUrl()) {
        <div 
          class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div 
            class="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 border border-white/20"
          >
            <button 
              type="button"
              (click)="closeVoucherModal()" 
              class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar imagen"
            >
              <span class="material-icons text-base">close</span>
            </button>
            <img 
              [src]="previewVoucherUrl()" 
              alt="Comprobante Ampliado" 
              class="max-w-full max-h-[82vh] object-contain rounded-xl mx-auto block" 
            />
            <div class="text-center py-2 text-xs font-semibold text-[#637381]">
              Comprobante de Pago — Vistas de alta resolución
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class AdminDashboardComponent {
  private vivoService = inject(VivoFacilService);
  private fb = inject(FormBuilder);

  currentUser = this.vivoService.currentUser;

  // Role Filter for Directorio de Usuarios (Req 8)
  selectedRoleFilter = signal<'Todos' | 'Administrador' | 'Residente' | 'Vigilante'>('Todos');

  filteredComplexUsers = computed(() => {
    const users = this.complexUsers();
    const role = this.selectedRoleFilter();
    if (role === 'Todos') return users;
    return users.filter(u => u.roles && u.roles.includes(role as UserRole));
  });

  onRoleFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedRoleFilter.set(target.value as 'Todos' | 'Administrador' | 'Residente' | 'Vigilante');
  }

  // Voucher zoom lightbox (Req 12)
  previewVoucherUrl = signal<string | null>(null);

  openVoucherModal(url: string) {
    this.previewVoucherUrl.set(url);
  }

  closeVoucherModal() {
    this.previewVoucherUrl.set(null);
  }

  get todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  currentComplex = this.vivoService.currentComplex;
  monthlyPendingPaymentsSummary = this.vivoService.monthlyPendingPaymentsSummary;
  selectedPaymentMonth = this.vivoService.selectedPaymentMonth;
  availablePaymentMonths = this.vivoService.availablePaymentMonths;

  // Status filter for Pagos Pendientes del Mes (Todos | Activos | Históricos)
  paymentStatusFilter = signal<'Todos' | 'Activos' | 'Históricos'>('Todos');

  getPaymentRequestCreatedAt(d: Debt): string {
    let rawDate = d.requestCreatedAt;
    if (!rawDate && d.paymentRequestId) {
      const req = this.vivoService.paymentRequests().find(p => p.id === d.paymentRequestId);
      if (req?.createdAt) {
        rawDate = req.createdAt;
      }
    }
    if (!rawDate) return d.dueDate || 'N/A';

    if (rawDate.includes('T')) {
      return rawDate.split('T')[0];
    }
    if (rawDate.includes(' ')) {
      return rawDate.split(' ')[0];
    }
    return rawDate;
  }

  isDueDateActive(dueDateStr: string): boolean {
    if (!dueDateStr) return true;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return dueDateStr >= todayStr;
  }

  filteredMonthlyPendingPayments = computed(() => {
    const filter = this.paymentStatusFilter();
    const summaries = this.monthlyPendingPaymentsSummary().summaries;

    if (filter === 'Todos') return summaries;
    if (filter === 'Activos') {
      return summaries.filter(s => this.isDueDateActive(s.request.dueDate));
    }
    if (filter === 'Históricos') {
      return summaries.filter(s => !this.isDueDateActive(s.request.dueDate));
    }
    return summaries;
  });

  getPaymentStatusFilterCount(filter: 'Todos' | 'Activos' | 'Históricos'): number {
    const summaries = this.monthlyPendingPaymentsSummary().summaries;
    if (filter === 'Todos') return summaries.length;
    if (filter === 'Activos') return summaries.filter(s => this.isDueDateActive(s.request.dueDate)).length;
    if (filter === 'Históricos') return summaries.filter(s => !this.isDueDateActive(s.request.dueDate)).length;
    return 0;
  }
  pendingUsers = this.vivoService.pendingUsersForComplex;
  complexUsers = this.vivoService.usersForComplex;
  submissionsForComplex = this.vivoService.submissionsForComplex;
  debtsForComplex = this.vivoService.debtsForComplex;
  debtsInReviewForComplex = this.vivoService.debtsInReviewForComplex;
  debtsHistoryForComplex = this.vivoService.debtsHistoryForComplex;
  newDebtsForComplex = this.vivoService.newDebtsForComplex;
  visitsForComplex = this.vivoService.visitsForComplex;

  // Filters for Revisión de Comprobantes de Residentes
  submissionStatusFilter = signal<'Todos' | 'Pendientes' | 'Aprobados' | 'Rechazados'>('Todos');

  filteredSubmissionsForComplex = computed(() => {
    const filter = this.submissionStatusFilter();
    const list = this.submissionsForComplex();
    if (filter === 'Pendientes') return list.filter(s => s.status === 'Pendiente');
    if (filter === 'Aprobados') return list.filter(s => s.status === 'Aprobado');
    if (filter === 'Rechazados') return list.filter(s => s.status === 'Rechazado');
    return list;
  });

  getSubmissionCountByStatus(status: 'Pendiente' | 'Aprobado' | 'Rechazado'): number {
    return this.submissionsForComplex().filter(s => s.status === status).length;
  }

  // Filters for Historial Global de Accesos
  globalAccessSearch = signal<string>('');
  globalAccessStatusFilter = signal<string>('Todos');

  filteredGlobalVisits = computed(() => {
    const filter = this.globalAccessStatusFilter();
    const search = this.globalAccessSearch().toLowerCase().trim();
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
        const matchDate = v.visitDate ? v.visitDate.toLowerCase().includes(search) : false;
        const matchObs = v.observations ? v.observations.toLowerCase().includes(search) : false;
        return matchVisitor || matchResident || matchVivienda || matchPlates || matchCode || matchDate || matchObs;
      }

      return true;
    });
  });

  getCountForGlobalVisitStatus(status: string): number {
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

  expandedRequestIds = signal<Set<string>>(new Set());

  onMonthChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedPaymentMonth.set(val);
  }

  toggleExpandRequest(requestId: string) {
    const current = new Set(this.expandedRequestIds());
    if (current.has(requestId)) {
      current.delete(requestId);
    } else {
      current.add(requestId);
    }
    this.expandedRequestIds.set(current);
  }

  sendReminder(residentId: string, title: string, amount: number, dueDate: string) {
    this.vivoService.sendPaymentReminderToResident(residentId, title, amount, dueDate);
  }

  sendMassReminders() {
    this.vivoService.sendMassMonthlyPaymentReminders();
  }

  navTab = this.vivoService.activeNavTab;

  activeSubtab = () => {
    const tab = this.navTab();
    if (tab === 'usuarios' || tab === 'pagos' || tab === 'adeudos' || tab === 'historial') {
      return tab;
    }
    return 'aprobaciones';
  };

  setSubtab(tab: 'aprobaciones' | 'usuarios' | 'pagos' | 'adeudos' | 'historial') {
    this.vivoService.activeNavTab.set(tab);
  }

  // Modal sizing controls
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

  // Reject Payment Modal
  rejectModalSubmission = signal<PaymentSubmission | null>(null);
  rejectionReason = signal<string>('');

  // Apply Sanction Modal
  applySanctionModalOpen = signal<boolean>(false);
  selectedDebtForSanction = signal<Debt | null>(null);
  applySanctionForm = this.fb.group({
    sanctionReason: ['', [Validators.required]],
    sanctionAmount: [150, [Validators.required, Validators.min(1)]]
  });

  // No Sanction Modal
  noSanctionModalOpen = signal<boolean>(false);
  selectedDebtForNoSanction = signal<Debt | null>(null);
  noSanctionForm = this.fb.group({
    noSanctionReason: ['', [Validators.required]]
  });

  // Edit User Modal
  editUserModal = signal<User | null>(null);
  tempRoles: UserRole[] = [];
  tempStatus: AccountStatus = 'Activa';

  openRejectModal(submission: PaymentSubmission) {
    this.rejectModalSubmission.set(submission);
    this.rejectionReason.set('');
  }

  closeRejectModal() {
    this.rejectModalSubmission.set(null);
    this.rejectionReason.set('');
  }

  onRejectionReasonInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.rejectionReason.set(target.value);
  }

  async confirmRejection() {
    const submission = this.rejectModalSubmission();
    const reason = this.rejectionReason().trim();
    if (!submission || !reason) return;

    await this.vivoService.processPaymentSubmission(submission.id, false, reason);
    this.closeRejectModal();
  }

  async approveSubmission(id: string) {
    await this.vivoService.processPaymentSubmission(id, true, 'Pago verificado y aceptado.');
  }

  getPendingSubmissionForDebt(debt: Debt): PaymentSubmission | undefined {
    return this.submissionsForComplex().find(s => 
      s.status === 'Pendiente' && (
        s.debtId === debt.id ||
        s.paymentRequestId === debt.id ||
        s.paymentRequestId === 'debt-' + debt.id ||
        (debt.paymentRequestId ? s.paymentRequestId === debt.paymentRequestId : false)
      )
    );
  }

  // Forms
  createPaymentForm = this.fb.group({
    title: ['', [Validators.required]],
    type: ['Pago Fijo' as const, [Validators.required]],
    category: ['Cuota mensual' as const, [Validators.required]],
    amount: [1250, [Validators.required, Validators.min(1)]],
    dueDate: [`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-28`, [Validators.required]],
    description: ['']
  });

  async approveUser(userId: string) {
    await this.vivoService.approveUserAccount(userId);
  }

  async rejectUser(userId: string) {
    await this.vivoService.rejectUserAccount(userId);
  }

  openEditUserModal(user: User) {
    this.tempRoles = user.roles ? [...user.roles] : [];
    this.tempStatus = user.status || 'Activa';
    this.editUserModal.set(user);
  }

  toggleRole(role: UserRole) {
    if (this.tempRoles.includes(role)) {
      if (this.tempRoles.length > 1) {
        this.tempRoles = this.tempRoles.filter(r => r !== role);
      }
    } else {
      this.tempRoles.push(role);
    }
  }

  onStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.tempStatus = target.value as AccountStatus;
  }

  async saveUserEdits(userId: string) {
    const res = await this.vivoService.updateUserRolesAndStatus(userId, this.tempRoles, this.tempStatus);
    if (res.success) {
      this.vivoService.showToast('Roles de usuario actualizados correctamente.', 'success');
      this.editUserModal.set(null);
    } else {
      this.vivoService.showToast(res.message || 'Error al guardar los roles en Supabase.', 'error');
    }
  }

  async onCreatePaymentSubmit() {
    if (this.createPaymentForm.invalid) return;
    const val = this.createPaymentForm.value;
    if (val.dueDate && val.dueDate < this.todayStr) {
      this.vivoService.showToast('La fecha límite no puede ser anterior al día de hoy.', 'error');
      return;
    }
    try {
      await this.vivoService.createPaymentRequest({
        title: val.title!,
        type: val.type!,
        category: val.category!,
        amount: val.amount!,
        dueDate: val.dueDate!,
        description: val.description || ''
      });
      this.createPaymentForm.reset({
        title: '',
        type: 'Pago Fijo',
        category: 'Cuota mensual',
        amount: 1250,
        dueDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-28`,
        description: ''
      });
    } catch (err) {
      console.error('Error al crear la solicitud de pago:', err);
    }
  }

  processSubmission(id: string, approve: boolean) {
    const note = prompt(approve ? 'Anotación de aprobación (opcional):' : 'Motivo del rechazo:');
    this.vivoService.processPaymentSubmission(id, approve, note || undefined);
  }

  openApplySanctionModal(debt: Debt) {
    this.selectedDebtForSanction.set(debt);
    this.applySanctionForm.reset({
      sanctionReason: 'Recargo por pago extemporáneo (10%)',
      sanctionAmount: Math.round(debt.amount * 0.1) || 150
    });
    this.applySanctionModalOpen.set(true);
  }

  closeApplySanctionModal() {
    this.applySanctionModalOpen.set(false);
    this.selectedDebtForSanction.set(null);
  }

  confirmApplySanction() {
    if (this.applySanctionForm.invalid) return;
    const debt = this.selectedDebtForSanction();
    if (!debt) return;
    const val = this.applySanctionForm.value;
    this.vivoService.applySanctionToDebt(debt.id, val.sanctionAmount!, val.sanctionReason!);
    this.closeApplySanctionModal();
  }

  openNoSanctionModal(debt: Debt) {
    this.selectedDebtForNoSanction.set(debt);
    this.noSanctionForm.reset({
      noSanctionReason: ''
    });
    this.noSanctionModalOpen.set(true);
  }

  closeNoSanctionModal() {
    this.noSanctionModalOpen.set(false);
    this.selectedDebtForNoSanction.set(null);
  }

  confirmNoSanction() {
    if (this.noSanctionForm.invalid) return;
    const debt = this.selectedDebtForNoSanction();
    if (!debt) return;
    const val = this.noSanctionForm.value;
    this.vivoService.waiveSanctionForDebt(debt.id, val.noSanctionReason!);
    this.closeNoSanctionModal();
  }
}