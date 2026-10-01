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
  <div class="flex min-w-0 flex-wrap items-center gap-3">
    <div ref="searchRef" class="min-w-0 w-full sm:w-80">
      <UInput
        id="collection-search"
        :model-value="modelValue"
        type="text"
        placeholder="Search collections, tables, or /api/path…"
        autocomplete="off"
        icon="lucide:search"
        class="w-full"
        @update:model-value="emit('update:modelValue', String($event))"
        @keydown.esc="clearSearch"
      >
        <template #trailing>
          <UKbd v-if="!hasSearch" value="/" />
          <UButton v-else icon="lucide:x" color="neutral" variant="ghost" size="xs" aria-label="Clear search" @click="clearSearch" />
        </template>
      </UInput>
    </div>
    <div class="flex flex-wrap items-center gap-3">
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
