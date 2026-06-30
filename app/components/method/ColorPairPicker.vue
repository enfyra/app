<script setup lang="ts">
import {
  METHOD_COLOR_PRESETS,
  getMethodColors,
  isHexColor,
  type MethodColorRecord,
} from '~/utils/http.constants';

const props = withDefaults(
  defineProps<{
    buttonColor: string;
    textColor: string;
    method?: string;
    disabled?: boolean;
  }>(),
  {
    method: 'METHOD',
  },
);

const emit = defineEmits<{
  'update:buttonColor': [value: string];
  'update:textColor': [value: string];
}>();

const showCustom = ref(false);

const previewMethod = computed<MethodColorRecord>(() => ({
  name: props.method || 'METHOD',
  buttonColor: props.buttonColor,
  textColor: props.textColor,
}));

const currentColors = computed(() => getMethodColors(previewMethod.value));
const customPreviewColors = computed(() => ({
  buttonColor: isHexColor(props.buttonColor) ? props.buttonColor.trim().toLowerCase() : currentColors.value.buttonColor,
  textColor: isHexColor(props.textColor) ? props.textColor.trim().toLowerCase() : currentColors.value.textColor,
}));

const selectedPresetLabel = computed(() => {
  if (!isHexColor(props.buttonColor) || !isHexColor(props.textColor)) {
    return null;
  }
  const current = currentColors.value;
  return METHOD_COLOR_PRESETS.find(
    (preset) =>
      preset.buttonColor === current.buttonColor &&
      preset.textColor === current.textColor,
  )?.label || null;
});

function choosePreset(preset: (typeof METHOD_COLOR_PRESETS)[number]) {
  if (props.disabled) return;
  emit('update:buttonColor', preset.buttonColor);
  emit('update:textColor', preset.textColor);
  showCustom.value = false;
}

function updateButtonColor(value: string) {
  emit('update:buttonColor', value);
}

function updateTextColor(value: string) {
  emit('update:textColor', value);
}

function updateColorInput(kind: 'button' | 'text', event: Event) {
  const value = (event.target as HTMLInputElement).value;
  if (kind === 'button') {
    updateButtonColor(value);
  } else {
    updateTextColor(value);
  }
}

function getPresetButtonStyle(preset: (typeof METHOD_COLOR_PRESETS)[number]) {
  if (selectedPresetLabel.value !== preset.label) return undefined;
  return {
    borderColor: preset.textColor,
    backgroundColor: `${preset.buttonColor}33`,
  };
}
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        v-for="preset in METHOD_COLOR_PRESETS"
        :key="preset.label"
        type="button"
        :disabled="disabled"
        class="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-default)] px-3 py-2 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        :style="getPresetButtonStyle(preset)"
        @click="choosePreset(preset)"
      >
        <div class="flex min-w-0 items-center gap-2">
          <MethodBadge
            :method="{
              name: method || 'METHOD',
              buttonColor: preset.buttonColor,
              textColor: preset.textColor,
            }"
          />
          <span class="min-w-0">
            <span class="block truncate text-sm font-medium text-[var(--text-primary)]">
              {{ preset.label }}
            </span>
            <span class="block truncate text-xs text-[var(--text-tertiary)]">
              Background {{ preset.buttonColor }} · Text {{ preset.textColor }}
            </span>
          </span>
        </div>
        <UIcon
          :name="selectedPresetLabel === preset.label ? 'lucide:check' : 'lucide:circle'"
          class="size-4 shrink-0"
          :class="selectedPresetLabel === preset.label ? '' : 'text-[var(--text-tertiary)]'"
          :style="selectedPresetLabel === preset.label ? { color: preset.textColor } : undefined"
        />
      </button>
    </div>

    <button
      type="button"
      :disabled="disabled"
      class="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
      :class="showCustom ? 'border-[var(--state-primary-outline-border)] bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)]' : 'border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'"
      @click="showCustom = !showCustom"
    >
      <span class="flex min-w-0 items-center gap-3">
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          :class="showCustom ? 'bg-[var(--surface-default)] text-[var(--state-primary-soft-text)]' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'"
        >
          <UIcon name="lucide:palette" class="size-4" />
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold">
            {{ showCustom ? 'Hide custom colors' : 'Use custom hex colors' }}
          </span>
          <span class="block text-xs text-[var(--text-tertiary)]">
            Enter exact background and text hex values.
          </span>
        </span>
      </span>
      <UIcon :name="showCustom ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-4 shrink-0" />
    </button>

    <div
      v-if="showCustom"
      class="space-y-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-nested)] p-3"
    >
      <div
        class="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2"
      >
        <span class="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Preview
        </span>
        <span
          class="rounded-md px-2 py-1 font-mono text-xs font-semibold uppercase ring-1 ring-inset"
          :style="{
            backgroundColor: customPreviewColors.buttonColor,
            color: customPreviewColors.textColor,
            '--tw-ring-color': customPreviewColors.textColor + '55',
          }"
        >
          {{ method || 'METHOD' }}
        </span>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Background color
          </span>
          <div class="flex gap-2">
            <input
              :value="customPreviewColors.buttonColor"
              type="color"
              class="h-10 w-12 cursor-pointer rounded-md border border-[var(--border-default)] bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="disabled"
              @input="updateColorInput('button', $event)"
            >
            <UInput
              :model-value="buttonColor"
              class="font-mono"
              :color="isHexColor(buttonColor) ? 'neutral' : 'error'"
              :disabled="disabled"
              placeholder="#f1f5f9"
              @update:model-value="updateButtonColor(String($event))"
            />
          </div>
        </label>

        <label class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Text color
          </span>
          <div class="flex gap-2">
            <input
              :value="customPreviewColors.textColor"
              type="color"
              class="h-10 w-12 cursor-pointer rounded-md border border-[var(--border-default)] bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="disabled"
              @input="updateColorInput('text', $event)"
            >
            <UInput
              :model-value="textColor"
              class="font-mono"
              :color="isHexColor(textColor) ? 'neutral' : 'error'"
              :disabled="disabled"
              placeholder="#334155"
              @update:model-value="updateTextColor(String($event))"
            />
          </div>
        </label>
      </div>

      <p
        v-if="!isHexColor(buttonColor) || !isHexColor(textColor)"
        class="text-xs font-medium text-[var(--form-error-text)]"
      >
        Colors must be full hex values such as #1d4ed8.
      </p>
    </div>
  </div>
</template>
