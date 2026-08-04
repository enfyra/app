<script setup lang="ts">
interface CollectionRecord {
  id: string | number;
  name?: string;
  description?: string;
  isSystem?: boolean;
  createdAt?: string;
  columns?: unknown[];
  relations?: unknown[];
}

withDefaults(defineProps<{
  collections: CollectionRecord[];
  refreshing?: boolean;
}>(), {
  refreshing: false,
});

function getFieldCount(collection: CollectionRecord): number {
  return (collection.columns?.length ?? 0) + (collection.relations?.length ?? 0);
}

function formatCollectionDate(value: string | undefined): string {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString();
}
</script>

<template>
  <div class="eapp-resource-list">
    <CommonResourceListItem
      v-for="collection in collections"
      :key="collection.id"
      :title="collection.name || 'Untitled Collection'"
      :description="collection.description || 'No description'"
      icon="lucide:database"
      :icon-color="collection.isSystem ? 'neutral' : 'primary'"
      :loading="refreshing"
      :to="`/collections/${collection.name}`"
    >
      <template #metadata>
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <UBadge color="primary" variant="soft" size="xs">
            {{ getFieldCount(collection) }} fields
          </UBadge>
          <UBadge color="neutral" variant="soft" size="xs">
            {{ collection.isSystem ? "System" : "Custom" }}
          </UBadge>
          <UBadge color="info" variant="soft" size="xs">
            /{{ collection.name }}
          </UBadge>
          <UBadge color="neutral" variant="soft" size="xs">
            {{ formatCollectionDate(collection.createdAt) }}
          </UBadge>
        </div>
      </template>
    </CommonResourceListItem>
  </div>
</template>
