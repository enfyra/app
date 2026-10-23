import type { DefaultPageMenu } from './default-page';

export interface GlobalSettings {
  [field: string]: unknown;
  projectName?: string | null;
  projectDescription?: string | null;
  projectFavicon?: string | null;
  enfyraVersion?: string;
  defaultPage?: DefaultPageMenu | string | number | null;
}

export interface GlobalStorageConfig {
  id?: string | number;
  _id?: string;
  name: string;
  type: string;
  isEnabled: boolean;
  isDefault: boolean;
}

export interface GlobalAppPackage {
  id?: string | number;
  _id?: string;
  name: string;
  version: string;
  isEnabled: boolean;
  type: 'App';
}

export interface RouteCatalogTable {
  id?: string | number;
  _id?: string;
  name: string;
  isSystem?: boolean;
  alias?: string | null;
  description?: string | null;
  isSingleRecord?: boolean;
}

export interface RouteCatalogEntry {
  id?: string | number;
  _id?: string;
  path: string;
  isEnabled: boolean;
  updatedAt?: string;
  mainTable?: RouteCatalogTable | null;
}

export interface RecordListResponse<T> {
  data: T[];
}
