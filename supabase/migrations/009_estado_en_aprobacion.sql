-- =============================================================================
-- ISO DMS · 009 · Estado "En aprobación"
-- -----------------------------------------------------------------------------
-- El listado maestro del SGI (Listado_Maestro_Documentos_SGI_ISO.xlsx, hoja
-- "Listas de Control") define cinco estados: Vigente, En Revisión, En
-- Aprobación, Obsoleto y Borrador. Faltaba el intermedio entre revisar y
-- aprobar, que es donde el documento espera la firma de quien lo autoriza.
--
-- Va en su propio archivo a propósito: PostgreSQL no permite usar un valor de
-- enum recién añadido dentro de la misma transacción que lo crea, así que
-- cualquier migración que lo utilice debe ejecutarse después de esta.
-- =============================================================================

alter type public.document_status add value if not exists 'pending_approval' after 'review';
