import type { Ref } from 'vue';

export const columnTypes = [
  { label: "UUID", value: "uuid", icon: "ph:key" },
  { label: "ObjectId", value: "ObjectId", icon: "ph:key" },
  { label: "Integer", value: "int", icon: "tabler:123" },
  { label: "Float", value: "float", icon: "mdi:decimal" },
  { label: "Varchar", value: "varchar", icon: "mdi:format-text" },
  { label: "Boolean", value: "boolean", icon: "mdi:toggle-switch" },
  { label: "Date", value: "date", icon: "mdi:calendar" },
  { label: "Text", value: "text", icon: "mdi:file-document-outline" },
  { label: "Rich Text", value: "richtext", icon: "mdi:format-text" },
  { label: "Code", value: "code", icon: "mdi:code-braces-box" },
  { label: "JSON", value: "simple-json", icon: "mdi:code-json" },
  {
    label: "Array Select",
    value: "array-select",
    icon: "mdi:format-list-bulleted",
  },
  { label: "Enum", value: "enum", icon: "lucide:type" },
];

export const relationTypes = [
  {
    label: "One to One",
    value: "one-to-one",
    icon: "ph:link-simple-horizontal",
  },
  { label: "One to Many", value: "one-to-many", icon: "mdi:source-branch" },
  { label: "Many to One", value: "many-to-one", icon: "mdi:source-merge" },
  { label: "Many to Many", value: "many-to-many", icon: "mdi:share-variant" },
];

export type ColumnType = 
  | 'uuid'
  | 'ObjectId'
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
  foreignKeyColumn?: string | null;
  sourceTable?: {
    id: number;
  };
  targetTable?: {
    id: number;
  };
  createdAt?: string;
  updatedAt?: string;
  metadataAccess?: {
    read?: boolean;
    create?: boolean;
    update?: boolean;
  };
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
