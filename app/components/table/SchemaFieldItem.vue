<script setup lang="ts">
interface FieldAction {
  label: string;
  icon: string;
  color?: 'neutral' | 'primary' | 'error';
  disabled?: boolean;
  onClick: () => unknown;
}

const props = withDefaults(defineProps<{
  name: string;
  icon: string;
  actions: FieldAction[];
  deleteAction?: FieldAction;
  editable?: boolean;
}>(), { editable: true });
const emit = defineEmits<{ edit: [] }>();
const route = useRoute();
const open = ref(false);
const pending = ref<'menu' | 'delete'>();

watch(() => [route.path, props.name], () => { open.value = false; }, { flush: 'sync' });

async function runAction(action: FieldAction, kind: 'menu' | 'delete' = 'menu') {
  if (pending.value || action.disabled) return;
  const ownerPath = route.path;
  const ownerName = props.name;
  pending.value = kind;
  open.value = false;
  try {
    await nextTick();
    if (route.path !== ownerPath || props.name !== ownerName) return;
    return await action.onClick();
  } finally {
    pending.value = undefined;
  }
}

function runDeleteAction() {
  if (props.deleteAction) return runAction(props.deleteAction, 'delete');
}
</script>

<template>
  <div class="flex min-w-0 items-start gap-3 px-3 py-3">
    <component
      :is="editable ? 'button' : 'div'"
      :type="editable ? 'button' : undefined"
      class="min-w-0 flex-1 rounded-[var(--radius-subcontrol)] text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :class="editable ? 'cursor-pointer' : undefined"
      :aria-label="editable ? `Edit ${name}` : undefined"
      @click="editable && emit('edit')"
    >
      <span class="flex min-w-0 items-start gap-2">
        <UIcon :name="icon" class="size-5 shrink-0 text-muted" />
        <span class="min-w-0 line-clamp-2 text-sm font-medium leading-5 text-highlighted [overflow-wrap:anywhere]" :title="name">{{ name }}</span>
      </span>
      <span class="mt-1.5 block min-w-0 space-y-1.5 pl-7 text-xs text-muted">
        <slot />
      </span>
    </component>
    <div class="flex shrink-0 items-center gap-3">
      <UButton
        icon="lucide:ellipsis"
        color="neutral"
        variant="outline"
        size="sm"
        square
        class="relative size-8 p-0 pointer-coarse:before:absolute pointer-coarse:before:-inset-1.5 pointer-coarse:before:content-['']"
        :aria-label="`Actions for ${name}`"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :loading="pending === 'menu'"
        :disabled="!!pending"
        @click="open = true"
      />
      <UButton
        v-if="deleteAction"
        :icon="deleteAction.icon"
        :aria-label="deleteAction.label"
        color="error"
        variant="outline"
        size="sm"
        square
        class="relative size-8 p-0 pointer-coarse:before:absolute pointer-coarse:before:-inset-1.5 pointer-coarse:before:content-['']"
        :disabled="!!pending || deleteAction.disabled"
        :loading="pending === 'delete'"
        loading-auto
        @click="runDeleteAction"
      />
    </div>
    <CommonDrawer v-model="open" direction="bottom" :title="`Actions for ${name}`">
      <template #header>
        <h2 class="min-w-0 line-clamp-2 text-base font-semibold text-highlighted [overflow-wrap:anywhere]">{{ name }}</h2>
      </template>
      <template #body>
        <div class="flex flex-col gap-1 pt-3">
          <UButton
            v-for="action in actions"
            :key="action.label"
            :icon="action.icon"
            :label="action.label"
            :color="action.color || 'neutral'"
            variant="ghost"
            class="w-full justify-start whitespace-normal px-0 py-2 pointer-coarse:min-h-[44px]"
            :ui="{ label: 'text-left' }"
            :disabled="!!pending || action.disabled"
            loading-auto
            @click="runAction(action)"
          />
        </div>
      </template>
    </CommonDrawer>
  </div>
</template>
