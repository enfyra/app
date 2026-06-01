<script setup lang="ts">
import {
  METHOD_COLOR_PRESETS,
  isHexColor,
  normalizeHexColor,
} from '~/utils/http.constants';

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    pairedValue?: string | null;
    role?: 'button' | 'text';
    disabled?: boolean;
  }>(),
  {
    modelValue: null,
    pairedValue: null,
    role: 'button',
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const fallback = computed(() => (props.role === 'text' ? '#334155' : '#f1f5f9'));
const value = computed(() => normalizeHexColor(props.modelValue, fallback.value));
const paired = computed(() => normalizeHexColor(props.pairedValue, props.role === 'text' ? '#f1f5f9' : '#334155'));
const textValue = ref(value.value);

watch(value, (next) => {
  textValue.value = next;
});

function choose(color: string) {
  if (props.disabled) return;
  emit('update:modelValue', normalizeHexColor(color, fallback.value));
}

function commitText() {
  if (props.disabled) return;
  emit('update:modelValue', normalizeHexColor(textValue.value, value.value));
}
</script>

<template>
  <div class="space-y-3">
    <div
      class="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2"
    >
      <span class="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        Preview
      </span>
      <span
        class="rounded-md px-2 py-1 font-mono text-xs font-semibold uppercase ring-1 ring-inset"
        :style="role === 'text'
          ? { backgroundColor: paired, color: value, '--tw-ring-color': value + '33' }
          : { backgroundColor: value, color: paired, '--tw-ring-color': paired + '33' }"
      >
        METHOD
      </span>
    </div>

    <div class="grid grid-cols-7 gap-2">
      <button
        v-for="preset in METHOD_COLOR_PRESETS"
        :key="preset.label"
        type="button"
        class="h-8 rounded-md border border-[var(--border-default)] ring-offset-2 ring-offset-[var(--surface-default)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
        :title="preset.label"
        :disabled="disabled"
        :style="{ backgroundColor: role === 'text' ? preset.textColor : preset.buttonColor }"
        @click="choose(role === 'text' ? preset.textColor : preset.buttonColor)"
      />
    </div>

    <div class="flex gap-2">
      <input
        :value="value"
        type="color"
        class="h-10 w-12 cursor-pointer rounded-md border border-[var(--border-default)] bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="disabled"
        @input="choose(($event.target as HTMLInputElement).value)"
      >
      <UInput
        v-model="textValue"
        class="font-mono"
        :color="isHexColor(textValue) ? 'neutral' : 'error'"
        :disabled="disabled"
        placeholder="#f1f5f9"
        @blur="commitText"
        @keydown.enter.prevent="commitText"
      />
    </div>
  </div>
</template>
