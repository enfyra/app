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

const selectedIds = computed(() => {
  if (props.multiple) {
    if (!Array.isArray(props.modelValue)) return new Set<string>();
    return new Set(props.modelValue.map((m: any) => getId(m)).filter(Boolean));
  }
  const id = getId(props.modelValue);
  return id ? new Set([id]) : new Set<string>();
});

function selectMethod(methodObj: any) {
  if (props.disabled) return;

  const targetId = getId(methodObj);

  if (props.multiple) {
    const currentArray = Array.isArray(props.modelValue) ? props.modelValue : [];
    const existingIndex = currentArray.findIndex((m: any) => getId(m) === targetId);

    if (existingIndex >= 0) {
      const newArray = [...currentArray];
      newArray.splice(existingIndex, 1);
      emit('update:modelValue', newArray);
    } else {
      const newMethod = targetId ? methodObj : { method: methodObj.method };
      emit('update:modelValue', [...currentArray, newMethod]);
    }
  } else {
    if (targetId && selectedIds.value.has(targetId)) {
      emit('update:modelValue', null);
    } else {
      const newMethod = targetId ? methodObj : { method: methodObj.method };
      emit('update:modelValue', newMethod);
    }
  }
}

function isSelected(methodObj: any): boolean {
  return selectedIds.value.has(getId(methodObj));
}

function getMethodColor(method: string): 'success' | 'info' | 'warning' | 'error' | 'neutral' {
  return methodColorMap[method] || 'neutral';
}

watch([() => props.modelValue, () => props.allowedMethods], () => {
  const allowed = props.allowedMethods;
  if (!Array.isArray(allowed)) return;

  const allowedIds = new Set<string>();
  for (const methodStr of allowed) {
    const cached = methodsCache.value.find((m: any) => m?.method === methodStr);
    if (cached) {
      const id = getId(cached);
      if (id) allowedIds.add(id);
    }
  }

  if (props.multiple && Array.isArray(props.modelValue)) {
    const filtered = allowedIds.size > 0
      ? props.modelValue.filter((m: any) => allowedIds.has(getId(m)))
      : [];
    if (filtered.length !== props.modelValue.length) {
      emit('update:modelValue', filtered);
    }
  } else if (props.modelValue) {
    const currentId = getId(props.modelValue);
    if (currentId && (allowedIds.size === 0 || !allowedIds.has(currentId))) {
      emit('update:modelValue', null);
    }
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
    <UButton
      v-for="m in availableMethods"
      :key="getId(m) || m.method"
      :color="isSelected(m) ? getMethodColor(m.method) : 'neutral'"
      :variant="isSelected(m) ? 'solid' : 'outline'"
      size="xs"
      :disabled="disabled"
      :aria-pressed="isSelected(m)"
      class="font-mono text-xs font-semibold"
      @click="selectMethod(m)"
    >
      {{ m.method }}
      <UIcon v-if="isSelected(m)" name="lucide:check" class="size-3.5 shrink-0 ml-1" />
    </UButton>
  </div>
</template>
