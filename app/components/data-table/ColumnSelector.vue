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

// Simple local state for checkbox values
const localCheckedState = ref<Record<string, boolean>>({});

// Initialize local state when modal opens
const initializeState = () => {
  const state: Record<string, boolean> = {};
  props.items.forEach(item => {
    state[item.label] = item.checked;
  });
  localCheckedState.value = state;
};

// Watch modal open to initialize state
watch(isOpen, (newValue) => {
  if (newValue) {
    initializeState();
  }
});

// Handle checkbox change - just update local state
const handleCheckboxChange = (label: string, checked: boolean) => {
  localCheckedState.value[label] = checked;
};

// Apply changes - call onToggle for items that changed
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

// Cancel changes - just close modal
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

    <Teleport to="body">
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
          <div class="space-y-3">
            <div
              v-for="item in props.items"
              :key="item.label"
              class="flex items-center gap-3"
            >
              <UCheckbox
                :model-value="localCheckedState[item.label]"
                @update:model-value="(checked: boolean | string) => handleCheckboxChange(item.label, Boolean(checked))"
              />
              <span>{{ item.label }}</span>
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
    </Teleport>
  </div>
</template>