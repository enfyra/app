export interface CodeVersionConfirmation {
  tableName: string;
  recordId: string;
  currentVersion: string;
  suggestedVersion: string;
}

export type CodeVersionRead = (path: string, options: { query: { fields: string; limit: number; filter: Record<string, { _eq: string }> } }) => Promise<{ data?: Array<{ version?: unknown }> }>;
export type ConfirmCodeVersion = (input: CodeVersionConfirmation) => Promise<string | null>;

export interface CodeAuditRecord {
  id?: string | number;
  _id?: string;
  tableName: string;
  recordId: string;
  action: 'create' | 'update' | 'delete' | 'revert';
  fromVersion: string | null;
  toVersion: string | null;
  restoredFrom: string | null;
  changedByEmail: string | null;
  changedBySource: string | null;
  createdAt: string;
  previous?: Record<string, unknown> | null;
}

export interface CodeAuditResponse {
  data: CodeAuditRecord[];
  meta?: { filterCount?: number; totalCount?: number };
}
