export interface SharedHelperEditorOptions {
  mode: 'create' | 'update';
  id?: string;
}

export interface SharedHelperForm {
  name: string;
  description: string;
  isEnabled: boolean;
  scriptLanguage: 'javascript' | 'typescript';
  sourceCode: string;
}

export interface SharedHelperRecord extends Partial<SharedHelperForm> {
  id?: string | number;
  _id?: string;
  updatedAt?: string;
}

export interface SharedHelperListResponse {
  data: SharedHelperRecord[];
  meta?: { totalCount?: number; filterCount?: number };
}

export interface SharedHelperTestResponse {
  success: boolean;
  result?: unknown;
  logs?: unknown[];
  error?: { code?: string; message?: string; details?: unknown };
}
