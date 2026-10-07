<script setup lang="ts">
import { defaultPageId, isDefaultPageCandidate } from '~/utils/default-page';

const props = defineProps<{ modelValue?: unknown; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>();
const { menuDefinitions, fetchMenuDefinitions } = useMenuApi();
const { getId } = useDatabase();
const menus = computed(() => menuDefinitions.value?.data ?? []);
const options = computed(() => menus.value.filter(isDefaultPageCandidate).map(menu => ({
  label: menu.label + ' · ' + menu.path,
  value: String(getId(menu)),
})));
const selected = computed({
  get: () => defaultPageId(props.modelValue) ?? undefined,
  set: (value: string | undefined) => {
    const menu = menus.value.find(item => String(getId(item)) === value);
    emit('update:modelValue', menu ? getId(menu) : null);
  },
});
const loading = ref(false);
const loadFailed = ref(false);
async function reload() {
  loading.value = true;
  try {
    loadFailed.value = !await fetchMenuDefinitions({ showSidebarSkeleton: false });
  } finally {
    loading.value = false;
  }
}
onMounted(() => { void reload(); });
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <USelectMenu v-model="selected" :items="options" value-key="value" :loading="loading" :disabled="disabled || loading" placeholder="No default page" class="w-full" />
      <UButton v-if="selected" icon="lucide:x" color="neutral" variant="ghost" :disabled="disabled" aria-label="Clear default page" @click="selected = undefined" />
    </div>
    <p class="text-sm text-muted">Opened after login when no redirect is provided. Choose an enabled menu with a page path. The selected menu cannot be deleted until this setting is changed.</p>
    <UButton v-if="loadFailed" label="Retry loading pages" icon="lucide:refresh-cw" variant="link" @click="reload" />
  </div>
</template>
