import type { TableDefinitionField } from '../../app/types/database';
import type {
  FieldPermissionCondition,
  FieldPermissionConditionParseResult,
  FieldPermissionConditionValidationResult,
} from '../../app/types/field-permission-condition';
import type { RelationSelectionValue } from '../../app/types/relation';
import type { FormEditorActions, FormEditorLazyActions } from '../../app/types/form-validation';
import { applyFieldPositions, sortDefinitionFieldsByKey } from '../../app/utils/form/field-order';

type Assert<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Assignable<T, U> = [T] extends [U] ? true : false;

type ColumnField = Extract<TableDefinitionField, { fieldType: 'column' }>;
type RelationField = Extract<TableDefinitionField, { fieldType: 'relation' }>;
type ExtendedColumn = ColumnField & { rank: number; draft: { source: 'virtual' } };

type ColumnCannotUseRelationType = Assert<Equal<
  Assignable<{ fieldType: 'column'; type: 'many-to-many' }, TableDefinitionField>, false
>>;
type RelationCannotUseColumnType = Assert<Equal<
  Assignable<{ fieldType: 'relation'; type: 'varchar' }, TableDefinitionField>, false
>>;
type RelationTypeIsNarrowed = Assert<Equal<RelationField['type'], 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many' | undefined>>;
type PositionKeepsCustomFields = Assert<Equal<ReturnType<typeof applyFieldPositions<ExtendedColumn>>, ExtendedColumn[]>>;
type SortKeepsCustomFields = Assert<Equal<ReturnType<typeof sortDefinitionFieldsByKey<ExtendedColumn>>, ExtendedColumn[]>>;
type HydratedRecordsCannotBeSelectionOutput = Assert<Equal<Assignable<{ id: string; title: string }, RelationSelectionValue>, false>>;
type MixedRecordArraysCannotBeSelectionOutput = Assert<Equal<Assignable<(string | { _id: string })[], RelationSelectionValue>, false>>;
type SqlAndMongoIdsRemainValid = Assert<Equal<Assignable<(string | number)[], RelationSelectionValue>, true>>;
type JsonParseDoesNotClaimValidation = Assert<Equal<Extract<FieldPermissionConditionParseResult, { error: null }>['condition'], unknown>>;
type UnknownCannotBecomeCondition = Assert<Equal<Assignable<unknown, FieldPermissionCondition>, false>>;
type SuccessfulValidationHasNoErrors = Assert<Equal<Extract<FieldPermissionConditionValidationResult, { ok: true }>['errors'], []>>;
type MountedValidationIsAwaitable = Assert<Equal<ReturnType<FormEditorActions['validateAllUniqueFields']>, Promise<boolean>>>;
type LazyValidationKeepsUnmountedState = Assert<Equal<ReturnType<FormEditorLazyActions['validateAllUniqueFields']>, Promise<boolean> | undefined>>;

export type FormsSchemaContractAssertions = [
  ColumnCannotUseRelationType,
  RelationCannotUseColumnType,
  RelationTypeIsNarrowed,
  PositionKeepsCustomFields,
  SortKeepsCustomFields,
  HydratedRecordsCannotBeSelectionOutput,
  MixedRecordArraysCannotBeSelectionOutput,
  SqlAndMongoIdsRemainValid,
  JsonParseDoesNotClaimValidation,
  UnknownCannotBecomeCondition,
  SuccessfulValidationHasNoErrors,
  MountedValidationIsAwaitable,
  LazyValidationKeepsUnmountedState,
];

const extendedFields: ExtendedColumn[] = [
  { fieldType: 'column', type: 'json', name: 'payload', rank: 1, draft: { source: 'virtual' } },
];
const positionedFields: ExtendedColumn[] = applyFieldPositions(extendedFields, { payload: 0 });
const sortedFields: ExtendedColumn[] = sortDefinitionFieldsByKey(extendedFields, 'rank');
const dynamicCondition: FieldPermissionCondition = {
  payload: { _eq: { nested: [false, 0, null, { arbitrary: 'value' }] } },
};

void positionedFields;
void sortedFields;
void dynamicCondition;
