<script setup lang="ts">
const props = defineProps<{
  relation: any;
  tableOptions: { label: string; value: any }[];
}>();

const targetTableLabel = computed(() => {
  const targetId = typeof props.relation?.targetTable === 'object'
    ? props.relation.targetTable?.id
    : props.relation?.targetTable;
  return props.tableOptions.find((t) => t.value === targetId)?.label ?? 'Unknown';
});

const mappedByLabel = computed(() => {
  if (!props.relation?.mappedBy) return null;
  if (typeof props.relation.mappedBy === 'object') {
    return props.relation.mappedBy?.propertyName ?? `ID: ${props.relation.mappedBy?.id}`;
  }
  return String(props.relation.mappedBy);
});
</script>

<template>
  <div class="space-y-3">
    <div class="rounded-lg border border-[var(--border-default)] p-3 surface-muted">
      <div class="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
        Inverse Relation Info
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-[var(--text-secondary)]">Type</span>
          <UBadge size="xs" color="info">{{ relation.type }}</UBadge>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-[var(--text-secondary)]">Target Table</span>
          <span class="text-sm font-medium text-[var(--text-primary)]">{{ targetTableLabel }}</span>
        </div>
        <div v-if="mappedByLabel" class="flex items-center justify-between">
          <span class="text-sm text-[var(--text-secondary)]">Mapped By</span>
          <UBadge size="xs" variant="soft" color="warning">{{ mappedByLabel }}</UBadge>
        </div>
        <div v-if="relation.isNullable !== undefined" class="flex items-center justify-between">
          <span class="text-sm text-[var(--text-secondary)]">Nullable</span>
          <span class="text-sm text-[var(--text-primary)]">{{ relation.isNullable ? 'Yes' : 'No' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
