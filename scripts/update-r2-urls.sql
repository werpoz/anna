-- Script para actualizar URLs de R2 en la base de datos
-- Cambia de: https://pub-256cdfd5f62e465eb4fdc3e23d6e96dd.r2.dev
-- A: https://pub-270bbd265a3d458585b7de88ba1de184.r2.dev

BEGIN;

-- 1. Actualizar fotos de perfil en session_contacts
UPDATE session_contacts
SET img_url = REPLACE(
    img_url,
    'https://pub-256cdfd5f62e465eb4fdc3e23d6e96dd.r2.dev',
    'https://pub-270bbd265a3d458585b7de88ba1de184.r2.dev'
)
WHERE img_url LIKE 'https://pub-256cdfd5f62e465eb4fdc3e23d6e96dd.r2.dev%';

-- 2. Actualizar media en session_messages (si existe columna media_url)
-- Nota: Verifica el nombre exacto de la columna
UPDATE session_messages
SET media_url = REPLACE(
    media_url,
    'https://pub-256cdfd5f62e465eb4fdc3e23d6e96dd.r2.dev',
    'https://pub-270bbd265a3d458585b7de88ba1de184.r2.dev'
)
WHERE media_url LIKE 'https://pub-256cdfd5f62e465eb4fdc3e23d6e96dd.r2.dev%';

-- 3. Actualizar media en session_messages_media (tabla separada para media)
UPDATE session_messages_media
SET url = REPLACE(
    url,
    'https://pub-256cdfd5f62e465eb4fdc3e23d6e96dd.r2.dev',
    'https://pub-270bbd265a3d458585b7de88ba1de184.r2.dev'
)
WHERE url LIKE 'https://pub-256cdfd5f62e465eb4fdc3e23d6e96dd.r2.dev%';

-- Mostrar resumen de cambios
SELECT 
    'session_contacts' as tabla,
    COUNT(*) as registros_actualizados
FROM session_contacts
WHERE img_url LIKE 'https://pub-270bbd265a3d458585b7de88ba1de184.r2.dev%'
UNION ALL
SELECT 
    'session_messages' as tabla,
    COUNT(*) as registros_actualizados
FROM session_messages
WHERE media_url LIKE 'https://pub-270bbd265a3d458585b7de88ba1de184.r2.dev%'
UNION ALL
SELECT 
    'session_messages_media' as tabla,
    COUNT(*) as registros_actualizados
FROM session_messages_media
WHERE url LIKE 'https://pub-270bbd265a3d458585b7de88ba1de184.r2.dev%';

-- Si todo se ve bien, commit. Si no, ejecuta: ROLLBACK;
COMMIT;
