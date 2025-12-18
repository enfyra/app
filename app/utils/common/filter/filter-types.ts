export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  type?: string;
}

export interface FilterGroup {
  id: string;
  operator: "and" | "or";
  conditions: (FilterCondition | FilterGroup)[];
  relationContext?: string; 
}

export interface FieldOption {
  label: string;
  value: string;
  fieldCategory: "column" | "relation"; 
  fieldType?: string;
  targetTable?: string;
}

export interface FilterProps {
  modelValue: FilterGroup;
  schemas: Record<string, any>;
  tableName: string;
  rootTableName?: string;
  readonly?: boolean;
}