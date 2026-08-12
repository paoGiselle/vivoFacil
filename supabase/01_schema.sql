-- =============================================================================
-- ESTRUCTURA DEFINITIVA DE BASE DE DATOS DE VIVOFÁCIL (SUPABASE / POSTGRESQL)
-- Script 01: Definición de Esquema, ENUMs, Tablas, Claves, Índices y RLS
-- =============================================================================

-- Habilitar extensión pgcrypto para generación de UUIDs si no está activa
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. CREACIÓN DE TIPOS ENUM
-- -----------------------------------------------------------------------------

CREATE TYPE estado_usuario_enum AS ENUM (
  'Pendiente',
  'Activa',
  'Rechazada',
  'Inactiva'
);

CREATE TYPE rol_usuario_enum AS ENUM (
  'Administrador',
  'Residente',
  'Vigilante'
);

CREATE TYPE estado_visita_enum AS ENUM (
  'Pendiente',
  'Aprobado',
  'Rechazado',
  'Expirado',
  'Cancelado'
);

CREATE TYPE decision_acceso_enum AS ENUM (
  'Aprobado',
  'Rechazado'
);

CREATE TYPE tipo_solicitud_enum AS ENUM (
  'Fijo',
  'Extraordinario'
);

CREATE TYPE estado_adeudo_enum AS ENUM (
  'Pendiente',
  'En revisión',
  'Pagado',
  'Vencido'
);

CREATE TYPE metodo_pago_enum AS ENUM (
  'Transferencia',
  'Efectivo'
);

CREATE TYPE estado_comprobante_enum AS ENUM (
  'Pendiente',
  'Aprobado',
  'Rechazado'
);

CREATE TYPE tipo_notificacion_enum AS ENUM (
  'Pago',
  'Visita',
  'Adeudo',
  'Cuenta'
);

-- -----------------------------------------------------------------------------
-- 2. TABLAS PRINCIPALES
-- -----------------------------------------------------------------------------

-- Tabla 1: conjuntos_habitacionales
CREATE TABLE conjuntos_habitacionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  direccion TEXT NOT NULL,
  ciudad VARCHAR(255) NOT NULL,
  latitud DECIMAL(10, 6) NOT NULL,
  longitud DECIMAL(10, 6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla 2: viviendas
CREATE TABLE viviendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id UUID NOT NULL REFERENCES conjuntos_habitacionales(id) ON DELETE CASCADE,
  numero_vivienda VARCHAR(100) NOT NULL,
  calle_bloque VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_vivienda_per_complex UNIQUE (complex_id, numero_vivienda)
);

-- Tabla 3: usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  complex_id UUID NOT NULL REFERENCES conjuntos_habitacionales(id) ON DELETE RESTRICT,
  vivienda_id UUID REFERENCES viviendas(id) ON DELETE SET NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  correo VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  password_hash TEXT NOT NULL,
  foto_url TEXT,
  estado estado_usuario_enum NOT NULL DEFAULT 'Pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla 4: roles_usuario
CREATE TABLE roles_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol rol_usuario_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_usuario_rol UNIQUE (usuario_id, rol)
);

-- Tabla 5: pases_visita
CREATE TABLE pases_visita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id UUID NOT NULL REFERENCES conjuntos_habitacionales(id) ON DELETE CASCADE,
  vivienda_id UUID NOT NULL REFERENCES viviendas(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  qr_code VARCHAR(100) UNIQUE NOT NULL,
  nombre_visitante VARCHAR(255) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  fecha_visita DATE NOT NULL,
  hora_visita TIME NOT NULL,
  estado estado_visita_enum NOT NULL DEFAULT 'Pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla 6: registros_acceso
CREATE TABLE registros_acceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES pases_visita(id) ON DELETE CASCADE,
  complex_id UUID NOT NULL REFERENCES conjuntos_habitacionales(id) ON DELETE CASCADE,
  vigilante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ine_confirmada BOOLEAN NOT NULL DEFAULT FALSE,
  placas VARCHAR(50),
  observaciones TEXT,
  motivo_rechazo TEXT,
  decision decision_acceso_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla 7: solicitudes_pago
CREATE TABLE solicitudes_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id UUID NOT NULL REFERENCES conjuntos_habitacionales(id) ON DELETE CASCADE,
  creado_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  titulo VARCHAR(255) NOT NULL,
  concepto TEXT NOT NULL,
  tipo tipo_solicitud_enum NOT NULL DEFAULT 'Fijo',
  monto DECIMAL(12, 2) NOT NULL,
  fecha_limite DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla 8: adeudos
CREATE TABLE adeudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id UUID NOT NULL REFERENCES conjuntos_habitacionales(id) ON DELETE CASCADE,
  vivienda_id UUID NOT NULL REFERENCES viviendas(id) ON DELETE CASCADE,
  solicitud_pago_id UUID NOT NULL REFERENCES solicitudes_pago(id) ON DELETE CASCADE,
  monto DECIMAL(12, 2) NOT NULL,
  estado estado_adeudo_enum NOT NULL DEFAULT 'Pendiente',
  fecha_vencimiento DATE NOT NULL,
  fecha_generacion DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla 9: comprobantes_pago
CREATE TABLE comprobantes_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id UUID NOT NULL REFERENCES conjuntos_habitacionales(id) ON DELETE CASCADE,
  vivienda_id UUID NOT NULL REFERENCES viviendas(id) ON DELETE CASCADE,
  residente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  adeudo_id UUID NOT NULL REFERENCES adeudos(id) ON DELETE CASCADE,
  metodo_pago metodo_pago_enum NOT NULL DEFAULT 'Transferencia',
  fecha DATE NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  monto_depositado DECIMAL(12, 2) NOT NULL,
  folio VARCHAR(100),
  recibido_por VARCHAR(255),
  banco_destino VARCHAR(100),
  cuenta_origen VARCHAR(100),
  cuenta_destino VARCHAR(100),
  comentario TEXT,
  comprobante_url TEXT,
  estado estado_comprobante_enum NOT NULL DEFAULT 'Pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla 10: sanciones
CREATE TABLE sanciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adeudo_id UUID NOT NULL REFERENCES adeudos(id) ON DELETE CASCADE,
  administrador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  aplica_sancion BOOLEAN NOT NULL DEFAULT FALSE,
  motivo TEXT NOT NULL,
  comentario TEXT,
  monto DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla 11: notificaciones
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id UUID NOT NULL REFERENCES conjuntos_habitacionales(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo tipo_notificacion_enum NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. ÍNDICES DE RENDIMIENTO Y OPTIMIZACIÓN MULTI-TENANT
-- -----------------------------------------------------------------------------

CREATE INDEX idx_viviendas_complex ON viviendas(complex_id);
CREATE INDEX idx_usuarios_complex ON usuarios(complex_id);
CREATE INDEX idx_usuarios_vivienda ON usuarios(vivienda_id);
CREATE INDEX idx_pases_complex ON pases_visita(complex_id);
CREATE INDEX idx_pases_vivienda ON pases_visita(vivienda_id);
CREATE INDEX idx_pases_qr ON pases_visita(qr_code);
CREATE INDEX idx_registros_visit ON registros_acceso(visit_id);
CREATE INDEX idx_solicitudes_complex ON solicitudes_pago(complex_id);
CREATE INDEX idx_adeudos_complex ON adeudos(complex_id);
CREATE INDEX idx_adeudos_vivienda ON adeudos(vivienda_id);
CREATE INDEX idx_comprobantes_complex ON comprobantes_pago(complex_id);
CREATE INDEX idx_comprobantes_adeudo ON comprobantes_pago(adeudo_id);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);

-- -----------------------------------------------------------------------------
-- 4. HABILITACIÓN DE RLS (ROW LEVEL SECURITY)
-- -----------------------------------------------------------------------------

ALTER TABLE conjuntos_habitacionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE viviendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE pases_visita ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_acceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE adeudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas por defecto para la clave pública (Anon API) durante desarrollo / prototipado
CREATE POLICY "Public Read Access conjuntos" ON conjuntos_habitacionales FOR SELECT USING (true);
CREATE POLICY "Public Read Access viviendas" ON viviendas FOR SELECT USING (true);
CREATE POLICY "Public Access usuarios" ON usuarios FOR ALL USING (true);
CREATE POLICY "Public Access roles" ON roles_usuario FOR ALL USING (true);
CREATE POLICY "Public Access pases" ON pases_visita FOR ALL USING (true);
CREATE POLICY "Public Access registros" ON registros_acceso FOR ALL USING (true);
CREATE POLICY "Public Access solicitudes" ON solicitudes_pago FOR ALL USING (true);
CREATE POLICY "Public Access adeudos" ON adeudos FOR ALL USING (true);
CREATE POLICY "Public Access comprobantes" ON comprobantes_pago FOR ALL USING (true);
CREATE POLICY "Public Access sanciones" ON sanciones FOR ALL USING (true);
CREATE POLICY "Public Access notificaciones" ON notificaciones FOR ALL USING (true);
