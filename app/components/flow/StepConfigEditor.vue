<template>
  <div class="space-y-3 w-full">
    <!-- Script -->
    <template v-if="type === 'script'">
      <p class="text-[11px] text-gray-500 dark:text-gray-400">Must <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">return</code> a value. Access repos via <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">#table_name</code>, previous steps via <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">@FLOW.step_key</code>, input via <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">@PAYLOAD</code>.</p>
      <UFormField label="Code" class="w-full">
        <FormCodeEditorLazy :model-value="fields.code" @update:model-value="update('code', $event)" language="javascript" :enfyra-autocomplete="true" height="220px" class="w-full" />
      </UFormField>
    </template>

    <!-- Condition -->
    <template v-else-if="type === 'condition'">
      <p class="text-[11px] text-gray-500 dark:text-gray-400">Uses JS truthy/falsy. <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">return user</code> (truthy if exists), <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">return null</code> (falsy). Each branch executes different child steps.</p>
      <UFormField label="Condition Code" class="w-full">
        <FormCodeEditorLazy :model-value="fields.code" @update:model-value="update('code', $event)" language="javascript" :enfyra-autocomplete="true" height="120px" class="w-full" />
      </UFormField>
    </template>

    <!-- Query -->
    <template v-else-if="type === 'query'">
      <p class="text-[11px] text-gray-500 dark:text-gray-400">Fetch records from a table.</p>
      <UFormField label="Table" class="w-full">
        <FlowTablePicker :model-value="fields.table" @update:model-value="onQueryTableChange($event)" />
      </UFormField>
      <div v-if="fields.table && schemas && Object.keys(schemas).length > 0" class="w-full">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Filter</p>
        <FilterBuilder
          v-model="queryFilter"
          :schemas="schemas"
          :table-name="fields.table"
          @update:model-value="onFilterChange"
        />
      </div>
      <div v-else-if="fields.table" class="w-full text-xs text-gray-400 py-2">Loading schema...</div>
      <div class="grid grid-cols-2 gap-3 w-full">
        <UFormField label="Limit" class="w-full">
          <UInput :model-value="fields.limit" @update:model-value="updateNumber('limit', $event)" type="number" placeholder="10" class="w-full" />
        </UFormField>
        <UFormField label="Fields" class="w-full">
          <UInput :model-value="fields.fields" @update:model-value="update('fields', $event)" placeholder="id,name,email" class="w-full" />
        </UFormField>
      </div>
    </template>

    <!-- Create -->
    <template v-else-if="type === 'create'">
      <p class="text-[11px] text-gray-500 dark:text-gray-400">Create a new record in a table.</p>
      <UFormField label="Table" class="w-full">
        <FlowTablePicker :model-value="fields.table" @update:model-value="update('table', $event)" />
      </UFormField>
      <UFormField label="Data" class="w-full">
        <FormCodeEditorLazy :model-value="stringifyField('data')" @update:model-value="updateJson('data', $event)" language="json" height="140px" class="w-full" />
      </UFormField>
    </template>

    <!-- Update -->
    <template v-else-if="type === 'update'">
      <p class="text-[11px] text-gray-500 dark:text-gray-400">Update an existing record by ID.</p>
      <UFormField label="Table" class="w-full">
        <FlowTablePicker :model-value="fields.table" @update:model-value="update('table', $event)" />
      </UFormField>
      <UFormField label="Record ID" class="w-full">
        <UInput :model-value="fields.id" @update:model-value="update('id', $event)" placeholder="1" class="w-full" />
      </UFormField>
      <UFormField label="Data" class="w-full">
        <FormCodeEditorLazy :model-value="stringifyField('data')" @update:model-value="updateJson('data', $event)" language="json" height="120px" class="w-full" />
      </UFormField>
    </template>

    <!-- Delete -->
    <template v-else-if="type === 'delete'">
      <p class="text-[11px] text-gray-500 dark:text-gray-400">Delete a record by ID.</p>
      <UFormField label="Table" class="w-full">
        <FlowTablePicker :model-value="fields.table" @update:model-value="update('table', $event)" />
      </UFormField>
      <UFormField label="Record ID" class="w-full">
        <UInput :model-value="fields.id" @update:model-value="update('id', $event)" placeholder="1" class="w-full" />
      </UFormField>
    </template>

    <!-- HTTP -->
    <template v-else-if="type === 'http'">
      <p class="text-[11px] text-gray-500 dark:text-gray-400">Send an HTTP request to an external API.</p>
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
      <p class="text-[11px] text-gray-500 dark:text-gray-400">Trigger another flow asynchronously.</p>
      <UFormField label="Flow Name" class="w-full">
        <UInput :model-value="fields.flowName" @update:model-value="update('flowName', $event)" placeholder="send-welcome-email" class="w-full" />
      </UFormField>
      <UFormField label="Or Flow ID" class="w-full">
        <UInput :model-value="fields.flowId" @update:model-value="updateNumber('flowId', $event)" type="number" placeholder="2" class="w-full" />
      </UFormField>
    </template>

    <!-- Sleep -->
    <template v-else-if="type === 'sleep'">
      <p class="text-[11px] text-gray-500 dark:text-gray-400">Pause execution for a specified duration.</p>
      <UFormField label="Duration" class="w-full">
        <UInput :model-value="fields.ms" @update:model-value="updateNumber('ms', $event)" type="number" placeholder="5000" class="w-full">
          <template #trailing><span class="text-xs text-gray-400">ms</span></template>
        </UInput>
      </UFormField>
    </template>

    <!-- Log -->
    <template v-else-if="type === 'log'">
      <p class="text-[11px] text-gray-500 dark:text-gray-400">Log a message to the execution output.</p>
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

function update(field: string, value: any) {
  const current = { ...fields.value };
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
  queryFilter.value = createEmptyFilter();
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
</script>
