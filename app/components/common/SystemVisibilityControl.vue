<script setup lang="ts">
import type { SystemVisibilityMode } from "~/types/ui";

const props = withDefaults(defineProps<{
  modelValue: boolean | SystemVisibilityMode | Ref<boolean | SystemVisibilityMode> | ComputedRef<boolean | SystemVisibilityMode>;
  disabled?: boolean | Ref<boolean> | ComputedRef<boolean>;
  label?: string;
  customLabel?: string;
  systemLabel?: string;
  allLabel?: string;
}>(), {
  disabled: false,
  label: "Scope",
  customLabel: "Custom",
  systemLabel: "System",
  allLabel: "All",
});

const emit = defineEmits<{
  "update:modelValue": [value: SystemVisibilityMode];
}>();

const isDisabled = computed(() => Boolean(unref(props.disabled)));

const currentMode = computed<SystemVisibilityMode>(() => {
  const value = unref(props.modelValue);
  if (value === "custom" || value === "system" || value === "all") return value;
  return value ? "all" : "custom";
});

const options = computed(() => [
  { label: props.customLabel, value: "custom" as const },
  { label: props.systemLabel, value: "system" as const },
  { label: props.allLabel, value: "all" as const },
]);

function select(value: SystemVisibilityMode) {
  if (isDisabled.value || currentMode.value === value) return;
  emit("update:modelValue", value);
}
</script>

<template>
  <div
    class="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-[var(--control-border)] bg-[var(--control-bg)] p-1 shadow-theme-xs"
    :aria-label="`${props.label} visibility`"
  >
    <div class="mr-1 hidden items-center gap-1.5 px-2 text-xs font-semibold text-[var(--text-tertiary)] md:flex">
      <UIcon name="lucide:shield" class="h-3.5 w-3.5" />
      <span>{{ props.label }}</span>
    </div>

    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="currentMode === option.value"
      :disabled="isDisabled"
      :class="[
        'h-7 rounded-[var(--radius-subcontrol)] px-3 text-xs font-semibold transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-60',
        currentMode === option.value
          ? 'bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)]'
          : 'text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
      ]"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
