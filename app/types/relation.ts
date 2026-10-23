import type { RelationType } from './database';

export type RelationId = string | number;

export type RelationSelectionValue = RelationId | RelationId[] | null;

export interface RelationSelectionMetadata {
  type?: RelationType;
  propertyName?: string;
  targetTableName?: string;
}

export type RelationRecord = Record<string, unknown>;

export interface RelationRecordsResponse {
  data?: RelationRecord[];
  meta?: { filterCount?: number };
}
