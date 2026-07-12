<script setup lang="ts">

const props = defineProps<{
  modelValue: any;
  columnNames: string[];
}>();

const { confirm } = useConfirm();
const table = useModel(props, "modelValue");
const expandedIndexCoverage = ref<string[]>([]);

function addUniqueGroup() {
  if (!table.value.uniques) table.value.uniques = [];
  table.value.uniques.push([""]);
}

function addIndexGroup() {
  if (!table.value.indexes) table.value.indexes = [];
  table.value.indexes.push([""]);
}

function addFieldToGroup(list: string[][], groupIndex: number | string) {
  const idx = Number(groupIndex);
  if (!list || !list[idx]) return;
  list[idx].push("");
}

function removeGroup(list: string[][], groupIndex: number | string) {
  const idx = Number(groupIndex);
  if (!list) return;
  list.splice(idx, 1);
}

async function removeUniqueGroupConfirm(groupIndex: number | string) {
  const idx = Number(groupIndex);
  const group = table.value?.uniques?.[idx];
  const label = Array.isArray(group) ? group.filter(Boolean).join(", ") : "";
  const ok = await confirm({
    title: "Remove Unique Constraint",
    content: `Remove this unique constraint${label ? ` (${label})` : ""}? You can still cancel by discarding changes before saving.`,
  });
  if (!ok) return;
  removeGroup(table.value.uniques, idx);
}

async function removeIndexGroupConfirm(groupIndex: number | string) {
  const idx = Number(groupIndex);
  const group = table.value?.indexes?.[idx];
  const label = Array.isArray(group) ? group.filter(Boolean).join(", ") : "";
  const ok = await confirm({
    title: "Remove Index",
    content: `Remove this index${label ? ` (${label})` : ""}? You can still cancel by discarding changes before saving.`,
  });
  if (!ok) return;
  removeGroup(table.value.indexes, idx);
}

function removeFieldFromGroup(list: string[][], groupIndex: number | string, fieldIndex: number | string) {
  const gIdx = Number(groupIndex);
  const fIdx = Number(fieldIndex);
  if (!list || !list[gIdx]) return;
  list[gIdx].splice(fIdx, 1);
  if (list[gIdx].length === 0) {
    list.splice(gIdx, 1);
  }
}

function getAvailableFields(group: string[], currentField: string): string[] {
  return props.columnNames.filter((name: string) => currentField === name || !group.includes(name));
}

function canAddFieldToGroup(group: string[]): boolean {
  const availableCount = props.columnNames.filter((name: string) => !group.includes(name) || name === '').length;
  const hasEmptySlot = group.some((f: string) => !f || f === '');
  return availableCount > 0 && !hasEmptySlot;
}

function hasDuplicateGroup(list: string[][], groupIndex: number | string, orderMatters = false): boolean {
  const idx = Number(groupIndex);
  if (!list) return false;
  const currentGroup = list[idx];
  if (!currentGroup || currentGroup.some((f: string) => !f)) return false;

  const normalize = (group: string[]) => (orderMatters ? group : [...group].sort()).join(',');
  const normalizedCurrent = normalize(currentGroup);
  return list.some((g: string[], i: number) => {
    if (i === idx) return false;
    if (g.some((f: string) => !f)) return false;
    return normalize(g) === normalizedCurrent;
  });
}

function getCoveringUniqueConstraints(indexGroup: string[]): string[][] {
  if (!indexGroup || indexGroup.some((field: string) => !field)) return [];
  if (!table.value.uniques) return [];
  return table.value.uniques.filter((uniqueGroup: string[]) => {
    if (uniqueGroup.some((f: string) => !f)) return false;
    return uniqueGroup.length >= indexGroup.length
      && indexGroup.every((field: string, fieldIndex: number) => uniqueGroup[fieldIndex] === field);
  });
}

function isIndexAlreadyUnique(groupIndex: number | string): boolean {
  const indexGroup = table.value.indexes?.[Number(groupIndex)];
  return Array.isArray(indexGroup) && getCoveringUniqueConstraints(indexGroup).length > 0;
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

function getIndexWarningType(groupIndex: number | string): 'duplicate' | 'redundant' | null {
  if (hasDuplicateGroup(table.value.indexes, groupIndex, true)) return 'duplicate';
  if (isIndexAlreadyUnique(groupIndex)) return 'redundant';
  return null;
}
</script>

<template>
  <div class="space-y-8">

    <div class="space-y-4">
      <div class="flex items-center gap-2 text-lg font-semibold text-muted">
        <UIcon name="lucide:key" class="w-5 h-5" />
        Unique Constraints
        <UButton
          icon="lucide:plus"
          size="sm"
          color="primary"
          @click="addUniqueGroup()"
          :disabled="table.isSystem"
        />
      </div>
      <div
        v-for="(group, gIndex) in table.uniques"
        :key="gIndex"
        class="flex flex-wrap gap-2 items-center"
        :class="hasDuplicateGroup(table.uniques, gIndex) ? 'p-2 rounded-lg bg-[var(--state-danger-soft-bg)] border border-[var(--state-danger-outline-border)]' : ''"
      >
        <UTooltip v-if="hasDuplicateGroup(table.uniques, gIndex)" text="This combination already exists in another constraint">
          <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-[var(--md-error)]" />
        </UTooltip>

        <div
          v-for="(field, fIndex) in group"
          :key="fIndex"
          class="flex items-center gap-1"
        >
          <USelect
            :items="getAvailableFields(group, field)"
            v-model="table.uniques[gIndex][fIndex]"
            size="sm"
            class="min-w-[180px]"
          />
          <UButton
            v-if="group.length > 1"
            icon="i-lucide-x"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="removeFieldFromGroup(table.uniques, gIndex, fIndex)"
            :disabled="table.isSystem"
          />
        </div>

        <UButton
          icon="i-lucide:plus"
          size="sm"
          @click="addFieldToGroup(table.uniques, gIndex)"
          :disabled="table.isSystem || !canAddFieldToGroup(group)"
        />
        <UButton
          icon="i-lucide:trash"
          color="error"
          variant="ghost"
          size="md"
          @click="removeUniqueGroupConfirm(gIndex)"
          :disabled="table.isSystem"
        />
      </div>
    </div>

    <div class="space-y-4">
      <div class="flex items-center gap-2 text-lg font-semibold text-muted">
        <UIcon name="lucide:list" class="w-5 h-5" />
        Index
        <UButton
          icon="lucide:plus"
          size="sm"
          color="primary"
          @click="addIndexGroup()"
          :disabled="table.isSystem"
        />
      </div>
      <div
        v-for="(group, gIndex) in table.indexes"
        :key="gIndex"
        class="flex flex-wrap gap-2 items-center"
        :class="getIndexWarningType(gIndex) ? 'p-2 rounded-lg border' : ''"
        :style="getIndexWarningType(gIndex) === 'duplicate' ? 'background: color-mix(in srgb, var(--md-error) 10%, transparent); border-color: color-mix(in srgb, var(--md-error) 30%, transparent);' : getIndexWarningType(gIndex) === 'redundant' ? 'background: color-mix(in srgb, var(--st-warning) 10%, transparent); border-color: color-mix(in srgb, var(--st-warning) 30%, transparent);' : ''"
      >
        <UTooltip v-if="getIndexWarningType(gIndex) === 'duplicate'" text="This combination already exists in another index">
          <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-[var(--md-error)]" />
        </UTooltip>
        <UTooltip v-else-if="getIndexWarningType(gIndex) === 'redundant'" text="This index is already covered by a Unique constraint - index is created automatically">
          <UIcon name="i-lucide-info" class="w-4 h-4 text-[var(--st-warning)]" />
        </UTooltip>

        <div
          v-for="(field, fIndex) in group"
          :key="fIndex"
          class="flex items-center gap-1"
        >
          <USelect
            :items="getAvailableFields(group, field)"
            v-model="table.indexes[gIndex][fIndex]"
            size="sm"
            class="min-w-[180px]"
          />
          <UButton
            v-if="group.length > 1"
            icon="i-lucide-x"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="removeFieldFromGroup(table.indexes, gIndex, fIndex)"
            :disabled="table.isSystem"
          />
        </div>

        <UButton
          icon="i-lucide:plus"
          size="sm"
          @click="addFieldToGroup(table.indexes, gIndex)"
          :disabled="table.isSystem || !canAddFieldToGroup(group)"
        />
        <UButton
          icon="i-lucide:trash"
          color="error"
          variant="ghost"
          size="md"
          @click="removeIndexGroupConfirm(gIndex)"
          :disabled="table.isSystem"
        />
        <button
          v-if="getIndexWarningType(gIndex) === 'redundant'"
          type="button"
          class="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[var(--state-warning-soft-text)] hover:text-[var(--state-warning-title-text)]"
          :aria-expanded="isIndexCoverageExpanded(group)"
          @click="toggleIndexCoverage(group)"
        >
          <span>View coverage</span>
          <UIcon
            :name="isIndexCoverageExpanded(group) ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            class="h-3.5 w-3.5"
          />
        </button>
        <div
          v-if="getIndexWarningType(gIndex) === 'redundant' && isIndexCoverageExpanded(group)"
          class="w-full rounded-[var(--radius-subcontrol)] border border-[var(--state-warning-outline-border)] bg-[var(--surface-default)] px-3 py-2 text-xs text-[var(--state-warning-soft-text)]"
        >
          <p>
            <code class="font-mono text-[var(--state-warning-title-text)]">{{ group.join(', ') }}</code>
            is the leading field prefix of these unique constraints, which already create the lookup index:
          </p>
          <ul class="mt-1.5 space-y-1">
            <li
              v-for="uniqueGroup in getCoveringUniqueConstraints(group)"
              :key="uniqueGroup.join(',')"
              class="font-mono text-[var(--state-warning-title-text)]"
            >
              {{ uniqueGroup.join(', ') }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
