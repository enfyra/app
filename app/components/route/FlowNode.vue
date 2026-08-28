<template>
  <div
    class="route-execution-node"
    :class="[
      `route-execution-node-${type}`,
      {
        'route-execution-node-disabled': data.enabled === false,
        'route-execution-node-default': isDefault,
      },
    ]"
  >
    <button
      type="button"
      class="route-execution-node-main"
      :aria-label="actionLabel"
      @click="handleClick"
    >
      <span class="route-execution-node-icon">
        <UIcon :name="iconName" class="size-4" />
      </span>

      <span class="min-w-0 flex-1 text-left">
        <span class="flex min-w-0 items-center gap-1.5">
          <span class="truncate text-xs font-semibold text-[var(--text-primary)]">
            {{ title }}
          </span>
          <span v-if="data.sequence" class="route-execution-sequence">
            {{ data.sequence }}
          </span>
        </span>
        <span v-if="data.description" class="mt-0.5 block truncate text-[11px] text-[var(--text-tertiary)]">
          {{ data.description }}
        </span>
        <span class="mt-1.5 flex flex-wrap items-center gap-1">
          <span v-if="isDefault" class="route-execution-badge route-execution-badge-primary">
            Built-in
          </span>
          <span v-if="isGlobal" class="route-execution-badge route-execution-badge-neutral">
            Global
          </span>
          <span v-if="data.enabled === false" class="route-execution-badge route-execution-badge-warning">
            Disabled
          </span>
          <span v-else-if="!isDefault" class="route-execution-badge route-execution-badge-success">
            Active
          </span>
        </span>
      </span>

      <span v-if="isDefault" class="route-execution-node-action">
        Customize
      </span>
      <UIcon v-else name="lucide:chevron-right" class="size-4 shrink-0 text-[var(--text-quaternary)]" />
    </button>

    <UDropdownMenu v-if="menuItems.length" :items="menuItems">
      <UButton
        icon="lucide:ellipsis-vertical"
        color="neutral"
        variant="ghost"
        size="xs"
        class="route-execution-node-menu"
        :aria-label="`Open actions for ${title}`"
        @click.stop
      />
    </UDropdownMenu>
  </div>
</template>

<script setup lang="ts">
interface Props {
  data: any;
  type: 'prehook' | 'handler' | 'posthook';
  onClick?: () => void;
  onDelete?: () => void;
  onInsertAfter?: () => void;
  onToggle?: (enabled: boolean) => void;
}

const props = defineProps<Props>();

const isDefault = computed(() => props.data._isDefault === true || props.data.isDefault === true);
const isGlobal = computed(() => props.type !== 'handler' && (props.data.isGlobal === true || (!props.data.route && !isDefault.value)));

const title = computed(() => {
  if (isDefault.value) return 'Built-in logic';
  return props.data.label || props.data.name || 'Unnamed';
});

const actionLabel = computed(() => {
  if (isDefault.value) return `Customize ${title.value}`;
  return `Edit ${title.value}`;
});

const iconName = computed(() => {
  if (isDefault.value) return 'lucide:sparkles';
  if (props.type === 'prehook') return 'lucide:log-in';
  if (props.type === 'posthook') return 'lucide:log-out';
  return 'lucide:play';
});

const menuItems = computed(() => {
  const items: any[] = [];

  if (props.onInsertAfter) {
    items.push({
      label: 'Add hook after',
      icon: 'lucide:plus',
      onSelect: props.onInsertAfter,
    });
  }

  if (!isDefault.value && !props.data.isSystem && props.onToggle) {
    items.push({
      label: props.data.enabled === false ? 'Enable' : 'Disable',
      icon: props.data.enabled === false ? 'lucide:circle-check' : 'lucide:circle-off',
      onSelect: () => props.onToggle?.(props.data.enabled === false),
    });
  }

  if (!isDefault.value && !props.data.isSystem && props.onDelete) {
    if (items.length) items.push({ type: 'separator' });
    items.push({
      label: 'Delete',
      icon: 'lucide:trash-2',
      color: 'error' as const,
      onSelect: props.onDelete,
    });
  }

  return items;
});

function handleClick() {
  props.onClick?.();
}
</script>

<style scoped>
.route-execution-node {
  position: relative;
  display: flex;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-default);
  box-shadow: var(--shadow-xs);
  transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard);
}

.route-execution-node::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  content: '';
  background: var(--execution-node-accent);
}

.route-execution-node:hover,
.route-execution-node:focus-within {
  border-color: color-mix(in srgb, var(--execution-node-accent) 55%, var(--border-default));
  box-shadow: var(--shadow-sm);
}

.route-execution-node-prehook {
  --execution-node-accent: var(--md-primary);
  --execution-node-soft: var(--state-primary-soft-bg);
  --execution-node-text: var(--state-primary-soft-text);
}

.route-execution-node-handler {
  --execution-node-accent: var(--st-success);
  --execution-node-soft: var(--state-success-soft-bg);
  --execution-node-text: var(--state-success-soft-text);
}

.route-execution-node-posthook {
  --execution-node-accent: var(--st-info);
  --execution-node-soft: var(--state-info-soft-bg);
  --execution-node-text: var(--state-info-soft-text);
}

.route-execution-node-default {
  border-style: dashed;
  background: color-mix(in srgb, var(--execution-node-soft) 45%, var(--surface-default));
}

.route-execution-node-disabled {
  opacity: 0.62;
}

.route-execution-node-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 0.625rem 0.75rem 0.875rem;
  text-align: left;
}

.route-execution-node-icon {
  display: flex;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-subcontrol);
  color: var(--execution-node-text);
  background: var(--execution-node-soft);
}

.route-execution-node-action {
  flex: 0 0 auto;
  font-size: 0.6875rem;
  font-weight: 650;
  color: var(--execution-node-text);
}

.route-execution-node-menu {
  align-self: center;
  margin-right: 0.375rem;
}

.route-execution-sequence,
.route-execution-badge {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-subcontrol);
  font-size: 0.5625rem;
  font-weight: 700;
  line-height: 1rem;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.route-execution-sequence {
  min-width: 1rem;
  justify-content: center;
  color: var(--text-tertiary);
  background: var(--surface-muted);
}

.route-execution-badge {
  padding: 0 0.3125rem;
}

.route-execution-badge-primary {
  color: var(--state-primary-soft-text);
  background: var(--state-primary-soft-bg);
}

.route-execution-badge-success {
  color: var(--state-success-soft-text);
  background: var(--state-success-soft-bg);
}

.route-execution-badge-warning {
  color: var(--state-warning-soft-text);
  background: var(--state-warning-soft-bg);
}

.route-execution-badge-neutral {
  color: var(--text-tertiary);
  background: var(--surface-muted);
}
</style>
