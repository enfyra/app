<template>
  <UContextMenu :items="contextMenuItems" :disabled="!canDelete">
    <div
      class="flow-node group transition-all relative"
      :class="[
        nodeClass,
        data.enabled === false ? 'disabled-state' : '',
        data.isDefault ? 'cursor-default' : 'cursor-pointer',
      ]"
      @click="handleClick"
    >
      <Handle type="target" :position="Position.Left" :style="{ top: '50%', transform: 'translateY(-50%)', opacity: 0 }" />
      <Handle type="source" :position="Position.Right" :style="{ top: '50%', transform: 'translateY(-50%)', opacity: 0 }" />
      <div v-if="data.enabled !== false" class="status-indicator"></div>
      <div class="flow-node-content">
        <div class="flex items-start gap-1.5">
          <div :class="iconClass">
            <UIcon :name="iconName" class="w-3.5 h-3.5" />
          </div>
          <div class="flex-1 min-w-0 overflow-hidden">
            <div class="flex items-center gap-1 overflow-hidden mb-0.5">
              <h5
                :class="[
                  'text-[9px] font-semibold truncate min-w-0 leading-tight',
                  isPrimaryTone ? 'flow-node-primary-title' : 'text-[var(--text-primary)]',
                ]"
              >
                {{ data.isDefault ? 'Built-in logic' : (data.label || 'Unnamed') }}
              </h5>
              <UBadge
                v-if="data.isDefault"
                size="xs"
                variant="soft"
                color="primary"
                class="!text-[9px] !px-1.5 !py-0.5 font-semibold leading-none shrink-0"
              >
                Built-in
              </UBadge>
              <UBadge
                v-if="!data.route && !data.isDefault"
                size="xs"
                variant="soft"
                color="neutral"
                :class="globalBadgeClass"
              >
                Global
              </UBadge>
              <UBadge
                v-if="data.enabled === false"
                size="xs"
                variant="soft"
                color="neutral"
                class="!text-[9px] !px-1.5 !py-0.5 font-semibold leading-none shrink-0"
              >
                Disabled
              </UBadge>
              <UBadge
                v-else-if="!data.isDefault && data.route"
                size="xs"
                variant="soft"
                color="success"
                class="!text-[9px] !px-1.5 !py-0.5 font-semibold leading-none shrink-0"
              >
                Enabled
              </UBadge>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UContextMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';

interface Props {
  data: any;
  type: 'prehook' | 'handler' | 'posthook';
  onClick?: () => void;
  onDelete?: () => void;
}

const props = defineProps<Props>();

function handleClick() {
  if (props.data?.isDefault) return;
  if (props.onClick) {
    props.onClick();
  }
}

function handleDelete() {
  if (props.onDelete) {
    props.onDelete();
  }
}

const canDelete = computed(() => {
  // Không thể xóa default handler hoặc system handler/hook
  if (props.data.isDefault || props.data.isSystem) {
    return false;
  }
  return true;
});

const isPrimaryTone = computed(() => props.data.isDefault || props.type === 'prehook');

const globalBadgeClass = computed(() => [
  '!text-[9px] !px-1.5 !py-0.5 font-semibold leading-none shrink-0',
  isPrimaryTone.value ? 'flow-node-global-badge' : '',
]);

const contextMenuItems = computed(() => {
  if (!canDelete.value) {
    return [];
  }
  
  return [
    [
      {
        label: 'Delete',
        icon: 'lucide:trash-2',
        color: 'error' as const,
        onSelect: () => {
          handleDelete();
        },
      },
    ],
  ];
});

const nodeClass = computed(() => {
  const baseClass = props.data.enabled === false 
    ? 'border-[var(--border-default)] bg-[var(--surface-muted)]'
    : '';
  
  if (props.data.isDefault) {
    return `${baseClass} flow-node-primary`;
  }

  switch (props.type) {
    case 'prehook':
      return `${baseClass} flow-node-primary`;
    case 'handler':
      return `${baseClass} flow-node-success`;
    case 'posthook':
      return `${baseClass} flow-node-info`;
    default:
      return `${baseClass} border-[var(--border-default)] bg-[var(--surface-muted)]`;
  }
});

const iconClass = computed(() => {
  if (props.data.isDefault) {
    return 'flow-node-primary-icon w-6 h-6 rounded flex items-center justify-center flex-shrink-0';
  }
  
  switch (props.type) {
    case 'prehook':
      return 'flow-node-primary-icon w-6 h-6 rounded flex items-center justify-center flex-shrink-0';
    case 'handler':
      return 'flow-node-success-icon w-6 h-6 rounded flex items-center justify-center flex-shrink-0';
    case 'posthook':
      return 'flow-node-info-icon w-6 h-6 rounded flex items-center justify-center flex-shrink-0';
    default:
      return 'w-6 h-6 rounded bg-[var(--surface-muted)] flex items-center justify-center flex-shrink-0 text-[var(--text-tertiary)]';
  }
});

const iconName = computed(() => {
  if (props.data.isDefault) {
    return 'lucide:sparkles';
  }
  
  switch (props.type) {
    case 'prehook':
    case 'posthook':
      return 'lucide:link';
    case 'handler':
      return 'lucide:command';
    default:
      return 'lucide:circle';
  }
});

</script>

<style scoped>
.flow-node-primary {
  border-color: color-mix(in srgb, var(--md-primary) 58%, var(--flow-node-border));
  background: color-mix(in srgb, var(--md-primary) 18%, var(--flow-node-bg));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-primary) 18%, transparent);
}

.flow-node-primary:hover {
  border-color: var(--md-primary);
}

.flow-node-primary-title {
  color: color-mix(in srgb, var(--md-primary) 54%, var(--text-primary));
}

.flow-node-primary-icon {
  color: color-mix(in srgb, var(--md-primary) 72%, var(--text-primary));
  background: color-mix(in srgb, var(--md-primary) 28%, var(--flow-node-bg));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-primary) 34%, transparent);
}

.flow-node-global-badge {
  color: color-mix(in srgb, var(--md-primary) 54%, var(--text-primary)) !important;
  background: color-mix(in srgb, var(--md-primary) 20%, var(--flow-node-bg)) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-primary) 34%, transparent);
}

.flow-node-success {
  border-color: color-mix(in srgb, var(--success-color) 50%, var(--flow-node-border));
  background: color-mix(in srgb, var(--success-color) 13%, var(--flow-node-bg));
}

.flow-node-success:hover {
  border-color: color-mix(in srgb, var(--success-color) 72%, var(--flow-node-border));
}

.flow-node-info {
  border-color: color-mix(in srgb, var(--info-color) 50%, var(--flow-node-border));
  background: color-mix(in srgb, var(--info-color) 13%, var(--flow-node-bg));
}

.flow-node-info:hover {
  border-color: color-mix(in srgb, var(--info-color) 72%, var(--flow-node-border));
}

.flow-node-success-icon,
.flow-node-info-icon {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 28%, transparent);
}

.flow-node-success-icon {
  color: color-mix(in srgb, var(--success-color) 72%, var(--text-primary));
  background: color-mix(in srgb, var(--success-color) 26%, var(--flow-node-bg));
}

.flow-node-info-icon {
  color: color-mix(in srgb, var(--info-color) 72%, var(--text-primary));
  background: color-mix(in srgb, var(--info-color) 26%, var(--flow-node-bg));
}
</style>
