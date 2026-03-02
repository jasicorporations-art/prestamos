-- =====================================================
-- Verificar y asignar empresa en perfiles (sin usar compania_id)
-- Si tu tabla perfiles NO tiene columna compania_id, usa este script.
-- =====================================================

-- 1) Ver perfiles y su empresa (reemplaza UUID_DEL_USUARIO si quieres filtrar)
SELECT p.id, p.user_id, p.nombre_completo, p.empresa_id, e.nombre AS empresa_nombre
FROM perfiles p
LEFT JOIN empresas e ON e.id = p.empresa_id
ORDER BY p.created_at DESC;

-- 2) Asignar empresa a un perfil que la tenga NULL (reemplaza los valores)
-- UPDATE perfiles
-- SET empresa_id = (SELECT id FROM empresas WHERE nombre = 'Nombre de tu empresa' LIMIT 1)
-- WHERE user_id = 'UUID_DEL_USUARIO';
