-- Generar códigos de registro iniciales
-- Ejecutar este script DESPUÉS de crear la tabla codigos_registro
-- Puedes modificar estos códigos según tus necesidades

-- Insertar códigos de registro iniciales
-- Cada código solo puede usarse una vez
INSERT INTO codigos_registro (codigo, usado, notas) VALUES
  ('JASICORPJOHNRIJO-2024-001', FALSE, 'Código de registro inicial 1'),
  ('JASICORPSAMUELAHIASRIJO-2024-002', FALSE, 'Código de registro inicial 2'),
  ('JASICORP-2024-003GISLEYDIRIJO', FALSE, 'Código de registro inicial 3'),
  ('JASICORP-2024-004IANRIJO', FALSE, 'Código de registro inicial 4'),
  ('JASICORP-2024JOHNWILLIAMSRIJO-005', FALSE, 'Código de registro inicial 5'),
  ('JASICORP-2024SULE-006', FALSE, 'Código de registro inicial 6')
ON CONFLICT (codigo) DO NOTHING; -- No insertar si el código ya existe

-- Para generar más códigos, puedes ejecutar:
-- INSERT INTO codigos_registro (codigo, usado, notas) VALUES
--   ('TU-CODIGO-AQUI', FALSE, 'Descripción del código');

-- Ver códigos disponibles (no usados)
-- SELECT codigo, creado_en, notas FROM codigos_registro WHERE usado = FALSE ORDER BY creado_en;

-- Ver códigos usados
-- SELECT codigo, usado_por_email, usado_en, notas FROM codigos_registro WHERE usado = TRUE ORDER BY usado_en DESC;

