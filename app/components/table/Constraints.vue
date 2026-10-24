<script setup lang="ts">
import { isAutomaticIndex } from '~/utils/schema/constraints';

const props = defineProps<{
  modelValue: any;
  columnNames: string[];
}>();

const { confirm } = useConfirm();
const table = useModel(props, "modelValue");
const expandedIndexCoverage = ref<string[]>([]);
const initialIndexGroups = shallowRef(new WeakSet<string[]>());
watch(() => props.modelValue, value => {
  initialIndexGroups.value = new WeakSet(Array.isArray(value?.indexes) ? value.indexes : []);
}, { immediate: true });
const actionClass = "relative h-8 pointer-coarse:before:absolute pointer-coarse:before:-inset-1.5 pointer-coarse:before:content-['']";

const automaticIndexes = computed(() => (table.value.indexes as string[][] | undefined)?.filter(isManagedIndex) ?? []);
const sections = computed(() => [
  {
    key: 'uniques' as const,
    title: 'Unique constraints',
    label: 'Unique constraint',
    icon: 'lucide:key-round',
    addLabel: 'Add unique constraint',
    empty: 'No unique constraints',
  },
  {
    key: 'indexes' as const,
    title: 'Indexes',
    label: 'Index',
    icon: 'lucide:list-filter',
    addLabel: 'Add index',
    empty: 'No custom indexes',
  },
].map(section => ({
  ...section,
  groups: ((table.value[section.key] ?? []) as string[][])
    .map((group, groupIndex) => ({
      group,
      groupIndex,
      fields: group.filter(Boolean),
      warning: section.key === 'uniques'
        ? (hasDuplicateGroup(table.value.uniques, groupIndex) ? 'duplicate' : null)
        : getIndexWarningType(groupIndex),
    }))
    .filter(({ group }) => section.key === 'uniques' || !isManagedIndex(group)),
})));

function addGroup(key: 'uniques' | 'indexes') {
  if (!table.value[key]) table.value[key] = [];
  table.value[key].push([""]);
}

function updateGroupFields(group: string[], fields: string[]) {
  if (table.value.isSystem || isManagedIndex(group)) return;
  group.splice(0, group.length, ...(fields.length ? fields : ['']));
}

async function removeGroupConfirm(key: 'uniques' | 'indexes', groupIndex: number) {
  const group = table.value[key]?.[groupIndex];
  const label = Array.isArray(group) ? group.filter(Boolean).join(", ") : "";
  const kind = key === 'uniques' ? 'unique constraint' : 'index';
  const ok = await confirm({
    title: key === 'uniques' ? 'Remove Unique Constraint' : 'Remove Index',
    content: `Remove this ${kind}${label ? ` (${label})` : ""}? You can still cancel by discarding changes before saving.`,
  });
  if (!ok) return;
  table.value[key].splice(groupIndex, 1);
}

function hasDuplicateGroup(list: string[][], groupIndex: number, orderMatters = false): boolean {
  if (!list) return false;
  const currentGroup = list[groupIndex];
  if (!currentGroup || currentGroup.some(field => !field)) return false;

  const normalize = (group: string[]) => (orderMatters ? group : [...group].sort()).join(',');
  const normalizedCurrent = normalize(currentGroup);
  return list.some((group, index) => index !== groupIndex && group.every(Boolean) && normalize(group) === normalizedCurrent);
}

function getCoveringUniqueConstraints(indexGroup: string[]): string[][] {
  if (!indexGroup || indexGroup.some(field => !field)) return [];
  return (table.value.uniques ?? []).filter((uniqueGroup: string[]) => uniqueGroup.every(Boolean)
    && uniqueGroup.length >= indexGroup.length
    && indexGroup.every((field, fieldIndex) => uniqueGroup[fieldIndex] === field));
}

function indexCoverageKey(group: string[]): string {
  return group.join('\u0000');
}

function isIndexCoverageExpanded(group: string[]): boolean {
  return expandedIndexCoverage.value.includes(indexCoverageKey(group));
}

function toggleIndexCoverage(group: string[]) {
  const key = indexCoverageKey(group);
  expandedIndexCoverage.value = isIndexCoverageExpanded(group)
    ? expandedIndexCoverage.value.filter(item => item !== key)
    : [...expandedIndexCoverage.value, key];
}

function isManagedIndex(group: string[]): boolean {
  return initialIndexGroups.value.has(group) && isAutomaticIndex(table.value, group) && getCoveringUniqueConstraints(group).length === 0;
}

function getIndexWarningType(groupIndex: number): 'duplicate' | 'redundant' | null {
  if (hasDuplicateGroup(table.value.indexes, groupIndex, true)) return 'duplicate';
  const group = table.value.indexes?.[groupIndex];
  if (Array.isArray(group) && getCoveringUniqueConstraints(group).length > 0) return 'redundant';
  return null;
}
</script>

<template>
  <div class="grid min-w-0 items-start gap-6 xl:grid-cols-2 xl:gap-8">
    <section v-for="section in sections" :key="section.key" :aria-label="section.title" class="min-w-0 space-y-3">
      <div class="flex min-h-8 items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <h3 class="text-sm font-semibold text-highlighted">{{ section.title }}</h3>
          <span v-if="section.groups.length" class="text-xs tabular-nums text-dimmed">{{ section.groups.length }}</span>
        </div>
        <UButton
          type="button"
          icon="lucide:plus"
          :aria-label="section.addLabel"
          label="Add"
          size="sm"
          color="neutral"
          variant="ghost"
          :class="actionClass"
          :disabled="table.isSystem"
          @click="addGroup(section.key)"
        />
      </div>

      <div class="space-y-3">
        <p v-if="!section.groups.length" class="py-2 text-xs text-muted">{{ section.empty }}</p>
        <div
          v-for="({ group, groupIndex, fields, warning }, displayIndex) in section.groups"
          :key="groupIndex"
          role="group"
          :aria-label="`${section.label} ${displayIndex + 1}`"
          class="min-w-0 space-y-1.5"
        >
          <div class="flex min-w-0 items-start gap-3">
            <UInputMenu
              :model-value="fields"
              :items="columnNames"
              multiple
              :icon="section.icon"
              :aria-label="`Fields of ${section.label.toLowerCase()} ${displayIndex + 1}`"
              :disabled="table.isSystem"
              :placeholder="fields.length ? 'Add field…' : 'Select fields…'"
              size="sm"
              class="min-w-0 flex-1"
              @update:model-value="updateGroupFields(group, $event)"
            >
              <template #tags-item-text="{ item, index }">
                <span v-if="fields.length > 1" class="inline-flex items-center tabular-nums text-[11px] leading-none opacity-65">{{ `${index + 1} ` }}</span><span class="truncate leading-none">{{ item }}</span>
              </template>
            </UInputMenu>
            <UButton
              type="button"
              icon="lucide:trash-2"
              :aria-label="`Delete ${section.label.toLowerCase()}`"
              :title="`Delete ${section.label.toLowerCase()}`"
              size="sm"
              square
              color="error"
              variant="ghost"
              :class="[actionClass, 'mt-1.5 size-8 p-0']"
              :disabled="table.isSystem"
              @click="removeGroupConfirm(section.key, groupIndex)"
            />
          </div>

          <div
            v-if="warning"
            class="pr-11 text-xs leading-5"
            :class="warning === 'duplicate' ? 'text-[var(--state-danger-soft-text)]' : 'text-[var(--state-warning-soft-text)]'"
          >
            <div class="flex items-start gap-1.5">
              <UIcon :name="warning === 'duplicate' ? 'lucide:triangle-alert' : 'lucide:info'" class="mt-0.5 size-3.5 shrink-0" />
              <p v-if="warning === 'duplicate'">This combination already exists in another {{ section.label.toLowerCase() }}.</p>
              <div v-else class="min-w-0 flex-1">
                <p>Covered by a unique constraint. Remove this index before saving.</p>
                <UButton
                  type="button"
                  aria-label="View unique constraint coverage"
                  :aria-expanded="isIndexCoverageExpanded(group)"
                  :trailing-icon="isIndexCoverageExpanded(group) ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                  label="View coverage"
                  size="xs"
                  color="warning"
                  variant="link"
                  class="px-0"
                  @click="toggleIndexCoverage(group)"
                />
              </div>
            </div>
            <div v-if="warning === 'redundant' && isIndexCoverageExpanded(group)" class="space-y-1 pl-5">
              <p>The leading fields are already indexed by:</p>
              <ul class="space-y-1">
                <li v-for="uniqueGroup in getCoveringUniqueConstraints(group)" :key="uniqueGroup.join(',')" class="break-all font-mono">
                  {{ uniqueGroup.join(', ') }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <p v-if="section.key === 'indexes' && section.groups.length" class="text-xs text-muted">Fields are indexed from left to right.</p>

      <details v-if="section.key === 'indexes' && automaticIndexes.length" class="group min-w-0">
        <summary class="flex min-h-8 cursor-pointer list-none items-center gap-1.5 text-xs text-muted outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus-ring)] pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
          <UIcon name="lucide:chevron-right" class="size-3.5 shrink-0 group-open:rotate-90" />
          <span>Automatic indexes</span>
          <span class="tabular-nums text-dimmed">{{ automaticIndexes.length }}</span>
        </summary>
        <div class="mt-2 space-y-2">
          <p class="text-xs leading-5 text-muted">Managed by Enfyra for relations and date/time fields.</p>
          <ul class="flex min-w-0 flex-wrap gap-2">
            <li v-for="group in automaticIndexes" :key="indexCoverageKey(group)" class="max-w-full rounded-[var(--radius-subcontrol)] bg-[var(--surface-muted)] px-2 py-1 text-xs text-muted">
              <code class="break-all">{{ group.join(', ') }}</code>
            </li>
          </ul>
        </div>
      </details>
    </section>
  </div>
</template>
