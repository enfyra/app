<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: any;
    disabled?: boolean;
    multiple?: boolean;
  }>(),
  {
    multiple: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const { getId } = useDatabase();

const methodColorMap: Record<string, 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
  GET: 'success',
  POST: 'info',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'error',
  HEAD: 'neutral',
  OPTIONS: 'neutral',
};

const methodsCache = useState<any[]>('methods-cache', () => []);
const methodsLoaded = useState<boolean>('methods-loaded', () => false);

const {
  data: methodsData,
  execute: fetchMethods,
} = useApi('/method_definition', {
  query: {
    fields: '*',
    limit: 0,
  },
  errorContext: "Fetch Methods",
});

watch(methodsData, (data) => {
  if (data?.data) {
    methodsCache.value = data.data;
    methodsLoaded.value = true;
  }
});

const availableMethods = computed(() => {
  return methodsCache.value;
});

const selectedMethod = computed(() => {
  if (!props.modelValue) return null;
  return props.modelValue.method || null;
});

const selectedMethods = computed(() => {
  if (!props.multiple || !Array.isArray(props.modelValue)) return [];
  return props.modelValue.map((m: any) => m.method);
});

function selectMethod(methodObj: any) {
  if (props.disabled) return;

  const methodString = methodObj.method;

  if (props.multiple) {
    const currentArray = Array.isArray(props.modelValue) ? props.modelValue : [];
    const existingIndex = currentArray.findIndex((m: any) => m.method === methodString);

    if (existingIndex >= 0) {
      const newArray = [...currentArray];
      newArray.splice(existingIndex, 1);
      emit('update:modelValue', newArray);
    } else {
      const newMethod = getId(methodObj) ? methodObj : { method: methodString };
      emit('update:modelValue', [...currentArray, newMethod]);
    }
  } else {
    if (selectedMethod.value === methodString) {
      emit('update:modelValue', null);
    } else {
      const newMethod = getId(methodObj) ? methodObj : { method: methodString };
      emit('update:modelValue', newMethod);
    }
  }
}

function isSelected(method: string): boolean {
  if (props.multiple) {
    return selectedMethods.value.includes(method);
  }
  return selectedMethod.value === method;
}

function getMethodColor(method: string): 'success' | 'info' | 'warning' | 'error' | 'neutral' {
  return methodColorMap[method] || 'neutral';
}

onMounted(async () => {
  if (!methodsLoaded.value) {
    await fetchMethods();
  }
});
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <UBadge
      v-for="m in availableMethods"
      :key="getId(m) || m.method"
      :color="isSelected(m.method) ? getMethodColor(m.method) : 'neutral'"
      :variant="isSelected(m.method) ? 'solid' : 'outline'"
      size="md"
      class="cursor-pointer select-none px-3 py-1 font-mono text-xs font-semibold"
      :class="{ 'opacity-50 cursor-not-allowed': disabled }"
      @click="selectMethod(m)"
    >
      {{ m.method }}
    </UBadge>
  </div>
</template>
