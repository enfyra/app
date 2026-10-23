import type { Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { CodeMirrorEditorOptions, CodeMirrorModules } from '../../app/types/code-editor-runtime';
import type { FileLibraryDisplayRow } from '../../app/types/file';
import type { FeatureCollection, FeatureEditableRecord, FeatureIdentity, FeatureRouteHeader } from '../../app/types/feature-api';
import type { FlowStepAddContext, FlowStepEditorForm } from '../../app/types/flow';
import type { NormalizedScriptContract, ScriptContractFields, ScriptLanguage } from '../../app/types/script-contract';
import { normalizeScriptContract } from '../../app/utils/script-contract';
import { useCodeMirrorEditor } from '../../app/composables/editor/useCodeMirrorEditor';

type Assert<T extends true> = T;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Rejects<Value, Contract> = Value extends Contract ? false : true;

const normalized = normalizeScriptContract({ sourceCode: '', scriptLanguage: 'legacy', key: 'step' } as const);

type Editor = ReturnType<typeof useCodeMirrorEditor>;
type Normalized = NormalizedScriptContract<{ sourceCode: ''; scriptLanguage: 'legacy'; key: 'step' }>;

export type RuntimeContractAssertions = [
  Assert<Equal<typeof normalized.sourceCode, string | null>>,
  Assert<Equal<typeof normalized.scriptLanguage, ScriptLanguage>>,
  Assert<Equal<typeof normalized.key, 'step'>>,
  Assert<Equal<Normalized['sourceCode'], string | null>>,
  Assert<Equal<Normalized['scriptLanguage'], ScriptLanguage>>,
  Assert<Rejects<123, ScriptContractFields['sourceCode']>>,
  Assert<Equal<string extends keyof ScriptContractFields ? true : false, false>>,
  Assert<Equal<IsAny<CodeMirrorModules['EditorView']>, false>>,
  Assert<Equal<Editor['editorView']['value'], EditorView | null>>,
  Assert<Equal<Parameters<Editor['createEditor']>[0], Extension[]>>,
  Assert<Rejects<{ malformed: true }, Parameters<Editor['createEditor']>[0]>>,
  Assert<Rejects<{ codeMirrorModules: { EditorView: string } }, Pick<CodeMirrorEditorOptions, 'codeMirrorModules'>>>,
  Assert<Rejects<{ emit: (event: 'diagnostics', value: string) => void }, Pick<CodeMirrorEditorOptions, 'emit'>>>,
  Assert<Equal<Parameters<CodeMirrorEditorOptions['emit']>[1], Diagnostic[]>>,
  Assert<Rejects<{ invalid: true }, FlowStepEditorForm['parentId']>>,
  Assert<Rejects<'other', FlowStepEditorForm['branch']>>,
  Assert<Rejects<{ branch: undefined }, Pick<FlowStepEditorForm, 'branch'>>>,
  Assert<Rejects<{ branch: null }, Pick<FlowStepEditorForm, 'branch'>>>,
  Assert<Equal<{} extends Pick<FlowStepEditorForm, 'branch'> ? true : false, true>>,
  Assert<Equal<{ parentId: null } extends Pick<FlowStepEditorForm, 'parentId'> ? true : false, true>>,
  Assert<Rejects<{ branch: 'other' }, FlowStepAddContext>>,
  Assert<Equal<FlowStepEditorForm['type'], 'script' | 'condition'>>,
  Assert<Equal<IsAny<FileLibraryDisplayRow['displayName']>, false>>,
  Assert<Rejects<number, FileLibraryDisplayRow['displayName']>>,
  Assert<Rejects<string, FileLibraryDisplayRow['storageConfig']>>,
  Assert<Equal<FeatureCollection<FeatureRouteHeader>['data'][number]['path'], string>>,
  Assert<Rejects<{ data: FeatureIdentity }, FeatureCollection<FeatureIdentity>>>,
  Assert<Rejects<{ path: number }, FeatureRouteHeader>>,
  Assert<Equal<FeatureEditableRecord['customValue'], unknown>>,
  Assert<Rejects<FeatureEditableRecord['customValue'], string>>,
];
