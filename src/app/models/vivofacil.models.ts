export type UserRole = 'Administrador' | 'Residente' | 'Vigilante';

export type AccountStatus = 'Pendiente' | 'Activa' | 'Rechazada' | 'Desactivada';

export type QRStatus = 'Pendiente' | 'Aprobado' | 'Aprobada' | 'Rechazado' | 'Rechazada' | 'Expirado' | 'Expirada' | 'Cancelado' | 'Cancelada';

export type PaymentType = 'Pago Fijo' | 'Pago Extraordinario';

export type PaymentCategory = 
  | 'Cuota mensual'
  | 'Seguridad'
  | 'Limpieza'
  | 'Mantenimiento'
  | 'Reparaciones'
  | 'Renovaciones'
  | 'Obras'
  | 'Mantenimiento especial'
  | 'Otro';

export interface HousingComplex {
  id: string;
  remoteId?: string;
  nombre: string;
  tipo?: string;
  direccion: string;
  ciudad: string;
  lat: number;
  lng: number;
  totalViviendas: number;
  contactoAdmin: string;
  viviendas?: HousingUnit[];
}

export interface HousingUnit {
  id: string;
  remoteId?: string;
  complexId: string;
  numeroVivienda: string; // e.g. "Casa #12", "Depto 402-A"
  numero?: string; // Alias for UI select
  piso?: number;
  bloqueCalle: string; // e.g. "Calle Ciprés", "Torre A"
  propietarioNombre?: string;
}

export interface User {
  id: string;
  remoteId?: string;
  remoteAuthUserId?: string;
  nombreCompleto: string;
  correo: string;
  telefono: string;
  password?: string;
  complexId: string;
  viviendaId: string;
  viviendaNumero?: string;
  roles: UserRole[];
  status: AccountStatus;
  associatedComplexIds?: string[]; // Complexes user has permission to access
  avatarUrl?: string;
  createdAt: string;
  approvedAt?: string;
  updatedAt?: string;
}

export interface VisitorVisit {
  id: string;
  qrCode: string;
  visitorName: string;
  birthDate: string; // YYYY-MM-DD
  visitDate: string; // YYYY-MM-DD
  estimatedTime: string; // HH:mm
  residentId: string;
  residentName: string;
  viviendaNumber: string;
  complexId: string;
  status: QRStatus;
  scannedAt?: string;
  scannedByVigilanteId?: string;
  scannedByVigilanteName?: string;
  ineVerifiedManual?: boolean;
  decision?: 'Aprobado' | 'Rechazado';
  vehiclePlates?: string;
  observations?: string;
  createdAt: string;
}

export interface PaymentRequest {
  id: string;
  complexId: string;
  viviendaId?: string; // If undefined, applies to all units in complex
  viviendaNumero?: string;
  title: string;
  type: PaymentType;
  category: PaymentCategory;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  status: 'Pendiente' | 'Pagado' | 'Vencido';
  createdAt: string;
  monthPeriod?: string;
}

export interface ExtractedOcrData {
  banco: string;
  bancoReceptor?: string;
  fecha: string;
  hora: string;
  monto: number;
  referencia: string;
  concepto?: string;
  beneficiario?: string;
  cuentaOrigen?: string;
  cuentaDestino?: string;
  confianza?: number;
  resumen?: string;
}

export interface PaymentSubmission {
  id: string;
  paymentRequestId: string;
  paymentTitle: string;
  complexId: string;
  viviendaId: string;
  viviendaNumero: string;
  residentId: string;
  residentName: string;
  method: 'Transferencia' | 'Efectivo';
  amount: number;
  date: string;
  voucherUrl?: string; // Base64 image or file string
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
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  adminObservation?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  targetRole?: UserRole;
  complexId: string;
  icon: string;
  title: string;
  description: string;
  category: 'pago' | 'visita' | 'adeudo' | 'usuario' | 'recordatorio';
  createdAt: string;
  read: boolean;
}

export interface Debt {
  id: string;
  complexId: string;
  viviendaId: string;
  viviendaNumero: string;
  residentId: string;
  residentName: string;
  paymentRequestId?: string;
  requestCreatedAt?: string;
  concept: string;
  amount: number;
  dueDate: string;
  createdAt: string;
  observations: string; // e.g., Reason for debt
  sanctionAmount?: number;
  sanctionReason?: string;
  sanctionDecision?: 'pending' | 'applied' | 'waived';
  status: 'Pendiente' | 'En revisión' | 'Liquidado' | 'Rechazado';
}

export interface RequestUnitStatus {
  unitId: string;
  viviendaNumero: string;
  residentId?: string;
  residentName?: string;
  status: 'Pagado' | 'En revisión' | 'Pendiente' | 'Vencido';
  submissionId?: string;
  paidAt?: string;
  debtId?: string;
}

export interface MonthlyPaymentSummary {
  request: PaymentRequest;
  totalUnits: number;
  paidUnitsCount: number;
  pendingUnitsCount: number;
  inReviewUnitsCount: number;
  expiredUnitsCount: number;
  totalAmountExpected: number;
  totalAmountCollected: number;
  totalAmountPending: number;
  unitStatuses: RequestUnitStatus[];
}

