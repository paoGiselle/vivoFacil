-- =============================================================================
-- SEED DE DATOS INICIALES PARA VIVOFÁCIL
-- Script 02: Inserción de 7 Conjuntos Habitacionales, Viviendas y Perfiles Demo
-- =============================================================================

-- UUIDs fijos asignados para consistencia en migraciones:
-- cx-1: 11111111-1111-1111-1111-111111111111 (Residencial Los Olivos)
-- cx-2: 22222222-2222-2222-2222-222222222222 (Privada El Roble)
-- cx-3: 33333333-3333-3333-3333-333333333333 (Condominios Torres del Sol)
-- cx-4: 44444444-4444-4444-4444-444444444444 (Fraccionamiento Las Hadas)
-- cx-5: 55555555-5555-5555-5555-555555555555 (Residencial Cumbres)
-- cx-6: 66666666-6666-6666-6666-666666666666 (Residencial Real de Palmas)
-- cx-7: 77777777-7777-7777-7777-777777777777 (Residential Capitol Villahermosa)

-- -----------------------------------------------------------------------------
-- 1. CONJUNTOS HABITACIONALES
-- -----------------------------------------------------------------------------
INSERT INTO conjuntos_habitacionales (id, nombre, direccion, ciudad, latitud, longitud) VALUES
('11111111-1111-1111-1111-111111111111', 'Residencial Los Olivos', 'Av. Las Palmas #450, Col. Campestre', 'Guadalajara, Jal.', 20.6736, -103.3440),
('22222222-2222-2222-2222-222222222222', 'Privada El Roble', 'Calle Roble Blanco #120, Col. Del Valle', 'Monterrey, N.L.', 25.6866, -100.3161),
('33333333-3333-3333-3333-333333333333', 'Condominios Torres del Sol', 'Blvd. Diaz Ordaz #890', 'Querétaro, Qro.', 20.5888, -100.3899),
('44444444-4444-4444-4444-444444444444', 'Fraccionamiento Las Hadas', 'Prol. Paseo Usumacinta', 'Villahermosa, Tab.', 17.9892, -92.9475),
('55555555-5555-5555-5555-555555555555', 'Residencial Cumbres', 'Villahermosa-Ixtacomitán km 1.5', 'Villahermosa, Tab.', 17.9620, -92.9550),
('66666666-6666-6666-6666-666666666666', 'Residencial Real de Palmas', 'Av. 4 Oriente, Ciudad Industrial', 'Villahermosa, Tab.', 18.0150, -92.9100),
('77777777-7777-7777-7777-777777777777', 'Residential Capitol Villahermosa', 'Prol. Paseo de Usumacinta', 'Villahermosa, Tab.', 17.9920, -92.9430);

-- -----------------------------------------------------------------------------
-- 2. VIVIENDAS DE MUESTRA
-- -----------------------------------------------------------------------------
-- Viviendas para cx-1 (Residencial Los Olivos)
INSERT INTO viviendas (id, complex_id, numero_vivienda, calle_bloque) VALUES
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Casa #12', 'Calle Ciprés'),
('a1111111-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', 'Casa #14', 'Calle Ciprés'),
('a1111111-1111-1111-1111-333333333333', '11111111-1111-1111-1111-111111111111', 'Casa #25', 'Calle Encino'),
('a1111111-1111-1111-1111-444444444444', '11111111-1111-1111-1111-111111111111', 'Casa #18', 'Calle Roble'),
('a1111111-1111-1111-1111-555555555555', '11111111-1111-1111-1111-111111111111', 'Casa #20', 'Calle Olivo');

-- Viviendas para cx-2 (Privada El Roble)
INSERT INTO viviendas (id, complex_id, numero_vivienda, calle_bloque) VALUES
('a2222222-2222-2222-2222-111111111111', '22222222-2222-2222-2222-222222222222', 'Privada A-04', 'Manzana 2');

-- Viviendas para cx-3 (Condominios Torres del Sol)
INSERT INTO viviendas (id, complex_id, numero_vivienda, calle_bloque) VALUES
('a3333333-3333-3333-3333-111111111111', '33333333-3333-3333-3333-333333333333', 'Depto 402-B', 'Torre Norte');

-- Viviendas para cx-4 (Fraccionamiento Las Hadas)
INSERT INTO viviendas (id, complex_id, numero_vivienda, calle_bloque) VALUES
('a4444444-4444-4444-4444-111111111111', '44444444-4444-4444-4444-444444444444', 'Casa 1', 'Paseo Usumacinta'),
('a4444444-4444-4444-4444-222222222222', '44444444-4444-4444-4444-444444444444', 'Casa 5', 'Paseo Usumacinta');

-- -----------------------------------------------------------------------------
-- 3. PERFILES DE PRUEBA Y USUARIOS DEMO
-- -----------------------------------------------------------------------------

-- 1) Pendiente: Sofía Ramírez López (cx-1, Casa #25)
INSERT INTO usuarios (id, complex_id, vivienda_id, nombre_completo, correo, telefono, password_hash, estado) VALUES
('b1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-333333333333', 'Sofía Ramírez López', 'sofia@vivofacil.com', '3377889900', '123456', 'Pendiente');

INSERT INTO roles_usuario (usuario_id, rol) VALUES
('b1000000-0000-0000-0000-000000000001', 'Residente');

-- 2) Administrador 1: Carlos Mendoza (cx-1, Casa #12)
INSERT INTO usuarios (id, complex_id, vivienda_id, nombre_completo, correo, telefono, password_hash, estado) VALUES
('b1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Carlos Mendoza', 'carlos@vivofacil.com', '3312345678', '123456', 'Activa');

INSERT INTO roles_usuario (usuario_id, rol) VALUES
('b1000000-0000-0000-0000-000000000002', 'Administrador');

-- 3) Administrador 2: Beatriz Solís (cx-2, Privada A-04)
INSERT INTO usuarios (id, complex_id, vivienda_id, nombre_completo, correo, telefono, password_hash, estado) VALUES
('b1000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-111111111111', 'Beatriz Solís', 'beatriz@vivofacil.com', '8112345678', '123456', 'Activa');

INSERT INTO roles_usuario (usuario_id, rol) VALUES
('b1000000-0000-0000-0000-000000000003', 'Administrador');

-- 4) Vigilante: Juan Pérez (cx-1)
INSERT INTO usuarios (id, complex_id, vivienda_id, nombre_completo, correo, telefono, password_hash, estado) VALUES
('b1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', NULL, 'Juan Pérez (Vigilancia)', 'vigilante@vivofacil.com', '3398765432', '123456', 'Activa');

INSERT INTO roles_usuario (usuario_id, rol) VALUES
('b1000000-0000-0000-0000-000000000004', 'Vigilante');

-- 5) Residente: María Fernanda Gómez (cx-1, Casa #14)
INSERT INTO usuarios (id, complex_id, vivienda_id, nombre_completo, correo, telefono, password_hash, estado) VALUES
('b1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-222222222222', 'María Fernanda Gómez', 'maria@vivofacil.com', '3345678901', '123456', 'Activa');

INSERT INTO roles_usuario (usuario_id, rol) VALUES
('b1000000-0000-0000-0000-000000000005', 'Residente');

-- 6) Residente + Vigilante: Ricardo Treviño (cx-1, Casa #18)
INSERT INTO usuarios (id, complex_id, vivienda_id, nombre_completo, correo, telefono, password_hash, estado) VALUES
('b1000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-444444444444', 'Ricardo Treviño', 'ricardo@vivofacil.com', '3355667788', '123456', 'Activa');

INSERT INTO roles_usuario (usuario_id, rol) VALUES
('b1000000-0000-0000-0000-000000000006', 'Residente'),
('b1000000-0000-0000-0000-000000000006', 'Vigilante');

-- 7) Administrador + Residente: Elena Castro (cx-1, Casa #20)
INSERT INTO usuarios (id, complex_id, vivienda_id, nombre_completo, correo, telefono, password_hash, estado) VALUES
('b1000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-555555555555', 'Elena Castro', 'elena@vivofacil.com', '3399001122', '123456', 'Activa');

INSERT INTO roles_usuario (usuario_id, rol) VALUES
('b1000000-0000-0000-0000-000000000007', 'Administrador'),
('b1000000-0000-0000-0000-000000000007', 'Residente');

-- -----------------------------------------------------------------------------
-- 4. SOLICITUDES DE PAGO DE PRUEBA
-- -----------------------------------------------------------------------------
INSERT INTO solicitudes_pago (id, complex_id, creado_por, titulo, concepto, tipo, monto, fecha_limite) VALUES
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'b1000000-0000-0000-0000-000000000002', 'Mantenimiento Mensual Agosto', 'Mantenimiento de áreas comunes y seguridad', 'Fijo', 1250.00, '2026-08-15'),
('c1111111-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', 'b1000000-0000-0000-0000-000000000002', 'Reparación Portón Eléctrico', 'Cuota extraordinaria para reparación de motor del portón', 'Extraordinario', 450.00, '2026-08-30');

-- -----------------------------------------------------------------------------
-- 5. ADEUDOS DE PRUEBA
-- -----------------------------------------------------------------------------
INSERT INTO adeudos (id, complex_id, vivienda_id, solicitud_pago_id, monto, estado, fecha_vencimiento) VALUES
('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 1250.00, 'Pendiente', '2026-08-15'),
('d1111111-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-222222222222', 'c1111111-1111-1111-1111-111111111111', 1250.00, 'Pendiente', '2026-08-15');

-- -----------------------------------------------------------------------------
-- 6. PASES DE VISITA DE PRUEBA
-- -----------------------------------------------------------------------------
INSERT INTO pases_visita (id, complex_id, vivienda_id, resident_id, qr_code, nombre_visitante, fecha_nacimiento, fecha_visita, hora_visita, estado) VALUES
('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-222222222222', 'b1000000-0000-0000-0000-000000000005', 'VF-QR-500575', 'Alejandro Morales', '1990-05-12', CURRENT_DATE, '18:00:00', 'Aprobado');

-- -----------------------------------------------------------------------------
-- 7. NOTIFICACIONES DE PRUEBA
-- -----------------------------------------------------------------------------
INSERT INTO notificaciones (id, complex_id, usuario_id, titulo, mensaje, tipo, leida) VALUES
('f1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'b1000000-0000-0000-0000-000000000005', 'Nuevo Pago Disponible', 'Se ha generado el cobro de Mantenimiento Mensual Agosto por $1,250.00', 'Adeudo', false);
