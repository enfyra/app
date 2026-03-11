<script setup lang="ts">
const GQL_METHODS = ['GQL_QUERY', 'GQL_MUTATION'];

const props = withDefaults(
  defineProps<{
    modelValue: any;
    disabled?: boolean;
    multiple?: boolean;
    allowedMethods?: string[];
    excludeGqlMethods?: boolean;
  }>(),
  {
    multiple: false,
    excludeGqlMethods: false,
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

const showAvailableMethodsHint = computed(() => {
  const allowed = props.allowedMethods;
  return Array.isArray(allowed) && allowed.length === 0;
});

const availableMethods = computed(() => {
  let list = methodsCache.value;
  const allowed = props.allowedMethods;
  if (Array.isArray(allowed)) {
    const allowedSet = new Set(allowed);
    list = list.filter((m: any) => m?.method && allowedSet.has(m.method));
  }
  if (props.excludeGqlMethods) {
    list = list.filter((m: any) => m?.method && !GQL_METHODS.includes(m.method));
  }
  return list;
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

watch([() => props.modelValue, () => props.allowedMethods], () => {
  const allowed = props.allowedMethods;
  if (!Array.isArray(allowed)) return;
  const allowedSet = new Set(allowed);
  if (props.multiple && Array.isArray(props.modelValue)) {
    const filtered = allowedSet.size > 0
      ? props.modelValue.filter((m: any) => m?.method && allowedSet.has(m.method))
      : [];
    if (filtered.length !== props.modelValue.length) {
      emit('update:modelValue', filtered);
    }
  } else if (props.modelValue?.method && (allowedSet.size === 0 || !allowedSet.has(props.modelValue.method))) {
    emit('update:modelValue', null);
  }
}, { immediate: true });

onMounted(async () => {
  if (!methodsLoaded.value) {
    await fetchMethods();
  }
});
</script>

<template>
  <div v-if="showAvailableMethodsHint" class="text-sm text-amber-600 dark:text-amber-400">
    Please select Available Methods first.
  </div>
  <div v-else class="flex flex-wrap gap-2">
    <UBadge
      v-for="m in availableMethods"
      :key="getId(m) || m.method"
      :color="isSelected(m.method) ? getMethodColor(m.method) : 'neutral'"
      :variant="isSelected(m.method) ? 'solid' : 'outline'"
      size="md"
      class="cursor-pointer select-none px-3 py-1 font-mono text-xs font-semibold inline-flex items-center gap-1.5"
      :class="{ 'opacity-50 cursor-not-allowed': disabled }"
      @click="selectMethod(m)"
    >
      {{ m.method }}
      <UIcon v-if="isSelected(m.method)" name="lucide:check" class="size-3.5 shrink-0" />

    </UBadge>
  </div>
</template>
