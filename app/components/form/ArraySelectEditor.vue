<script setup lang="ts">
const props = defineProps<{
  options: string[];
  disabled?: boolean;
}>();

const model = defineModel<any[]>();

if (!Array.isArray(model.value)) {
  model.value = [];
}
const selectedArr = ref<string[]>(model.value);

function changeItem() {
  model.value = selectedArr.value as any;
}

watch(
  () => selectedArr.value,
  () => {
    changeItem();
  }
);
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-2">
      <USelectMenu
        v-model="selectedArr"
        :items="props.options"
        placeholder="Select values"
        class="flex-1"
        :disabled="disabled"
        multiple
      />
    </div>
  </div>
</template>
