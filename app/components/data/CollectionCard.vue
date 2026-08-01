<script setup lang="ts">
defineOptions({ name: 'DataCollectionCard' });

interface CollectionItem {
  tableName: string;
  label: string;
  icon: string;
  routePath: string;
  apiPath: string;
  description: string;
  isSingleRecord: boolean;
}

defineProps<{
  item: CollectionItem;
  pinned?: boolean;
}>();

defineEmits<{
  open: [item: CollectionItem];
  'toggle-pin': [tableName: string];
}>();
</script>

<template>
  <article
    class="surface-card-hover group relative flex flex-col p-4 cursor-pointer"
    :class="pinned ? 'ring-1 ring-[var(--state-primary-outline-border)]' : ''"
    @click="$emit('open', item)"
  >
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-[var(--radius-control)] flex items-center justify-center flex-shrink-0 accent-tile accent-tile-primary">
        <UIcon :name="item.icon" class="w-5 h-5" />
      </div>
      <div class="flex-1 min-w-0 pt-0.5">
        <div class="flex items-center gap-1.5 mb-0.5">
          <h3 class="text-sm font-semibold text-[var(--text-primary)] truncate">{{ item.label }}</h3>
          <span
            v-if="item.isSingleRecord"
            class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[var(--radius-subcontrol)] text-2xs font-medium bg-[var(--surface-muted)] text-[var(--text-tertiary)] flex-shrink-0"
          >
            <UIcon name="lucide:file-text" class="w-2.5 h-2.5" />
            Single
          </span>
        </div>
        <p class="text-xs text-[var(--text-tertiary)] font-mono truncate">{{ item.apiPath }}</p>
      </div>
      <UButton
        :icon="pinned ? 'lucide:pin' : 'lucide:pin-off'"
        :color="pinned ? 'primary' : 'neutral'"
        :variant="pinned ? 'soft' : 'ghost'"
        size="xs"
        class="!rounded-[var(--radius-subcontrol)] !aspect-square opacity-0 group-hover:opacity-100 transition-opacity"
        :class="pinned ? '!opacity-100' : ''"
        :aria-label="pinned ? `Unpin ${item.label}` : `Pin ${item.label}`"
        @click.stop="$emit('toggle-pin', item.tableName)"
      />
    </div>
    <p v-if="item.description" class="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 mt-3">
      {{ item.description }}
    </p>
  </article>
</template>

<style scoped>
</style>
