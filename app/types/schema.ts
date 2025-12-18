import type { Ref } from 'vue';

export type ColumnType = 
  | 'uuid'
  | 'varchar'
  | 'text'
  | 'int'
  | 'bigint'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'array'
  | 'array-select'
  | 'simple-json'
  | 'richtext'
  | 'code'
  | 'number'
  | 'timestamp';

export type RelationType = 
  | 'one-to-one' 
  | 'one-to-many' 
  | 'many-to-one' 
  | 'many-to-many';

export interface TableColumnResponse {
  id?: number;  
  name: string;
  type: ColumnType;
  defaultValue?: any;
  description?: string | null;
  isGenerated?: boolean;
  isHidden?: boolean;
  isNullable?: boolean;
  isPrimary?: boolean;
  isSystem?: boolean;
  isUpdatable?: boolean;
  isVirtual?: boolean;  
  options?: any;
  placeholder?: string | null;
  table?: {
    id: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface TableRelationResponse {
  id: number;
  propertyName: string;
  inversePropertyName?: string | null;
  type: RelationType;
  description?: string | null;
  isNullable?: boolean;
  isSystem?: boolean;
  sourceTable: {
    id: number;
  };
  targetTable: {
    id: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface TableApiResponse {
  id: number;
  name: string;
  alias?: string | null;
  description?: string | null;
  isSystem?: boolean;
  indexes?: any[] | null;
  uniques?: any[][] | null;  
  columns?: TableColumnResponse[];
  relations?: TableRelationResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiTableListResponse {
  data: TableApiResponse[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface TableDefinitionField {
  
  name?: string;
  label?: string;
  fieldType: 'column' | 'relation';

  id?: number;
  type?: ColumnType | RelationType;  
  defaultValue?: any;
  description?: string | null;
  isGenerated?: boolean;
  isHidden?: boolean;
  isNullable?: boolean;
  isPrimary?: boolean;
  isSystem?: boolean;
  isUpdatable?: boolean;
  isVirtual?: boolean;
  options?: any;
  placeholder?: string | null;
  table?: {
    id: number;
  };

  propertyName?: string;
  inversePropertyName?: string | null;
  relationType?: RelationType;
  sourceTable?: {
    id: number;
  };
  targetTable?: {
    id: number;
  };

  createdAt?: string;
  updatedAt?: string;
}

export interface TableSchema {
  id: number;
  name: string;
  alias?: string | null;
  description?: string | null;
  isSystem?: boolean;
  indexes?: any[] | null;
  uniques?: any[][] | null;
  definition: TableDefinitionField[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;  
}

export type SchemaCollection = Record<string, TableSchema>;

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FormChangesState {
  originalData: Readonly<Ref<Record<string, any>>>;
  update: (newData: Record<string, any>) => void;
  checkChanges: (currentData: Record<string, any>) => boolean;
  discardChanges: (currentData: Record<string, any>) => Record<string, any>;
}