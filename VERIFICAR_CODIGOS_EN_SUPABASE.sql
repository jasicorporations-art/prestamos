-- Script para verificar códigos de registro en Supabase
-- Ejecuta este script en Supabase SQL Editor para ver qué códigos tienes

-- Ver TODOS los códigos (usados y no usados)
SELECT 
  codigo, 
  usado, 
  usado_por_email, 
  usado_en, 
  creado_en, 
  notas 
FROM codigos_registro 
ORDER BY creado_en DESC;

-- Ver SOLO códigos DISPONIBLES (no usados)
SELECT 
  codigo, 
  creado_en, 
  notas 
FROM codigos_registro 
WHERE usado = FALSE 
ORDER BY creado_en;

-- Ver SOLO códigos USADOS
SELECT 
  codigo, 
  usado_por_email, 
  usado_en, 
  notas 
FROM codigos_registro 
WHERE usado = TRUE 
ORDER BY usado_en DESC;

-- Contar códigos disponibles
SELECT 
  COUNT(*) as total_disponibles,
  (SELECT COUNT(*) FROM codigos_registro WHERE usado = TRUE) as total_usados,
  (SELECT COUNT(*) FROM codigos_registro) as total_codigos
FROM codigos_registro 
WHERE usado = FALSE;

-- Buscar un código específico (reemplaza 'TU-CODIGO-AQUI' con el código que quieres buscar)
-- SELECT * FROM codigos_registro WHERE codigo = 'TU-CODIGO-AQUI';



