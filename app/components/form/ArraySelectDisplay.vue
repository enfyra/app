<template>
  <div class="space-y-3">
    <div v-if="displayArray.length > 0" class="flex flex-wrap gap-2">
      <UBadge
        v-for="(item, index) in displayArray"
        :key="index"
        color="primary"
        variant="outline"
        class="cursor-pointer hover:bg-red-500 hover:text-white hover:!border-red-500 transition-all duration-200"
        size="lg"
        @click="removeItem(index)"
      >
        {{ item }}
      </UBadge>
    </div>

    <div
      v-else
      class="text-xs text-[var(--text-tertiary)] italic"
    >
      No items added yet
    </div>

    <div class="relative">
      <UInput
        v-model="newOption"
        placeholder="Enter new item"
        class="w-full"
        @keyup.enter="addOption"
      >
        <template #trailing>
          <UButton
            @click="addOption"
            icon="lucide:plus"
            color="primary"
            variant="solid"
            size="md"
            :disabled="!newOption.trim()"
            class="rounded-md"
          />
        </template>
      </UInput>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string[] | string | null;
  disabled?: boolean;
  isNullable?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:modelValue": [value: string[] | null];
}>();

const newOption = ref("");

const displayArray = computed(() => {
  if (!props.modelValue) return [];

  if (Array.isArray(props.modelValue)) {
    return props.modelValue;
  }

  try {
    if (props.modelValue.startsWith("[") && props.modelValue.endsWith("]")) {
      const content = props.modelValue.slice(1, -1);
      if (!content.trim()) return [];

      return content
        .split(",")
        .map((item: string) => {
          let cleaned = item.trim();
          if (
            (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
            (cleaned.startsWith("'") && cleaned.endsWith("'"))
          ) {
            cleaned = cleaned.slice(1, -1);
          }

          cleaned = cleaned.replace(/\\"/g, '"').replace(/\\'/g, "'");
          return cleaned;
        })
        .filter((item: string) => item.length > 0);
    }
    return [];
  } catch {
    return [];
  }
});

function addOption() {
  if (!newOption.value.trim()) return;
  const currentArray = [...displayArray.value];
  currentArray.push(newOption.value.trim());
  emit("update:modelValue", currentArray);
  newOption.value = "";
}

function removeItem(index: number) {
  const currentArray = [...displayArray.value];
  currentArray.splice(index, 1);

  if (props.isNullable && currentArray.length === 0) {
    emit("update:modelValue", null);
  } else {
    emit("update:modelValue", currentArray);
  }
}

watch(
  () => props.modelValue,
  (newValue) => {
    newOption.value = "";

    if (props.isNullable && Array.isArray(newValue) && newValue.length === 0) {
      emit("update:modelValue", null);
    }
  }
);
</script>
