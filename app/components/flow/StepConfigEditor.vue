<template>
  <div class="space-y-3 w-full">
    <!-- Script -->
    <template v-if="type === 'script'">
      <p class="text-[11px] text-[var(--text-tertiary)]">Must <code class="bg-[var(--surface-muted)] px-1 rounded">return</code> a value. Access repos via <code class="bg-[var(--surface-muted)] px-1 rounded">#table_name</code>, previous steps via <code class="bg-[var(--surface-muted)] px-1 rounded">@FLOW.step_key</code>, input via <code class="bg-[var(--surface-muted)] px-1 rounded">@FLOW_PAYLOAD</code>.</p>
      <UFormField label="Code" class="w-full">
        <FormCodeEditorLazy :model-value="sourceCode" @update:model-value="update('sourceCode', $event)" :language="scriptLanguage" :enfyra-autocomplete="true" :test-run="false" height="220px" class="w-full" />
      </UFormField>
    </template>

    <!-- Condition -->
    <template v-else-if="type === 'condition'">
      <p class="text-[11px] text-[var(--text-tertiary)]">Uses JS truthy/falsy. <code class="bg-[var(--surface-muted)] px-1 rounded">return user</code> (truthy if exists), <code class="bg-[var(--surface-muted)] px-1 rounded">return null</code> (falsy). Each branch executes different child steps.</p>
      <UFormField label="Condition Code" class="w-full">
        <FormCodeEditorLazy :model-value="sourceCode" @update:model-value="update('sourceCode', $event)" :language="scriptLanguage" :enfyra-autocomplete="true" :test-run="false" height="120px" class="w-full" />
      </UFormField>
    </template>

    <!-- Query -->
    <template v-else-if="type === 'query'">
      <p class="text-[11px] text-[var(--text-tertiary)]">Fetch records from a table.</p>
      <UFormField label="Table" class="w-full">
        <FlowTablePicker :model-value="fields.table" @update:model-value="onQueryTableChange($event)" />
      </UFormField>
      <div v-if="fields.table && schemas && Object.keys(schemas).length > 0" class="w-full space-y-2">
        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <p class="text-xs font-semibold text-[var(--text-secondary)] mb-2">Fields</p>
          <RouteFieldPickerNode
            :schemas="schemas"
            :table-name="fields.table"
            prefix=""
            :selected-fields="selectedQueryFields"
            @toggle="toggleQueryField($event)"
            @toggle-all="handleToggleAllFields($event)"
          />
        </div>
        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <p class="text-xs font-semibold text-[var(--text-secondary)] mb-2">Filter</p>
          <FilterBuilder
            v-model="queryFilter"
            :schemas="schemas"
            :table-name="fields.table"
            @update:model-value="onFilterChange"
          />
        </div>
        <div class="rounded-lg border border-[var(--border-default)] p-3">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-semibold text-[var(--text-secondary)]">Sort</p>
            <UButton size="xs" variant="ghost" icon="lucide:plus" @click="addSortRow">Add</UButton>
          </div>
          <div v-if="sortRows.length" class="space-y-1.5">
            <div v-for="(row, idx) in sortRows" :key="idx" class="flex gap-2 items-center">
              <USelect v-model="row.field" :items="queryColumnOptions" value-key="value" placeholder="Field" class="flex-1" size="sm" @update:model-value="onSortChange" />
              <USelect v-model="row.dir" :items="[{label: 'Ascending', value: 'asc'}, {label: 'Descending', value: 'desc'}]" value-key="value" class="w-32" size="sm" @update:model-value="onSortChange" />
              <UButton size="xs" variant="ghost" color="error" icon="lucide:x" class="flex-shrink-0" @click="sortRows.splice(idx, 1); onSortChange()" />
            </div>
          </div>
          <p v-else class="text-xs text-[var(--text-quaternary)]">No sort rules</p>
        </div>
        <UFormField label="Limit" class="w-full">
          <UInput :model-value="fields.limit" @update:model-value="updateNumber('limit', $event)" type="number" placeholder="10" class="w-full" />
        </UFormField>
      </div>
      <div v-else-if="fields.table" class="w-full text-xs text-[var(--text-quaternary)] py-2">Loading schema...</div>
    </template>

    <!-- Delete -->
    <template v-else-if="type === 'delete'">
      <p class="text-[11px] text-[var(--text-tertiary)]">Delete a record by ID.</p>
      <UFormField label="Table" class="w-full">
        <FlowTablePicker :model-value="fields.table" @update:model-value="update('table', $event)" />
      </UFormField>
      <UFormField label="Record ID" class="w-full">
        <UInput :model-value="fields.id" @update:model-value="update('id', $event)" placeholder="1" class="w-full" />
      </UFormField>
    </template>

    <!-- HTTP -->
    <template v-else-if="type === 'http'">
      <p class="text-[11px] text-[var(--text-tertiary)]">Send an HTTP request to an external API.</p>
      <UFormField label="URL" class="w-full">
        <UInput :model-value="fields.url" @update:model-value="update('url', $event)" placeholder="https://api.example.com/webhook" class="w-full" />
      </UFormField>
      <UFormField label="Method" class="w-full">
        <USelect :model-value="fields.method || 'GET'" @update:model-value="update('method', $event)" :items="['GET', 'POST', 'PUT', 'PATCH', 'DELETE']" class="w-full" />
      </UFormField>
      <UFormField label="Headers" class="w-full">
        <FormCodeEditorLazy :model-value="stringifyField('headers')" @update:model-value="updateJson('headers', $event)" language="json" height="80px" class="w-full" />
      </UFormField>
      <UFormField v-if="!['GET', 'DELETE'].includes(fields.method || 'GET')" label="Body" class="w-full">
        <FormCodeEditorLazy :model-value="stringifyField('body')" @update:model-value="updateJson('body', $event)" language="json" height="120px" class="w-full" />
      </UFormField>
    </template>

    <!-- Trigger Flow -->
    <template v-else-if="type === 'trigger_flow'">
      <p class="text-[11px] text-[var(--text-tertiary)]">Trigger another flow asynchronously.</p>
      <UFormField label="Flow Name" required class="w-full">
        <UInput :model-value="fields.flowName" @update:model-value="update('flowName', $event)" placeholder="send-welcome-email" class="w-full" />
      </UFormField>
      <UFormField label="Payload" class="w-full">
        <FormCodeEditorLazy :model-value="stringifyField('payload')" @update:model-value="updateJson('payload', $event)" language="json" height="120px" class="w-full" />
        <template #hint><span class="text-[10px]">Accessible via <code class="bg-[var(--surface-muted)] px-1 rounded">@FLOW_PAYLOAD</code> in target flow steps</span></template>
      </UFormField>
    </template>

    <!-- Sleep -->
    <template v-else-if="type === 'sleep'">
      <p class="text-[11px] text-[var(--text-tertiary)]">Pause execution for a specified duration.</p>
      <UFormField label="Duration" class="w-full">
        <UInput :model-value="fields.ms" @update:model-value="updateNumber('ms', $event)" type="number" placeholder="5000" class="w-full">
          <template #trailing><span class="text-xs text-[var(--text-quaternary)]">ms</span></template>
        </UInput>
      </UFormField>
    </template>

    <!-- Log -->
    <template v-else-if="type === 'log'">
      <p class="text-[11px] text-[var(--text-tertiary)]">Log a message to the execution output.</p>
      <UFormField label="Message" class="w-full">
        <UInput :model-value="fields.message" @update:model-value="update('message', $event)" placeholder="Processing complete" class="w-full" />
      </UFormField>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { StepType } from '~/types/flow';
import type { FilterGroup, FilterCondition } from '~/utils/common/filter/filter-types';

interface Props {
  type: StepType | string;
  configJson: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ 'update:configJson': [value: string] }>();

const fields = computed(() => {
  try {
    return props.configJson ? JSON.parse(props.configJson) : {};
  } catch {
    return {};
  }
});

const scriptLanguage = computed(() => 'typescript');

const sourceCode = computed(() => fields.value.sourceCode ?? fields.value.code ?? '');

function update(field: string, value: any) {
  const current = { ...fields.value };
  if (field === 'sourceCode') {
    current.scriptLanguage = 'typescript';
    delete current.compiledCode;
    delete current.code;
  }
  if (value === '' || value === undefined || value === null) {
    delete current[field];
  } else {
    current[field] = value;
  }
  emit('update:configJson', JSON.stringify(current, null, 2));
}

function updateNumber(field: string, value: any) {
  const num = Number(value);
  update(field, isNaN(num) ? undefined : num);
}

function updateJson(field: string, raw: string) {
  const current = { ...fields.value };
  try {
    current[field] = raw ? JSON.parse(raw) : undefined;
    if (current[field] === undefined) delete current[field];
  } catch {
    current[field] = raw;
  }
  emit('update:configJson', JSON.stringify(current, null, 2));
}

function stringifyField(field: string): string {
  const val = fields.value[field];
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') return val;
  return JSON.stringify(val, null, 2);
}

const { schemas, fetchSchema } = useSchema();
const { createEmptyFilter, buildQuery } = useFilterQuery();

const queryFilter = ref<FilterGroup>(createEmptyFilter());

function filterObjectToFilterGroup(filterObj: any): FilterGroup {
  if (!filterObj || typeof filterObj !== 'object' || Object.keys(filterObj).length === 0) {
    return createEmptyFilter();
  }
  const group = createEmptyFilter();
  for (const [field, ops] of Object.entries(filterObj)) {
    if (field === '_and' || field === '_or') continue;
    if (ops && typeof ops === 'object') {
      for (const [op, val] of Object.entries(ops as any)) {
        group.conditions.push({
          id: Math.random().toString(36).substr(2, 9),
          field,
          operator: op,
          value: val,
        });
      }
    }
  }
  return group;
}

watch(() => fields.value.table, async (tableName) => {
  if (tableName) {
    await fetchSchema();
    queryFilter.value = filterObjectToFilterGroup(fields.value.filter);
  }
}, { immediate: true });

function onQueryTableChange(tableName: string) {
  const current = { ...fields.value };
  current.table = tableName;
  delete current.filter;
  delete current.fields;
  delete current.sort;
  queryFilter.value = createEmptyFilter();
  sortRows.value = [];
  emit('update:configJson', JSON.stringify(current, null, 2));
}

function onFilterChange(filter: FilterGroup) {
  const filterObj = buildQuery(filter);
  if (filterObj && Object.keys(filterObj).length > 0) {
    update('filter', filterObj);
  } else {
    update('filter', undefined);
  }
}

// --- Query: Field Picker ---
const selectedQueryFields = computed<string[]>(() => {
  const raw = fields.value.fields
  if (!raw || typeof raw !== 'string') return []
  return raw.split(',').map((f: string) => f.trim()).filter(Boolean)
})

function toggleQueryField(field: string) {
  const current = [...selectedQueryFields.value]
  const idx = current.indexOf(field)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(field)
  update('fields', current.length ? current.join(',') : undefined)
}

function handleToggleAllFields(prefix: string) {
  const current = [...selectedQueryFields.value]
  const matching = current.filter(f => f.startsWith(prefix + '.') || f === prefix)
  if (matching.length > 0) {
    const filtered = current.filter(f => !f.startsWith(prefix + '.') && f !== prefix)
    update('fields', filtered.length ? filtered.join(',') : undefined)
  }
}

// --- Query: Sort ---
interface SortRow { field: string; dir: 'asc' | 'desc' }

const sortRows = ref<SortRow[]>([])

const queryColumnOptions = computed(() => {
  if (!fields.value.table) return []
  const allSchemas = schemas?.value ?? schemas
  if (!allSchemas || !Object.keys(allSchemas).length) return []
  const schema = allSchemas[fields.value.table]
  if (!schema) return []
  const def = schema.definition || []
  return def
    .filter((f: any) => f.fieldType === 'column' && f.name)
    .map((f: any) => ({ label: f.name, value: f.name }))
})

function addSortRow() {
  sortRows.value.push({ field: '', dir: 'asc' })
}

function onSortChange() {
  const valid = sortRows.value.filter(r => r.field)
  if (valid.length) {
    update('sort', valid.map(r => `${r.dir === 'desc' ? '-' : '+'}${r.field}`))
  } else {
    update('sort', undefined)
  }
}

function parseSortToRows(sort: any): SortRow[] {
  if (!sort) return []
  const arr = Array.isArray(sort) ? sort : []
  return arr.map((s: string) => ({
    field: s.startsWith('-') || s.startsWith('+') ? s.slice(1) : s,
    dir: s.startsWith('-') ? 'desc' as const : 'asc' as const,
  })).filter((r: SortRow) => r.field)
}

// --- Init from configJson ---
watch(() => props.configJson, () => {
  if (props.type === 'query') {
    sortRows.value = parseSortToRows(fields.value.sort)
  }
}, { immediate: true })
</script>
