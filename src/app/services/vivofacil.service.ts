import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { 
  User, 
  UserRole, 
  AccountStatus, 
  HousingComplex, 
  HousingUnit, 
  VisitorVisit, 
  PaymentRequest, 
  PaymentSubmission, 
  Debt, 
  ExtractedOcrData,
  PaymentCategory,
  NotificationItem,
  RequestUnitStatus,
  MonthlyPaymentSummary
} from '../models/vivofacil.models';

@Injectable({
  providedIn: 'root'
})
export class VivoFacilService {
  private http = inject(HttpClient);
  public supabaseService = inject(SupabaseService);

  private catalogosSynced = false;
  private isSyncingCatalogos = false;
  private isSyncingOverdueDebts = false;

  // State Signals
  readonly complexes = signal<HousingComplex[]>([]);
  readonly units = signal<HousingUnit[]>([]);
  readonly users = signal<User[]>([]);
  readonly visits = signal<VisitorVisit[]>([]);
  readonly paymentRequests = signal<PaymentRequest[]>([]);
  readonly paymentSubmissions = signal<PaymentSubmission[]>([]);
  readonly debts = signal<Debt[]>([]);
  readonly notifications = signal<NotificationItem[]>([]);

  // Auth & Multi-tenant State
  readonly currentUser = signal<User | null>(null);
  readonly activeRole = signal<UserRole | null>(null);
  readonly activeComplexId = signal<string | null>(null);
  readonly activeNavTab = signal<string>('default');
  readonly toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    this.toast.set({ message, type });
    setTimeout(() => {
      if (this.toast()?.message === message) {
        this.toast.set(null);
      }
    }, 3500);
  }

  // Derived Signals
  readonly userAccessibleComplexes = computed(() => {
    const user = this.currentUser();
    if (!user) return this.complexes();
    return this.complexes().filter(c => c.id === user.complexId);
  });

  readonly currentComplex = computed(() => {
    const user = this.currentUser();
    if (!user) return this.complexes()[0] || null;
    return this.complexes().find(c => c.id === user.complexId) || this.complexes()[0] || null;
  });

  readonly pendingUsersForComplex = computed(() => {
    const complex = this.currentComplex();
    if (!complex) return [];
    return this.users().filter(u => u.complexId === complex.id && u.status === 'Pendiente');
  });

  readonly usersForComplex = computed(() => {
    const complex = this.currentComplex();
    if (!complex) return [];
    return this.users().filter(u => u.complexId === complex.id);
  });

  private isValidUuid(val?: string | null): boolean {
    return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  }

  public getComplexUuid(complexId?: string | null): string | null {
    if (!complexId) return null;
    if (this.isValidUuid(complexId)) return complexId;
    const localComp = this.complexes().find(c => c.id === complexId);
    if (localComp && localComp.remoteId && this.isValidUuid(localComp.remoteId)) {
      return localComp.remoteId;
    }
    const seedMap: Record<string, string> = {
      'cx-1': '11111111-1111-1111-1111-111111111111',
      'cx-2': '22222222-2222-2222-2222-222222222222',
      'cx-3': '33333333-3333-3333-3333-333333333333',
      'cx-4': '44444444-4444-4444-4444-444444444444',
      'cx-5': '55555555-5555-5555-5555-555555555555',
      'cx-6': '66666666-6666-6666-6666-666666666666',
      'cx-7': '77777777-7777-7777-7777-777777777777'
    };
    return seedMap[complexId] || null;
  }

  public getViviendaUuid(viviendaId?: string | null): string | null {
    if (!viviendaId) return null;
    if (this.isValidUuid(viviendaId)) return viviendaId;
    const localUnit = this.units().find(u => u.id === viviendaId);
    if (localUnit && localUnit.remoteId && this.isValidUuid(localUnit.remoteId)) {
      return localUnit.remoteId;
    }
    const seedMap: Record<string, string> = {
      'u-101': 'a1111111-1111-1111-1111-111111111111',
      'u-102': 'a1111111-1111-1111-1111-222222222222',
      'u-103': 'a1111111-1111-1111-1111-333333333333',
      'u-201': 'a2222222-2222-2222-2222-111111111111',
      'u-301': 'a3333333-3333-3333-3333-111111111111',
      'u-401': 'a4444444-4444-4444-4444-111111111111',
      'u-405': 'a4444444-4444-4444-4444-222222222222'
    };
    return seedMap[viviendaId] || null;
  }

  public isSameComplex(complexIdA?: string | null, complexIdB?: string | null): boolean {
    if (!complexIdA || !complexIdB) return false;
    if (complexIdA === complexIdB) return true;
    const uuidA = this.getComplexUuid(complexIdA);
    const uuidB = this.getComplexUuid(complexIdB);
    if (uuidA && uuidB && uuidA === uuidB) return true;

    const seedMap: Record<string, string> = {
      'cx-1': '11111111-1111-1111-1111-111111111111',
      'cx-2': '22222222-2222-2222-2222-222222222222',
      'cx-3': '33333333-3333-3333-3333-333333333333',
      'cx-4': '44444444-4444-4444-4444-444444444444',
      'cx-5': '55555555-5555-5555-5555-555555555555',
      'cx-6': '66666666-6666-6666-6666-666666666666',
      'cx-7': '77777777-7777-7777-7777-777777777777'
    };

    const compA = this.complexes().find(c => c.id === complexIdA || c.remoteId === complexIdA || seedMap[c.id] === complexIdA);
    const compB = this.complexes().find(c => c.id === complexIdB || c.remoteId === complexIdB || seedMap[c.id] === complexIdB);
    if (compA && compB && compA.id === compB.id) return true;
    return false;
  }

  public deduplicateDebts(debts: Debt[]): Debt[] {
    const map = new Map<string, Debt>();

    for (const d of debts) {
      if (!d || !d.id) continue;

      const pairKey = (d.paymentRequestId && d.viviendaId) ? `pair_${d.paymentRequestId}_${d.viviendaId}` : null;

      let existingKey: string | null = null;
      let existing: Debt | null = null;

      if (map.has(d.id)) {
        existingKey = d.id;
        existing = map.get(d.id)!;
      } else if (pairKey && map.has(pairKey)) {
        existingKey = pairKey;
        existing = map.get(pairKey)!;
      } else {
        for (const [k, v] of map.entries()) {
          if (v.id === d.id) {
            existingKey = k;
            existing = v;
            break;
          }
          if (pairKey && v.paymentRequestId && v.viviendaId && `${v.paymentRequestId}_${v.viviendaId}` === `${d.paymentRequestId}_${d.viviendaId}`) {
            existingKey = k;
            existing = v;
            break;
          }
        }
      }

      if (!existing || !existingKey) {
        const keyToUse = pairKey || d.id;
        map.set(keyToUse, d);
      } else {
        let preferNew = false;
        if (existing.sanctionDecision === 'pending' && d.sanctionDecision !== 'pending') {
          preferNew = true;
        } else if (existing.status === 'Pendiente' && d.status !== 'Pendiente') {
          preferNew = true;
        } else if (!this.isValidUuid(existing.id) && this.isValidUuid(d.id)) {
          preferNew = true;
        }

        if (preferNew) {
          map.delete(existingKey);
          const keyToUse = pairKey || d.id;
          map.set(keyToUse, d);
        }
      }
    }

    return Array.from(map.values());
  }

  private mapDbVisitaToVisitorVisit(dbRow: Record<string, unknown>): VisitorVisit {
    const residentId = (dbRow['resident_id'] as string) || '';
    const viviendaId = (dbRow['vivienda_id'] as string) || '';
    const dbComplexId = (dbRow['complex_id'] as string) || '';
    const vigilanteId = (dbRow['vigilante_id'] as string) || '';

    const resident = this.users().find(u => u.id === residentId || u.remoteId === residentId || u.remoteAuthUserId === residentId);
    const vigilante = vigilanteId ? this.users().find(u => u.id === vigilanteId || u.remoteId === vigilanteId || u.remoteAuthUserId === vigilanteId) : null;

    let viviendaNumber = resident ? (resident.viviendaNumero || 'Sin asignar') : 'Sin asignar';
    if (viviendaId) {
      const unit = this.units().find(u => u.id === viviendaId || u.remoteId === viviendaId);
      if (unit) {
        viviendaNumber = unit.numeroVivienda ? `${unit.numeroVivienda} (${unit.bloqueCalle})` : unit.bloqueCalle || viviendaNumber;
      }
    }

    const seedMap: Record<string, string> = {
      'cx-1': '11111111-1111-1111-1111-111111111111',
      'cx-2': '22222222-2222-2222-2222-222222222222',
      'cx-3': '33333333-3333-3333-3333-333333333333',
      'cx-4': '44444444-4444-4444-4444-444444444444',
      'cx-5': '55555555-5555-5555-5555-555555555555',
      'cx-6': '66666666-6666-6666-6666-666666666666',
      'cx-7': '77777777-7777-7777-7777-777777777777'
    };
    const matchedComplex = this.complexes().find(c =>
      c.id === dbComplexId ||
      c.remoteId === dbComplexId ||
      seedMap[c.id] === dbComplexId
    );
    const complexId = matchedComplex ? matchedComplex.id : dbComplexId;

    const rawStatus = (dbRow['estado'] as string) || 'Pendiente';
    let status: VisitorVisit['status'] = 'Pendiente';
    if (rawStatus === 'Aprobado') status = 'Aprobado';
    else if (rawStatus === 'Rechazado') status = 'Rechazado';
    else if (rawStatus === 'Expirado') status = 'Expirado';
    else if (rawStatus === 'Cancelado' || rawStatus === 'Cancelada') status = 'Cancelada';

    return {
      id: (dbRow['id'] as string) || '',
      qrCode: (dbRow['qr_code'] as string) || '',
      visitorName: (dbRow['nombre_visitante'] as string) || '',
      birthDate: (dbRow['fecha_nacimiento'] as string) || (dbRow['fecha_nacimiento_visitante'] as string) || '',
      visitDate: (dbRow['fecha_visita'] as string) || '',
      estimatedTime: (dbRow['hora_visita'] as string) || (dbRow['hora_estimada'] as string) || '',
      residentId: residentId,
      residentName: resident ? resident.nombreCompleto : 'Residente',
      viviendaNumber: viviendaNumber,
      complexId: complexId,
      status: status,
      scannedAt: (dbRow['fecha_escaneo'] as string) || undefined,
      scannedByVigilanteId: vigilanteId || undefined,
      scannedByVigilanteName: vigilante ? vigilante.nombreCompleto : undefined,
      ineVerifiedManual: (dbRow['ine_verificada_manual'] as boolean) || false,
      decision: (dbRow['decision'] as 'Aprobado' | 'Rechazado') || undefined,
      vehiclePlates: (dbRow['placas_vehiculo'] as string) || undefined,
      observations: (dbRow['observaciones'] as string) || undefined,
      createdAt: (dbRow['created_at'] as string) || new Date().toISOString()
    };
  }

  async syncVisitas(): Promise<void> {
    if (!this.supabaseService.isConfigured) return;

    const user = this.currentUser();
    const role = this.activeRole();
    if (!user) return;

    try {
      let rawVisitas: Record<string, unknown>[] = [];
      const userUuid = user.remoteId || user.id;

      if (role === 'Residente') {
        if (this.isValidUuid(userUuid)) {
          console.log(`[syncVisitas] Consultando visitas en Supabase para residente ${userUuid}...`);
          rawVisitas = await this.supabaseService.getVisitasByResident(userUuid);
        }
      } else if (role === 'Vigilante' || role === 'Administrador') {
        const complex = this.currentComplex();
        let complexUuid = complex?.remoteId || complex?.id;
        if (complex && (!complexUuid || !this.isValidUuid(complexUuid))) {
          const COMPLEX_SEED_UUID_MAP: Record<string, string> = {
            'cx-1': '11111111-1111-1111-1111-111111111111',
            'cx-2': '22222222-2222-2222-2222-222222222222'
          };
          complexUuid = COMPLEX_SEED_UUID_MAP[complex.id] || complexUuid;
        }
        if (complexUuid && this.isValidUuid(complexUuid)) {
          console.log(`[syncVisitas] Consultando visitas en Supabase para conjunto ${complexUuid}...`);
          rawVisitas = await this.supabaseService.getVisitasByComplex(complexUuid);
        }
      }

      if (rawVisitas) {
        const remoteVisits = rawVisitas.map(r => this.mapDbVisitaToVisitorVisit(r));
        if (remoteVisits.length > 0) {
          console.log(`[syncVisitas] Sincronizadas ${remoteVisits.length} visitas desde Supabase.`);
          this.visits.set(this.autoExpireVisits(remoteVisits));
        } else if (role === 'Residente' && this.isValidUuid(userUuid)) {
          this.visits.set([]);
        }
      }
    } catch (err) {
      console.error('[syncVisitas] Error al sincronizar visitas con Supabase:', err);
    }
  }

  async syncSolicitudesPago(): Promise<void> {
    if (!this.supabaseService.isConfigured) return;
    try {
      const complex = this.currentComplex();
      if (!complex) return;

      let complexUuid = complex.remoteId || complex.id;
      if (!this.isValidUuid(complexUuid)) {
        const COMPLEX_SEED_UUID_MAP: Record<string, string> = {
          'cx-1': '11111111-1111-1111-1111-111111111111',
          'cx-2': '22222222-2222-2222-2222-222222222222'
        };
        complexUuid = COMPLEX_SEED_UUID_MAP[complex.id] || complexUuid;
      }

      if (!this.isValidUuid(complexUuid)) return;

      const remoteRows = await this.supabaseService.getSolicitudesPagoByComplex(complexUuid);
      if (!remoteRows || remoteRows.length === 0) return;

      const currentList = this.paymentRequests();
      const updatedList = [...currentList];

      for (const row of remoteRows) {
        const rowId = row['id'] as string;
        const existsIndex = updatedList.findIndex(p => p.id === rowId || p.title === row['titulo']);

        const mapped: PaymentRequest = {
          id: rowId,
          complexId: complex.id,
          title: (row['titulo'] as string) || 'Solicitud de pago',
          type: (row['tipo'] as string) === 'Extraordinario' ? 'Pago Extraordinario' : 'Pago Fijo',
          category: 'Cuota mensual',
          amount: Number(row['monto']) || 0,
          dueDate: (row['fecha_limite'] as string) || new Date().toISOString().substring(0, 10),
          description: (row['concepto'] as string) || '',
          status: 'Pendiente',
          createdAt: (row['created_at'] as string) || new Date().toISOString()
        };

        if (existsIndex >= 0) {
          updatedList[existsIndex] = { ...updatedList[existsIndex], ...mapped };
        } else {
          updatedList.unshift(mapped);
        }
      }

      this.paymentRequests.set(updatedList);
      this.saveStateToStorage();
      await this.syncOverduePaymentRequests();
    } catch (err) {
      console.warn('[syncSolicitudesPago] Error al sincronizar solicitudes de pago:', err);
    }
  }

  async syncComprobantes(): Promise<void> {
    if (!this.supabaseService.isConfigured) return;
    try {
      const complex = this.currentComplex();
      if (!complex) return;

      let complexUuid = complex.remoteId || complex.id;
      if (!this.isValidUuid(complexUuid)) {
        const COMPLEX_SEED_UUID_MAP: Record<string, string> = {
          'cx-1': '11111111-1111-1111-1111-111111111111',
          'cx-2': '22222222-2222-2222-2222-222222222222'
        };
        complexUuid = COMPLEX_SEED_UUID_MAP[complex.id] || complexUuid;
      }
      if (!this.isValidUuid(complexUuid)) return;

      const remoteRows = await this.supabaseService.getComprobantesByComplex(complexUuid);
      if (!remoteRows || remoteRows.length === 0) return;

      const currentList = this.paymentSubmissions();
      const updatedList = [...currentList];
      const userNamesCache = new Map<string, string>();

      for (const row of remoteRows) {
        const rowId = row['id'] as string;
        const existsIndex = updatedList.findIndex(s => s.id === rowId);

        const residentId = (row['residente_id'] as string) || '';
        const viviendaId = (row['vivienda_id'] as string) || '';

        const resident = this.users().find(u => u.id === residentId || u.remoteId === residentId || u.remoteAuthUserId === residentId);
        let residentName = resident ? resident.nombreCompleto : '';
        let viviendaNumero = resident ? (resident.viviendaNumero || 'Sin asignar') : 'Sin asignar';

        if (!residentName && residentId) {
          if (userNamesCache.has(residentId)) {
            residentName = userNamesCache.get(residentId)!;
          } else if (this.isValidUuid(residentId) && this.supabaseService.isConfigured) {
            const dbUser = await this.supabaseService.getUsuarioByAuthUserId(residentId);
            if (dbUser && dbUser['nombre_completo']) {
              residentName = dbUser['nombre_completo'] as string;
              userNamesCache.set(residentId, residentName);
            }
          }
        }

        if (viviendaId) {
          const unit = this.units().find(u => u.id === viviendaId || u.remoteId === viviendaId);
          if (unit) {
            viviendaNumero = unit.numeroVivienda ? `${unit.numeroVivienda} (${unit.bloqueCalle})` : unit.bloqueCalle || viviendaNumero;
          }
        }

        if (!residentName) {
          residentName = 'Residente (Sin asignar)';
        }

        const mapped: PaymentSubmission = {
          id: rowId,
          paymentRequestId: (row['solicitud_pago_id'] as string) || (row['adeudo_id'] as string) || 'pay-sync',
          paymentTitle: (row['concepto'] as string) || 'Comprobante de pago',
          complexId: complex.id,
          viviendaId: viviendaId,
          viviendaNumero: viviendaNumero,
          residentId: residentId,
          residentName: residentName,
          method: (row['metodo_pago'] as 'Transferencia' | 'Efectivo') || 'Transferencia',
          amount: Number(row['monto_depositado']) || 0,
          date: (row['fecha'] as string) || new Date().toISOString().split('T')[0],
          voucherUrl: (row['comprobante_url'] as string) || undefined,
          bancoReceptor: (row['banco_destino'] as string) || undefined,
          referencia: (row['folio'] as string) || undefined,
          cuentaOrigen: (row['cuenta_origen'] as string) || undefined,
          cuentaDestino: (row['cuenta_destino'] as string) || undefined,
          recibidoPor: (row['recibido_por'] as string) || undefined,
          concepto: (row['concepto'] as string) || undefined,
          comentarios: (row['comentario'] as string) || undefined,
          debtId: (row['adeudo_id'] as string) || undefined,
          status: (row['estado'] as 'Pendiente' | 'Aprobado' | 'Rechazado') || 'Pendiente',
          createdAt: (row['created_at'] as string) || new Date().toISOString()
        };

        if (existsIndex >= 0) {
          updatedList[existsIndex] = { ...updatedList[existsIndex], ...mapped };
        } else {
          updatedList.unshift(mapped);
        }
      }

      this.paymentSubmissions.set(updatedList);
      this.saveStateToStorage();
    } catch (err) {
      console.warn('[syncComprobantes] Error al sincronizar comprobantes:', err);
    }
  }

  private isVisitExpired(visit: VisitorVisit): boolean {
    if (visit.status !== 'Pendiente') return false;
    try {
      const [year, month, day] = visit.visitDate.split('-').map(Number);
      const [hours, minutes] = (visit.estimatedTime || '00:00').split(':').map(Number);
      const visitDateObj = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const expirationMs = visitDateObj.getTime() + 2 * 60 * 60 * 1000; // 2 hours after scheduled time
      return Date.now() > expirationMs;
    } catch {
      return false;
    }
  }

  private autoExpireVisits(allVisits: VisitorVisit[]): VisitorVisit[] {
    let hasChanges = false;
    const updated = allVisits.map(v => {
      if (v.status === 'Pendiente' && this.isVisitExpired(v)) {
        hasChanges = true;
        if (this.supabaseService.isConfigured && this.isValidUuid(v.id)) {
          this.supabaseService.actualizarEstadoVisita(v.id, { estado: 'Expirado' }).catch(err => {
            console.error('Error al actualizar expiración en Supabase DB:', err);
          });
        }
        return { ...v, status: 'Expirado' as const };
      }
      return v;
    });

    if (hasChanges) {
      setTimeout(() => {
        this.visits.set(updated);
        this.safeSetStorage('vivofacil_visits', JSON.stringify(updated));
      }, 0);
    }
    return updated;
  }

  readonly visitsForComplex = computed(() => {
    const complex = this.currentComplex();
    if (!complex) return [];
    const list = this.visits();
    const expiredChecked = this.autoExpireVisits(list);
    return expiredChecked.filter(v => this.isSameComplex(v.complexId, complex.id));
  });

  readonly myVisits = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    const list = this.visits();
    const expiredChecked = this.autoExpireVisits(list);
    return expiredChecked.filter(v => v.residentId === user.id);
  });

  readonly paymentRequestsForComplex = computed(() => {
    const complex = this.currentComplex();
    if (!complex) return [];
    return this.paymentRequests().filter(p => p.complexId === complex.id);
  });

  readonly myPaymentRequests = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    const todayStr = new Date().toISOString().split('T')[0];
    const submissions = this.mySubmissions();
    const registeredOrPaidRequestIds = new Set(
      submissions
        .filter(s => s.status === 'Pendiente' || s.status === 'Aprobado')
        .map(s => s.paymentRequestId)
    );

    // Filter payments starting from user's approval month
    const userApprovalDate = user.approvedAt || user.createdAt || todayStr;
    const userApprovalMonth = userApprovalDate.substring(0, 7);

    return this.paymentRequests().filter(p => {
      if (p.complexId !== user.complexId) return false;
      if (p.viviendaId && p.viviendaId !== user.viviendaId) return false;
      if (p.status === 'Pagado') return false;
      if (registeredOrPaidRequestIds.has(p.id)) return false;
      if (p.dueDate < todayStr) return false;

      // Filter out payments generated prior to resident's approval month
      const pMonth = (p.monthPeriod || p.createdAt || p.dueDate).substring(0, 7);
      if (pMonth < userApprovalMonth) return false;

      return true;
    });
  });

  readonly submissionsForComplex = computed(() => {
    const complex = this.currentComplex();
    if (!complex) return [];
    return this.paymentSubmissions().filter(s => s.complexId === complex.id);
  });

  readonly selectedPaymentMonth = signal<string>(new Date().toISOString().substring(0, 7));

  getPaymentRequestMonthKey(p: PaymentRequest): string | null {
    const dateStr = p.dueDate || p.createdAt;
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}/.test(dateStr)) {
      return dateStr.substring(0, 7);
    }
    if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
      const parts = dateStr.split(' ')[0].split('/');
      return `${parts[2]}-${parts[1].padStart(2, '0')}`;
    }
    return null;
  }

  readonly availablePaymentMonths = computed(() => {
    const monthsMap = new Map<string, string>();
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}${i === 0 ? ' (Mes Actual)' : ''}`;
      monthsMap.set(val, label);
    }

    const complex = this.currentComplex();
    if (complex) {
      for (const p of this.paymentRequests()) {
        if (p.complexId === complex.id) {
          const val = this.getPaymentRequestMonthKey(p);
          if (val && !monthsMap.has(val)) {
            const [y, m] = val.split('-');
            const mIdx = parseInt(m, 10) - 1;
            if (mIdx >= 0 && mIdx < 12) {
              monthsMap.set(val, `${monthNames[mIdx]} ${y}`);
            }
          }
        }
      }
    }

    const options = Array.from(monthsMap.entries()).map(([value, label]) => ({ value, label }));
    options.unshift({ value: 'all', label: 'Todos los Meses' });
    return options;
  });

  readonly monthlyPendingPaymentsSummary = computed(() => {
    const complex = this.currentComplex();
    if (!complex) return {
      summaries: [],
      totalExpected: 0,
      totalCollected: 0,
      totalPending: 0,
      totalPendingResidents: 0,
      inReviewSubmissionsCount: 0
    };

    const targetMonthStr = this.selectedPaymentMonth();

    const allRequests = this.paymentRequests().filter(p => p.complexId === complex.id);
    const submissions = this.paymentSubmissions().filter(s => s.complexId === complex.id);
    const activeResidents = this.users().filter(u => u.complexId === complex.id && u.roles.includes('Residente') && u.status === 'Activa');
    const complexUnits = this.units().filter(u => u.complexId === complex.id);

    const activeRequests = allRequests.filter(p => {
      if (targetMonthStr === 'all') return true;
      const key = this.getPaymentRequestMonthKey(p);
      return key === targetMonthStr;
    });

    let grandTotalExpected = 0;
    let grandTotalCollected = 0;
    let grandTotalPending = 0;
    const pendingResidentIdsSet = new Set<string>();
    const todayStr = new Date().toISOString().split('T')[0];
    const existingDebts = this.debts().filter(d => d.complexId === complex.id);

    const summaries: MonthlyPaymentSummary[] = activeRequests.map(req => {
      let targetUnits = complexUnits;
      if (req.viviendaId) {
        targetUnits = complexUnits.filter(u => u.id === req.viviendaId);
      }

      const unitStatuses: RequestUnitStatus[] = targetUnits.map(unit => {
        const res = activeResidents.find(r => r.viviendaId === unit.id);
        const sub = submissions.find(s => 
          s.paymentRequestId === req.id && 
          (s.viviendaId === unit.id || (res && s.residentId === res.id))
        );

        let status: 'Pagado' | 'En revisión' | 'Pendiente' | 'Vencido' = 'Pendiente';
        if (sub) {
          if (sub.status === 'Aprobado') status = 'Pagado';
          else if (sub.status === 'Pendiente') status = 'En revisión';
        }

        // If not paid and not in review, check if expired / converted to adeudo
        if (status === 'Pendiente') {
          const debtExists = existingDebts.some(d => 
            (d.paymentRequestId === req.id || d.id === `dbt-auto-${req.id}-${res?.id || unit.id}`) && 
            (d.viviendaId === unit.id || (res && d.residentId === res.id))
          );

          const isExpired = (req.dueDate && req.dueDate < todayStr) || req.status === 'Vencido' || debtExists;

          if (isExpired) {
            status = 'Vencido';
          }
        }

        if (status === 'Pendiente' && res) {
          pendingResidentIdsSet.add(res.id);
        }

        const debt = existingDebts.find(d => 
          (d.paymentRequestId === req.id || d.id === `dbt-auto-${req.id}-${res?.id || unit.id}`) && 
          (d.viviendaId === unit.id || (res && d.residentId === res.id))
        );

        return {
          unitId: unit.id,
          viviendaNumero: unit.numeroVivienda ? `${unit.numeroVivienda} (${unit.bloqueCalle})` : unit.bloqueCalle,
          residentId: res?.id,
          residentName: res?.nombreCompleto || 'Sin residente asignado',
          status,
          submissionId: sub?.id,
          paidAt: sub?.date,
          debtId: debt?.id
        };
      });

      const totalUnits = unitStatuses.length;
      const paidUnitsCount = unitStatuses.filter(u => u.status === 'Pagado').length;
      const inReviewUnitsCount = unitStatuses.filter(u => u.status === 'En revisión').length;
      const pendingUnitsCount = unitStatuses.filter(u => u.status === 'Pendiente').length;
      const expiredUnitsCount = unitStatuses.filter(u => u.status === 'Vencido').length;

      const totalAmountExpected = req.amount * totalUnits;
      const totalAmountCollected = req.amount * paidUnitsCount;
      const totalAmountPending = req.amount * (pendingUnitsCount + inReviewUnitsCount);

      grandTotalExpected += totalAmountExpected;
      grandTotalCollected += totalAmountCollected;
      grandTotalPending += totalAmountPending;

      return {
        request: req,
        totalUnits,
        paidUnitsCount,
        pendingUnitsCount,
        inReviewUnitsCount,
        expiredUnitsCount,
        totalAmountExpected,
        totalAmountCollected,
        totalAmountPending,
        unitStatuses
      };
    });

    const inReviewSubmissionsCount = submissions.filter(s => s.status === 'Pendiente').length;

    return {
      summaries,
      totalExpected: grandTotalExpected,
      totalCollected: grandTotalCollected,
      totalPending: grandTotalPending,
      totalPendingResidents: pendingResidentIdsSet.size,
      inReviewSubmissionsCount
    };
  });

  readonly mySubmissions = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    return this.paymentSubmissions().filter(s => s.residentId === user.id);
  });

  readonly newDebtsForComplex = computed(() => {
    const complex = this.currentComplex();
    if (!complex) return [];

    const complexUnits = this.units().filter(u => this.isSameComplex(u.complexId, complex.id));
    const complexUnitIds = new Set<string>();
    complexUnits.forEach(u => {
      if (u.id) complexUnitIds.add(u.id);
      if (u.remoteId) complexUnitIds.add(u.remoteId);
    });

    return this.deduplicateDebts(this.debts()).filter(d => {
      const matchesComplexDirect = this.isSameComplex(d.complexId, complex.id);
      const matchesByVivienda = d.viviendaId ? complexUnitIds.has(d.viviendaId) : false;
      return (matchesComplexDirect || matchesByVivienda) && 
        d.status !== 'Liquidado' && 
        d.status !== 'Rechazado' &&
        d.sanctionDecision === 'pending';
    });
  });

  readonly debtsInReviewForComplex = computed(() => {
    const complex = this.currentComplex();
    if (!complex) return [];

    const complexUnits = this.units().filter(u => this.isSameComplex(u.complexId, complex.id));
    const complexUnitIds = new Set<string>();
    complexUnits.forEach(u => {
      if (u.id) complexUnitIds.add(u.id);
      if (u.remoteId) complexUnitIds.add(u.remoteId);
    });

    return this.deduplicateDebts(this.debts()).filter(d => {
      const matchesComplexDirect = this.isSameComplex(d.complexId, complex.id);
      const matchesByVivienda = d.viviendaId ? complexUnitIds.has(d.viviendaId) : false;
      return (matchesComplexDirect || matchesByVivienda) && 
        d.sanctionDecision !== 'pending' &&
        d.status !== 'Liquidado' &&
        d.status !== 'Rechazado';
    });
  });

  readonly debtsHistoryForComplex = computed(() => {
    const complex = this.currentComplex();
    if (!complex) return [];

    const complexUnits = this.units().filter(u => this.isSameComplex(u.complexId, complex.id));
    const complexUnitIds = new Set<string>();
    complexUnits.forEach(u => {
      if (u.id) complexUnitIds.add(u.id);
      if (u.remoteId) complexUnitIds.add(u.remoteId);
    });

    return this.deduplicateDebts(this.debts()).filter(d => {
      const matchesComplexDirect = this.isSameComplex(d.complexId, complex.id);
      const matchesByVivienda = d.viviendaId ? complexUnitIds.has(d.viviendaId) : false;
      return (matchesComplexDirect || matchesByVivienda) && 
        d.sanctionDecision !== 'pending' &&
        (d.status === 'Liquidado' || d.status === 'Rechazado');
    });
  });

  readonly debtsForComplex = computed(() => this.debtsInReviewForComplex());

  readonly myDebts = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    const submissions = this.mySubmissions();
    const pendingSubmissionDebtIds = new Set<string>();

    for (const s of submissions) {
      if (s.status === 'Pendiente') {
        if (s.debtId) {
          pendingSubmissionDebtIds.add(s.debtId);
        }
        if (s.paymentRequestId) {
          pendingSubmissionDebtIds.add(s.paymentRequestId);
          if (s.paymentRequestId.startsWith('debt-')) {
            pendingSubmissionDebtIds.add(s.paymentRequestId.replace('debt-', ''));
          }
        }
      }
    }

    const userViviendaIds = new Set<string>();
    if (user.viviendaId) userViviendaIds.add(user.viviendaId);
    const userUnit = this.units().find(u => u.id === user.viviendaId || u.remoteId === user.viviendaId);
    if (userUnit) {
      if (userUnit.id) userViviendaIds.add(userUnit.id);
      if (userUnit.remoteId) userViviendaIds.add(userUnit.remoteId);
    }

    return this.deduplicateDebts(this.debts())
      .filter(d => 
        (d.residentId === user.id || (d.viviendaId && userViviendaIds.has(d.viviendaId))) &&
        d.status !== 'Liquidado' &&
        d.sanctionDecision !== 'pending'
      )
      .map(d => {
        const isPendingReview = d.status === 'En revisión' || 
          pendingSubmissionDebtIds.has(d.id) || 
          (d.paymentRequestId ? pendingSubmissionDebtIds.has(d.paymentRequestId) : false);
        
        if (isPendingReview) {
          return { ...d, status: 'En revisión' as const };
        }
        return d;
      });
  });

  readonly userNotifications = computed(() => {
    const user = this.currentUser();
    const role = this.activeRole();
    const complex = this.currentComplex();
    if (!user || !role || !complex) return [];

    return this.notifications().filter(n => {
      if (n.complexId !== complex.id) return false;

      // Role MUST strictly match active role profile
      const effectiveTargetRole = n.targetRole || 'Residente';
      if (effectiveTargetRole !== role) return false;

      // If notification targets a specific user ID, it must match current logged in user
      if (n.userId && n.userId !== user.id) return false;

      return true;
    });
  });

  readonly unreadNotificationCount = computed(() => {
    return this.userNotifications().filter(n => !n.read).length;
  });

  constructor() {
    this.initSeedData();
    this.syncCatalogos();
  }

  async syncCatalogos(): Promise<{
    complexesSynced: number;
    complexesUnsynced: number;
    complexesConflict: number;
    unitsSynced: number;
    unitsUnsynced: number;
    unitsConflict: number;
  }> {
    let complexesSynced = 0;
    let complexesUnsynced = 0;
    let complexesConflict = 0;

    let unitsSynced = 0;
    let unitsUnsynced = 0;
    let unitsConflict = 0;

    if (this.catalogosSynced || this.isSyncingCatalogos) {
      console.log('[Sync Catálogos] Sincronización omitida: ya realizada previamente o en progreso.');
      return {
        complexesSynced: 0,
        complexesUnsynced: 0,
        complexesConflict: 0,
        unitsSynced: 0,
        unitsUnsynced: 0,
        unitsConflict: 0
      };
    }

    this.isSyncingCatalogos = true;

    try {
      console.log('[Sync Catálogos] Iniciando sincronización única de catálogos con Supabase (2 consultas)...');
      
      // Consulta 1: Todos los conjuntos habitacionales
      const rawRemoteComplexes = await this.supabaseService.getConjuntos();
      const remoteComplexes = rawRemoteComplexes as { id: string; nombre: string; [key: string]: unknown }[];

      // Consulta 2: Todas las viviendas
      const rawRemoteUnits = await this.supabaseService.getAllViviendas();
      const remoteUnits = rawRemoteUnits as { id: string; complex_id: string; numero_vivienda: string; [key: string]: unknown }[];

      const currentComplexes = [...this.complexes()];
      const currentUnits = [...this.units()];

      const localToRemoteComplexMap = new Map<string, string>();

      const updatedComplexes: HousingComplex[] = currentComplexes.map(localComplex => {
        const normalizedLocalName = localComplex.nombre.trim().toLowerCase();
        const matches = remoteComplexes.filter(
          rc => (rc.nombre || '').trim().toLowerCase() === normalizedLocalName
        );

        if (matches.length === 1) {
          const remoteId = matches[0].id;
          localToRemoteComplexMap.set(localComplex.id, remoteId);
          complexesSynced++;
          console.log(`[Sync Catálogos] SYNCED: Conjunto local ${localComplex.id} (${localComplex.nombre}) -> Remote ${remoteId}`);
          return { ...localComplex, remoteId };
        } else if (matches.length === 0) {
          complexesUnsynced++;
          console.log(`[Sync Catálogos] UNSYNCED: Conjunto local ${localComplex.id} (${localComplex.nombre})`);
          return { ...localComplex, remoteId: undefined };
        } else {
          complexesConflict++;
          console.warn(`[Sync Catálogos] CONFLICT: Múltiples coincidencias remotas (${matches.length}) para conjunto local ${localComplex.id} (${localComplex.nombre})`);
          return { ...localComplex, remoteId: undefined };
        }
      });

      // Agrupar viviendas remotas por complex_id
      const remoteUnitsByComplexMap = new Map<string, { id: string; numero_vivienda: string; [key: string]: unknown }[]>();
      for (const ru of remoteUnits) {
        if (ru.complex_id) {
          const list = remoteUnitsByComplexMap.get(ru.complex_id) || [];
          list.push(ru);
          remoteUnitsByComplexMap.set(ru.complex_id, list);
        }
      }

      const updatedUnits: HousingUnit[] = [];
      for (const localUnit of currentUnits) {
        const remoteComplexId = localToRemoteComplexMap.get(localUnit.complexId);
        if (!remoteComplexId) {
          unitsUnsynced++;
          console.log(`[Sync Catálogos] UNSYNCED: Vivienda local ${localUnit.id} (${localUnit.numeroVivienda}) - Conjunto no sincronizado (${localUnit.complexId})`);
          updatedUnits.push({ ...localUnit, remoteId: undefined });
          continue;
        }

        const candidateRemoteUnits = remoteUnitsByComplexMap.get(remoteComplexId) || [];
        const normalizedLocalNum = localUnit.numeroVivienda.trim().toLowerCase();

        const matches = candidateRemoteUnits.filter(
          ru => (ru.numero_vivienda || '').trim().toLowerCase() === normalizedLocalNum
        );

        if (matches.length === 1) {
          const remoteId = matches[0].id;
          unitsSynced++;
          console.log(`[Sync Catálogos] SYNCED: Vivienda local ${localUnit.id} (${localUnit.numeroVivienda}) -> Remote ${remoteId}`);
          updatedUnits.push({ ...localUnit, remoteId });
        } else if (matches.length === 0) {
          unitsUnsynced++;
          console.log(`[Sync Catálogos] UNSYNCED: Vivienda local ${localUnit.id} (${localUnit.numeroVivienda}) no existe en Supabase.`);
          updatedUnits.push({ ...localUnit, remoteId: undefined });
        } else {
          unitsConflict++;
          console.warn(`[Sync Catálogos] CONFLICT: Múltiples coincidencias remotas (${matches.length}) para vivienda local ${localUnit.id} (${localUnit.numeroVivienda})`);
          updatedUnits.push({ ...localUnit, remoteId: undefined });
        }
      }

      this.complexes.set(updatedComplexes);
      this.units.set(updatedUnits);
      this.saveStateToStorage();

      console.log(`[Sync Catálogos] RESUMEN CONJUNTOS -> SYNCED: ${complexesSynced}, UNSYNCED: ${complexesUnsynced}, CONFLICT: ${complexesConflict}`);
      console.log(`[Sync Catálogos] RESUMEN VIVIENDAS  -> SYNCED: ${unitsSynced}, UNSYNCED: ${unitsUnsynced}, CONFLICT: ${unitsConflict}`);

      this.catalogosSynced = true;
    } catch (err) {
      console.error('[Sync Catálogos] Error durante la sincronización de catálogos:', err);
    } finally {
      this.isSyncingCatalogos = false;
    }

    return {
      complexesSynced,
      complexesUnsynced,
      complexesConflict,
      unitsSynced,
      unitsUnsynced,
      unitsConflict
    };
  }

  private safeGetStorage(key: string): string | null {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeSetStorage(key: string, value: string): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }

  private safeRemoveStorage(key: string): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  private initSeedData() {
    const storedComplexes = this.safeGetStorage('vivofacil_complexes');
    const storedUsers = this.safeGetStorage('vivofacil_users');
    const storedVisits = this.safeGetStorage('vivofacil_visits');
    const storedPayments = this.safeGetStorage('vivofacil_payments');
    const storedSubmissions = this.safeGetStorage('vivofacil_submissions');
    const storedDebts = this.safeGetStorage('vivofacil_debts');
    const storedNotifications = this.safeGetStorage('vivofacil_notifications');



    // Default Multi-Tenant Complexes
    const initialComplexes: HousingComplex[] = [
      {
        id: 'cx-1',
        nombre: 'Residencial Los Olivos',
        direccion: 'Av. Las Palmas #450, Col. Campestre',
        ciudad: 'Guadalajara, Jal.',
        lat: 20.6736,
        lng: -103.3440,
        totalViviendas: 48,
        contactoAdmin: 'admin.olivos@vivofacil.com'
      },
      {
        id: 'cx-2',
        nombre: 'Privada El Roble',
        direccion: 'Calle Roble Blanco #120, Col. Del Valle',
        ciudad: 'Monterrey, N.L.',
        lat: 25.6866,
        lng: -100.3161,
        totalViviendas: 24,
        contactoAdmin: 'admin.roble@vivofacil.com'
      },
      {
        id: 'cx-3',
        nombre: 'Condominios Torres del Sol',
        direccion: 'Blvd. Diaz Ordaz #890',
        ciudad: 'Querétaro, Qro.',
        lat: 20.5888,
        lng: -100.3899,
        totalViviendas: 60,
        contactoAdmin: 'admin.torressol@vivofacil.com'
      },
      {
        id: 'cx-4',
        nombre: 'Fraccionamiento Las Hadas',
        direccion: 'Prol. Paseo Usumacinta',
        ciudad: 'Villahermosa, Tab.',
        lat: 17.9892,
        lng: -92.9475,
        totalViviendas: 15,
        contactoAdmin: 'admin.hadas@vivofacil.com'
      },
      {
        id: 'cx-5',
        nombre: 'Residencial Cumbres',
        direccion: 'Villahermosa-Ixtacomitán km 1.5',
        ciudad: 'Villahermosa, Tab.',
        lat: 17.9620,
        lng: -92.9550,
        totalViviendas: 15,
        contactoAdmin: 'admin.cumbres@vivofacil.com'
      },
      {
        id: 'cx-6',
        nombre: 'Residencial Real de Palmas',
        direccion: 'Av. 4 Oriente, Ciudad Industrial',
        ciudad: 'Villahermosa, Tab.',
        lat: 18.0150,
        lng: -92.9100,
        totalViviendas: 20,
        contactoAdmin: 'admin.realpalmas@vivofacil.com'
      },
      {
        id: 'cx-7',
        nombre: 'Residential Capitol Villahermosa',
        direccion: 'Prol. Paseo de Usumacinta',
        ciudad: 'Villahermosa, Tab.',
        lat: 17.9920,
        lng: -92.9430,
        totalViviendas: 15,
        contactoAdmin: 'admin.capitol@vivofacil.com'
      }
    ];

    const initialUnits: HousingUnit[] = [
      { id: 'u-101', complexId: 'cx-1', numeroVivienda: 'Casa #12', bloqueCalle: 'Calle Ciprés' },
      { id: 'u-102', complexId: 'cx-1', numeroVivienda: 'Casa #14', bloqueCalle: 'Calle Ciprés' },
      { id: 'u-103', complexId: 'cx-1', numeroVivienda: 'Casa #25', bloqueCalle: 'Calle Encino' },
      { id: 'u-201', complexId: 'cx-2', numeroVivienda: 'Privada A-04', bloqueCalle: 'Manzana 2' },
      { id: 'u-301', complexId: 'cx-3', numeroVivienda: 'Depto 402-B', bloqueCalle: 'Torre Norte' },
      
      // Fraccionamiento Las Hadas (cx-4): Casa 1 to Casa 15
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `u-4${String(i + 1).padStart(2, '0')}`,
        complexId: 'cx-4',
        numeroVivienda: `Casa ${i + 1}`,
        bloqueCalle: 'Paseo Usumacinta'
      })),
      // Residencial Cumbres (cx-5): Casa 1 to Casa 15
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `u-5${String(i + 1).padStart(2, '0')}`,
        complexId: 'cx-5',
        numeroVivienda: `Casa ${i + 1}`,
        bloqueCalle: 'Ixtacomitán'
      })),
      // Residencial Real de Palmas (cx-6): Casa 1 to Casa 20
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `u-6${String(i + 1).padStart(2, '0')}`,
        complexId: 'cx-6',
        numeroVivienda: `Casa ${i + 1}`,
        bloqueCalle: 'Av. 4 Oriente'
      })),
      // Residential Capitol Villahermosa (cx-7): Casa 1 to Casa 15
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `u-7${String(i + 1).padStart(2, '0')}`,
        complexId: 'cx-7',
        numeroVivienda: `Casa ${i + 1}`,
        bloqueCalle: 'Paseo Usumacinta'
      }))
    ];

    // Seed Data Requirement 6:
    // 1 Pendiente, 2 Administrador, 1 Vigilante, 1 Residente, 1 Residente+Vigilante, 1 Administrador+Residente
    const initialUsers: User[] = [
      {
        id: 'usr-pending-1',
        nombreCompleto: 'Sofía Ramírez López',
        correo: 'sofia@vivofacil.com',
        telefono: '3377889900',
        password: '123456',
        complexId: 'cx-1',
        viviendaId: 'u-103',
        viviendaNumero: 'Casa #25',
        roles: ['Residente'],
        status: 'Pendiente',
        associatedComplexIds: ['cx-1'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-admin-1',
        nombreCompleto: 'Carlos Mendoza',
        correo: 'carlos@vivofacil.com',
        telefono: '3312345678',
        password: '123456',
        complexId: 'cx-1',
        viviendaId: 'u-101',
        viviendaNumero: 'Casa #12',
        roles: ['Administrador'],
        status: 'Activa',
        associatedComplexIds: ['cx-1', 'cx-2'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-admin-2',
        nombreCompleto: 'Beatriz Solís',
        correo: 'beatriz@vivofacil.com',
        telefono: '8112345678',
        password: '123456',
        complexId: 'cx-2',
        viviendaId: 'u-201',
        viviendaNumero: 'Oficina Admin Roble',
        roles: ['Administrador'],
        status: 'Activa',
        associatedComplexIds: ['cx-2'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-vigilante-1',
        nombreCompleto: 'Juan Pérez (Vigilancia)',
        correo: 'vigilante@vivofacil.com',
        telefono: '3398765432',
        password: '123456',
        complexId: 'cx-1',
        viviendaId: 'u-101',
        viviendaNumero: 'Caseta Principal',
        roles: ['Vigilante'],
        status: 'Activa',
        associatedComplexIds: ['cx-1'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-resident-1',
        nombreCompleto: 'María Fernanda Gómez',
        correo: 'maria@vivofacil.com',
        telefono: '3345678901',
        password: '123456',
        complexId: 'cx-1',
        viviendaId: 'u-102',
        viviendaNumero: 'Casa #14',
        roles: ['Residente'],
        status: 'Activa',
        associatedComplexIds: ['cx-1'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-res-vig',
        nombreCompleto: 'Ricardo Treviño (Res+Vig)',
        correo: 'ricardo@vivofacil.com',
        telefono: '3355667788',
        password: '123456',
        complexId: 'cx-1',
        viviendaId: 'u-101',
        viviendaNumero: 'Casa #18',
        roles: ['Residente', 'Vigilante'],
        status: 'Activa',
        associatedComplexIds: ['cx-1'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-adm-res',
        nombreCompleto: 'Elena Castro (Admin+Res)',
        correo: 'elena@vivofacil.com',
        telefono: '3399001122',
        password: '123456',
        complexId: 'cx-1',
        viviendaId: 'u-102',
        viviendaNumero: 'Casa #20',
        roles: ['Administrador', 'Residente'],
        status: 'Activa',
        associatedComplexIds: ['cx-1', 'cx-3'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-prueba2',
        nombreCompleto: 'Prueba 2',
        correo: 'prueba2@gmail.com',
        telefono: '3312345678',
        password: '123456',
        complexId: 'cx-1',
        viviendaId: 'u-101',
        viviendaNumero: 'Casa #12',
        roles: ['Residente'],
        status: 'Activa',
        associatedComplexIds: ['cx-1'],
        createdAt: new Date().toISOString()
      },

      // --- Fraccionamiento Las Hadas (cx-4) ---
      {
        id: 'usr-hadas-admin',
        nombreCompleto: 'Laura Hinojosa',
        correo: 'admin.hadas@vivofacil.com',
        telefono: '9931234501',
        password: '123456',
        complexId: 'cx-4',
        viviendaId: 'u-401',
        viviendaNumero: 'Casa 1',
        roles: ['Administrador'],
        status: 'Activa',
        associatedComplexIds: ['cx-4'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-hadas-vigilante',
        nombreCompleto: 'Mario Rendón',
        correo: 'vigilante.hadas@vivofacil.com',
        telefono: '9931234502',
        password: '123456',
        complexId: 'cx-4',
        viviendaId: 'u-401',
        viviendaNumero: 'Caseta Principal',
        roles: ['Vigilante'],
        status: 'Activa',
        associatedComplexIds: ['cx-4'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-hadas-residente',
        nombreCompleto: 'Gabriel Peralta',
        correo: 'residente.hadas@vivofacil.com',
        telefono: '9931234503',
        password: '123456',
        complexId: 'cx-4',
        viviendaId: 'u-405',
        viviendaNumero: 'Casa 5',
        roles: ['Residente'],
        status: 'Activa',
        associatedComplexIds: ['cx-4'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-hadas-all',
        nombreCompleto: 'Verónica Suárez (Todos los Roles)',
        correo: 'todos.hadas@vivofacil.com',
        telefono: '9931234504',
        password: '123456',
        complexId: 'cx-4',
        viviendaId: 'u-410',
        viviendaNumero: 'Casa 10',
        roles: ['Administrador', 'Vigilante', 'Residente'],
        status: 'Activa',
        associatedComplexIds: ['cx-4'],
        createdAt: new Date().toISOString()
      },

      // --- Residencial Cumbres (cx-5) ---
      {
        id: 'usr-cumbres-admin',
        nombreCompleto: 'Fernando Morales',
        correo: 'admin.cumbres@vivofacil.com',
        telefono: '9931234505',
        password: '123456',
        complexId: 'cx-5',
        viviendaId: 'u-501',
        viviendaNumero: 'Casa 1',
        roles: ['Administrador'],
        status: 'Activa',
        associatedComplexIds: ['cx-5'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-cumbres-vigilante',
        nombreCompleto: 'José Luis Aguilar',
        correo: 'vigilante.cumbres@vivofacil.com',
        telefono: '9931234506',
        password: '123456',
        complexId: 'cx-5',
        viviendaId: 'u-501',
        viviendaNumero: 'Caseta Principal',
        roles: ['Vigilante'],
        status: 'Activa',
        associatedComplexIds: ['cx-5'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-cumbres-residente',
        nombreCompleto: 'Daniela Osorio',
        correo: 'residente.cumbres@vivofacil.com',
        telefono: '9931234507',
        password: '123456',
        complexId: 'cx-5',
        viviendaId: 'u-505',
        viviendaNumero: 'Casa 5',
        roles: ['Residente'],
        status: 'Activa',
        associatedComplexIds: ['cx-5'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-cumbres-all',
        nombreCompleto: 'Alejandro Ruiz (Todos los Roles)',
        correo: 'todos.cumbres@vivofacil.com',
        telefono: '9931234508',
        password: '123456',
        complexId: 'cx-5',
        viviendaId: 'u-510',
        viviendaNumero: 'Casa 10',
        roles: ['Administrador', 'Vigilante', 'Residente'],
        status: 'Activa',
        associatedComplexIds: ['cx-5'],
        createdAt: new Date().toISOString()
      },

      // --- Residencial Real de Palmas (cx-6) ---
      {
        id: 'usr-realpalmas-admin',
        nombreCompleto: 'Patricio Domínguez',
        correo: 'admin.realpalmas@vivofacil.com',
        telefono: '9931234509',
        password: '123456',
        complexId: 'cx-6',
        viviendaId: 'u-601',
        viviendaNumero: 'Casa 1',
        roles: ['Administrador'],
        status: 'Activa',
        associatedComplexIds: ['cx-6'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-realpalmas-vigilante',
        nombreCompleto: 'Ramón Gutiérrez',
        correo: 'vigilante.realpalmas@vivofacil.com',
        telefono: '9931234510',
        password: '123456',
        complexId: 'cx-6',
        viviendaId: 'u-601',
        viviendaNumero: 'Caseta Principal',
        roles: ['Vigilante'],
        status: 'Activa',
        associatedComplexIds: ['cx-6'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-realpalmas-residente',
        nombreCompleto: 'Claudia Armenta',
        correo: 'residente.realpalmas@vivofacil.com',
        telefono: '9931234511',
        password: '123456',
        complexId: 'cx-6',
        viviendaId: 'u-608',
        viviendaNumero: 'Casa 8',
        roles: ['Residente'],
        status: 'Activa',
        associatedComplexIds: ['cx-6'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-realpalmas-all',
        nombreCompleto: 'Guillermo Lara (Todos los Roles)',
        correo: 'todos.realpalmas@vivofacil.com',
        telefono: '9931234512',
        password: '123456',
        complexId: 'cx-6',
        viviendaId: 'u-615',
        viviendaNumero: 'Casa 15',
        roles: ['Administrador', 'Vigilante', 'Residente'],
        status: 'Activa',
        associatedComplexIds: ['cx-6'],
        createdAt: new Date().toISOString()
      },

      // --- Residential Capitol Villahermosa (cx-7) ---
      {
        id: 'usr-capitol-admin',
        nombreCompleto: 'Valeria Camargo',
        correo: 'admin.capitol@vivofacil.com',
        telefono: '9931234513',
        password: '123456',
        complexId: 'cx-7',
        viviendaId: 'u-701',
        viviendaNumero: 'Casa 1',
        roles: ['Administrador'],
        status: 'Activa',
        associatedComplexIds: ['cx-7'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-capitol-vigilante',
        nombreCompleto: 'Esteban Cabrera',
        correo: 'vigilante.capitol@vivofacil.com',
        telefono: '9931234514',
        password: '123456',
        complexId: 'cx-7',
        viviendaId: 'u-701',
        viviendaNumero: 'Caseta Principal',
        roles: ['Vigilante'],
        status: 'Activa',
        associatedComplexIds: ['cx-7'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-capitol-residente',
        nombreCompleto: 'Andrea Rivas',
        correo: 'residente.capitol@vivofacil.com',
        telefono: '9931234515',
        password: '123456',
        complexId: 'cx-7',
        viviendaId: 'u-705',
        viviendaNumero: 'Casa 5',
        roles: ['Residente'],
        status: 'Activa',
        associatedComplexIds: ['cx-7'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-capitol-all',
        nombreCompleto: 'Rodrigo Valenzuela (Todos los Roles)',
        correo: 'todos.capitol@vivofacil.com',
        telefono: '9931234516',
        password: '123456',
        complexId: 'cx-7',
        viviendaId: 'u-710',
        viviendaNumero: 'Casa 10',
        roles: ['Administrador', 'Vigilante', 'Residente'],
        status: 'Activa',
        associatedComplexIds: ['cx-7'],
        createdAt: new Date().toISOString()
      }
    ];

    const today = new Date().toISOString().split('T')[0];

    const initialVisits: VisitorVisit[] = [
      {
        id: 'vst-101',
        qrCode: 'VF-QR-849201',
        visitorName: 'Roberto Hernández',
        birthDate: '1988-04-12',
        visitDate: today,
        estimatedTime: '18:00',
        residentId: 'usr-admin-resident',
        residentName: 'Carlos Mendoza',
        viviendaNumber: 'Casa #12',
        complexId: 'cx-1',
        status: 'Pendiente',
        createdAt: new Date().toISOString()
      },
      {
        id: 'vst-102',
        qrCode: 'VF-QR-112233',
        visitorName: 'Ana Lucía Torres',
        birthDate: '1995-09-24',
        visitDate: today,
        estimatedTime: '11:30',
        residentId: 'usr-admin-resident',
        residentName: 'Carlos Mendoza',
        viviendaNumber: 'Casa #12',
        complexId: 'cx-1',
        status: 'Aprobado',
        scannedAt: new Date(Date.now() - 3600000).toISOString(),
        scannedByVigilanteId: 'usr-vigilante',
        scannedByVigilanteName: 'Juan Pérez (Vigilancia)',
        ineVerifiedManual: true,
        decision: 'Aprobado',
        vehiclePlates: 'JMX-8921',
        observations: 'Visitante familiar. INE verificada correctamente en caseta.',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'vst-401',
        qrCode: 'VF-QR-400101',
        visitorName: 'Martha Gómez',
        birthDate: '1990-06-15',
        visitDate: today,
        estimatedTime: '16:00',
        residentId: 'usr-hadas-residente',
        residentName: 'Gabriel Peralta',
        viviendaNumber: 'Casa 5',
        complexId: 'cx-4',
        status: 'Pendiente',
        createdAt: new Date().toISOString()
      },
      {
        id: 'vst-501',
        qrCode: 'VF-QR-500101',
        visitorName: 'Felipe Neri',
        birthDate: '1985-02-20',
        visitDate: today,
        estimatedTime: '17:30',
        residentId: 'usr-cumbres-residente',
        residentName: 'Daniela Osorio',
        viviendaNumber: 'Casa 5',
        complexId: 'cx-5',
        status: 'Pendiente',
        createdAt: new Date().toISOString()
      },
      {
        id: 'vst-601',
        qrCode: 'VF-QR-600101',
        visitorName: 'Sofía Medina',
        birthDate: '1992-11-08',
        visitDate: today,
        estimatedTime: '19:00',
        residentId: 'usr-realpalmas-residente',
        residentName: 'Claudia Armenta',
        viviendaNumber: 'Casa 8',
        complexId: 'cx-6',
        status: 'Pendiente',
        createdAt: new Date().toISOString()
      },
      {
        id: 'vst-701',
        qrCode: 'VF-QR-700101',
        visitorName: 'Ernesto Sodi',
        birthDate: '1987-08-30',
        visitDate: today,
        estimatedTime: '20:00',
        residentId: 'usr-capitol-residente',
        residentName: 'Andrea Rivas',
        viviendaNumber: 'Casa 5',
        complexId: 'cx-7',
        status: 'Pendiente',
        createdAt: new Date().toISOString()
      }
    ];

    const initialPayments: PaymentRequest[] = [
      {
        id: 'pay-1',
        complexId: 'cx-1',
        title: 'Mantenimiento Mensual de Agosto',
        type: 'Pago Fijo',
        category: 'Cuota mensual',
        amount: 1250,
        dueDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-15`,
        description: 'Cuota ordinaria para mantenimiento de jardines, alumbrado y seguridad.',
        status: 'Pendiente',
        createdAt: new Date().toISOString()
      },
      {
        id: 'pay-2',
        complexId: 'cx-1',
        title: 'Fondo para Reparación de Portón Eléctrico',
        type: 'Pago Extraordinario',
        category: 'Reparaciones',
        amount: 450,
        dueDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-28`,
        description: 'Sustitución de motor y mantenimiento preventivo del portón automatizado.',
        status: 'Pendiente',
        createdAt: new Date().toISOString()
      },
      {
        id: 'pay-3',
        complexId: 'cx-1',
        title: 'Cuota de Limpieza de Áreas Comunes (Julio)',
        type: 'Pago Fijo',
        category: 'Mantenimiento',
        amount: 350,
        dueDate: '2026-07-28',
        description: 'Cuota extraordinaria para limpieza intensiva de piscina y terraza.',
        status: 'Pendiente',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
      }
    ];

    const initialDebts: Debt[] = [
      {
        id: 'dbt-1',
        complexId: 'cx-1',
        viviendaId: 'u-103',
        viviendaNumero: 'Casa #25',
        residentId: 'usr-pending-1',
        residentName: 'Sofía Ramírez López',
        concept: 'Mantenimiento Mensual Julio (Vencido)',
        amount: 1250,
        dueDate: '2026-07-15',
        createdAt: '2026-07-16',
        observations: 'Pago no recibido al corte mensual.',
        sanctionAmount: 150,
        sanctionReason: 'Recargo por pago extemporáneo (10%)',
        sanctionDecision: 'applied',
        status: 'Pendiente'
      }
    ];

    const initialNotifications: NotificationItem[] = [
      {
        id: 'notif-seed-1',
        complexId: 'cx-1',
        targetRole: 'Administrador',
        icon: 'person_add',
        title: 'Nueva cuenta pendiente de aprobación',
        description: 'Sofía Ramírez López se ha registrado y requiere aprobación de acceso para la Casa #25.',
        category: 'usuario',
        createdAt: '01/08/2026 10:15',
        read: false
      },
      {
        id: 'notif-seed-2',
        complexId: 'cx-1',
        userId: 'usr-resident-1',
        targetRole: 'Residente',
        icon: 'check_circle',
        title: 'Visita Aprobada',
        description: 'Tu visita Roberto Hernández ya llegó y accedió al lugar por la caseta principal.',
        category: 'visita',
        createdAt: '01/08/2026 09:30',
        read: false
      },
      {
        id: 'notif-seed-3',
        complexId: 'cx-1',
        userId: 'usr-resident-1',
        targetRole: 'Residente',
        icon: 'schedule',
        title: 'Recordatorio de Pago Próximo',
        description: 'Tu pago "Mantenimiento Mensual de Agosto" de $1,250 vence el próximo día 15. Evita recargos.',
        category: 'recordatorio',
        createdAt: '01/08/2026 08:00',
        read: false
      },
      {
        id: 'notif-seed-4',
        complexId: 'cx-1',
        targetRole: 'Administrador',
        icon: 'payments',
        title: 'Nuevo pago registrado',
        description: 'María Fernanda Gómez (Casa #14) ha registrado un comprobante de pago por $1,250.',
        category: 'pago',
        createdAt: '31/07/2026 18:45',
        read: true
      },
      {
        id: 'notif-seed-5',
        complexId: 'cx-1',
        targetRole: 'Vigilante',
        icon: 'qr_code',
        title: 'Nueva Visita Pre-registrada',
        description: 'Carlos Residente (Casa #12) ha pre-registrado la visita de Roberto Hernández para hoy a las 14:00.',
        category: 'visita',
        createdAt: '01/08/2026 11:00',
        read: false
      }
    ];

    // Merge logic to ensure all initial seed records exist even with stored localStorage
    let finalUsers = initialUsers;
    if (storedUsers) {
      try {
        const parsed: User[] = JSON.parse(storedUsers);
        initialUsers.forEach(iu => {
          if (!parsed.some(u => u.correo.toLowerCase() === iu.correo.toLowerCase())) {
            parsed.push(iu);
          }
        });
        finalUsers = parsed;
      } catch {
        finalUsers = initialUsers;
      }
    }

    // Always ensure prueba2@gmail.com has status 'Activa' so side navigation is visible
    finalUsers = finalUsers.map(u => {
      if (u.correo.toLowerCase() === 'prueba2@gmail.com') {
        return {
          ...u,
          status: 'Activa' as AccountStatus,
          roles: (u.roles && u.roles.length > 0) ? u.roles : ['Residente']
        };
      }
      return u;
    });

    let finalComplexes = initialComplexes;
    if (storedComplexes) {
      try {
        const parsed: HousingComplex[] = JSON.parse(storedComplexes);
        initialComplexes.forEach(ic => {
          if (!parsed.some(c => c.id === ic.id)) {
            parsed.push(ic);
          }
        });
        finalComplexes = parsed;
      } catch {
        finalComplexes = initialComplexes;
      }
    }

    let finalUnits = initialUnits;
    const storedUnits = this.safeGetStorage('vivofacil_units');
    if (storedUnits) {
      try {
        const parsed: HousingUnit[] = JSON.parse(storedUnits);
        initialUnits.forEach(iu => {
          if (!parsed.some(u => u.id === iu.id)) {
            parsed.push(iu);
          }
        });
        finalUnits = parsed;
      } catch {
        finalUnits = initialUnits;
      }
    }

    let finalNotifications = initialNotifications;
    if (storedNotifications) {
      try {
        const parsed: NotificationItem[] = JSON.parse(storedNotifications);
        initialNotifications.forEach(inote => {
          if (!parsed.some(n => n.id === inote.id)) {
            parsed.push(inote);
          }
        });
        finalNotifications = parsed;
      } catch {
        finalNotifications = initialNotifications;
      }
    }

    this.complexes.set(finalComplexes);
    this.units.set(finalUnits);
    this.users.set(finalUsers);
    this.visits.set(storedVisits ? JSON.parse(storedVisits) : initialVisits);
    this.paymentRequests.set(storedPayments ? JSON.parse(storedPayments) : initialPayments);
    this.paymentSubmissions.set(storedSubmissions ? JSON.parse(storedSubmissions) : []);
    this.debts.set(this.deduplicateDebts(storedDebts ? JSON.parse(storedDebts) : initialDebts));
    this.notifications.set(finalNotifications);

    this.saveStateToStorage();

    // Restore session if available
    const savedUser = this.safeGetStorage('vivofacil_session_user');
    const savedRole = this.safeGetStorage('vivofacil_session_role');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        const freshUser = this.users().find(x => x.id === u.id || x.correo.toLowerCase() === u.correo.toLowerCase()) || u;
        this.currentUser.set(freshUser);
        const roleToSet = (savedRole as UserRole);
        const finalRole = (roleToSet && freshUser.roles.includes(roleToSet)) ? roleToSet : freshUser.roles[0];
        this.activeRole.set(finalRole);
        this.activeNavTab.set(this.getDefaultTabForRole(finalRole));
      } catch {
        this.login('carlos@vivofacil.com', '123456');
      }
    } else {
      this.login('carlos@vivofacil.com', '123456');
    }

    this.checkPaymentReminders();
    this.syncOverduePaymentRequests();

    if (this.supabaseService.isConfigured) {
      this.syncCatalogos().then(() => {
        this.syncVisitas();
        this.syncSolicitudesPago();
        this.syncComprobantes();
      }).catch(err => console.warn('[Init] Error al sincronizar datos iniciales:', err));
    }
  }

  private saveStateToStorage() {
    this.safeSetStorage('vivofacil_complexes', JSON.stringify(this.complexes()));
    this.safeSetStorage('vivofacil_units', JSON.stringify(this.units()));
    this.safeSetStorage('vivofacil_users', JSON.stringify(this.users()));
    this.safeSetStorage('vivofacil_visits', JSON.stringify(this.visits()));
    this.safeSetStorage('vivofacil_payments', JSON.stringify(this.paymentRequests()));
    this.safeSetStorage('vivofacil_submissions', JSON.stringify(this.paymentSubmissions()));
    this.safeSetStorage('vivofacil_debts', JSON.stringify(this.debts()));
    this.safeSetStorage('vivofacil_notifications', JSON.stringify(this.notifications()));
  }

  // --- Notifications Management ---

  addNotification(notif: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) {
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: formattedDate,
      read: false
    };

    this.notifications.update(list => [newNotif, ...list]);
    this.safeSetStorage('vivofacil_notifications', JSON.stringify(this.notifications()));
  }

  markNotificationAsRead(id: string) {
    this.notifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
    this.safeSetStorage('vivofacil_notifications', JSON.stringify(this.notifications()));
  }

  markAllNotificationsAsRead() {
    const currentFilteredIds = new Set(this.userNotifications().map(n => n.id));
    this.notifications.update(list => list.map(n => currentFilteredIds.has(n.id) ? { ...n, read: true } : n));
    this.safeSetStorage('vivofacil_notifications', JSON.stringify(this.notifications()));
  }

  checkPaymentReminders() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Check payment requests due tomorrow
    for (const p of this.paymentRequests()) {
      if (p.dueDate === tomorrowStr && p.status === 'Pendiente') {
        const existing = this.notifications().some(n => 
          n.category === 'recordatorio' && n.description.includes(p.title)
        );
        if (!existing) {
          this.addNotification({
            complexId: p.complexId,
            targetRole: 'Residente',
            icon: 'schedule',
            title: 'Recordatorio de Pago Próximo',
            description: `Tu pago "${p.title}" de $${p.amount.toLocaleString()} vence el día de mañana (${p.dueDate}).`,
            category: 'recordatorio'
          });
        }
      }
    }
  }

  getDefaultTabForRole(role: UserRole | null): string {
    switch (role) {
      case 'Residente': return 'visitas';
      case 'Administrador': return 'aprobaciones';
      case 'Vigilante': return 'escanear';
      default: return 'visitas';
    }
  }

  // --- Auth & Account Registration ---

  async login(email: string, pass: string, preferredRole?: UserRole): Promise<{ success: boolean; user?: User; message?: string }> {
    const isDemoAccount = [
      'carlos@vivofacil.com', 'beatriz@vivofacil.com', 'vigilante@vivofacil.com',
      'maria@vivofacil.com', 'ricardo@vivofacil.com', 'elena@vivofacil.com', 'prueba2@gmail.com',
      'admin.hadas@vivofacil.com', 'vigilante.hadas@vivofacil.com', 'residente.hadas@vivofacil.com', 'todos.hadas@vivofacil.com',
      'admin.cumbres@vivofacil.com', 'vigilante.cumbres@vivofacil.com', 'residente.cumbres@vivofacil.com', 'todos.cumbres@vivofacil.com',
      'admin.realpalmas@vivofacil.com', 'vigilante.realpalmas@vivofacil.com', 'residente.realpalmas@vivofacil.com', 'todos.realpalmas@vivofacil.com',
      'admin.capitol@vivofacil.com', 'vigilante.capitol@vivofacil.com', 'residente.capitol@vivofacil.com', 'todos.capitol@vivofacil.com'
    ].includes(email.toLowerCase());

    // 1. If it's a demo account or Supabase is not configured, try local state login
    if (isDemoAccount || !this.supabaseService.isConfigured) {
      let user = this.users().find(u => u.correo.toLowerCase() === email.toLowerCase());
      if (!user) {
        return { success: false, message: 'El correo electrónico no se encuentra registrado.' };
      }
      if (user.password && user.password !== pass) {
        return { success: false, message: 'La contraseña ingresada es incorrecta.' };
      }

      if (user.correo.toLowerCase() === 'prueba2@gmail.com' && user.status !== 'Activa') {
        user = { ...user, status: 'Activa' };
        this.users.update(list => list.map(u => u.correo.toLowerCase() === 'prueba2@gmail.com' ? user! : u));
        this.saveStateToStorage();
      }

      const roleToSet = (preferredRole && user.roles.includes(preferredRole)) ? preferredRole : user.roles[0];

      this.currentUser.set(user);
      this.activeRole.set(roleToSet);
      this.activeNavTab.set(this.getDefaultTabForRole(roleToSet));

      this.safeSetStorage('vivofacil_session_user', JSON.stringify(user));
      this.safeSetStorage('vivofacil_session_role', roleToSet);

      return { success: true, user };
    }

    // 2. Real user login via Supabase Auth
    try {
      console.log(`[Supabase Auth] Iniciando sesión para ${email}...`);
      const { data: authData, error: authError } = await this.supabaseService.signInWithPassword(email, pass);

      if (authError || !authData.user) {
        console.warn('[Supabase Auth] Error en signInWithPassword:', authError?.message);
        // Fallback to local user check if available
        const localUser = this.users().find(u => u.correo.toLowerCase() === email.toLowerCase());
        if (localUser && localUser.password === pass) {
          const roleToSet = (preferredRole && localUser.roles.includes(preferredRole)) ? preferredRole : localUser.roles[0];
          this.currentUser.set(localUser);
          this.activeRole.set(roleToSet);
          this.activeNavTab.set(this.getDefaultTabForRole(roleToSet));
          this.safeSetStorage('vivofacil_session_user', JSON.stringify(localUser));
          this.safeSetStorage('vivofacil_session_role', roleToSet);
          return { success: true, user: localUser };
        }
        return { success: false, message: authError?.message || 'Correo o contraseña incorrectos en Supabase Auth.' };
      }

      const authUserId = authData.user.id;
      console.log(`[Supabase Auth] Autenticado exitosamente en Supabase Auth (UUID: ${authUserId})`);

      // Retrieve public user profile from public.usuarios
      let dbUser = await this.supabaseService.getUsuarioByAuthUserId(authUserId);
      if (!dbUser) {
        console.log('[Supabase Auth] No encontrado por auth_user_id. Buscando por correo en public.usuarios...');
        dbUser = await this.supabaseService.getUsuarioByEmail(email);
        if (dbUser && dbUser.id) {
          console.log(`[Supabase Auth] Vinculando auth_user_id ${authUserId} a usuario public.usuarios ${dbUser.id}...`);
          await this.supabaseService.linkAuthUser(dbUser.id, authUserId);
        }
      }

      if (!dbUser) {
        return { success: false, message: 'Usuario autenticado pero no existe perfil en public.usuarios.' };
      }

      // Check account status
      if (dbUser.estado === 'Rechazada' || dbUser.estado === 'Inactiva') {
        return { success: false, message: `Tu cuenta se encuentra en estado "${dbUser.estado}". Contacta a la administración.` };
      }

      // Retrieve roles from public.roles_usuario
      const rolesDb = await this.supabaseService.getRolesByUsuarioId(dbUser.id);
      const userRoles: UserRole[] = rolesDb.length > 0
        ? (rolesDb.map((r: { rol: string }) => {
            const val = (r.rol || '').trim();
            const lower = val.toLowerCase();
            if (lower === 'admin' || lower === 'administrador') return 'Administrador';
            if (lower === 'residente') return 'Residente';
            if (lower === 'vigilante') return 'Vigilante';
            return val as UserRole;
          }))
        : ['Residente'];

      // Map remote complex & unit IDs to local
      const matchingComplex = this.complexes().find(c => c.remoteId === dbUser.complex_id || c.id === dbUser.complex_id) || this.complexes()[0];
      const matchingUnit = this.units().find(u => u.remoteId === dbUser.vivienda_id || u.id === dbUser.vivienda_id);

      const statusMap: Record<string, AccountStatus> = {
        'Pendiente': 'Pendiente',
        'Activa': 'Activa',
        'Rechazada': 'Rechazada',
        'Inactiva': 'Desactivada'
      };

      const mappedStatus: AccountStatus = statusMap[dbUser.estado as string] || 'Pendiente';

      const fullUser: User = {
        id: dbUser.id,
        remoteId: dbUser.id,
        remoteAuthUserId: authUserId,
        nombreCompleto: dbUser.nombre_completo || email,
        correo: dbUser.correo || email,
        telefono: dbUser.telefono || '',
        password: '',
        complexId: matchingComplex.id,
        viviendaId: matchingUnit ? matchingUnit.id : (dbUser.vivienda_id || ''),
        viviendaNumero: matchingUnit ? `${matchingUnit.numeroVivienda} (${matchingUnit.bloqueCalle})` : 'Vivienda',
        roles: userRoles,
        status: mappedStatus,
        createdAt: dbUser.created_at || new Date().toISOString()
      };

      // Update local state list
      this.users.update(list => {
        const idx = list.findIndex(u => u.id === fullUser.id || u.correo.toLowerCase() === fullUser.correo.toLowerCase());
        if (idx >= 0) {
          const copy = [...list];
          copy[idx] = fullUser;
          return copy;
        }
        return [...list, fullUser];
      });

      const roleToSet = (preferredRole && userRoles.includes(preferredRole)) ? preferredRole : userRoles[0];

      this.currentUser.set(fullUser);
      this.activeRole.set(roleToSet);
      this.activeNavTab.set(this.getDefaultTabForRole(roleToSet));

      this.safeSetStorage('vivofacil_session_user', JSON.stringify(fullUser));
      this.safeSetStorage('vivofacil_session_role', roleToSet);
      this.saveStateToStorage();

      this.syncVisitas().catch(err => console.warn('[Login] Error al sincronizar visitas:', err));

      return { success: true, user: fullUser };

    } catch (err: unknown) {
      console.error('[Supabase Auth] Excepción en login:', err);
      const errMsg = err instanceof Error ? err.message : 'Error al conectar con el servicio de autenticación';
      return { success: false, message: errMsg };
    }
  }

  switchRole(role: UserRole) {
    const user = this.currentUser();
    if (user && user.roles.includes(role)) {
      this.activeRole.set(role);
      this.activeNavTab.set(this.getDefaultTabForRole(role));
      this.safeSetStorage('vivofacil_session_role', role);
      this.syncVisitas().catch(err => console.warn('[SwitchRole] Error al sincronizar visitas:', err));
    }
  }

  switchComplex() {
    return;
  }

  async updateProfile(data: {
    nombreCompleto?: string;
    telefono?: string;
    correo?: string;
    currentPassword?: string;
    newPassword?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; message: string }> {
    const user = this.currentUser();
    if (!user) return { success: false, message: 'No hay usuario autenticado.' };

    if (data.correo && data.correo.toLowerCase() !== user.correo.toLowerCase()) {
      const existing = this.users().find(u => u.correo.toLowerCase() === data.correo!.toLowerCase() && u.id !== user.id);
      if (existing) {
        return { success: false, message: 'El correo electrónico ya está en uso por otra cuenta.' };
      }
    }

    // 1. Verificar y actualizar contraseña si se solicitó cambio de contraseña
    if (data.currentPassword && data.newPassword) {
      if (this.supabaseService.isConfigured && (user.remoteAuthUserId || user.id)) {
        // Validar contraseña actual contra Supabase Auth
        try {
          const { error: signInErr } = await this.supabaseService.signInWithPassword(user.correo, data.currentPassword);
          if (signInErr) {
            console.warn('[UpdateProfile] Validación de contraseña actual falló en Supabase Auth:', signInErr.message);
            return { success: false, message: 'La contraseña actual es incorrecta.' };
          }
        } catch (authValErr) {
          console.warn('[UpdateProfile] Excepción al validar contraseña actual en Supabase Auth:', authValErr);
          return { success: false, message: 'La contraseña actual es incorrecta.' };
        }

        // Actualizar contraseña en Supabase Auth
        try {
          const { error: updatePassErr } = await this.supabaseService.updateAuthPassword(data.newPassword);
          if (updatePassErr) {
            console.error('[UpdateProfile] Error al actualizar contraseña en Supabase Auth:', updatePassErr.message);
            return { success: false, message: 'No se pudo actualizar la contraseña: ' + updatePassErr.message };
          }
          console.log('[UpdateProfile] Contraseña actualizada correctamente en Supabase Auth.');
        } catch (updatePassEx) {
          console.error('[UpdateProfile] Excepción al actualizar contraseña en Supabase Auth:', updatePassEx);
          return { success: false, message: 'Error al actualizar la contraseña en el servidor.' };
        }
      } else {
        // Usuario local / demo
        if (user.password && user.password !== data.currentPassword) {
          return { success: false, message: 'La contraseña actual es incorrecta.' };
        }
      }
    }

    // 2. Actualizar datos en public.usuarios si Supabase está configurado
    if (this.supabaseService.isConfigured && (user.remoteId || user.id)) {
      const targetDbId = user.remoteId || user.id;
      try {
        await this.supabaseService.updateUsuarioDatos(targetDbId, {
          nombre_completo: data.nombreCompleto || user.nombreCompleto,
          correo: data.correo || user.correo,
          telefono: data.telefono || user.telefono
        });
      } catch (dbErr) {
        console.warn('[UpdateProfile] Advertencia al actualizar datos en public.usuarios:', dbErr);
      }
    }

    // 3. Actualizar estado local
    const updatedUser: User = {
      ...user,
      nombreCompleto: data.nombreCompleto || user.nombreCompleto,
      telefono: data.telefono || user.telefono,
      correo: data.correo || user.correo,
      password: (data.newPassword ? data.newPassword : user.password) || '',
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : user.avatarUrl,
      updatedAt: new Date().toISOString()
    };

    this.users.update(list => list.map(u => u.id === user.id ? updatedUser : u));
    this.currentUser.set(updatedUser);
    this.safeSetStorage('vivofacil_session_user', JSON.stringify(updatedUser));
    this.saveStateToStorage();

    this.showToast('Perfil actualizado correctamente.', 'success');
    return { success: true, message: 'Perfil actualizado correctamente.' };
  }

  async logout() {
    try {
      if (this.supabaseService.isConfigured) {
        await this.supabaseService.signOut();
      }
    } catch (err) {
      console.warn('Error al cerrar sesión en Supabase:', err);
    }
    this.currentUser.set(null);
    this.activeRole.set(null);
    this.safeRemoveStorage('vivofacil_session_user');
    this.safeRemoveStorage('vivofacil_session_role');
  }

  async registerUser(data: {
    nombreCompleto: string;
    correo: string;
    telefono: string;
    password?: string;
    complexId: string;
    viviendaId: string;
    viviendaNumero?: string;
  }): Promise<{ success: boolean; message: string; user?: User }> {
    const cleanCorreo = (data.correo || '').trim().toLowerCase();
    const cleanNombre = (data.nombreCompleto || '').trim();
    const cleanTelefono = (data.telefono || '').trim();

    const existing = this.users().find(u => u.correo.toLowerCase() === cleanCorreo);
    if (existing) {
      return { success: false, message: 'Ya existe una cuenta registrada localmente con este correo electrónico.' };
    }

    let vivNum = data.viviendaNumero;
    if (!vivNum) {
      const unit = this.units().find(u => u.id === data.viviendaId);
      vivNum = unit ? `${unit.numeroVivienda} (${unit.bloqueCalle})` : 'Vivienda';
    }

    // 1. Resolve remote UUIDs for complex and housing unit
    const isValidUuid = (val?: string | null): boolean => {
      return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    };

    let localComplex = this.complexes().find(c => c.id === data.complexId);
    let localUnit = this.units().find(u => u.id === data.viviendaId);

    // If catalog sync hasn't run or remoteId is missing, force catalog sync
    if (this.supabaseService.isConfigured && (!isValidUuid(localComplex?.remoteId) || !isValidUuid(localUnit?.remoteId))) {
      console.log('[Register] Catalog remote IDs missing or non-UUID. Triggering catalog sync...');
      await this.syncCatalogos();
      localComplex = this.complexes().find(c => c.id === data.complexId);
      localUnit = this.units().find(u => u.id === data.viviendaId);
    }

    // Static mapping fallback for default local seed IDs
    const COMPLEX_SEED_UUID_MAP: Record<string, string> = {
      'cx-1': '11111111-1111-1111-1111-111111111111',
      'cx-2': '22222222-2222-2222-2222-222222222222',
      'cx-3': '33333333-3333-3333-3333-333333333333',
      'cx-4': '44444444-4444-4444-4444-444444444444',
      'cx-5': '55555555-5555-5555-5555-555555555555',
      'cx-6': '66666666-6666-6666-6666-666666666666',
      'cx-7': '77777777-7777-7777-7777-777777777777'
    };

    const UNIT_SEED_UUID_MAP: Record<string, string> = {
      'u-101': 'a1111111-1111-1111-1111-111111111111',
      'u-102': 'a1111111-1111-1111-1111-222222222222',
      'u-103': 'a1111111-1111-1111-1111-333333333333',
      'u-201': 'a2222222-2222-2222-2222-111111111111',
      'u-301': 'a3333333-3333-3333-3333-111111111111',
      'u-401': 'a4444444-4444-4444-4444-111111111111',
      'u-405': 'a4444444-4444-4444-4444-222222222222'
    };

    let targetComplexRemoteId = localComplex?.remoteId;
    if (!isValidUuid(targetComplexRemoteId)) {
      targetComplexRemoteId = COMPLEX_SEED_UUID_MAP[data.complexId] || (isValidUuid(data.complexId) ? data.complexId : undefined);
    }

    let targetUnitRemoteId = localUnit?.remoteId;
    if (!isValidUuid(targetUnitRemoteId)) {
      targetUnitRemoteId = UNIT_SEED_UUID_MAP[data.viviendaId] || (isValidUuid(data.viviendaId) ? data.viviendaId : undefined);
    }

    // Dynamic query fallback if still no valid complex UUID
    if (this.supabaseService.isConfigured && !isValidUuid(targetComplexRemoteId)) {
      const remoteComplexes = await this.supabaseService.getConjuntos();
      if (remoteComplexes && remoteComplexes.length > 0) {
        const localName = (localComplex?.nombre || '').trim().toLowerCase();
        const match = remoteComplexes.find((rc: Record<string, unknown>) => ((rc['nombre'] as string) || '').trim().toLowerCase() === localName);
        targetComplexRemoteId = match ? (match['id'] as string) : (remoteComplexes[0]['id'] as string);
      }
    }

    // Verify unit belongs to selected complex
    if (localUnit && localComplex && localUnit.complexId !== localComplex.id) {
      return {
        success: false,
        message: 'La vivienda seleccionada no pertenece al conjunto habitacional seleccionado.'
      };
    }

    console.log(`[Register] Remote IDs resueltos -> Complex UUID: "${targetComplexRemoteId}", Vivienda UUID: "${targetUnitRemoteId}"`);

    // Strict validation before touching Supabase Auth
    if (this.supabaseService.isConfigured) {
      if (!isValidUuid(targetComplexRemoteId) || !isValidUuid(targetUnitRemoteId)) {
        console.error(`[Register Aborted] Impossible to proceed without valid Supabase UUIDs. Complex: "${targetComplexRemoteId}", Unit: "${targetUnitRemoteId}"`);
        return {
          success: false,
          message: 'La vivienda o conjunto habitacional seleccionado no cuenta con un registro UUID válido en Supabase. Se ha detenido el registro antes de crear la cuenta de autenticación.'
        };
      }
    }

    let authUserId: string | undefined = undefined;
    let remoteUserDbId: string | undefined = undefined;

    // 2. Create account in Supabase Auth if configured
    if (this.supabaseService.isConfigured) {
      try {
        console.log(`[Supabase Auth] Creando usuario en Supabase Auth para "${cleanCorreo}"...`);
        const userPassword = data.password || '123456';
        
        console.log(`[DIAGNÓSTICO REGISTRO AUTH]
email original: "${data.correo}"
email después de trim: "${cleanCorreo}"
longitud: ${cleanCorreo.length}
valor enviado a Supabase: "${cleanCorreo}"
longitud enviada: ${cleanCorreo.length}`);

        let { data: authData, error: authError } = await this.supabaseService.signUp(cleanCorreo, userPassword);

        const errRec = authError as (Record<string, unknown> | null);
        console.log(`[DIAGNÓSTICO REAL SIGNUP]
email enviado: ${cleanCorreo}
error.status: ${authError?.status ?? 'null/undefined'}
error.code: ${errRec?.['code'] ?? 'null/undefined'}
error.name: ${authError?.name ?? 'null/undefined'}
error.message: ${authError?.message ?? 'null/undefined'}
error.details: ${errRec?.['details'] ?? 'null/undefined'}
data.user: ${authData?.user ? authData.user.id : 'null/undefined'}
data.session: ${authData?.session ? 'presente' : 'null/undefined'}`);

        // If user already exists in Auth but public.usuarios insert failed earlier, recover authUserId
        if (authError) {
          const lowerMsg = (authError.message || '').toLowerCase();
          if (lowerMsg.includes('already registered') || lowerMsg.includes('already in use') || lowerMsg.includes('already exists')) {
            console.log('[Supabase Auth] El correo ya existe en Supabase Auth. Intentando autenticación para vincular con public.usuarios...');
            try {
              const { data: signInData, error: signInErr } = await this.supabaseService.signInWithPassword(cleanCorreo, userPassword);
              if (!signInErr && signInData.user) {
                authData = signInData;
                authError = null;
                console.log(`[Supabase Auth] Autenticado exitosamente para recuperación con UUID Auth: ${signInData.user.id}`);
              }
            } catch (recoveryErr) {
              console.warn('[Supabase Auth] No se pudo recuperar la sesión Auth:', recoveryErr);
            }
          }
        }

        if (authError) {
          console.error('[Supabase Auth] Error nativo en signUp:', authError);
          // NATIVE ERROR MESSAGE - NO TRANSLATION OR REPLACEMENT AS REQUESTED BY USER
          const nativeMsg = `[Supabase Auth Error] status: ${authError.status ?? 'N/A'}, code: ${errRec?.['code'] ?? 'N/A'}, message: "${authError.message}"`;
          return { success: false, message: nativeMsg };
        }

        if (authData.user) {
          authUserId = authData.user.id;
          console.log(`[Supabase Auth] Usuario de Auth confirmado con UUID: ${authUserId}`);
        }

        // Check if user record already exists in public.usuarios
        if (authUserId) {
          const existingDbUser = await this.supabaseService.getUsuarioByAuthUserId(authUserId);
          if (existingDbUser && existingDbUser.id) {
            remoteUserDbId = existingDbUser.id;
            console.log(`[Supabase DB] El perfil público ya existe en public.usuarios con ID ${remoteUserDbId}`);
          }
        }

        // 3. Insert profile into public.usuarios if not existing
        if (!remoteUserDbId) {
          console.log(`[Supabase DB] Insertando nuevo registro en public.usuarios con complex_id=${targetComplexRemoteId}, vivienda_id=${targetUnitRemoteId}...`);
          try {
            const dbUser = await this.supabaseService.crearUsuarioPublico({
              id: authUserId,
              complex_id: targetComplexRemoteId!,
              vivienda_id: targetUnitRemoteId || null,
              nombre_completo: cleanNombre,
              correo: cleanCorreo,
              telefono: cleanTelefono,
              password_hash: '[SUPABASE_AUTH]',
              estado: 'Pendiente'
            });

            remoteUserDbId = dbUser.id;
            console.log(`[Supabase DB] Usuario registrado exitosamente en public.usuarios con ID ${remoteUserDbId}`);

            // 4. Assign role in public.roles_usuario
            if (remoteUserDbId) {
              console.log(`[Supabase DB] Asignando rol Residente en public.roles_usuario...`);
              await this.supabaseService.crearRolUsuario(remoteUserDbId, 'Residente');
            }
          } catch (dbErr: unknown) {
            console.error('[Supabase DB Error] Error al guardar perfil en public.usuarios o roles:', dbErr);
            const dbMsg = dbErr instanceof Error ? dbErr.message : 'Error al guardar el perfil en la base de datos';
            return {
              success: false,
              message: `Cuenta autenticada en Supabase (UUID: ${authUserId}), pero falló la creación del perfil público en public.usuarios: ${dbMsg}`
            };
          }
        }

      } catch (err: unknown) {
        console.error('[Supabase Registration] Error en flujo de Supabase:', err);
        const errMsg = err instanceof Error ? err.message : 'Error al registrar usuario en Supabase';
        return { success: false, message: errMsg };
      }
    }

    const newUser: User = {
      id: remoteUserDbId || `usr-${Date.now()}`,
      remoteId: remoteUserDbId,
      remoteAuthUserId: authUserId,
      nombreCompleto: data.nombreCompleto,
      correo: data.correo,
      telefono: data.telefono,
      password: '', // Password is never stored in plaintext
      complexId: data.complexId,
      viviendaId: data.viviendaId,
      viviendaNumero: vivNum,
      roles: ['Residente'],
      status: 'Pendiente', // Pendiente de aprobación
      createdAt: new Date().toISOString()
    };

    this.users.update(list => [...list, newUser]);

    // Notify Administrador
    this.addNotification({
      complexId: data.complexId,
      targetRole: 'Administrador',
      icon: 'person_add',
      title: 'Nueva cuenta pendiente de aprobación',
      description: `${data.nombreCompleto} se ha registrado y requiere aprobación de acceso para la ${vivNum}.`,
      category: 'usuario'
    });

    this.saveStateToStorage();

    return { 
      success: true, 
      message: 'Cuenta creada con éxito. Su solicitud ha sido enviada al Administrador para su aprobación.',
      user: newUser 
    };
  }

  async approveUserAccount(userId: string): Promise<boolean> {
    let updated = false;
    let targetUser: User | null = null;

    const userInList = this.users().find(u => u.id === userId);
    if (!userInList) return false;

    // Update in Supabase DB if remoteId exists or is UUID
    if (this.supabaseService.isConfigured) {
      const dbTargetId = userInList.remoteId || userInList.id;
      try {
        console.log(`[Supabase DB] Actualizando estado de usuario ${dbTargetId} a Activa...`);
        await this.supabaseService.updateEstadoUsuario(dbTargetId, 'Activa');
      } catch (err) {
        console.error('[Supabase DB] Error al actualizar estado de usuario en DB:', err);
      }
    }

    this.users.update(list => list.map(u => {
      if (u.id === userId) {
        updated = true;
        targetUser = { ...u, status: 'Activa', updatedAt: new Date().toISOString() };
        return targetUser;
      }
      return u;
    }));

    if (updated && targetUser) {
      this.addNotification({
        complexId: (targetUser as User).complexId,
        userId: (targetUser as User).id,
        icon: 'check_circle',
        title: 'Cuenta Aprobada',
        description: 'Tu solicitud de acceso ha sido aprobada por el Administrador.',
        category: 'usuario'
      });
      this.saveStateToStorage();
    }
    return updated;
  }

  async rejectUserAccount(userId: string): Promise<boolean> {
    let updated = false;
    let targetUser: User | null = null;

    const userInList = this.users().find(u => u.id === userId);
    if (!userInList) return false;

    // Update in Supabase DB if remoteId exists or is UUID
    if (this.supabaseService.isConfigured) {
      const dbTargetId = userInList.remoteId || userInList.id;
      try {
        console.log(`[Supabase DB] Actualizando estado de usuario ${dbTargetId} a Rechazada...`);
        await this.supabaseService.updateEstadoUsuario(dbTargetId, 'Rechazada');
      } catch (err) {
        console.error('[Supabase DB] Error al actualizar estado de usuario en DB:', err);
      }
    }

    this.users.update(list => list.map(u => {
      if (u.id === userId) {
        updated = true;
        targetUser = { ...u, status: 'Rechazada', updatedAt: new Date().toISOString() };
        return targetUser;
      }
      return u;
    }));

    if (updated && targetUser) {
      this.addNotification({
        complexId: (targetUser as User).complexId,
        userId: (targetUser as User).id,
        icon: 'cancel',
        title: 'Cuenta Rechazada',
        description: 'Tu solicitud de acceso ha sido rechazada por el Administrador.',
        category: 'usuario'
      });
      this.saveStateToStorage();
    }
    return updated;
  }

  async updateUserRolesAndStatus(userId: string, roles: UserRole[], status: AccountStatus, viviendaId?: string, viviendaNumero?: string): Promise<{ success: boolean; message?: string }> {
    // 1. Sincronizar roles en Supabase public.roles_usuario si el cliente está configurado
    if (this.supabaseService.isConfigured) {
      const syncRes = await this.supabaseService.syncUserRoles(userId, roles);
      if (!syncRes.success) {
        console.error('[Supabase DB Error] Falló la sincronización en public.roles_usuario:', syncRes.error);
        const errObj = syncRes.error as { message?: string } | null;
        const errMsg = errObj?.message || 'Error al guardar los roles en Supabase.';
        return { success: false, message: `Error de Supabase Auth/DB: ${errMsg}` };
      }
    }

    // 2. Si la sincronización en Supabase fue exitosa (o en modo offline), actualizar el estado local
    this.users.update(list => list.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          roles,
          status,
          approvedAt: status === 'Activa' && !u.approvedAt ? new Date().toISOString() : u.approvedAt,
          viviendaId: viviendaId || u.viviendaId,
          viviendaNumero: viviendaNumero || u.viviendaNumero,
          updatedAt: new Date().toISOString()
        };
      }
      return u;
    }));
    this.saveStateToStorage();

    // If updating currently logged in user
    if (this.currentUser()?.id === userId) {
      const fresh = this.users().find(x => x.id === userId);
      if (fresh) {
        this.currentUser.set(fresh);
        if (!fresh.roles.includes(this.activeRole()!)) {
          this.activeRole.set(fresh.roles[0]);
        }
      }
    }

    return { success: true };
  }

  // --- Visit & QR Code Module ---

  async createVisit(data: {
    visitorName: string;
    birthDate: string;
    visitDate: string;
    estimatedTime: string;
  }): Promise<VisitorVisit> {
    const user = this.currentUser();
    if (!user) throw new Error('Usuario no autenticado.');

    const qrCode = `VF-QR-${Math.floor(100000 + Math.random() * 900000)}`;

    let newVisitId = `vst-${Date.now()}`;

    if (this.supabaseService.isConfigured) {
      let residentUuid: string | null = null;
      let complexUuid: string | null = null;
      let viviendaUuid: string | null = null;

      // 1. Obtener usuario de Supabase Auth si existe sesión
      const authUser = await this.supabaseService.getAuthUser();
      if (authUser && authUser.id && this.isValidUuid(authUser.id)) {
        residentUuid = authUser.id;
      }

      // 2. Buscar en public.usuarios por Auth ID, remoteId o Correo (e.g. prueba15)
      let dbUser: Record<string, unknown> | null = null;
      if (residentUuid) {
        dbUser = await this.supabaseService.getUsuarioByAuthUserId(residentUuid);
      }
      if (!dbUser && user.remoteId && this.isValidUuid(user.remoteId)) {
        dbUser = await this.supabaseService.getUsuarioByAuthUserId(user.remoteId);
      }
      if (!dbUser && user.correo) {
        dbUser = await this.supabaseService.getUsuarioByEmail(user.correo);
      }
      if (!dbUser && user.nombreCompleto) {
        try {
          const { data: matchedUser } = await this.supabaseService.client
            .from('usuarios')
            .select('*')
            .or(`correo.ilike.%${user.correo}%,nombre_completo.ilike.%${user.nombreCompleto}%`)
            .limit(1)
            .maybeSingle();
          if (matchedUser) {
            dbUser = matchedUser as Record<string, unknown>;
          }
        } catch {
          // ignore lookup fallback error
        }
      }

      if (dbUser) {
        if (dbUser['id'] && this.isValidUuid(dbUser['id'] as string)) {
          residentUuid = dbUser['id'] as string;
        }
        if (dbUser['complex_id'] && this.isValidUuid(dbUser['complex_id'] as string)) {
          complexUuid = dbUser['complex_id'] as string;
        }
        if (dbUser['vivienda_id'] && this.isValidUuid(dbUser['vivienda_id'] as string)) {
          viviendaUuid = dbUser['vivienda_id'] as string;
        }
      }

      // 3. Fallbacks para complex_id y vivienda_id usando resolver helpers
      if (!complexUuid) {
        complexUuid = this.getComplexUuid(user.complexId);
      }

      if (!viviendaUuid) {
        viviendaUuid = this.getViviendaUuid(user.viviendaId);
      }

      // 4. Verificar existencia de complex_id en conjuntos_habitacionales
      const conjuntosRemotos = await this.supabaseService.getConjuntos();
      if (conjuntosRemotos && conjuntosRemotos.length > 0) {
        let existeComplex = conjuntosRemotos.some(c => c['id'] === complexUuid);
        if (!existeComplex) {
          // Si no existe por ID, intentar por coincidencia de nombre de conjunto
          const localComplex = this.complexes().find(c => c.id === user.complexId);
          if (localComplex) {
            const matchName = conjuntosRemotos.find(c => ((c['nombre'] as string) || '').trim().toLowerCase() === (localComplex.nombre || '').trim().toLowerCase());
            if (matchName && matchName['id']) {
              complexUuid = matchName['id'] as string;
              existeComplex = true;
            }
          }
        }
        if (!existeComplex && !this.isValidUuid(complexUuid)) {
          console.warn(`[createVisit] complex_id (${complexUuid}) no existe en conjuntos_habitacionales. Asignando primer conjunto remoto disponible: ${conjuntosRemotos[0]['id']}`);
          complexUuid = conjuntosRemotos[0]['id'] as string;
        }
      }

      // 5. Verificar existencia de vivienda_id en viviendas
      const viviendasRemotas = await this.supabaseService.getAllViviendas();
      if (viviendasRemotas && viviendasRemotas.length > 0) {
        const existeVivienda = viviendasRemotas.some(v => v['id'] === viviendaUuid);
        if (!existeVivienda) {
          const viviendaPorComplex = viviendasRemotas.find(v => v['complex_id'] === complexUuid);
          if (viviendaPorComplex && viviendaPorComplex['id']) {
            viviendaUuid = viviendaPorComplex['id'] as string;
            console.warn(`[createVisit] vivienda_id ajustado a vivienda perteneciente al conjunto: ${viviendaUuid}`);
          } else {
            viviendaUuid = viviendasRemotas[0]['id'] as string;
            console.warn(`[createVisit] vivienda_id ajustado a primera vivienda remota disponible: ${viviendaUuid}`);
          }
        }
      }

      console.log(`[createVisit] Diagnóstico de UUIDs para "${user.correo || user.nombreCompleto}":`);
      console.log(` - resident_id (public.usuarios.id): ${residentUuid}`);
      console.log(` - complex_id (public.conjuntos_habitacionales.id): ${complexUuid}`);
      console.log(` - vivienda_id (public.viviendas.id): ${viviendaUuid}`);

      if (!this.isValidUuid(residentUuid) || !this.isValidUuid(complexUuid) || !this.isValidUuid(viviendaUuid)) {
        const errDetails = `No se pudieron resolver UUIDs válidos de Supabase. resident_id=${residentUuid}, complex_id=${complexUuid}, vivienda_id=${viviendaUuid}`;
        console.error(`[Supabase Error] ${errDetails}`);
        this.showToast('No se pudo guardar en la nube: Faltan UUIDs de usuario, conjunto o vivienda en Supabase.', 'error');
        throw new Error(errDetails);
      }

      try {
        console.log(`[Supabase DB] Insertando en public.pases_visita con resident_id=${residentUuid}, complex_id=${complexUuid}, vivienda_id=${viviendaUuid}...`);
        const dbRow = await this.supabaseService.crearVisita({
          complex_id: complexUuid!,
          vivienda_id: viviendaUuid!,
          resident_id: residentUuid!,
          qr_code: qrCode,
          nombre_visitante: data.visitorName,
          fecha_nacimiento: data.birthDate,
          fecha_visita: data.visitDate,
          hora_visita: data.estimatedTime,
          estado: 'Pendiente'
        });

        if (dbRow && dbRow['id']) {
          newVisitId = dbRow['id'] as string;
          console.log(`[Supabase DB] Visita creada exitosamente en public.pases_visita con ID: ${newVisitId}`);
          if (user.remoteId !== residentUuid) {
            user.remoteId = residentUuid!;
          }
        }
      } catch (err: unknown) {
        const sbErr = err as { code?: string; message?: string; details?: string; hint?: string };
        console.error('[Supabase DB Error] Falló el INSERT en public.pases_visita:', sbErr);
        console.error(`Código de error: ${sbErr?.code || 'SIN_CODIGO'}, Mensaje: ${sbErr?.message || err}`);
        this.showToast(`Error de Supabase (${sbErr?.code || 'Error'}): ${sbErr?.message || 'No se pudo guardar la visita en la nube.'}`, 'error');
        throw err;
      }
    }

    const newVisit: VisitorVisit = {
      id: newVisitId,
      qrCode,
      visitorName: data.visitorName,
      birthDate: data.birthDate,
      visitDate: data.visitDate,
      estimatedTime: data.estimatedTime,
      residentId: user.id,
      residentName: user.nombreCompleto,
      viviendaNumber: user.viviendaNumero || 'Sin asignar',
      complexId: user.complexId,
      status: 'Pendiente',
      createdAt: new Date().toISOString()
    };

    this.visits.update(list => [newVisit, ...list]);

    // Notify Vigilante about pre-registered visit
    this.addNotification({
      complexId: user.complexId,
      targetRole: 'Vigilante',
      icon: 'qr_code',
      title: 'Nueva Visita Pre-registrada',
      description: `${user.nombreCompleto} (${user.viviendaNumero || 'Residente'}) ha pre-registrado la visita de ${data.visitorName} para el ${data.visitDate} a las ${data.estimatedTime}.`,
      category: 'visita'
    });

    this.saveStateToStorage();
    return newVisit;
  }

  async cancelVisitQR(visitId: string): Promise<{ success: boolean; message: string }> {
    const visit = this.visits().find(v => v.id === visitId || v.qrCode === visitId);
    if (!visit) {
      return { success: false, message: 'La visita especificada no existe.' };
    }

    if (visit.status !== 'Pendiente') {
      return { 
        success: false, 
        message: `No es posible cancelar el código QR. Solo se pueden cancelar códigos en estado Pendiente. Estado actual: ${visit.status}` 
      };
    }

    if (this.supabaseService.isConfigured && (this.isValidUuid(visit.id) || visit.qrCode)) {
      try {
        console.log(`[Supabase DB] Cancelando visita ${visit.id} (QR: ${visit.qrCode}) en DB...`);
        await this.supabaseService.actualizarEstadoVisita(visit.id, {
          estado: 'Cancelado'
        }, visit.qrCode);
      } catch (err) {
        console.error('[Supabase DB] Error al cancelar visita en DB:', err);
      }
    }

    this.visits.update(list => list.map(v => (v.id === visitId || v.qrCode === visitId) ? { ...v, status: 'Cancelada' } : v));
    
    this.addNotification({
      complexId: visit.complexId,
      userId: visit.residentId,
      icon: 'cancel',
      title: 'Visita Cancelada',
      description: `El pase de acceso para ${visit.visitorName} ha sido cancelado correctamente.`,
      category: 'visita'
    });

    this.saveStateToStorage();
    return { success: true, message: 'La visita fue cancelada correctamente.' };
  }

  /**
   * Extracts clean pass identifier (e.g. VF-QR-849201) from QR text, JSON or URL
   */
  extractPassId(rawInput: string): string {
    if (!rawInput) return '';
    const trimmed = rawInput.trim();

    // VF-QR-XXXXXX pattern
    const vfMatch = trimmed.match(/VF-QR-\d+/i);
    if (vfMatch) {
      return vfMatch[0].toUpperCase();
    }

    // vst-XXXXXX pattern
    const vstMatch = trimmed.match(/vst-\d+/i);
    if (vstMatch) {
      return vstMatch[0];
    }

    // Try parsing JSON if encoded as object
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        if (parsed.qrCode && typeof parsed.qrCode === 'string') return this.extractPassId(parsed.qrCode);
        if (parsed.id && typeof parsed.id === 'string') return this.extractPassId(parsed.id);
      }
    } catch {
      // Not JSON
    }

    return trimmed;
  }

  async getVisitByCodeRemote(rawCode: string): Promise<VisitorVisit | undefined> {
    const code = this.extractPassId(rawCode);
    if (!code) return undefined;

    if (this.supabaseService.isConfigured) {
      try {
        const dbRow = await this.supabaseService.getVisitaByQrCode(code);
        if (dbRow) {
          const remoteVisit = this.mapDbVisitaToVisitorVisit(dbRow);
          this.visits.update(list => {
            const idx = list.findIndex(v => v.id === remoteVisit.id || v.qrCode === remoteVisit.qrCode);
            if (idx >= 0) {
              const copy = [...list];
              copy[idx] = remoteVisit;
              return copy;
            }
            return [remoteVisit, ...list];
          });
          return remoteVisit;
        }
      } catch (err) {
        console.error('[getVisitByCodeRemote] Error al consultar visita en DB:', err);
      }
    }

    return this.getVisitByCode(code);
  }

  /**
   * Queries the database for a visit using its unique pass identifier,
   * applying auto-expiration logic.
   */
  getVisitByCode(rawCode: string): VisitorVisit | undefined {
    const code = this.extractPassId(rawCode);
    if (!code) return undefined;

    const currentVisits = this.autoExpireVisits(this.visits());
    return currentVisits.find(v => 
      v.qrCode.toUpperCase() === code.toUpperCase() || 
      v.id.toUpperCase() === code.toUpperCase()
    );
  }

  async processQRScanByVigilante(
    qrCodeString: string,
    decision: 'Aprobado' | 'Rechazado',
    vehiclePlates?: string,
    observations?: string
  ): Promise<{ success: boolean; message: string; visit?: VisitorVisit }> {
    const vigilante = this.currentUser();
    if (!vigilante) {
      return { success: false, message: 'Acceso denegado. Se requiere cuenta de Vigilante.' };
    }

    const cleanCode = this.extractPassId(qrCodeString);
    const visit = await this.getVisitByCodeRemote(cleanCode);

    if (!visit) {
      return { success: false, message: 'Código de pase no encontrado en el sistema de este conjunto habitacional.' };
    }

    const currentComp = this.currentComplex();
    const matchesComplex = this.isSameComplex(visit.complexId, currentComp?.id) || 
                           this.isSameComplex(visit.complexId, vigilante.complexId);
    if (!matchesComplex) {
      return { success: false, message: 'Pase no válido para este conjunto de vivienda.', visit };
    }

    if (visit.status !== 'Pendiente') {
      return {
        success: false,
        message: `¡ATENCIÓN! Este código QR no se encuentra PENDIENTE. Estado actual: ${visit.status.toUpperCase()}`,
        visit
      };
    }

    if (this.isVisitExpired(visit)) {
      const expiredVisit: VisitorVisit = { ...visit, status: 'Expirado' };
      if (this.supabaseService.isConfigured && this.isValidUuid(visit.id)) {
        await this.supabaseService.actualizarEstadoVisita(visit.id, { estado: 'Expirado' });
      }
      this.visits.update(list => list.map(v => v.id === visit.id ? expiredVisit : v));
      return {
        success: false,
        message: '¡ATENCIÓN! Este código QR ha EXPIRADO (han transcurrido más de 2 horas desde la hora programada de la visita).',
        visit: expiredVisit
      };
    }

    const scanTime = new Date().toISOString();

    if (this.supabaseService.isConfigured) {
      try {
        console.log(`[Supabase DB] Actualizando visita ${visit.id} (QR: ${visit.qrCode}) a estado ${decision}...`);
        const updatePayload: {
          estado: string;
          decision: 'Aprobado' | 'Rechazado';
          fecha_escaneo: string;
          vigilante_id?: string;
          ine_verificada_manual: boolean;
          observaciones?: string | null;
          placas_vehiculo?: string;
        } = {
          estado: decision,
          decision: decision,
          fecha_escaneo: scanTime,
          ine_verificada_manual: true,
          observaciones: observations?.trim() ? observations.trim() : null
        };

        if (vigilante.id && this.isValidUuid(vigilante.id)) {
          updatePayload.vigilante_id = vigilante.id;
        }

        if (vehiclePlates?.trim()) {
          updatePayload.placas_vehiculo = vehiclePlates.trim();
        }

        const updatedRow = await this.supabaseService.actualizarEstadoVisita(
          visit.id,
          updatePayload,
          visit.qrCode
        );

        if (!updatedRow) {
          return {
            success: false,
            message: 'No se pudo actualizar el pase en Supabase (0 filas afectadas).',
            visit
          };
        }
      } catch (err: unknown) {
        const sbErr = err as { code?: string; message?: string; details?: string; hint?: string };
        const codeStr = sbErr?.code ? ` [Error code: ${sbErr.code}]` : '';
        const detailStr = sbErr?.details ? ` (${sbErr.details})` : '';
        const hintStr = sbErr?.hint ? ` [Hint: ${sbErr.hint}]` : '';
        const errMsg = sbErr?.message || String(err);
        console.error('[Supabase DB Error] Falló la actualización del pase de visita en public.pases_visita:', {
          code: sbErr?.code,
          message: errMsg,
          details: sbErr?.details,
          hint: sbErr?.hint
        });
        return {
          success: false,
          message: `Error al guardar en Supabase: ${errMsg}${codeStr}${detailStr}${hintStr}`,
          visit
        };
      }
    }

    const updatedVisit: VisitorVisit = {
      ...visit,
      status: decision,
      decision,
      scannedAt: scanTime,
      scannedByVigilanteId: vigilante.id,
      scannedByVigilanteName: vigilante.nombreCompleto,
      ineVerifiedManual: true, // Manual INE check required
      vehiclePlates: vehiclePlates || '',
      observations: observations || ''
    };

    this.visits.update(list => list.map(v => (v.id === visit.id || v.qrCode === visit.qrCode) ? updatedVisit : v));

    if (decision === 'Aprobado') {
      this.addNotification({
        complexId: visit.complexId,
        userId: visit.residentId,
        icon: 'check_circle',
        title: 'Visita Aprobada',
        description: `Tu visita ${visit.visitorName} ya llegó y accedió al lugar por la caseta principal.`,
        category: 'visita'
      });
    } else {
      this.addNotification({
        complexId: visit.complexId,
        userId: visit.residentId,
        icon: 'block',
        title: 'Visita Rechazada',
        description: `Tu visita ${visit.visitorName} ya llegó y fue rechazada por vigilancia. ${observations ? 'Observaciones: ' + observations : ''}`,
        category: 'visita'
      });
    }

    this.saveStateToStorage();

    return {
      success: true,
      message: `Acceso registrado como: ${decision.toUpperCase()}. Decisión guardada de forma permanente.`,
      visit: updatedVisit
    };
  }

  // --- Payments & Vouchers Module ---

  async createPaymentRequest(data: {
    title: string;
    type: 'Pago Fijo' | 'Pago Extraordinario';
    category: PaymentCategory;
    amount: number;
    dueDate: string;
    description: string;
    viviendaId?: string;
    viviendaNumero?: string;
  }): Promise<PaymentRequest> {
    const complex = this.currentComplex();
    if (!complex) throw new Error('No hay un conjunto seleccionado.');

    const todayStr = new Date().toISOString().split('T')[0];
    if (data.dueDate && data.dueDate < todayStr) {
      this.showToast('La fecha límite no puede ser anterior al día de hoy.', 'error');
      throw new Error('La fecha límite no puede ser anterior al día de hoy.');
    }

    let newPayment: PaymentRequest;

    if (this.supabaseService.isConfigured) {
      // 1. Resolver complexUuid
      let complexUuid = complex.remoteId || complex.id;
      if (!this.isValidUuid(complexUuid)) {
        const COMPLEX_SEED_UUID_MAP: Record<string, string> = {
          'cx-1': '11111111-1111-1111-1111-111111111111',
          'cx-2': '22222222-2222-2222-2222-222222222222'
        };
        complexUuid = COMPLEX_SEED_UUID_MAP[complex.id] || complexUuid;
      }

      // 2. Resolver adminUserUuid (creado_por)
      const user = this.currentUser();
      let adminUserUuid: string | null = null;

      const authUser = await this.supabaseService.getAuthUser();
      if (authUser && authUser.id && this.isValidUuid(authUser.id)) {
        adminUserUuid = authUser.id;
      }

      let dbUser: Record<string, unknown> | null = null;
      if (adminUserUuid) {
        dbUser = await this.supabaseService.getUsuarioByAuthUserId(adminUserUuid);
      }
      if (!dbUser && user?.remoteId && this.isValidUuid(user.remoteId)) {
        dbUser = await this.supabaseService.getUsuarioByAuthUserId(user.remoteId);
      }
      if (!dbUser && user?.correo) {
        dbUser = await this.supabaseService.getUsuarioByEmail(user.correo);
      }

      if (dbUser && dbUser['id'] && this.isValidUuid(dbUser['id'] as string)) {
        adminUserUuid = dbUser['id'] as string;
      }

      if (!adminUserUuid || !this.isValidUuid(adminUserUuid)) {
        adminUserUuid = 'b1000000-0000-0000-0000-000000000002';
      }

      if (!this.isValidUuid(complexUuid)) {
        complexUuid = '11111111-1111-1111-1111-111111111111';
      }

      try {
        console.log(`[Supabase DB] Insertando en public.solicitudes_pago con complex_id=${complexUuid}, creado_por=${adminUserUuid}...`);
        const dbRow = await this.supabaseService.crearSolicitudPago({
          complex_id: complexUuid,
          creado_por: adminUserUuid,
          titulo: data.title,
          concepto: data.description || '',
          tipo: data.type === 'Pago Fijo' ? 'Fijo' : (data.type === 'Pago Extraordinario' ? 'Extraordinario' : data.type),
          monto: data.amount,
          fecha_limite: data.dueDate
        });

        newPayment = {
          id: (dbRow['id'] as string) || `pay-${Date.now()}`,
          complexId: complex.id,
          title: (dbRow['titulo'] as string) || data.title,
          type: data.type,
          category: data.category,
          amount: Number(dbRow['monto']) || data.amount,
          dueDate: (dbRow['fecha_limite'] as string) || data.dueDate,
          description: (dbRow['concepto'] as string) || data.description,
          viviendaId: data.viviendaId,
          viviendaNumero: data.viviendaNumero,
          status: 'Pendiente',
          createdAt: (dbRow['created_at'] as string) || new Date().toISOString()
        };
      } catch (err) {
        console.error('Error al guardar la solicitud de pago en Supabase:', err);
        this.showToast('Error al guardar la solicitud de pago en Supabase. No se creó el pago.', 'error');
        throw err;
      }
    } else {
      newPayment = {
        id: `pay-${Date.now()}`,
        complexId: complex.id,
        title: data.title,
        type: data.type,
        category: data.category,
        amount: data.amount,
        dueDate: data.dueDate,
        description: data.description,
        viviendaId: data.viviendaId,
        viviendaNumero: data.viviendaNumero,
        status: 'Pendiente',
        createdAt: new Date().toISOString()
      };
    }

    // Solo si Supabase o el modo local tuvieron éxito se actualiza el estado local y localStorage
    this.paymentRequests.update(list => [newPayment, ...list]);

    // Notify residents about the new payment request
    if (data.viviendaId) {
      const targetUser = this.users().find(u => u.viviendaId === data.viviendaId && u.complexId === complex.id);
      if (targetUser) {
        this.addNotification({
          complexId: complex.id,
          userId: targetUser.id,
          icon: 'payments',
          title: 'Nuevo Cobro Asignado',
          description: `Se ha emitido un nuevo cobro de $${data.amount.toLocaleString()} MXN por "${data.title}". Fecha límite: ${data.dueDate}.`,
          category: 'pago'
        });
      }
    } else {
      this.addNotification({
        complexId: complex.id,
        targetRole: 'Residente',
        icon: 'payments',
        title: 'Nuevo Cobro de Cuota Residencial',
        description: `Se ha publicado el cobro "${data.title}" de $${data.amount.toLocaleString()} MXN. Fecha límite: ${data.dueDate}. Por favor realiza tu pago a tiempo.`,
        category: 'pago'
      });
    }

    this.saveStateToStorage();
    this.showToast('Solicitud de pago creada correctamente.', 'success');
    return newPayment;
  }

  async runOcrOnVoucher(imageBase64: string, rawText?: string): Promise<ExtractedOcrData> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean; data: ExtractedOcrData }>('/api/ocr-voucher', {
          imageBase64,
          rawText
        })
      );
      if (res && res.success && res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('Error fetching OCR endpoint, falling back to local extractor:', err);
    }

    // Client fallback OCR heuristic (No fake or mock data per requirement 6)
    return {
      banco: '',
      fecha: '',
      hora: '',
      monto: 0,
      referencia: '',
      confianza: 0,
      resumen: 'Comprobante cargado. Por favor verifique o ingrese los datos faltantes.'
    };
  }

  async submitPaymentVoucher(data: {
    paymentRequestId: string;
    paymentTitle: string;
    method: 'Transferencia' | 'Efectivo';
    amount: number;
    date: string;
    voucherUrl?: string;
    extractedOcr?: ExtractedOcrData;
    banco?: string;
    bancoReceptor?: string;
    referencia?: string;
    hora?: string;
    concepto?: string;
    cuentaOrigen?: string;
    cuentaDestino?: string;
    recibidoPor?: string;
    fechaEntrega?: string;
    comentarios?: string;
    debtId?: string;
  }): Promise<PaymentSubmission> {
    const user = this.currentUser();
    if (!user) throw new Error('Usuario no autenticado.');

    const todayStr = new Date().toISOString().split('T')[0];
    if (data.date && data.date > todayStr) {
      this.showToast('La fecha del pago no puede ser posterior al día de hoy.', 'error');
      throw new Error('La fecha del pago no puede ser posterior al día de hoy.');
    }

    let resolvedDebtId = data.debtId || (data.paymentRequestId.startsWith('debt-') ? data.paymentRequestId.replace('debt-', '') : undefined);
    let submissionId = `sub-${Date.now()}`;

    if (this.supabaseService.isConfigured) {
      // 1. Resolver UUIDs de complex, vivienda y residente
      const complex = this.currentComplex();
      let complexUuid = complex?.remoteId || complex?.id || user.complexId;
      if (!this.isValidUuid(complexUuid)) {
        const COMPLEX_SEED_UUID_MAP: Record<string, string> = {
          'cx-1': '11111111-1111-1111-1111-111111111111',
          'cx-2': '22222222-2222-2222-2222-222222222222'
        };
        complexUuid = COMPLEX_SEED_UUID_MAP[user.complexId] || '11111111-1111-1111-1111-111111111111';
      }

      let viviendaUuid = user.viviendaId;
      if (!this.isValidUuid(viviendaUuid)) {
        const VIVIENDAS_SEED_UUID_MAP: Record<string, string> = {
          'viv-101': 'a1111111-1111-1111-1111-111111111111',
          'viv-102': 'a1111111-1111-1111-1111-222222222222'
        };
        viviendaUuid = VIVIENDAS_SEED_UUID_MAP[user.viviendaId] || 'a1111111-1111-1111-1111-111111111111';
      }

      let residenteUuid: string | null = null;
      const authUser = await this.supabaseService.getAuthUser();
      if (authUser && authUser.id && this.isValidUuid(authUser.id)) {
        residenteUuid = authUser.id;
      }

      let dbUser: Record<string, unknown> | null = null;
      if (residenteUuid) {
        dbUser = await this.supabaseService.getUsuarioByAuthUserId(residenteUuid);
      }
      if (!dbUser && user.remoteId && this.isValidUuid(user.remoteId)) {
        dbUser = await this.supabaseService.getUsuarioByAuthUserId(user.remoteId);
      }
      if (!dbUser && user.correo) {
        dbUser = await this.supabaseService.getUsuarioByEmail(user.correo);
      }
      if (dbUser) {
        if (dbUser['id'] && this.isValidUuid(dbUser['id'] as string)) {
          residenteUuid = dbUser['id'] as string;
        }
        if (dbUser['complex_id'] && this.isValidUuid(dbUser['complex_id'] as string)) {
          complexUuid = dbUser['complex_id'] as string;
        }
        if (dbUser['vivienda_id'] && this.isValidUuid(dbUser['vivienda_id'] as string)) {
          viviendaUuid = dbUser['vivienda_id'] as string;
        }
      }

      if (!residenteUuid || !this.isValidUuid(residenteUuid)) {
        residenteUuid = 'b1000000-0000-0000-0000-000000000005';
      }

      // 2. Resolver solicitud_pago_id
      let solicitudPagoUuid = data.paymentRequestId;
      if (!this.isValidUuid(solicitudPagoUuid)) {
        const remoteSolicitudes = await this.supabaseService.getSolicitudesPagoByComplex(complexUuid);
        const match = remoteSolicitudes.find(s => s['titulo'] === data.paymentTitle || s['id'] === data.paymentRequestId);
        if (match && match['id'] && this.isValidUuid(match['id'] as string)) {
          solicitudPagoUuid = match['id'] as string;
        } else if (remoteSolicitudes.length > 0 && remoteSolicitudes[0]['id']) {
          solicitudPagoUuid = remoteSolicitudes[0]['id'] as string;
        } else {
          solicitudPagoUuid = 'c1111111-1111-1111-1111-111111111111';
        }
      }

      try {
        // Step 1 & 2: Buscar adeudo existente o crear uno solo si no existe
        console.log(`[Supabase DB] Buscando/creando adeudo para solicitud_pago_id=${solicitudPagoUuid}, vivienda_id=${viviendaUuid}...`);
        const adeudoRow = await this.supabaseService.getOrCreateAdeudo({
          complex_id: complexUuid,
          vivienda_id: viviendaUuid,
          solicitud_pago_id: solicitudPagoUuid,
          monto: data.amount
        });

        const adeudoUuid = adeudoRow['id'] as string;
        resolvedDebtId = adeudoUuid;

        // Step 3: Insertar el comprobante en public.comprobantes_pago relacionándolo con el adeudo_id
        const payload: Record<string, unknown> = {
          complex_id: complexUuid,
          vivienda_id: viviendaUuid,
          residente_id: residenteUuid,
          adeudo_id: adeudoUuid,
          monto_depositado: data.amount,
          metodo_pago: data.method,
          fecha: data.date || todayStr,
          concepto: data.concepto || data.paymentTitle || 'Pago de cuota',
          comentario: data.comentarios || null,
          comprobante_url: data.voucherUrl || null,
          estado: 'Pendiente'
        };

        if (data.method === 'Transferencia') {
          payload['banco_destino'] = data.bancoReceptor || data.banco || null;
          payload['folio'] = data.referencia || null;
          payload['cuenta_origen'] = data.cuentaOrigen || null;
          payload['cuenta_destino'] = data.cuentaDestino || null;
        } else if (data.method === 'Efectivo') {
          payload['recibido_por'] = data.recibidoPor || null;
          if (data.fechaEntrega) {
            payload['fecha'] = data.fechaEntrega;
          }
        }

        console.log('[Supabase DB] Registrando comprobante_pago con adeudo_id=', adeudoUuid, payload);
        const compRow = await this.supabaseService.crearComprobantePago(payload);
        if (compRow && compRow['id']) {
          submissionId = compRow['id'] as string;
        }
      } catch (err) {
        console.error('Error al registrar el comprobante en Supabase:', err);
        const supabaseError = err as { code?: string; message?: string; details?: string; hint?: string };
        if (
          supabaseError.code === '23505' &&
          (supabaseError.message?.toLowerCase().includes('folio') || supabaseError.details?.toLowerCase().includes('folio'))
        ) {
          this.showToast(
            'El Folio / Referencia ya fue registrado. No puedes utilizar el mismo comprobante de pago más de una vez.',
            'error'
          );
        } else {
          this.showToast('Error al registrar el comprobante en Supabase. No se guardó el pago.', 'error');
        }
        throw err;
      }
    }
    // Step 5: Solo se actualiza Signal/localStorage si Supabase confirmó ambos procesos correctamente
    const newSubmission: PaymentSubmission = {
      id: submissionId,
      paymentRequestId: data.paymentRequestId,
      paymentTitle: data.paymentTitle,
      complexId: user.complexId,
      viviendaId: user.viviendaId,
      viviendaNumero: user.viviendaNumero || 'Sin asignar',
      residentId: user.id,
      residentName: user.nombreCompleto,
      method: data.method,
      amount: data.amount,
      date: data.date,
      voucherUrl: data.voucherUrl,
      extractedOcr: data.extractedOcr,
      banco: data.banco,
      bancoReceptor: data.bancoReceptor,
      referencia: data.referencia,
      hora: data.hora,
      concepto: data.concepto,
      cuentaOrigen: data.cuentaOrigen,
      cuentaDestino: data.cuentaDestino,
      recibidoPor: data.recibidoPor,
      fechaEntrega: data.fechaEntrega,
      comentarios: data.comentarios,
      debtId: resolvedDebtId,
      status: 'Pendiente',
      createdAt: new Date().toISOString()
    };

    this.paymentSubmissions.update(list => [newSubmission, ...list]);

    if (resolvedDebtId) {
      this.debts.update(list => list.map(d => d.id === resolvedDebtId ? { ...d, status: 'En revisión' } : d));
    }

    // Notify Administrators
    this.addNotification({
      complexId: user.complexId,
      targetRole: 'Administrador',
      icon: 'payments',
      title: 'Nuevo pago registrado',
      description: `${user.nombreCompleto} (${user.viviendaNumero || 'Residente'}) ha registrado un comprobante de pago por $${data.amount.toLocaleString()} (${data.paymentTitle}).`,
      category: 'pago'
    });

    this.saveStateToStorage();
    this.showToast('Pago registrado correctamente. En revisión por la administración.', 'success');
    return newSubmission;
  }

  async processPaymentSubmission(submissionId: string, approve: boolean, adminObservation?: string): Promise<void> {
    const submission = this.paymentSubmissions().find(s => s.id === submissionId);
    if (!submission) return;

    const newStatus = approve ? 'Aprobado' : 'Rechazado';

    if (this.supabaseService.isConfigured) {
      try {
        // 1. Actualizar estado del comprobante en Supabase
        if (this.isValidUuid(submissionId)) {
          await this.supabaseService.updateComprobanteEstado(submissionId, newStatus);
        }

        // 2. Si se aprueba, actualizar también el adeudo relacionado a 'Pagado' en Supabase
        if (approve) {
          const debtId = submission.debtId;
          if (debtId && this.isValidUuid(debtId)) {
            await this.supabaseService.updateAdeudoEstado(debtId, 'Pagado');
          }
        }
      } catch (err) {
        console.error('Error al actualizar en Supabase durante la revisión de comprobante:', err);
        this.showToast('Error al actualizar en Supabase.', 'error');
        throw err;
      }
    }

    this.paymentSubmissions.update(list => list.map(s => {
      if (s.id === submissionId) {
        return {
          ...s,
          status: newStatus,
          adminObservation: adminObservation || (approve ? 'Pago verificado y aceptado.' : 'Comprobante rechazado por incongruencia.')
        };
      }
      return s;
    }));

    if (approve) {
      // Mark payment request as Paid if matching
      this.paymentRequests.update(list => list.map(p => {
        if (p.id === submission.paymentRequestId) {
          return { ...p, status: 'Pagado' };
        }
        return p;
      }));

      // Resolve debt if any matching
      this.debts.update(list => list.map(d => {
        if (
          (submission.debtId && d.id === submission.debtId) ||
          (d.paymentRequestId === submission.paymentRequestId && d.viviendaId === submission.viviendaId) ||
          (submission.paymentRequestId && (d.id === submission.paymentRequestId || d.id === submission.paymentRequestId.replace('debt-', '')))
        ) {
          return { ...d, status: 'Liquidado' };
        }
        return d;
      }));

      this.addNotification({
        complexId: submission.complexId,
        userId: submission.residentId,
        icon: 'check_circle',
        title: 'Pago Aprobado',
        description: `Tu pago por "${submission.paymentTitle}" ($${submission.amount.toLocaleString()}) ha sido verificado y APROBADO por la administración.`,
        category: 'pago'
      });
      this.showToast('Comprobante de pago APROBADO correctamente.', 'success');
    } else {
      const targetDebtId = submission.debtId || (submission.paymentRequestId?.startsWith('debt-') ? submission.paymentRequestId.replace('debt-', '') : submission.paymentRequestId);

      // Al rechazar, NO se marca como pagado
      this.debts.update(list => list.map(d => {
        if (
          (targetDebtId && d.id === targetDebtId) ||
          (d.paymentRequestId === submission.paymentRequestId && d.viviendaId === submission.viviendaId)
        ) {
          return { ...d, status: 'Rechazado' };
        }
        return d;
      }));

      this.addNotification({
        complexId: submission.complexId,
        userId: submission.residentId,
        icon: 'cancel',
        title: 'Pago Rechazado',
        description: `Tu comprobante de pago por "${submission.paymentTitle}" ($${submission.amount.toLocaleString()}) fue RECHAZADO. Motivo: ${adminObservation || 'Datos incongruentes'}.`,
        category: 'pago'
      });
      this.showToast('Comprobante de pago RECHAZADO.', 'info');
    }

    this.saveStateToStorage();
  }

  recordManualPayment(data: {
    paymentRequestId: string;
    residentId?: string;
    viviendaId: string;
    viviendaNumero: string;
    residentName: string;
    amount: number;
    method: 'Efectivo' | 'Transferencia';
    notes?: string;
  }): PaymentSubmission {
    const user = this.currentUser();
    if (!user) throw new Error('No autenticado.');

    const payReq = this.paymentRequests().find(p => p.id === data.paymentRequestId);
    const paymentTitle = payReq ? payReq.title : 'Pago de Mantenimiento';

    const newSub: PaymentSubmission = {
      id: `sub-manual-${Date.now()}`,
      paymentRequestId: data.paymentRequestId,
      paymentTitle,
      complexId: user.complexId,
      viviendaId: data.viviendaId,
      viviendaNumero: data.viviendaNumero,
      residentId: data.residentId || user.id,
      residentName: data.residentName,
      method: data.method,
      amount: data.amount,
      date: new Date().toISOString().split('T')[0],
      comentarios: data.notes,
      status: 'Aprobado',
      adminObservation: `Pago en ${data.method} registrado directamente en administración por ${user.nombreCompleto}.`,
      createdAt: new Date().toISOString()
    };

    this.paymentSubmissions.update(list => [newSub, ...list]);

    if (data.residentId) {
      this.addNotification({
        complexId: user.complexId,
        userId: data.residentId,
        icon: 'check_circle',
        title: 'Pago Acreditado',
        description: `La administración acreditó tu pago de $${data.amount.toLocaleString()} MXN por "${paymentTitle}" vía ${data.method}.`,
        category: 'pago'
      });
    }

    this.saveStateToStorage();
    this.showToast('Pago manual registrado y acreditado correctamente.', 'success');
    return newSub;
  }

  sendPaymentReminderToResident(residentId: string, paymentTitle: string, amount: number, dueDate: string) {
    const complex = this.currentComplex();
    if (!complex) return;

    this.addNotification({
      complexId: complex.id,
      userId: residentId,
      icon: 'notifications_active',
      title: 'Recordatorio de Pago Pendiente',
      description: `Atento aviso de administración: Tienes pendiente el pago de "${paymentTitle}" ($${amount.toLocaleString()} MXN) con fecha límite ${dueDate}. Por favor realiza tu pago o sube tu comprobante.`,
      category: 'recordatorio'
    });

    this.showToast('Recordatorio enviado al residente.', 'success');
  }

  sendMassMonthlyPaymentReminders() {
    const summary = this.monthlyPendingPaymentsSummary();
    const complex = this.currentComplex();
    if (!complex) return;

    let count = 0;
    const notifiedUserIds = new Set<string>();

    for (const s of summary.summaries) {
      for (const u of s.unitStatuses) {
        if (u.status === 'Pendiente' && u.residentId && !notifiedUserIds.has(u.residentId)) {
          this.addNotification({
            complexId: complex.id,
            userId: u.residentId,
            icon: 'notifications_active',
            title: 'Recordatorio de Pago de Cuota',
            description: `Estimado residente de ${u.viviendaNumero}: Tienes un pago pendiente este mes por "${s.request.title}" ($${s.request.amount.toLocaleString()} MXN). Vence: ${s.request.dueDate}.`,
            category: 'recordatorio'
          });
          notifiedUserIds.add(u.residentId);
          count++;
        }
      }
    }

    if (count > 0) {
      this.showToast(`Se enviaron ${count} recordatorios a residentes con pagos pendientes.`, 'success');
    } else {
      this.showToast('No hay pagos pendientes para notificar este mes.', 'info');
    }
  }

  // --- Debts Module ---

  createDebt(data: {
    viviendaId: string;
    viviendaNumero: string;
    residentId: string;
    residentName: string;
    paymentRequestId?: string;
    concept: string;
    amount: number;
    dueDate: string;
    observations: string;
    sanctionAmount?: number;
    sanctionReason?: string;
  }): Debt {
    const complex = this.currentComplex();
    if (!complex) throw new Error('Sin conjunto asignado.');

    const todayStr = new Date().toISOString().split('T')[0];
    if (data.dueDate && data.dueDate < todayStr) {
      this.showToast('La fecha de vencimiento no puede ser anterior al día de hoy.', 'error');
      throw new Error('La fecha de vencimiento no puede ser anterior al día de hoy.');
    }

    const newDebt: Debt = {
      id: `dbt-${Date.now()}`,
      complexId: complex.id,
      viviendaId: data.viviendaId,
      viviendaNumero: data.viviendaNumero,
      residentId: data.residentId,
      residentName: data.residentName,
      paymentRequestId: data.paymentRequestId,
      concept: data.concept,
      amount: data.amount,
      dueDate: data.dueDate,
      observations: data.observations,
      sanctionAmount: data.sanctionAmount,
      sanctionReason: data.sanctionReason,
      status: 'Pendiente',
      createdAt: new Date().toISOString().split('T')[0]
    };

    this.debts.update(list => this.deduplicateDebts([newDebt, ...list]));

    // Notify Resident
    this.addNotification({
      complexId: complex.id,
      userId: data.residentId,
      icon: 'warning',
      title: 'Nuevo Adeudo Registrado',
      description: `Se registró un adeudo de $${data.amount.toLocaleString()} por el concepto "${data.concept}". Vence el ${data.dueDate}.`,
      category: 'adeudo'
    });

    // Notify Admin
    this.addNotification({
      complexId: complex.id,
      targetRole: 'Administrador',
      icon: 'account_balance_wallet',
      title: 'Nuevo Adeudo Registrado',
      description: `Se asignó un adeudo de $${data.amount.toLocaleString()} a ${data.residentName} (${data.viviendaNumero}).`,
      category: 'adeudo'
    });

    this.saveStateToStorage();
    return newDebt;
  }

  updateDebtObservations(debtId: string, observations: string, sanctionAmount?: number, sanctionReason?: string) {
    const debt = this.debts().find(d => d.id === debtId);
    this.debts.update(list => list.map(d => {
      if (d.id === debtId) {
        return {
          ...d,
          observations,
          sanctionAmount,
          sanctionReason
        };
      }
      return d;
    }));

    if (debt && sanctionAmount && sanctionAmount > 0) {
      this.addNotification({
        complexId: debt.complexId,
        userId: debt.residentId,
        icon: 'gavel',
        title: 'Nueva Sanción Registrada',
        description: `Se ha aplicado una sanción de $${sanctionAmount.toLocaleString()} a tu adeudo "${debt.concept}". Motivo: ${sanctionReason || 'Recargo extemporáneo'}.`,
        category: 'adeudo'
      });
    }

    this.saveStateToStorage();
  }

  async syncOverduePaymentRequests(): Promise<void> {
    if (this.isSyncingOverdueDebts) return;
    this.isSyncingOverdueDebts = true;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payments = this.paymentRequests();
      const existingDebts = this.debts();
      const submissions = this.paymentSubmissions();
      const allUsers = this.users();
      const allUnits = this.units();

      const newDebtsCreated: Debt[] = [];

      for (const p of payments) {
        if (p.dueDate && p.dueDate < todayStr) {
          const complexUuid = this.getComplexUuid(p.complexId);
          let targetViviendas: {
            viviendaUuid: string;
            localUnitId?: string;
            numeroVivienda: string;
            bloqueCalle?: string;
          }[] = [];

          // 1. Obtener todas las viviendas correspondientes al complex_id desde Supabase (fuente de verdad)
          if (this.supabaseService.isConfigured && complexUuid) {
            try {
              const remoteViviendas = await this.supabaseService.getViviendasByConjunto(complexUuid);
              if (remoteViviendas && remoteViviendas.length > 0) {
                targetViviendas = remoteViviendas.map(rv => {
                  const vUuid = rv['id'] as string;
                  const numViv = (rv['numero_vivienda'] as string) || '';
                  const calleBlq = (rv['calle_bloque'] as string) || undefined;
                  const localMatch = allUnits.find(u => 
                    u.remoteId === vUuid || 
                    u.id === vUuid || 
                    (u.numeroVivienda && u.numeroVivienda.trim().toLowerCase() === numViv.trim().toLowerCase() && this.isSameComplex(u.complexId, p.complexId))
                  );
                  return {
                    viviendaUuid: vUuid,
                    localUnitId: localMatch?.id || vUuid,
                    numeroVivienda: numViv || localMatch?.numeroVivienda || 'Vivienda',
                    bloqueCalle: calleBlq || localMatch?.bloqueCalle
                  };
                });
              }
            } catch (err) {
              console.error('[syncOverduePaymentRequests] Error al consultar viviendas por conjunto:', err);
            }
          }

          // Fallback a unidades locales solo si no fue posible obtener viviendas remotas de Supabase
          if (targetViviendas.length === 0) {
            let localUnits = allUnits.filter(u => this.isSameComplex(u.complexId, p.complexId));
            if (p.viviendaId) {
              localUnits = localUnits.filter(u => u.id === p.viviendaId || u.remoteId === p.viviendaId);
            }
            targetViviendas = localUnits.map(u => ({
              viviendaUuid: this.getViviendaUuid(u.id) || (this.isValidUuid(u.id) ? u.id : u.id),
              localUnitId: u.id,
              numeroVivienda: u.numeroVivienda,
              bloqueCalle: u.bloqueCalle
            }));
          }

          // Resolver UUID de solicitud de pago en Supabase si aplica
          let solicitudPagoUuid = p.id;
          if (this.supabaseService.isConfigured && complexUuid) {
            if (!this.isValidUuid(solicitudPagoUuid)) {
              try {
                const remoteSolicitudes = await this.supabaseService.getSolicitudesPagoByComplex(complexUuid);
                const match = remoteSolicitudes.find(s => s['titulo'] === p.title || s['id'] === p.id);
                if (match && match['id'] && this.isValidUuid(match['id'] as string)) {
                  solicitudPagoUuid = match['id'] as string;
                }
              } catch (e) {
                console.error('[syncOverduePaymentRequests] Error al buscar solicitud remota:', e);
              }
            }
          }

          // 2. Recorrer la totalidad de viviendas del conjunto sin filtrar si tienen o no residente
          for (const target of targetViviendas) {
            const { viviendaUuid, localUnitId, numeroVivienda, bloqueCalle } = target;

            // Relación con residente para asignación informativa y visualización posterior
            const res = allUsers.find(u => 
              (u.viviendaId && (u.viviendaId === viviendaUuid || (localUnitId && u.viviendaId === localUnitId))) ||
              (u.viviendaNumero && numeroVivienda && u.viviendaNumero.trim().toLowerCase() === numeroVivienda.trim().toLowerCase() && this.isSameComplex(u.complexId, p.complexId))
            );
            const residentId = res?.id || 'res-pending';
            const residentName = res?.nombreCompleto || 'Sin residente asignado';

            // Comprobar si existe comprobante de pago aprobado para esta solicitud + vivienda/residente
            const hasApprovedSubmission = submissions.some(s => 
              s.paymentRequestId === p.id && 
              (s.viviendaId === viviendaUuid || (localUnitId && s.viviendaId === localUnitId) || (res && s.residentId === res.id)) && 
              s.status === 'Aprobado'
            );

            if (hasApprovedSubmission) continue;

            // 3. Verificación de duplicados en estado local por combinación solicitud_pago_id + vivienda_id
            const debtExistsInLocal = existingDebts.some(d => 
              (d.paymentRequestId === p.id || (solicitudPagoUuid && d.paymentRequestId === solicitudPagoUuid)) &&
              (d.viviendaId === viviendaUuid || (localUnitId && d.viviendaId === localUnitId))
            ) || newDebtsCreated.some(d => 
              (d.paymentRequestId === p.id || (solicitudPagoUuid && d.paymentRequestId === solicitudPagoUuid)) &&
              (d.viviendaId === viviendaUuid || (localUnitId && d.viviendaId === localUnitId))
            );

            if (debtExistsInLocal) {
              continue;
            }

            let createdDebtId = `dbt-auto-${p.id}-${viviendaUuid}`;

            // Sincronizar / crear en public.adeudos de Supabase
            if (this.supabaseService.isConfigured && complexUuid && viviendaUuid && this.isValidUuid(solicitudPagoUuid)) {
              try {
                const dbAdeudo = await this.supabaseService.getOrCreateAdeudo({
                  complex_id: complexUuid,
                  vivienda_id: viviendaUuid,
                  solicitud_pago_id: solicitudPagoUuid,
                  monto: p.amount,
                  fecha_vencimiento: p.dueDate
                });
                if (dbAdeudo && dbAdeudo['id']) {
                  createdDebtId = dbAdeudo['id'] as string;
                }
              } catch (err) {
                console.error('[syncOverduePaymentRequests] Error al sincro con Supabase public.adeudos:', err);
              }
            }

            // Evitar duplicados en local por ID generado/retornado
            if (existingDebts.some(d => d.id === createdDebtId) || newDebtsCreated.some(d => d.id === createdDebtId)) {
              continue;
            }

            const displayViviendaNum = numeroVivienda 
              ? (bloqueCalle ? `${numeroVivienda} (${bloqueCalle})` : numeroVivienda)
              : (bloqueCalle || 'Vivienda');

            const autoDebt: Debt = {
              id: createdDebtId,
              complexId: p.complexId,
              viviendaId: viviendaUuid || localUnitId || 'viv-pending',
              viviendaNumero: displayViviendaNum,
              residentId: residentId,
              residentName: residentName,
              paymentRequestId: p.id,
              concept: `${p.title} (Vencido)`,
              amount: p.amount,
              dueDate: p.dueDate,
              createdAt: todayStr,
              requestCreatedAt: p.createdAt,
              observations: `Cobro vencido el ${p.dueDate}. Convertido automáticamente a adeudo.`,
              sanctionDecision: 'pending',
              status: 'Pendiente'
            };
            newDebtsCreated.push(autoDebt);
          }
        }
      }

      if (newDebtsCreated.length > 0) {
        this.debts.update(list => this.deduplicateDebts([...newDebtsCreated, ...list]));
        this.saveStateToStorage();
      }
    } finally {
      this.isSyncingOverdueDebts = false;
    }
  }

  async resolveAdminId(): Promise<string> {
    const user = this.currentUser();
    let adminId: string | null = null;

    const authUser = await this.supabaseService.getAuthUser();
    if (authUser && authUser.id && this.isValidUuid(authUser.id)) {
      adminId = authUser.id;
    }

    let dbUser: Record<string, unknown> | null = null;
    if (adminId) {
      dbUser = await this.supabaseService.getUsuarioByAuthUserId(adminId);
    }
    if (!dbUser && user?.remoteId && this.isValidUuid(user.remoteId)) {
      dbUser = await this.supabaseService.getUsuarioByAuthUserId(user.remoteId);
    }
    if (!dbUser && user?.correo) {
      dbUser = await this.supabaseService.getUsuarioByEmail(user.correo);
    }

    if (dbUser && dbUser['id'] && this.isValidUuid(dbUser['id'] as string)) {
      adminId = dbUser['id'] as string;
    }

    if (!adminId || !this.isValidUuid(adminId)) {
      adminId = (user?.id && this.isValidUuid(user.id)) ? user.id : 'b1000000-0000-0000-0000-000000000002';
    }

    return adminId;
  }

  async applySanctionToDebt(debtId: string, sanctionAmount: number, sanctionReason: string) {
    const target = this.debts().find(d => d.id === debtId);
    if (!target) return;

    this.debts.update(list => list.map(d => {
      if (d.id === debtId) {
        return {
          ...d,
          sanctionAmount,
          sanctionReason,
          sanctionDecision: 'applied' as const,
          observations: d.observations ? `${d.observations} | Sanción aplicada: ${sanctionReason} ($${sanctionAmount} MXN)` : `Sanción aplicada: ${sanctionReason} ($${sanctionAmount} MXN)`
        };
      }
      return d;
    }));

    if (this.supabaseService.isConfigured) {
      try {
        const adminId = await this.resolveAdminId();
        const adeudoId = target.id;

        await this.supabaseService.crearSancion({
          adeudo_id: adeudoId,
          administrador_id: adminId,
          aplica_sancion: true,
          motivo: sanctionReason,
          comentario: null,
          monto: sanctionAmount
        });
      } catch (err) {
        console.warn('Error al registrar sanción en Supabase:', err);
      }
    }

    this.addNotification({
      complexId: target.complexId,
      userId: target.residentId,
      icon: 'gavel',
      title: 'Sanción Aplicada a Adeudo',
      description: `Se aplicó una sanción de $${sanctionAmount.toLocaleString()} MXN al adeudo "${target.concept}". Motivo: ${sanctionReason}.`,
      category: 'adeudo'
    });

    this.saveStateToStorage();
    this.showToast('Sanción aplicada correctamente.', 'success');
  }

  async waiveSanctionForDebt(debtId: string, reason: string) {
    const target = this.debts().find(d => d.id === debtId);
    if (!target) return;

    this.debts.update(list => list.map(d => {
      if (d.id === debtId) {
        return {
          ...d,
          sanctionAmount: 0,
          sanctionReason: `Sin sanción: ${reason}`,
          sanctionDecision: 'waived' as const,
          observations: d.observations ? `${d.observations} | Sin sanción: ${reason}` : `Sin sanción: ${reason}`
        };
      }
      return d;
    }));

    if (this.supabaseService.isConfigured) {
      try {
        const adminId = await this.resolveAdminId();
        const adeudoId = target.id;

        await this.supabaseService.crearSancion({
          adeudo_id: adeudoId,
          administrador_id: adminId,
          aplica_sancion: false,
          motivo: reason,
          comentario: null,
          monto: null
        });
      } catch (err) {
        console.warn('Error al registrar decisión sin sanción en Supabase:', err);
      }
    }

    this.addNotification({
      complexId: target.complexId,
      userId: target.residentId,
      icon: 'info',
      title: 'Adeudo sin Sanción',
      description: `Se procesó tu adeudo "${target.concept}" sin sanción adicional. Motivo: ${reason}.`,
      category: 'adeudo'
    });

    this.saveStateToStorage();
    this.showToast('Registrado sin sanción.', 'info');
  }
}
