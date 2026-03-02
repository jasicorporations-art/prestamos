-- Script para compatibilidad SISI: agregar columnas faltantes
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor) del proyecto SISI

BEGIN;

-- 1. actividad_logs: agregar columnas empresa_id, compania_id, app_id
ALTER TABLE actividad_logs ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(255);
ALTER TABLE actividad_logs ADD COLUMN IF NOT EXISTS compania_id VARCHAR(255);
ALTER TABLE actividad_logs ADD COLUMN IF NOT EXISTS app_id TEXT;

-- 2. motores: agregar columna categoria (opcional)
ALTER TABLE motores ADD COLUMN IF NOT EXISTS categoria VARCHAR(255);

COMMIT;
