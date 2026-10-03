<script setup lang="ts">
import type { HeaderAction } from '~/types/ui';

const { isDesktop, menuActions, runAction } = useSubHeaderActionPresentation();
const route = useRoute();
const open = ref(false);
const pending = ref<string>();

watch(() => route.path, () => { open.value = false; }, { flush: 'sync' });
watch(() => isDesktop.value || menuActions.value.length === 0, hidden => {
  if (hidden) open.value = false;
}, { flush: 'sync' });

async function selectAction(action: HeaderAction) {
  if (pending.value || unref(action.disabled) || unref(action.loading)) return;
  pending.value = action.id;
  open.value = false;
  try {
    await nextTick();
    return await runAction(action);
  } finally {
    pending.value = undefined;
  }
}
</script>

<template>
  <template v-if="!isDesktop && menuActions.length">
    <UButton
      icon="lucide:ellipsis"
      color="neutral"
      variant="outline"
      size="lg"
      square
      :class="[getHeaderActionButtonClass({}), '!w-9 relative pointer-coarse:before:absolute pointer-coarse:before:-inset-1 pointer-coarse:before:content-[\'\']']"
      aria-label="More page actions"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :loading="!!pending"
      :disabled="!!pending"
      @click="open = true"
    />
    <CommonDrawer v-model="open" direction="bottom" title="Page actions">
      <template #header>
        <h2 class="text-base font-semibold text-highlighted">Page actions</h2>
      </template>
      <template #body>
        <div class="flex flex-col gap-1 pt-3">
          <template v-for="action in menuActions" :key="action.key || action.id">
            <component v-if="action.component" :is="action.component" v-bind="action.props" />
            <UButton
              v-else
              :icon="unref(action.icon)"
              :label="unref(action.label) || action.ariaLabel || action.id"
              :color="unref(action.color) || 'neutral'"
              variant="ghost"
              class="w-full justify-start whitespace-normal px-0 py-2 pointer-coarse:min-h-[44px]"
              :ui="{ label: 'text-left' }"
              :disabled="!!pending || unref(action.disabled) || unref(action.loading)"
              :loading="unref(action.loading) || pending === action.id"
              loading-auto
              @click="selectAction(action)"
            />
          </template>
        </div>
      </template>
    </CommonDrawer>
  </template>
</template>
