import type { OAuthProvider } from './auth';
import type { GlobalSettings, RecordListResponse } from './global-state';
import type { MenuDefinition } from './menu';

export interface ShellRecordIdentity {
  id?: string | number;
  _id?: string;
}

export interface ShellListResponse<T> extends RecordListResponse<T> {
  meta?: {
    totalCount?: number;
    filterCount?: number;
  };
}

export interface ShellRoleRecord extends ShellRecordIdentity, Record<string, unknown> {
  name: string;
  description?: string | null;
  isSystem?: boolean;
  createdAt?: string;
}

export interface ShellUserRecord extends ShellRecordIdentity, Record<string, unknown> {
  email: string;
  name?: string | null;
  username?: string | null;
  isRootAdmin?: boolean;
  isSystem?: boolean;
  roles?: ShellRoleRecord[];
  createdAt?: string;
}

export interface ShellOAuthAccountRecord extends ShellRecordIdentity, Record<string, unknown> {
  provider: OAuthProvider;
  providerUserId: string;
  user?: Pick<ShellUserRecord, 'id' | '_id' | 'email'> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShellOAuthConfigRecord extends ShellRecordIdentity, Record<string, unknown> {
  provider: OAuthProvider;
  clientId?: string;
  description?: string | null;
  isEnabled: boolean;
  isSystem?: boolean;
}

export interface ShellOriginRecord extends ShellRecordIdentity {
  value: string;
  isEnabled: boolean;
}

export type ShellProfileResponse = RecordListResponse<ShellUserRecord>;
export type ShellSettingsResponse = RecordListResponse<GlobalSettings>;
export type ShellMenuResponse = RecordListResponse<MenuDefinition>;
export type ShellCreatedRecordResponse = RecordListResponse<ShellRecordIdentity>;
