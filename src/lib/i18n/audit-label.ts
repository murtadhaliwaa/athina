import { arIq, t, type ArIqKey } from "@/lib/i18n/ar-iq";

export function auditActionLabel(action: string): string {
  const key = `audit.action.${action}` as ArIqKey;
  return key in arIq ? t(key) : action;
}

export function auditEntityLabel(entityType: string): string {
  const key = `audit.entity.${entityType}` as ArIqKey;
  return key in arIq ? t(key) : entityType;
}
