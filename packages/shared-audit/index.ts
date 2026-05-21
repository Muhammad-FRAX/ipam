export interface AuditEntry {
  action: string;
  entity?: string;
  entityId?: string;
  userId: string | null;
  details?: Record<string, unknown>;
}

export async function logAudit(dataSource: any, entry: AuditEntry): Promise<void> {
  try {
    await dataSource.query(
      `INSERT INTO audit_logs (action, entity, entity_id, user_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.action,
        entry.entity ?? null,
        entry.entityId ?? null,
        entry.userId ?? null,
        JSON.stringify(entry.details ?? {}),
      ],
    );
  } catch (err) {
    console.error('[shared-audit] Failed to write audit log:', err);
  }
}
