import type { TableApiResponse, TableColumnResponse, TableRelationResponse } from './database';

export interface FormApiIdentity {
  id?: string | number;
  _id?: string | number;
}

export interface FormApiListResponse<T> {
  data?: T[];
  meta?: {
    totalCount?: number;
    filterCount?: number;
  };
}

export interface FormRoleRecord extends FormApiIdentity {
  name?: string | null;
}

export interface FormUserRecord extends FormRoleRecord {
  email?: string | null;
}

export interface FormMethodRecord extends FormApiIdentity {
  name?: string;
  buttonColor?: string | null;
  textColor?: string | null;
  isSystem?: boolean;
}

export interface FormRouteRecord extends FormApiIdentity {
  path?: string;
  description?: string | null;
  icon?: string | null;
  isEnabled?: boolean;
  isSystem?: boolean;
  mainTable?: (FormApiIdentity & { name?: string }) | null;
  availableMethods?: FormMethodRecord[];
}

export interface FormPermissionRecord extends FormApiIdentity, Record<string, unknown> {
  description?: string | null;
  isEnabled?: boolean;
  role?: FormRoleRecord | null;
  allowedUsers?: FormUserRecord[];
  routeMethodConfigs?: Array<FormApiIdentity & {
    available?: boolean;
    method?: { name?: string } | string | null;
  }>;
}

export type FormGraphqlOperationName = 'QUERY' | 'CREATE' | 'UPDATE' | 'DELETE';

export interface FormGraphqlOperationRecord extends FormApiIdentity {
  name: FormGraphqlOperationName;
  label: string;
  description?: string | null;
  order?: number;
}

export interface FormGraphqlPermissionRecord extends FormApiIdentity {
  description?: string | null;
  isEnabled?: boolean;
  role?: FormRoleRecord | null;
  allowedUsers?: FormUserRecord[];
  operations?: Array<FormApiIdentity & { name?: FormGraphqlOperationName }>;
}

export interface FormGraphqlConfigRecord extends FormApiIdentity {
  isEnabled?: boolean;
  description?: string | null;
  publicOperations?: Array<FormApiIdentity & { name?: FormGraphqlOperationName }>;
  permissions?: FormGraphqlPermissionRecord[];
}

export interface FormCollectionRecord extends Omit<TableApiResponse, 'id' | 'columns' | 'relations' | 'indexes' | 'uniques'>, FormApiIdentity {
  isSingleRecord?: boolean;
  validateBody?: boolean;
  indexes?: string[][] | null;
  uniques?: string[][] | null;
  columns?: Array<Omit<TableColumnResponse, 'id'> & FormApiIdentity>;
  relations?: Array<Omit<TableRelationResponse, 'id' | 'sourceTable' | 'targetTable'> & FormApiIdentity & {
    sourceTable?: FormApiIdentity & { name?: string };
    targetTable?: FormApiIdentity & { name?: string };
  }>;
}

export interface FormCollectionListRecord extends FormApiIdentity {
  name?: string;
  description?: string | null;
  isSystem?: boolean;
  createdAt?: string;
  columns?: FormApiIdentity[];
  relations?: FormApiIdentity[];
}

export interface FormSchemaMutationResponse {
  data?: unknown[];
  message?: string;
  statusCode?: number;
}
