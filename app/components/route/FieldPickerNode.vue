<script setup lang="ts">
const props = defineProps<{
  schemas: Record<string, any>;
  tableName: string;
  prefix: string;
  selectedFields: string[];
  depth?: number;
  visited?: string[];
}>();

const emit = defineEmits<{
  toggle: [field: string];
  'toggle-all': [prefix: string];
}>();

const MAX_DEPTH = 3;
const currentDepth = props.depth ?? 0;
const visitedTables = props.visited ?? [];

const schema = computed(() => props.schemas?.[props.tableName]);
const definition = computed(() => schema.value?.definition || []);

const fkColumns = computed(() => {
  const fks = new Set<string>();
  definition.value
    .filter((f: any) => f.fieldType === 'relation' && f.foreignKeyColumn)
    .forEach((f: any) => fks.add(f.foreignKeyColumn));
  return fks;
});

const columns = computed(() =>
  definition.value
    .filter((f: any) => f.fieldType === 'column' && f.name && !fkColumns.value.has(f.name))
    .map((f: any) => f.name as string)
);

function resolveTargetTableName(rel: any): string | null {
  if (rel.targetTableName) return rel.targetTableName;
  const targetId = rel.targetTableId ?? rel.targetTable?.id;
  if (targetId && props.schemas) {
    return Object.values(props.schemas).find((s: any) => s.id === targetId)?.name || null;
  }
  return null;
}

const relations = computed(() => {
  if (currentDepth >= MAX_DEPTH) return [];
  return definition.value
    .filter((f: any) => f.fieldType === 'relation' && f.propertyName)
    .map((rel: any) => {
      const targetName = resolveTargetTableName(rel);
      return {
        name: rel.propertyName as string,
        relationType: (rel.relationType || rel.type) as string,
        targetTable: targetName,
        canExpand: !!targetName && !visitedTables.includes(targetName),
        isCircular: !!targetName && visitedTables.includes(targetName),
        isMaxDepth: currentDepth + 1 >= MAX_DEPTH,
      };
    });
});

const expanded = ref<Set<string>>(new Set());

function toggleExpand(name: string) {
  if (expanded.value.has(name)) expanded.value.delete(name);
  else expanded.value.add(name);
}

function fullPath(field: string): string {
  return props.prefix ? `${props.prefix}.${field}` : field;
}

function isSelected(field: string): boolean {
  return props.selectedFields.includes(fullPath(field));
}

function hasAnySelected(relName: string): boolean {
  const p = fullPath(relName) + '.';
  return props.selectedFields.some(f => f.startsWith(p));
}
</script>

<template>
  <div class="space-y-2">
    <div v-if="columns.length > 0" class="flex flex-wrap gap-1.5">
      <UButton
        v-for="col in columns"
        :key="col"
        :color="isSelected(col) ? 'primary' : 'neutral'"
        :variant="isSelected(col) ? 'solid' : 'outline'"
        size="xs"
        @click="emit('toggle', fullPath(col))"
      >{{ col }}</UButton>
    </div>

    <div v-for="rel in relations" :key="rel.name" class="rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] overflow-hidden">
      <button
        type="button"
        class="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs bg-neutral-200 dark:bg-neutral-900"
        :class="[
          rel.canExpand ? '' : 'cursor-default'
        ]"
        @click="rel.canExpand && toggleExpand(rel.name)"
      >
        <UIcon
          v-if="rel.canExpand"
          name="lucide:chevron-right"
          :class="['w-3.5 h-3.5 transition-transform duration-200', expanded.has(rel.name) ? 'rotate-90' : '']"
        />
        <UIcon v-else-if="rel.isCircular" name="lucide:refresh-cw" class="w-3.5 h-3.5 text-warning-500" />
        <UIcon v-else name="lucide:lock" class="w-3.5 h-3.5 text-[var(--text-quaternary)]" />
        <span class="font-medium text-[var(--text-secondary)]">{{ rel.name }}</span>
        <UBadge v-if="rel.isCircular" size="xs" variant="soft" color="warning">circular</UBadge>
        <UBadge v-else-if="rel.isMaxDepth && !rel.canExpand" size="xs" variant="soft" color="neutral">max depth</UBadge>
        <UBadge size="xs" variant="soft" color="neutral" class="ml-auto">{{ rel.relationType }}</UBadge>
        <UButton
          v-if="rel.canExpand"
          size="xs"
          :variant="hasAnySelected(rel.name) ? 'solid' : 'outline'"
          :color="hasAnySelected(rel.name) ? 'primary' : 'neutral'"
          @click.stop="emit('toggle-all', fullPath(rel.name))"
        >
          {{ rel.name }}.*
        </UButton>
      </button>
      <div
        v-if="rel.canExpand"
        class="grid transition-all duration-200 ease-out"
        :class="expanded.has(rel.name) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
      >
        <div class="overflow-hidden">
          <div class="px-2.5 pb-2 pt-1.5 border-t border-[var(--border-default)] bg-[var(--surface-default)] rounded-b-lg">
            <FieldPickerNode
              :schemas="schemas"
              :table-name="rel.targetTable!"
              :prefix="fullPath(rel.name)"
              :selected-fields="selectedFields"
              :depth="currentDepth + 1"
              :visited="[...visitedTables, tableName]"
              @toggle="emit('toggle', $event)"
              @toggle-all="emit('toggle-all', $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
