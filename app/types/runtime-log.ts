export interface RuntimeLogRow {
  id?: number;
  _id?: string;
  eventId: string;
  occurredAt: string;
  correlationId: string | null;
  instanceId: string | null;
  component: string;
  sourceKind: string | null;
  sourceId: string | null;
  statusCode: number | null;
  code?: string;
  message?: string;
  severity?: string;
  entryCount?: number;
  truncated?: boolean;
  details?: unknown;
  stack?: string;
  entries?: unknown;
}
