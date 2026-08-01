<script setup lang="ts">
defineOptions({ name: 'DataDirectorySearchBar' });

const props = defineProps<{
  modelValue: string;
  sortBy: 'name' | 'recent';
  total: number;
  matchCount?: number;
  loading?: boolean;
  hasSearch?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:sortBy': [value: 'name' | 'recent'];
  clear: [];
}>();

const searchRef = ref<HTMLElement | null>(null);

function focusSearch() {
  searchRef.value?.querySelector<HTMLInputElement>('input')?.focus();
}

function clearSearch() {
  emit('update:modelValue', '');
  nextTick(focusSearch);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

function handleShortcut(event: KeyboardEvent) {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) return;
  event.preventDefault();
  focusSearch();
}

onMounted(() => window.addEventListener('keydown', handleShortcut));
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut));
</script>

<template>
  <div class="surface-card rounded-[var(--radius-card)] overflow-hidden">
    <div ref="searchRef" class="flex items-center gap-3 px-4 py-3">
      <UIcon name="lucide:search" class="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" />
      <input
        id="collection-search"
        :value="modelValue"
        type="text"
        placeholder="Search collections, tables, or /api/path…"
        autocomplete="off"
        class="flex-1 min-w-0 bg-transparent border-0 outline-0 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @keydown.esc="clearSearch"
      />
      <UKbd v-if="!hasSearch" value="/" class="flex-shrink-0" />
      <UButton v-else icon="lucide:x" color="neutral" variant="ghost" size="xs" class="!rounded-[var(--radius-subcontrol)] !aspect-square flex-shrink-0" aria-label="Clear search" @click="clearSearch" />
    </div>
    <div class="flex items-center justify-between px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface-nested)]">
      <span class="text-xs text-[var(--text-tertiary)]">
        <template v-if="loading">Loading…</template>
        <template v-else-if="hasSearch"><strong class="text-[var(--text-primary)]">{{ matchCount }}</strong> {{ matchCount === 1 ? 'match' : 'matches' }}</template>
        <template v-else><strong class="text-[var(--text-primary)]">{{ total }}</strong> collections</template>
      </span>
      <div class="flex items-center gap-1">
        <UButton icon="lucide:arrow-down-a-z" :color="sortBy === 'name' ? 'primary' : 'neutral'" :variant="sortBy === 'name' ? 'soft' : 'ghost'" size="xs" :aria-pressed="sortBy === 'name'" @click="emit('update:sortBy', 'name')">A–Z</UButton>
        <UButton icon="lucide:history" :color="sortBy === 'recent' ? 'primary' : 'neutral'" :variant="sortBy === 'recent' ? 'soft' : 'ghost'" size="xs" :aria-pressed="sortBy === 'recent'" @click="emit('update:sortBy', 'recent')">Recent</UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Tailwind v4 requires a style block */
</style>
