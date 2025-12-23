<template>
  <UContextMenu :items="contextMenuItems" :disabled="!canDelete">
    <div
      class="flow-node group cursor-pointer transition-all relative"
      :class="[
        nodeClass,
        data.enabled === false ? 'disabled-state' : ''
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
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-0.5 flex-wrap mb-0.5">
              <h5 class="text-[8px] font-semibold text-gray-900 dark:text-white truncate leading-tight max-w-[100px]">
                {{ data.label || 'Unnamed' }}
              </h5>
              <UBadge
                v-if="data.isDefault"
                size="xs"
                variant="soft"
                color="primary"
                class="text-[7px] px-0.5 py-0 leading-none"
              >
                Default
              </UBadge>
              <UBadge
                v-if="!data.route && !data.isDefault"
                size="xs"
                variant="soft"
                color="warning"
                class="text-[7px] px-0.5 py-0 leading-none"
              >
                Global
              </UBadge>
              <UBadge
                v-if="data.enabled === false"
                size="xs"
                variant="soft"
                color="neutral"
                class="text-[7px] px-0.5 py-0 leading-none"
              >
                Disabled
              </UBadge>
              <UBadge
                v-else-if="!data.isDefault && data.route"
                size="xs"
                variant="soft"
                color="success"
                class="text-[7px] px-0.5 py-0 leading-none"
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
    ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/40'
    : '';
  
  if (props.data.isDefault) {
    return `${baseClass} border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700`;
  }
  
  switch (props.type) {
    case 'prehook':
      return `${baseClass} border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700`;
    case 'handler':
      return `${baseClass} border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/20 hover:border-success-300 dark:hover:border-success-700`;
    case 'posthook':
      return `${baseClass} border-secondary-200 dark:border-secondary-800 bg-secondary-50 dark:bg-secondary-900/20 hover:border-secondary-300 dark:hover:border-secondary-700`;
    default:
      return `${baseClass} border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50`;
  }
});

const iconClass = computed(() => {
  if (props.data.isDefault) {
    return 'w-6 h-6 rounded bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 text-primary-600 dark:text-primary-400';
  }
  
  switch (props.type) {
    case 'prehook':
      return 'w-6 h-6 rounded bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 text-primary-600 dark:text-primary-400';
    case 'handler':
      return 'w-6 h-6 rounded bg-success-100 dark:bg-success-900/40 flex items-center justify-center flex-shrink-0 text-success-600 dark:text-success-400';
    case 'posthook':
      return 'w-6 h-6 rounded bg-secondary-100 dark:bg-secondary-900/40 flex items-center justify-center flex-shrink-0 text-secondary-600 dark:text-secondary-400';
    default:
      return 'w-6 h-6 rounded bg-gray-100 dark:bg-gray-900/40 flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-gray-400';
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


