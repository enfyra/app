import type { Ref } from 'vue';

// Các type cơ bản cho column
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

// Các type relation
export type RelationType = 
  | 'one-to-one' 
  | 'one-to-many' 
  | 'many-to-one' 
  | 'many-to-many';

// Column từ API response
export interface TableColumnResponse {
  id?: number;  // optional vì virtual column không có id
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
  isVirtual?: boolean;  // thêm field này cho createdAt, updatedAt virtual
  options?: any;
  placeholder?: string | null;
  table?: {
    id: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Relation từ API response
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

// Table response từ API
export interface TableApiResponse {
  id: number;
  name: string;
  alias?: string | null;
  description?: string | null;
  isSystem?: boolean;
  indexes?: any[] | null;
  uniques?: any[][] | null;  // mảng của mảng string (composite unique)
  columns?: TableColumnResponse[];
  relations?: TableRelationResponse[];
  createdAt?: string;
  updatedAt?: string;
}

// Response wrapper từ API
export interface ApiTableListResponse {
  data: TableApiResponse[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// ===== Types sau khi convert =====

// Field trong definition (có thể là column hoặc relation)
export interface TableDefinitionField {
  // Common fields
  name?: string;
  label?: string;
  fieldType: 'column' | 'relation';
  
  // Column fields (optional)
  id?: number;
  type?: ColumnType | RelationType;  // có thể là column type hoặc relation type
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
  
  // Relation fields (optional)
  propertyName?: string;
  inversePropertyName?: string | null;
  relationType?: RelationType;
  sourceTable?: {
    id: number;
  };
  targetTable?: {
    id: number;
  };
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// Schema sau khi convert (lưu trong state)
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
  [key: string]: any;  // cho phép thêm field khác
}

// Collection của tất cả schemas
export type SchemaCollection = Record<string, TableSchema>;

// ===== Types cho form và validation =====

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