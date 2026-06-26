<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';

interface Props {
  items: Array<{
    label: string;
    checked: boolean;
    onToggle: () => void;
  }>;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "solid" | "outline" | "ghost" | "soft";
  color?: "error" | "info" | "success" | "secondary" | "primary" | "warning" | "neutral";
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  variant: "soft",
  color: "neutral",
});

const isOpen = ref(false);
const showButton = ref(true);

function checkScreenSize() {
  showButton.value = window.innerWidth >= 1024;
}

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkScreenSize);
});

const localCheckedState = ref<Record<string, boolean>>({});

const initializeState = () => {
  const state: Record<string, boolean> = {};
  props.items.forEach(item => {
    state[item.label] = item.checked;
  });
  localCheckedState.value = state;
};

watch(isOpen, (newValue) => {
  if (newValue) {
    initializeState();
  }
});

const handleCheckboxChange = (label: string, checked: boolean) => {
  localCheckedState.value[label] = checked;
};

const applyChanges = () => {
  props.items.forEach(item => {
    const newState = localCheckedState.value[item.label];
    const oldState = item.checked;
    
    if (newState !== oldState && item.onToggle) {
      item.onToggle();
    }
  });
  isOpen.value = false;
};

const cancelChanges = () => {
  isOpen.value = false;
};
</script>

<template>
  <div v-if="showButton">
    <UButton
      icon="i-lucide-columns"
      :size="size"
      :variant="variant"
      :color="color"
      @click="isOpen = true"
    >
      Columns
    </UButton>

      <UModal v-model:open="isOpen">
        <template #header>
          <div class="flex justify-between items-center w-full">
            <div class="text-base font-semibold">
              Select Columns
            </div>
            <UButton
              icon="lucide:x"
              color="error"
              variant="soft"
              @click="cancelChanges"
            >
              Close
            </UButton>
          </div>
        </template>

        <template #body>
          <div class="space-y-2">
            <div
              v-for="item in props.items"
              :key="item.label"
              role="button"
              tabindex="0"
              :class="[
                'flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-panel)] border px-3 py-2.5 text-left transition-colors',
                localCheckedState[item.label]
                  ? 'eapp-accent-soft'
                  : 'border-[var(--border-default)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-default)]',
              ]"
              @click="handleCheckboxChange(item.label, !localCheckedState[item.label])"
              @keydown.enter.prevent="handleCheckboxChange(item.label, !localCheckedState[item.label])"
              @keydown.space.prevent="handleCheckboxChange(item.label, !localCheckedState[item.label])"
            >
              <UCheckbox
                :model-value="localCheckedState[item.label]"
                color="primary"
                size="lg"
                :ui="{ root: 'pointer-events-none', label: 'sr-only' }"
                @update:model-value="(checked: boolean | string) => handleCheckboxChange(item.label, Boolean(checked))"
              />
              <span class="min-w-0 truncate text-sm font-medium">{{ item.label }}</span>
            </div>
          </div>
        </template>

        <template #footer>
          <div class="w-full">
            <UButton
              @click="applyChanges"
              variant="solid"
              color="primary"
              size="lg"
              block
            >
              Apply
            </UButton>
          </div>
        </template>
      </UModal>
  </div>
</template>
