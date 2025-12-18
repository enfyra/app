<template>
  <div class="space-y-3">
    <div v-if="displayArray.length > 0" class="flex flex-wrap gap-2">
      <UBadge
        v-for="(item, index) in displayArray"
        :key="index"
        color="primary"
        variant="soft"
        class="flex items-center justify-between gap-2 cursor-pointer hover:bg-red-500/80 hover:text-gray-200 transition-all duration-200"
        size="lg"
        @click="removeItem(index)"
      >
        {{ item }}
      </UBadge>
    </div>

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

  emit("update:modelValue", currentArray);
}

watch(
  () => props.modelValue,
  (newValue) => {
    newOption.value = "";
  }
);
</script>
