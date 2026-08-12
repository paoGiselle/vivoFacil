import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabaseClient: SupabaseClient | null = null;

  constructor() {
    this.initClient();
  }

  /**
   * Initializes or re-initializes the Supabase client with given or environment credentials.
   */
  public initClient(url?: string, anonKey?: string): SupabaseClient | null {
    const supabaseUrl = url || environment.supabaseUrl;
    const supabaseAnonKey = anonKey || environment.supabaseAnonKey;

    if (supabaseUrl && supabaseAnonKey) {
      try {
        this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
      } catch (err) {
        console.warn('Error al inicializar cliente de Supabase:', err);
      }
    }
    return this.supabaseClient;
  }

  /**
   * Returns the underlying SupabaseClient instance.
   */
  get client(): SupabaseClient {
    if (!this.supabaseClient) {
      throw new Error(
        'El cliente de Supabase no está configurado. Por favor provee SUPABASE_URL y SUPABASE_ANON_KEY.'
      );
    }
    return this.supabaseClient;
  }

  /**
   * Returns whether Supabase credentials are configured.
   */
  get isConfigured(): boolean {
    return !!this.supabaseClient;
  }

  /**
   * Helper to upload a file to Supabase Storage bucket 'comprobantes'
   */
  async uploadComprobante(file: File, pathName: string): Promise<string | null> {
    if (!this.isConfigured) return null;
    const { data, error } = await this.client.storage
      .from('comprobantes')
      .upload(pathName, file, { upsert: true });

    if (error) {
      console.error('Error al subir comprobante a Supabase Storage:', error);
      throw error;
    }

    const { data: publicUrlData } = this.client.storage
      .from('comprobantes')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  /**
   * Helper to upload a profile photo to Supabase Storage bucket 'perfiles'
   */
  async uploadFotoPerfil(file: File, pathName: string): Promise<string | null> {
    if (!this.isConfigured) return null;
    const { data, error } = await this.client.storage
      .from('perfiles')
      .upload(pathName, file, { upsert: true });

    if (error) {
      console.error('Error al subir foto de perfil a Supabase Storage:', error);
      throw error;
    }

    const { data: publicUrlData } = this.client.storage
      .from('perfiles')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  /**
   * Get public URL of a file stored in a bucket
   */
  getPublicUrl(bucket: 'comprobantes' | 'perfiles', filePath: string): string | null {
    if (!this.isConfigured) return null;
    const { data } = this.client.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async crearVivienda(viviendaData: {
    complex_id: string;
    numero_vivienda: string;
    calle_bloque?: string | null;
  }) {
    if (!this.isConfigured) throw new Error('Supabase no está configurado');

    const { data, error } = await this.client
      .from('viviendas')
      .insert({
        complex_id: viviendaData.complex_id,
        numero_vivienda: viviendaData.numero_vivienda,
        calle_bloque: viviendaData.calle_bloque || null
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear vivienda en public.viviendas:', error);
      throw error;
    }

    return data;
  }

  /**
   * Obtiene todos los conjuntos habitacionales
   */
  public async getConjuntos(): Promise<Record<string, unknown>[]> {
    if (!this.isConfigured) return [];
    try {
      const { data, error } = await this.client
        .from('conjuntos_habitacionales')
        .select('*');

      if (error) {
        console.error('Error al obtener conjuntos habitacionales:', error);
        return [];
      }
      return (data as Record<string, unknown>[]) || [];
    } catch (err) {
      console.error('Excepción al obtener conjuntos habitacionales:', err);
      return [];
    }
  }

  /**
   * Obtiene todas las viviendas registradas en Supabase
   */
  public async getAllViviendas(): Promise<Record<string, unknown>[]> {
    if (!this.isConfigured) return [];
    try {
      const { data, error } = await this.client
        .from('viviendas')
        .select('*');

      if (error) {
        console.error('Error al obtener todas las viviendas:', error);
        return [];
      }
      return (data as Record<string, unknown>[]) || [];
    } catch (err) {
      console.error('Excepción al obtener todas las viviendas:', err);
      return [];
    }
  }

  /**
   * Obtiene las viviendas pertenecientes a un conjunto habitacional por su ID
   */
  public async getViviendasByConjunto(conjuntoId: string): Promise<Record<string, unknown>[]> {
    if (!this.isConfigured || !conjuntoId) return [];
    try {
      const { data, error } = await this.client
        .from('viviendas')
        .select('*')
        .eq('complex_id', conjuntoId);

      if (error) {
        console.error('Error al obtener viviendas por conjunto:', error);
        return [];
      }
      return (data as Record<string, unknown>[]) || [];
    } catch (err) {
      console.error('Excepción al obtener viviendas por conjunto:', err);
      return [];
    }
  }

  /**
   * Tests connection to Supabase database by querying 'conjuntos_habitacionales'
   */
  async testConnection() {
    if (!this.isConfigured) {
      console.warn('Supabase no está configurado');
      return null;
    }
    try {
      const { data, error } = await this.client
        .from('conjuntos_habitacionales')
        .select('id, nombre, ciudad')
        .limit(1);

      if (error) {
        console.error('Error al probar conexión con Supabase:', error);
        return null;
      }

      console.log('✅ Conexión exitosa a Supabase (conjuntos_habitacionales):', data);
      return data;
    } catch (err) {
      console.error('Excepción al conectar con Supabase:', err);
      return null;
    }
  }

  // =========================================================================
  // METODOS DE AUTENTICACION (SUPABASE AUTH)
  // =========================================================================

  async signUp(email: string, password: string) {
    if (!this.isConfigured) throw new Error('Supabase no está configurado');
    const cleanEmail = (email || '').trim().toLowerCase();
    console.log(`[Supabase Service] Llamando a auth.signUp() con email normalizado: "${cleanEmail}" (longitud: ${cleanEmail.length})`);
    return await this.client.auth.signUp({ email: cleanEmail, password });
  }

  async signInWithPassword(email: string, password: string) {
    if (!this.isConfigured) throw new Error('Supabase no está configurado');
    return await this.client.auth.signInWithPassword({ email, password });
  }

  async updateAuthPassword(newPassword: string) {
    if (!this.isConfigured) throw new Error('Supabase no está configurado');
    return await this.client.auth.updateUser({ password: newPassword });
  }

  async signOut() {
    if (!this.isConfigured) return;
    return await this.client.auth.signOut();
  }

  async getAuthUser() {
    if (!this.isConfigured) return null;
    const { data } = await this.client.auth.getUser();
    return data.user || null;
  }

  async getSession() {
    if (!this.isConfigured) return null;
    const { data } = await this.client.auth.getSession();
    return data.session || null;
  }

  // =========================================================================
  // METODOS DE USUARIOS Y ROLES (PUBLIC.USUARIOS / PUBLIC.ROLES_USUARIO)
  // =========================================================================

  async crearUsuarioPublico(usuarioData: {
    id?: string;
    complex_id: string;
    vivienda_id?: string | null;
    nombre_completo: string;
    correo: string;
    telefono: string;
    password_hash?: string;
    foto_url?: string | null;
    estado?: string;
  }) {
    if (!this.isConfigured) throw new Error('Supabase no está configurado');

    const insertPayload: Record<string, unknown> = {
      complex_id: usuarioData.complex_id,
      vivienda_id: usuarioData.vivienda_id || null,
      nombre_completo: usuarioData.nombre_completo,
      correo: usuarioData.correo,
      telefono: usuarioData.telefono,
      password_hash: usuarioData.password_hash || '[SUPABASE_AUTH]',
      foto_url: usuarioData.foto_url || null,
      estado: usuarioData.estado || 'Pendiente'
    };

    if (usuarioData.id) {
      insertPayload['id'] = usuarioData.id;
    }

    const { data, error } = await this.client
      .from('usuarios')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear usuario en public.usuarios:', error);
      throw error;
    }

    return data;
  }

  async crearRolUsuario(usuarioId: string, rol: 'Administrador' | 'Residente' | 'Vigilante') {
    if (!this.isConfigured) throw new Error('Supabase no está configurado');

    const { data, error } = await this.client
      .from('roles_usuario')
      .insert({
        usuario_id: usuarioId,
        rol: rol
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear rol de usuario en public.roles_usuario:', error);
      throw error;
    }

    return data;
  }

  async syncUserRoles(usuarioId: string, roles: ('Administrador' | 'Residente' | 'Vigilante')[]) {
    if (!this.isConfigured || !usuarioId) return { success: false, error: 'Supabase no configurado o ID de usuario inválido' };

    try {
      console.log(`[Supabase DB] Sincronizando roles para usuario_id "${usuarioId}":`, roles);

      // 1. Delete existing roles in public.roles_usuario
      const { error: deleteError } = await this.client
        .from('roles_usuario')
        .delete()
        .eq('usuario_id', usuarioId);

      if (deleteError) {
        console.error('Error al eliminar roles anteriores en public.roles_usuario:', deleteError);
        return { success: false, error: deleteError };
      }

      // 2. Insert new roles if array is not empty
      if (roles.length > 0) {
        const rowsToInsert = roles.map(r => ({
          usuario_id: usuarioId,
          rol: r
        }));

        const { error: insertError } = await this.client
          .from('roles_usuario')
          .insert(rowsToInsert);

        if (insertError) {
          console.error('Error al insertar nuevos roles en public.roles_usuario:', insertError);
          return { success: false, error: insertError };
        }
      }

      console.log(`[Supabase DB] Roles sincronizados con éxito en public.roles_usuario para "${usuarioId}"`);
      return { success: true };
    } catch (err) {
      console.error('Excepción en syncUserRoles:', err);
      return { success: false, error: err };
    }
  }

  async getUsuarioByAuthUserId(authUserId: string) {
    if (!this.isConfigured || !authUserId) return null;
    try {
      const { data, error } = await this.client
        .from('usuarios')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (error) {
        console.error('Error al obtener usuario por id (authUserId):', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Excepción al buscar usuario por id (authUserId):', err);
      return null;
    }
  }

  async getUsuarioByEmail(email: string) {
    if (!this.isConfigured || !email) return null;
    try {
      const { data, error } = await this.client
        .from('usuarios')
        .select('*')
        .eq('correo', email)
        .maybeSingle();

      if (error) {
        console.error('Error al obtener usuario por correo:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Excepción al buscar usuario por correo:', err);
      return null;
    }
  }

  async getRolesByUsuarioId(usuarioId: string) {
    if (!this.isConfigured || !usuarioId) return [];
    try {
      const { data, error } = await this.client
        .from('roles_usuario')
        .select('*')
        .eq('usuario_id', usuarioId);

      if (error) {
        console.error('Error al obtener roles por usuario_id:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Excepción al buscar roles por usuario_id:', err);
      return [];
    }
  }

  async updateEstadoUsuario(usuarioId: string, estado: 'Pendiente' | 'Activa' | 'Rechazada' | 'Inactiva') {
    if (!this.isConfigured || !usuarioId) return null;
    try {
      const { data, error } = await this.client
        .from('usuarios')
        .update({ estado })
        .eq('id', usuarioId)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error al actualizar estado de usuario:', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Excepción al actualizar estado de usuario:', err);
      throw err;
    }
  }

  async updateUsuarioDatos(usuarioId: string, datos: { nombre_completo?: string; correo?: string; telefono?: string }) {
    if (!this.isConfigured || !usuarioId) return null;
    try {
      const { data, error } = await this.client
        .from('usuarios')
        .update(datos)
        .eq('id', usuarioId)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error al actualizar datos de usuario en public.usuarios:', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Excepción al actualizar datos de usuario en public.usuarios:', err);
      throw err;
    }
  }

  async linkAuthUser(usuarioId: string, authUserId: string) {
    if (!this.isConfigured || !usuarioId || !authUserId) return null;
    try {
      if (usuarioId === authUserId) {
        return await this.getUsuarioByAuthUserId(authUserId);
      }

      console.warn(`[linkAuthUser] El usuario local id=${usuarioId} difiere de authUserId=${authUserId}. ` +
        `En el esquema actual sin columna auth_user_id, ambos deben coincidir.`);

      const { data, error } = await this.client
        .from('usuarios')
        .select('*')
        .eq('id', usuarioId)
        .maybeSingle();

      if (error) {
        console.error('Error al consultar usuario para vinculación:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Excepción al consultar usuario para vinculación:', err);
      return null;
    }
  }

  // =========================================================================
  // METODOS DE VISITAS Y CODIGOS QR (PUBLIC.PASES_VISITA)
  // =========================================================================

  /**
   * Obtiene todas las visitas pertenecientes a un conjunto habitacional desde public.pases_visita
   */
  async getVisitasByComplex(complexId: string): Promise<Record<string, unknown>[]> {
    if (!this.isConfigured || !complexId) return [];
    try {
      const { data, error } = await this.client
        .from('pases_visita')
        .select('*')
        .eq('complex_id', complexId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al obtener visitas por conjunto en public.pases_visita:', error);
        return [];
      }
      return (data as Record<string, unknown>[]) || [];
    } catch (err) {
      console.error('Excepción al obtener visitas por conjunto en public.pases_visita:', err);
      return [];
    }
  }

  /**
   * Obtiene las visitas creadas por un residente específico desde public.pases_visita
   */
  async getVisitasByResident(residentId: string): Promise<Record<string, unknown>[]> {
    if (!this.isConfigured || !residentId) return [];
    try {
      const { data, error } = await this.client
        .from('pases_visita')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al obtener visitas por residente en public.pases_visita:', error);
        return [];
      }
      return (data as Record<string, unknown>[]) || [];
    } catch (err) {
      console.error('Excepción al obtener visitas por residente en public.pases_visita:', err);
      return [];
    }
  }

  /**
   * Consulta una visita por su código QR o ID desde public.pases_visita
   */
  async getVisitaByQrCode(code: string): Promise<Record<string, unknown> | null> {
    if (!this.isConfigured || !code) return null;
    try {
      const { data, error } = await this.client
        .from('pases_visita')
        .select('*')
        .or(`qr_code.eq.${code},id.eq.${code}`)
        .maybeSingle();

      if (error) {
        console.error('Error al buscar visita por código QR en public.pases_visita:', error);
        return null;
      }
      return data as Record<string, unknown> | null;
    } catch (err) {
      console.error('Excepción al buscar visita por código QR en public.pases_visita:', err);
      return null;
    }
  }

  /**
   * Registra una nueva visita en public.pases_visita
   */
  async crearVisita(visitaData: {
    complex_id: string;
    vivienda_id?: string | null;
    resident_id: string;
    qr_code: string;
    nombre_visitante: string;
    fecha_nacimiento: string;
    fecha_visita: string;
    hora_visita: string;
    estado?: string;
  }): Promise<Record<string, unknown>> {
    if (!this.isConfigured) throw new Error('Supabase no está configurado');

    const insertPayload: Record<string, unknown> = {
      complex_id: visitaData.complex_id,
      vivienda_id: visitaData.vivienda_id || null,
      resident_id: visitaData.resident_id,
      qr_code: visitaData.qr_code,
      nombre_visitante: visitaData.nombre_visitante,
      fecha_nacimiento: visitaData.fecha_nacimiento,
      fecha_visita: visitaData.fecha_visita,
      hora_visita: visitaData.hora_visita,
      estado: visitaData.estado || 'Pendiente'
    };

    const { data, error } = await this.client
      .from('pases_visita')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear visita en public.pases_visita:', error);
      throw error;
    }

    return data as Record<string, unknown>;
  }

  public isValidUuid(val?: string | null): boolean {
    return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  }

  /**
   * Actualiza el estado de una visita en public.pases_visita
   */
  async actualizarEstadoVisita(
    visitaId: string,
    updateData: {
      estado?: string;
      fecha_escaneo?: string | null;
      vigilante_id?: string | null;
      ine_verificada_manual?: boolean;
      decision?: string | null;
      placas_vehiculo?: string | null;
      observaciones?: string | null;
    },
    qrCodeFallback?: string
  ): Promise<Record<string, unknown> | null> {
    if (!this.isConfigured) return null;
    if (!visitaId && !qrCodeFallback) {
      throw new Error('ID de visita o Código QR no proporcionado.');
    }

    try {
      // 1. Diagnóstico previo: obtener usuario autenticado actual en Supabase Auth
      const { data: authUserData } = await this.client.auth.getUser();
      const currentAuthUser = authUserData?.user || null;
      const authUid = currentAuthUser ? currentAuthUser.id : null;

      // 2. Diagnóstico previo: obtener el pase desde public.pases_visita para verificar existencia y complex_id
      let passRow: Record<string, unknown> | null = null;
      let passSelectErr: { code?: string; message?: string } | null = null;

      let passQuery = this.client.from('pases_visita').select('*');
      if (this.isValidUuid(visitaId)) {
        passQuery = passQuery.eq('id', visitaId);
      } else if (qrCodeFallback) {
        passQuery = passQuery.eq('qr_code', qrCodeFallback);
      } else {
        passQuery = passQuery.eq('qr_code', visitaId);
      }

      const { data: passRows, error: pErr } = await passQuery;
      if (pErr) {
        passSelectErr = pErr;
      } else if (passRows && passRows.length > 0) {
        passRow = passRows[0] as Record<string, unknown>;
      } else if (qrCodeFallback && this.isValidUuid(visitaId)) {
        // Intentar fallback por QR si no se encontró por ID
        const { data: retryPassRows, error: rpErr } = await this.client
          .from('pases_visita')
          .select('*')
          .eq('qr_code', qrCodeFallback);
        if (rpErr) {
          passSelectErr = rpErr;
        } else if (retryPassRows && retryPassRows.length > 0) {
          passRow = retryPassRows[0] as Record<string, unknown>;
        }
      }

      // 3. Diagnóstico previo: obtener datos de usuario y roles en Supabase DB
      let vigilanteUserRow: Record<string, unknown> | null = null;
      let vigilanteRoles: string[] = [];
      let vigilanteErr: string | null = null;

      if (authUid) {
        const { data: uData, error: uErr } = await this.client
          .from('usuarios')
          .select('id, complex_id, correo, nombre_completo, estado')
          .eq('id', authUid)
          .maybeSingle();

        if (uErr) {
          vigilanteErr = `Error al consultar public.usuarios: ${uErr.message}`;
        } else {
          vigilanteUserRow = uData as Record<string, unknown> | null;
        }

        const { data: rData, error: rErr } = await this.client
          .from('roles_usuario')
          .select('rol')
          .eq('usuario_id', authUid);

        if (rErr) {
          vigilanteErr = (vigilanteErr ? vigilanteErr + ' | ' : '') + `Error al consultar public.roles_usuario: ${rErr.message}`;
        } else if (rData) {
          vigilanteRoles = rData.map((r: { rol: string }) => r.rol);
        }
      }

      // REGISTRO OBLIGATORIO EN CONSOLA SEGÚN INDICACIONES DE DIAGNÓSTICO:
      console.log('================ [DIAGNÓSTICO UPDATE PASES_VISITA] ================');
      console.log('1. auth.uid() / Usuario Autenticado:', authUid || 'SIN SESIÓN AUTH (NULL)');
      console.log(' - Email auth:', currentAuthUser?.email || 'N/A');
      console.log('2. ID utilizado para actualizar:', visitaId);
      console.log('3. QR utilizado:', qrCodeFallback || 'N/A');
      console.log('4. complex_id del pase en DB:', passRow ? passRow['complex_id'] : 'NO ENCONTRADO EN DB' + (passSelectErr ? ` (${passSelectErr.message})` : ''));
      console.log(' - ID real en DB:', passRow ? passRow['id'] : 'N/A');
      console.log(' - QR real en DB:', passRow ? passRow['qr_code'] : 'N/A');
      console.log(' - Estado actual en DB:', passRow ? passRow['estado'] : 'N/A');
      console.log('5. complex_id del vigilante en public.usuarios:', vigilanteUserRow ? vigilanteUserRow['complex_id'] : 'NO ENCONTRADO EN public.usuarios' + (vigilanteErr ? ` (${vigilanteErr})` : ''));
      console.log(' - Nombre vigilante DB:', vigilanteUserRow ? vigilanteUserRow['nombre_completo'] : 'N/A');
      console.log('6. Rol(es) del vigilante en public.roles_usuario:', vigilanteRoles.length > 0 ? vigilanteRoles.join(', ') : 'SIN ROLES EN DB');
      console.log('===================================================================');

      // 4. Preparar payload de actualización con campos condicionales
      const payload: Record<string, unknown> = {};

      if (updateData.estado !== undefined) {
        payload['estado'] = updateData.estado;
      }
      if (updateData.decision !== undefined) {
        payload['decision'] = updateData.decision;
      }
      if (updateData.fecha_escaneo !== undefined) {
        payload['fecha_escaneo'] = updateData.fecha_escaneo;
      }
      if (updateData.vigilante_id !== undefined && this.isValidUuid(updateData.vigilante_id)) {
        payload['vigilante_id'] = updateData.vigilante_id;
      }
      if (updateData.ine_verificada_manual !== undefined) {
        payload['ine_verificada_manual'] = updateData.ine_verificada_manual;
      }
      if (updateData.observaciones !== undefined) {
        payload['observaciones'] = updateData.observaciones;
      }
      if (typeof updateData.placas_vehiculo === 'string' && updateData.placas_vehiculo.trim() !== '') {
        payload['placas_vehiculo'] = updateData.placas_vehiculo.trim();
      }

      if (Object.keys(payload).length === 0) {
        return null;
      }

      // 5. Ejecutar el UPDATE en public.pases_visita
      let updateQuery = this.client.from('pases_visita').update(payload);
      if (passRow && passRow['id']) {
        updateQuery = updateQuery.eq('id', passRow['id'] as string);
      } else if (this.isValidUuid(visitaId)) {
        updateQuery = updateQuery.eq('id', visitaId);
      } else if (qrCodeFallback) {
        updateQuery = updateQuery.eq('qr_code', qrCodeFallback);
      } else {
        updateQuery = updateQuery.eq('qr_code', visitaId);
      }

      const { data, error } = await updateQuery.select('*');

      // 6. Análisis de resultados del UPDATE
      if (error) {
        console.error('[Supabase Update Error] Error al ejecutar UPDATE en public.pases_visita:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      if (!data || data.length === 0) {
        // Si no devolvió filas, determinar la causa exacta
        let reason = '';
        if (!passRow) {
          reason = `El pase con ID ${visitaId} (QR: ${qrCodeFallback || 'N/A'}) no existe en public.pases_visita.`;
        } else if (!authUid) {
          reason = `No hay sesión activa en Supabase Auth (auth.uid() es NULL). La política RLS requiere un usuario autenticado.`;
        } else if (!vigilanteUserRow) {
          reason = `El usuario autenticado (${authUid}) no tiene registro en public.usuarios.`;
        } else if (passRow['complex_id'] !== vigilanteUserRow['complex_id']) {
          reason = `Conflicto de Conjunto Habitacional: El complex_id del pase (${passRow['complex_id']}) no coincide con el complex_id del vigilante (${vigilanteUserRow['complex_id']}).`;
        } else if (!vigilanteRoles.includes('Vigilante') && !vigilanteRoles.includes('Administrador')) {
          reason = `El usuario autenticado (${authUid}) carece del rol 'Vigilante' o 'Administrador' en public.roles_usuario (roles actuales: ${vigilanteRoles.join(', ') || 'ninguno'}).`;
        } else {
          reason = `La política RLS "Vigilantes y Admins procesan pases" rechazó la actualización en public.pases_visita (0 filas afectadas).`;
        }

        const fullMsg = `UPDATE afectado 0 filas. Motivo: ${reason}`;
        console.error(`[Supabase Update Failed] ${fullMsg}`);
        throw new Error(fullMsg);
      }

      console.log('[Supabase DB] Visita actualizada exitosamente en public.pases_visita:', data[0]);
      return data[0] as Record<string, unknown>;
    } catch (err) {
      const sbErr = err as { code?: string; message?: string; details?: string; hint?: string };
      console.error('Excepción al actualizar visita en public.pases_visita:', {
        code: sbErr?.code,
        message: sbErr?.message || err,
        details: sbErr?.details,
        hint: sbErr?.hint
      });
      throw err;
    }
  }

  /**
   * Registra una nueva solicitud de pago en public.solicitudes_pago
   */
  async crearSolicitudPago(pagoData: {
    complex_id: string;
    creado_por: string;
    titulo: string;
    concepto?: string;
    tipo: string;
    monto: number;
    fecha_limite: string;
  }): Promise<Record<string, unknown>> {
    if (!this.isConfigured) throw new Error('Supabase no está configurado');

    const insertPayload: Record<string, unknown> = {
      complex_id: pagoData.complex_id,
      creado_por: pagoData.creado_por,
      titulo: pagoData.titulo,
      concepto: pagoData.concepto || '',
      tipo: pagoData.tipo,
      monto: pagoData.monto,
      fecha_limite: pagoData.fecha_limite
    };

    const { data, error } = await this.client
      .from('solicitudes_pago')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear solicitud de pago en public.solicitudes_pago:', error);
      throw error;
    }

    return data as Record<string, unknown>;
  }

  /**
   * Obtiene las solicitudes de pago de un conjunto habitacional
   */
  async getSolicitudesPagoByComplex(complexId: string): Promise<Record<string, unknown>[]> {
    if (!this.isConfigured || !complexId) return [];
    try {
      const { data, error } = await this.client
        .from('solicitudes_pago')
        .select('*')
        .eq('complex_id', complexId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al obtener solicitudes de pago:', error);
        return [];
      }
      return (data as Record<string, unknown>[]) || [];
    } catch (err) {
      console.error('Excepción al obtener solicitudes de pago:', err);
      return [];
    }
  }

  /**
   * Busca un adeudo existente por solicitud_pago_id y vivienda_id, o crea uno si no existe.
   */
  async getOrCreateAdeudo(data: {
    complex_id: string;
    vivienda_id: string;
    solicitud_pago_id: string;
    monto: number;
    fecha_vencimiento?: string;
  }): Promise<Record<string, unknown>> {
    if (!this.isConfigured) throw new Error('Supabase no está configurado');

    // 1. Buscar adeudo existente (usamos limit(1) para evitar fallos si ya existen duplicados en la DB)
    const { data: existingRows, error: searchError } = await this.client
      .from('adeudos')
      .select('*')
      .eq('solicitud_pago_id', data.solicitud_pago_id)
      .eq('vivienda_id', data.vivienda_id)
      .limit(1);

    if (searchError) {
      console.error('Error al buscar adeudo existente en public.adeudos:', searchError);
    }

    if (existingRows && existingRows.length > 0) {
      const existing = existingRows[0];
      console.log('[Supabase DB] Adeudo existente encontrado en public.adeudos:', existing['id']);
      return existing as Record<string, unknown>;
    }

    // 2. Si no existe, crear uno nuevo
    const todayStr = new Date().toISOString().split('T')[0];
    const newAdeudoPayload = {
      complex_id: data.complex_id,
      vivienda_id: data.vivienda_id,
      solicitud_pago_id: data.solicitud_pago_id,
      monto: data.monto,
      estado: 'Pendiente',
      fecha_generacion: todayStr,
      fecha_vencimiento: data.fecha_vencimiento || todayStr
    };

    console.log('[Supabase DB] Creando nuevo adeudo en public.adeudos:', newAdeudoPayload);
    try {
      const { data: created, error: createError } = await this.client
        .from('adeudos')
        .insert(newAdeudoPayload)
        .select('*')
        .single();

      if (createError) {
        if (createError.code === '23505') {
          console.warn('[Supabase DB] Conflicto UNIQUE (23505) en insert. Re-consultando adeudo...');
          const { data: retryRows } = await this.client
            .from('adeudos')
            .select('*')
            .eq('solicitud_pago_id', data.solicitud_pago_id)
            .eq('vivienda_id', data.vivienda_id)
            .limit(1);
          if (retryRows && retryRows.length > 0) {
            return retryRows[0] as Record<string, unknown>;
          }
        }
        console.error('Error al crear adeudo en public.adeudos:', createError);
        throw createError;
      }

      return created as Record<string, unknown>;
    } catch (err: unknown) {
      const errCode = (err as Record<string, unknown> | null)?.['code'];
      if (errCode === '23505') {
        const { data: retryRows } = await this.client
          .from('adeudos')
          .select('*')
          .eq('solicitud_pago_id', data.solicitud_pago_id)
          .eq('vivienda_id', data.vivienda_id)
          .limit(1);
        if (retryRows && retryRows.length > 0) {
          return retryRows[0] as Record<string, unknown>;
        }
      }
      throw err;
    }
  }

  /**
   * Registra una sanción en public.sanciones
   */
  async crearSancion(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    if (!this.isConfigured) return null;
    try {
      console.log('[Supabase DB] Creando registro en public.sanciones:', payload);
      const { data, error } = await this.client
        .from('sanciones')
        .insert(payload)
        .select('*')
        .maybeSingle();

      if (error) {
        console.warn('Error al insertar en public.sanciones:', error);
      }
      return data as Record<string, unknown> | null;
    } catch (err) {
      console.warn('Excepción al crear sanción en Supabase:', err);
      return null;
    }
  }

  /**
   * Registra un nuevo comprobante de pago en public.comprobantes_pago
   */
  async crearComprobantePago(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.isConfigured) throw new Error('Supabase no está configurado');

    console.log('[Supabase DB] Insertando comprobante de pago en public.comprobantes_pago...', payload);
    const { data, error } = await this.client
      .from('comprobantes_pago')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Error al insertar comprobante de pago en public.comprobantes_pago:', error);
      throw error;
    }

    return data as Record<string, unknown>;
  }

  /**
   * Obtiene los comprobantes de pago de un conjunto habitacional
   */
  async getComprobantesByComplex(complexId: string): Promise<Record<string, unknown>[]> {
    if (!this.isConfigured || !complexId) return [];
    try {
      const { data, error } = await this.client
        .from('comprobantes_pago')
        .select('*')
        .eq('complex_id', complexId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al obtener comprobantes de pago:', error);
        return [];
      }
      return (data as Record<string, unknown>[]) || [];
    } catch (err) {
      console.error('Excepción al obtener comprobantes de pago:', err);
      return [];
    }
  }

  /**
   * Obtiene los adeudos de un conjunto habitacional
   */
  async getAdeudosByComplex(complexId: string): Promise<Record<string, unknown>[]> {
    if (!this.isConfigured || !complexId) return [];
    try {
      const { data, error } = await this.client
        .from('adeudos')
        .select('*')
        .eq('complex_id', complexId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al obtener adeudos:', error);
        return [];
      }
      return (data as Record<string, unknown>[]) || [];
    } catch (err) {
      console.error('Excepción al obtener adeudos:', err);
      return [];
    }
  }

  /**
   * Actualiza el estado de un comprobante de pago en public.comprobantes_pago
   */
  async updateComprobanteEstado(comprobanteId: string, estado: 'Aprobado' | 'Rechazado' | string): Promise<void> {
    if (!this.isConfigured || !comprobanteId) return;
    console.log(`[Supabase DB] Actualizando estado de comprobante_pago ${comprobanteId} a ${estado}...`);
    const { error } = await this.client
      .from('comprobantes_pago')
      .update({ estado })
      .eq('id', comprobanteId);

    if (error) {
      console.error(`Error al actualizar estado del comprobante ${comprobanteId} en Supabase:`, error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de un adeudo en public.adeudos
   */
  async updateAdeudoEstado(adeudoId: string, estado: string): Promise<void> {
    if (!this.isConfigured || !adeudoId) return;
    console.log(`[Supabase DB] Actualizando estado de adeudo ${adeudoId} a ${estado}...`);
    const { error } = await this.client
      .from('adeudos')
      .update({ estado })
      .eq('id', adeudoId);

    if (error) {
      console.error(`Error al actualizar estado del adeudo ${adeudoId} en Supabase:`, error);
      throw error;
    }
  }
}
