<template>
  <div class="space-y-3">
    <!-- Display existing options -->
    <div v-if="displayArray.length > 0" class="flex flex-wrap gap-2">
      <UBadge
        v-for="(item, index) in displayArray"
        :key="index"
        color="primary"
        variant="soft"
        class="flex items-center gap-2"
      >
        {{ item }}
        <UButton
          icon="lucide:x"
          color="primary"
          variant="ghost"
          size="xs"
          @click="removeItem(index)"
          class="p-0 h-4 w-4"
        />
      </UBadge>
    </div>

    <!-- Add new option -->
    <div class="flex gap-2">
      <UInput
        v-model="newOption"
        placeholder="Enter new option"
        class="flex-1"
        @keyup.enter="addOption"
      />
      <UButton
        @click="addOption"
        icon="lucide:plus"
        color="primary"
        variant="solid"
        size="sm"
        :disabled="!newOption.trim()"
        class="w-8 h-8 flex items-center justify-center"
      >
      </UButton>
    </div>

    <!-- Empty state -->
    <div
      v-if="displayArray.length === 0"
      class="text-sm text-gray-400 text-center py-2"
    >
      No options selected
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string[] | string;
  disabled?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const newOption = ref("");

// Parse string to array
const displayArray = computed(() => {
  if (!props.modelValue) return [];

  // If already an array, return it
  if (Array.isArray(props.modelValue)) {
    return props.modelValue;
  }

  // If it's a string, try to parse it
  try {
    if (props.modelValue.startsWith("[") && props.modelValue.endsWith("]")) {
      // Remove outer brackets and split by comma, then clean each item
      const content = props.modelValue.slice(1, -1);
      if (!content.trim()) return [];

      return content
        .split(",")
        .map((item: string) => {
          // Clean up escaped quotes and extra characters
          let cleaned = item.trim();
          // Remove outer quotes if they exist
          if (
            (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
            (cleaned.startsWith("'") && cleaned.endsWith("'"))
          ) {
            cleaned = cleaned.slice(1, -1);
          }
          // Remove escape characters
          cleaned = cleaned.replace(/\\"/g, '"').replace(/\\'/g, "'");
          return cleaned;
        })
        .filter((item: string) => item.length > 0); // Filter out empty items
    }
    return [];
  } catch {
    return [];
  }
});

// Add new option
function addOption() {
  if (!newOption.value.trim()) return;

  const currentArray = [...displayArray.value];
  currentArray.push(newOption.value.trim());

  // Emit array directly
  emit("update:modelValue", currentArray);

  newOption.value = "";
}

// Remove option
function removeItem(index: number) {
  const currentArray = [...displayArray.value];
  currentArray.splice(index, 1);

  // Emit array directly
  emit("update:modelValue", currentArray);
}

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    // Reset newOption if external value changes
    newOption.value = "";
  }
);
</script>
