-- =============================================================================
-- CONFIGURACIÓN DE SUPABASE STORAGE PARA VIVOFÁCIL
-- Script 03: Creación de Buckets 'comprobantes' y 'perfiles' y sus Políticas RLS
-- =============================================================================

-- 1. Crear buckets públicos en storage.buckets si no existen
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('perfiles', 'perfiles', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Seguridad RLS para Bucket 'comprobantes'
CREATE POLICY "Acceso público lectura comprobantes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'comprobantes');

CREATE POLICY "Subida pública comprobantes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'comprobantes');

CREATE POLICY "Actualización pública comprobantes"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'comprobantes');

CREATE POLICY "Eliminación pública comprobantes"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'comprobantes');

-- 3. Políticas de Seguridad RLS para Bucket 'perfiles'
CREATE POLICY "Acceso público lectura perfiles"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'perfiles');

CREATE POLICY "Subida pública perfiles"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'perfiles');

CREATE POLICY "Actualización pública perfiles"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'perfiles');

CREATE POLICY "Eliminación pública perfiles"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'perfiles');
