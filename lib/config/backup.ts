/**
 * appId fijo dentro del JSON exportado/restaurado (backup de cartera).
 * No usar getAppId() del producto aquí: evita rechazar restores por mismatch "electro" vs otro.
 */
export const BACKUP_JSON_APP_ID = 'admin-backup'
