<template>
  <div class="space-y-3 w-full">
    <FormEditorLazy
      :model-value="scriptForm"
      table-name="enfyra_flow_step"
      :errors="errors"
      :includes="['sourceCode', 'scriptLanguage']"
      :field-map="fieldMap"
      mode="update"
      @update:model-value="updateScriptForm"
      @update:errors="emit('update:errors', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { StepType } from '~/types/flow';
import type { ScriptLanguage } from '~/types/script-contract';
import { normalizeScriptLanguage } from '~/utils/script-contract';

interface Props {
  type: StepType | string;
  sourceCode?: string | null;
  scriptLanguage?: ScriptLanguage | string | null;
  errors?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  errors: () => ({}),
});
const emit = defineEmits<{
  'update:sourceCode': [value: string | null];
  'update:scriptLanguage': [value: ScriptLanguage];
  'update:errors': [value: Record<string, string>];
}>();

const scriptLanguage = computed<ScriptLanguage>(() => normalizeScriptLanguage(props.scriptLanguage));

const scriptForm = computed(() => ({
  sourceCode: props.sourceCode ?? '',
  scriptLanguage: scriptLanguage.value,
}));

const isCondition = computed(() => props.type === 'condition');

const fieldMap = computed(() => ({
  sourceCode: {
    type: 'code',
    height: isCondition.value ? '220px' : '300px',
    testRun: false,
    hint: isCondition.value
      ? 'Must return a boolean: true or false. Wrap other values, e.g. return Boolean(@FLOW_PAYLOAD.enabled). Macros: @FLOW_PAYLOAD, @FLOW_LAST, @FLOW.step_key, #table_name, @HELPERS.'
      : 'Must return a value. Use @FLOW_PAYLOAD, @FLOW_LAST, @FLOW.step_key, #table_name, @HELPERS.',
  },
  scriptLanguage: {
    hint: 'Language used by sourceCode before server compilation',
  },
}));

function updateScriptForm(value: Record<string, any>) {
  emit('update:sourceCode', value.sourceCode === '' ? null : value.sourceCode ?? null);
  emit('update:scriptLanguage', normalizeScriptLanguage(value.scriptLanguage));
}
</script>
