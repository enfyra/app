<template>
  <div class="space-y-3">
    <p
      v-if="hint"
      class="text-xs leading-relaxed text-[var(--text-secondary)]"
    >
      {{ hint }}
    </p>

    <ul
      v-if="displayArray.length > 0"
      class="divide-y divide-[var(--border-default)] overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)]"
    >
      <li
        v-for="(item, index) in displayArray"
        :key="index"
        class="flex min-h-11 items-center gap-2 px-3 py-2.5"
      >
        <span
          :class="[
            'min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]',
            monospace ? 'font-mono' : '',
          ]"
          :title="item"
        >{{ item }}</span>
        <UButton
          v-if="!disabled"
          icon="i-lucide-x"
          color="error"
          variant="ghost"
          size="xs"
          class="shrink-0"
          :aria-label="'Remove ' + item"
          @click="removeItem(index)"
        />
      </li>
    </ul>

    <div
      v-else
      class="rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)]/40 px-4 py-5 text-center text-sm text-[var(--text-tertiary)]"
    >
      {{ emptyMessage }}
    </div>

    <div v-if="!disabled" class="relative">
      <UInput
        v-model="newOption"
        :placeholder="placeholder"
        :class="['w-full', monospace && 'font-mono text-sm']"
        @keyup.enter="addOption"
      >
        <template #trailing>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            variant="solid"
            size="md"
            class="rounded-md"
            :disabled="!newOption.trim()"
            @click="addOption"
          />
        </template>
      </UInput>
    </div>
  </div>
</template>

<script setup lang="ts">
import { parseFieldArrayValue } from "~/utils/components/form";

interface Props {
  modelValue?: string[] | string | null;
  disabled?: boolean;
  isNullable?: boolean;
  placeholder?: string;
  hint?: string;
  emptyMessage?: string;
  normalizeOrigin?: boolean;
  monospace?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Enter new item",
  emptyMessage: "No items yet. Add one below.",
  normalizeOrigin: false,
  monospace: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string[] | null];
}>();

const newOption = ref("");

const displayArray = computed(() => parseFieldArrayValue(props.modelValue));

function normalizeOriginValue(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  try {
    return new URL(t).origin;
  } catch {
    return t;
  }
}

function originKey(s: string): string {
  return normalizeOriginValue(s).toLowerCase();
}

function addOption() {
  const raw = newOption.value.trim();
  if (!raw) return;

  if (props.normalizeOrigin) {
    const normalized = normalizeOriginValue(raw);
    if (!normalized) return;

    const keys = new Set(displayArray.value.map((o) => originKey(o)));
    if (keys.has(originKey(normalized))) {
      newOption.value = "";
      return;
    }

    emit("update:modelValue", [...displayArray.value, normalized]);
    newOption.value = "";
    return;
  }

  emit("update:modelValue", [...displayArray.value, raw]);
  newOption.value = "";
}

function removeItem(index: number) {
  const next = [...displayArray.value];
  next.splice(index, 1);

  if (props.isNullable && next.length === 0) {
    emit("update:modelValue", null);
  } else {
    emit("update:modelValue", next);
  }
}

watch(
  () => props.modelValue,
  () => {
    newOption.value = "";

    if (props.isNullable && Array.isArray(props.modelValue) && props.modelValue.length === 0) {
      emit("update:modelValue", null);
    }
  }
);
</script>
