-- =============================================================================
-- RPC: aprobar_pago_pendiente_verificacion
-- Transacción atómica: inserta pago, actualiza saldo de venta, marca notificación
-- y registra actividad_logs.
--
-- • ventas / notificación: SQL estático (mismo criterio que antes) → saldo y locks fiables.
-- • pagos: si no existe columna `empresa_id`, se usa `compania_id` / `id_empresa` según
--   information_schema (solo tabla pagos).
--
-- Ejecutar TODO el script en Supabase → SQL Editor.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.aprobar_pago_pendiente_verificacion(
  p_notificacion_id uuid,
  p_id_empresa uuid,
  p_user_id uuid,
  p_sucursal_id uuid,
  p_usuario_nombre text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notif record;
  v_venta record;
  v_monto numeric(12, 2);
  v_id_prestamo uuid;
  v_num_cuota int;
  v_max_cuota int;
  v_tiene_cuotas_det boolean;
  v_pago_id uuid;
  v_detalle text;
  v_rows int;
  v_notif_ok boolean := false;

  p_has_empresa_id boolean;
  p_has_compania_id boolean;
  p_has_id_empresa boolean;

  cond_p text;
  sql_text text;
  est_norm text;
BEGIN
  IF p_notificacion_id IS NULL OR p_id_empresa IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Parámetros inválidos'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'pagos' AND c.column_name = 'empresa_id'
  ) INTO p_has_empresa_id;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'pagos' AND c.column_name = 'compania_id'
  ) INTO p_has_compania_id;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'pagos' AND c.column_name = 'id_empresa'
  ) INTO p_has_id_empresa;

  -- 1) Bloquear notificación (estático; compañía espejo si existe la columna)
  BEGIN
    SELECT *
    INTO v_notif
    FROM public.pagos_pendientes_verificacion
    WHERE id = p_notificacion_id
      AND (
        id_empresa = p_id_empresa
        OR empresa_id = p_id_empresa
        OR (
          compania_id IS NOT NULL
          AND compania_id::text = p_id_empresa::text
        )
      )
    FOR UPDATE;
  EXCEPTION
    WHEN undefined_column THEN
      BEGIN
        SELECT *
        INTO v_notif
        FROM public.pagos_pendientes_verificacion
        WHERE id = p_notificacion_id
          AND (
            id_empresa = p_id_empresa
            OR empresa_id = p_id_empresa
          )
        FOR UPDATE;
      EXCEPTION
        WHEN undefined_column THEN
          SELECT *
          INTO v_notif
          FROM public.pagos_pendientes_verificacion
          WHERE id = p_notificacion_id
            AND id_empresa = p_id_empresa
          FOR UPDATE;
      END;
  END;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Notificación no encontrada'
    );
  END IF;

  -- Solo "Verificado" = idempotente. Cualquier otro estado distinto de pendiente/en revisión
  -- debe seguir intentando crear el pago (evita omitir INSERT por texto de estado distinto).
  DECLARE
    est_norm text := lower(trim(coalesce(v_notif.estado, '')));
  BEGIN
    IF est_norm = 'verificado' THEN
      RETURN jsonb_build_object(
        'ok', true,
        'alreadyProcessed', true,
        'estado', v_notif.estado
      );
    END IF;
    IF est_norm = 'rechazado' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'La notificación ya fue rechazada'
      );
    END IF;
  END;

  v_monto := v_notif.monto;
  -- id_prestamo canónico o columna legacy prestamo_id (sin depender del nombre en el RECORD)
  v_id_prestamo := COALESCE(
    (
      CASE
        WHEN (to_jsonb(v_notif) ? 'id_prestamo')
          AND btrim(to_jsonb(v_notif)->>'id_prestamo') <> ''
        THEN (btrim(to_jsonb(v_notif)->>'id_prestamo'))::uuid
        ELSE NULL::uuid
      END
    ),
    (
      CASE
        WHEN (to_jsonb(v_notif) ? 'prestamo_id')
          AND btrim(to_jsonb(v_notif)->>'prestamo_id') <> ''
        THEN (btrim(to_jsonb(v_notif)->>'prestamo_id'))::uuid
        ELSE NULL::uuid
      END
    )
  );

  IF v_monto IS NULL OR v_monto <= 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Monto inválido'
    );
  END IF;

  IF v_id_prestamo IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Notificación sin préstamo asociado (id_prestamo)'
    );
  END IF;

  -- 2) Venta + bloqueo (igual que versión estable anterior)
  BEGIN
    SELECT v.id, v.cantidad_cuotas, v.saldo_pendiente
    INTO v_venta
    FROM public.ventas v
    WHERE v.id = v_id_prestamo
      AND (
        v.empresa_id = p_id_empresa
        OR (
          v.compania_id IS NOT NULL
          AND v.compania_id::text = p_id_empresa::text
        )
      )
    FOR UPDATE;
  EXCEPTION
    WHEN undefined_column THEN
      SELECT v.id, v.cantidad_cuotas, v.saldo_pendiente
      INTO v_venta
      FROM public.ventas v
      WHERE v.id = v_id_prestamo
        AND v.empresa_id = p_id_empresa
      FOR UPDATE;
  END;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Préstamo no encontrado'
    );
  END IF;

  -- Filtro tenant en subconsultas sobre `pagos` (solo aquí importa si falta empresa_id)
  cond_p := '(';
  IF p_has_empresa_id THEN
    cond_p := cond_p || 'p.empresa_id = $1::uuid OR ';
  END IF;
  IF p_has_compania_id THEN
    cond_p := cond_p || '(p.compania_id IS NOT NULL AND p.compania_id::text = $1::text) OR ';
  END IF;
  IF p_has_id_empresa THEN
    cond_p := cond_p || 'p.id_empresa = $1::uuid OR ';
  END IF;
  IF cond_p = '(' THEN
    cond_p := '(true)';
  ELSE
    cond_p := rtrim(cond_p, ' OR ');
    cond_p := cond_p || ')';
  END IF;

  v_num_cuota := NULL;

  IF COALESCE(v_venta.saldo_pendiente, 0) > 0 THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.cuotas_detalladas cd
      WHERE cd.venta_id = v_id_prestamo
        AND cd.numero_cuota > 0
    )
    INTO v_tiene_cuotas_det;

    IF v_tiene_cuotas_det THEN
      sql_text := format(
        'SELECT cd.numero_cuota
         FROM public.cuotas_detalladas cd
         WHERE cd.venta_id = $2
           AND cd.numero_cuota > 0
           AND NOT EXISTS (
             SELECT 1 FROM public.pagos p
             WHERE p.venta_id = $2
               AND p.numero_cuota = cd.numero_cuota
               AND p.numero_cuota > 0
               AND %s
           )
         ORDER BY cd.numero_cuota ASC
         LIMIT 1',
        cond_p
      );
      EXECUTE sql_text INTO v_num_cuota USING p_id_empresa, v_id_prestamo;
    ELSE
      sql_text := format(
        'SELECT COALESCE(MAX(p.numero_cuota), 0)
         FROM public.pagos p
         WHERE p.venta_id = $2
           AND p.numero_cuota > 0
           AND %s',
        cond_p
      );
      EXECUTE sql_text INTO v_max_cuota USING p_id_empresa, v_id_prestamo;

      v_num_cuota := v_max_cuota + 1;

      IF COALESCE(v_venta.cantidad_cuotas, 0) > 0 THEN
        v_num_cuota := LEAST(v_num_cuota, v_venta.cantidad_cuotas);
      END IF;
    END IF;
  END IF;

  -- 3) Insertar pago (si existen empresa_id y compania_id en la tabla, rellenar ambos con el tenant)
  BEGIN
    IF p_has_empresa_id AND p_has_compania_id THEN
      INSERT INTO public.pagos (
        empresa_id,
        compania_id,
        venta_id,
        monto,
        numero_cuota,
        fecha_pago,
        fecha_hora,
        sucursal_id,
        sucursal_donde_se_cobro,
        usuario_que_cobro
      )
      VALUES (
        p_id_empresa,
        p_id_empresa,
        v_id_prestamo,
        v_monto,
        v_num_cuota,
        now(),
        now(),
        p_sucursal_id,
        p_sucursal_id,
        p_user_id
      )
      RETURNING id INTO v_pago_id;
    ELSIF p_has_empresa_id THEN
      INSERT INTO public.pagos (
        empresa_id,
        venta_id,
        monto,
        numero_cuota,
        fecha_pago,
        fecha_hora,
        sucursal_id,
        sucursal_donde_se_cobro,
        usuario_que_cobro
      )
      VALUES (
        p_id_empresa,
        v_id_prestamo,
        v_monto,
        v_num_cuota,
        now(),
        now(),
        p_sucursal_id,
        p_sucursal_id,
        p_user_id
      )
      RETURNING id INTO v_pago_id;
    ELSIF p_has_compania_id THEN
      INSERT INTO public.pagos (
        compania_id,
        venta_id,
        monto,
        numero_cuota,
        fecha_pago,
        fecha_hora,
        sucursal_id,
        sucursal_donde_se_cobro,
        usuario_que_cobro
      )
      VALUES (
        p_id_empresa,
        v_id_prestamo,
        v_monto,
        v_num_cuota,
        now(),
        now(),
        p_sucursal_id,
        p_sucursal_id,
        p_user_id
      )
      RETURNING id INTO v_pago_id;
    ELSIF p_has_id_empresa THEN
      INSERT INTO public.pagos (
        id_empresa,
        venta_id,
        monto,
        numero_cuota,
        fecha_pago,
        fecha_hora,
        sucursal_id,
        sucursal_donde_se_cobro,
        usuario_que_cobro
      )
      VALUES (
        p_id_empresa,
        v_id_prestamo,
        v_monto,
        v_num_cuota,
        now(),
        now(),
        p_sucursal_id,
        p_sucursal_id,
        p_user_id
      )
      RETURNING id INTO v_pago_id;
    ELSE
      INSERT INTO public.pagos (
        venta_id,
        monto,
        numero_cuota,
        fecha_pago,
        fecha_hora,
        sucursal_id,
        sucursal_donde_se_cobro,
        usuario_que_cobro
      )
      VALUES (
        v_id_prestamo,
        v_monto,
        v_num_cuota,
        now(),
        now(),
        p_sucursal_id,
        p_sucursal_id,
        p_user_id
      )
      RETURNING id INTO v_pago_id;
    END IF;
  EXCEPTION
    WHEN undefined_column THEN
      BEGIN
        IF p_has_empresa_id AND p_has_compania_id THEN
          INSERT INTO public.pagos (
            empresa_id,
            compania_id,
            venta_id,
            monto,
            numero_cuota,
            fecha_pago
          )
          VALUES (
            p_id_empresa,
            p_id_empresa,
            v_id_prestamo,
            v_monto,
            v_num_cuota,
            now()
          )
          RETURNING id INTO v_pago_id;
        ELSIF p_has_empresa_id THEN
          INSERT INTO public.pagos (
            empresa_id,
            venta_id,
            monto,
            numero_cuota,
            fecha_pago
          )
          VALUES (
            p_id_empresa,
            v_id_prestamo,
            v_monto,
            v_num_cuota,
            now()
          )
          RETURNING id INTO v_pago_id;
        ELSIF p_has_compania_id THEN
          INSERT INTO public.pagos (
            compania_id,
            venta_id,
            monto,
            numero_cuota,
            fecha_pago
          )
          VALUES (
            p_id_empresa,
            v_id_prestamo,
            v_monto,
            v_num_cuota,
            now()
          )
          RETURNING id INTO v_pago_id;
        ELSIF p_has_id_empresa THEN
          INSERT INTO public.pagos (
            id_empresa,
            venta_id,
            monto,
            numero_cuota,
            fecha_pago
          )
          VALUES (
            p_id_empresa,
            v_id_prestamo,
            v_monto,
            v_num_cuota,
            now()
          )
          RETURNING id INTO v_pago_id;
        ELSE
          INSERT INTO public.pagos (
            venta_id,
            monto,
            numero_cuota,
            fecha_pago
          )
          VALUES (
            v_id_prestamo,
            v_monto,
            v_num_cuota,
            now()
          )
          RETURNING id INTO v_pago_id;
        END IF;
      END;
  END;

  IF v_pago_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'No se creó el pago: la tabla pagos no devolvió id (revise NOT NULL, triggers y columnas)'
    );
  END IF;

  -- 4) Reducir saldo del préstamo (misma condición que el SELECT de venta — sin EXECUTE)
  BEGIN
    UPDATE public.ventas v
    SET saldo_pendiente = GREATEST(0, COALESCE(v.saldo_pendiente, 0) - v_monto)
    WHERE v.id = v_id_prestamo
      AND (
        v.empresa_id = p_id_empresa
        OR (
          v.compania_id IS NOT NULL
          AND v.compania_id::text = p_id_empresa::text
        )
      );
  EXCEPTION
    WHEN undefined_column THEN
      UPDATE public.ventas v
      SET saldo_pendiente = GREATEST(0, COALESCE(v.saldo_pendiente, 0) - v_monto)
      WHERE v.id = v_id_prestamo
        AND v.empresa_id = p_id_empresa;
  END;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'No se pudo actualizar saldo del préstamo';
  END IF;

  -- 5) Marcar notificación como Verificado.
  --    Cada bloque captura undefined_column (42703) Y check_violation (23514).
  --    La regla es: siempre incluir aprobado_por_user_id cuando el constraint lo exige.
  --    Si la columna no existe → undefined_column → fallback sin ella.

  -- Intento A: todas las columnas + WHERE multi-tenant
  BEGIN
    UPDATE public.pagos_pendientes_verificacion n
    SET
      estado               = 'Verificado',
      aprobado_por_user_id = p_user_id,
      motivo_rechazo       = NULL,
      updated_at           = now()
    WHERE n.id = p_notificacion_id
      AND (
        n.id_empresa = p_id_empresa
        OR n.empresa_id = p_id_empresa
        OR (n.compania_id IS NOT NULL AND n.compania_id::text = p_id_empresa::text)
      );
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 1 THEN v_notif_ok := true; END IF;
  EXCEPTION
    WHEN undefined_column OR check_violation THEN
      v_notif_ok := false;
  END;

  -- Intento B: solo id_empresa (canónica) + aprobado_por_user_id
  IF NOT v_notif_ok THEN
    BEGIN
      UPDATE public.pagos_pendientes_verificacion n
      SET
        estado               = 'Verificado',
        aprobado_por_user_id = p_user_id,
        motivo_rechazo       = NULL
      WHERE n.id = p_notificacion_id
        AND n.id_empresa = p_id_empresa;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows = 1 THEN v_notif_ok := true; END IF;
    EXCEPTION
      WHEN undefined_column OR check_violation THEN
        v_notif_ok := false;
    END;
  END IF;

  -- Intento C: sin aprobado_por_user_id (para tablas que no tienen esa columna
  --            y cuyo constraint no la exige)
  IF NOT v_notif_ok THEN
    BEGIN
      UPDATE public.pagos_pendientes_verificacion n
      SET
        estado         = 'Verificado',
        motivo_rechazo = NULL
      WHERE n.id = p_notificacion_id
        AND n.id_empresa = p_id_empresa;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows = 1 THEN v_notif_ok := true; END IF;
    EXCEPTION
      WHEN undefined_column OR check_violation THEN
        v_notif_ok := false;
    END;
  END IF;

  IF NOT v_notif_ok THEN
    RAISE EXCEPTION 'No se pudo actualizar la notificación (id: %, empresa: %)',
      p_notificacion_id, p_id_empresa;
  END IF;

  v_detalle := format(
    'Notificación %s aprobada. Pago %s creado%s.',
    p_notificacion_id,
    v_pago_id,
    CASE
      WHEN v_num_cuota IS NOT NULL THEN format(' (cuota %s)', v_num_cuota)
      ELSE ''
    END
  );

  -- Log opcional: no debe revertir pago + saldo si falla el esquema de la tabla
  BEGIN
    INSERT INTO public.actividad_logs (
      empresa_id,
      usuario_id,
      accion,
      detalle,
      entidad_tipo,
      entidad_id,
      usuario_nombre,
      fecha_hora
    )
    VALUES (
      p_id_empresa,
      p_user_id,
      'Aprobó pago por verificar',
      v_detalle,
      'pagos_pendientes_verificacion',
      p_notificacion_id,
      NULLIF(trim(p_usuario_nombre), ''),
      now()
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'pago_id', v_pago_id,
    'numero_cuota', v_num_cuota,
    'estado', 'Verificado'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.aprobar_pago_pendiente_verificacion IS
'Aprueba notificación portal: pago + saldo venta + verificado. Pagos sin empresa_id usan compania_id/id_empresa.';

GRANT EXECUTE ON FUNCTION public.aprobar_pago_pendiente_verificacion(
  uuid, uuid, uuid, uuid, text
) TO service_role;
