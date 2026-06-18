<script setup lang="ts">
import {
  filterMethodsByAllowedMethodNames,
  getMethodIdentity,
  getSelectedMethodIdentities,
} from '~/utils/form/method-selector';
import { getMethodColors } from '~/utils/http.constants';

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

const methodsCache = useState<any[]>('methods-cache', () => []);
const methodsLoaded = useState<boolean>('methods-loaded', () => false);

const {
  data: methodsData,
  execute: fetchMethods,
} = useApi('/enfyra_method', {
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
    list = list.filter((m: any) => m?.name && allowedSet.has(m.name));
  }
  if (props.excludeGqlMethods) {
    list = list.filter((m: any) => m?.name && !GQL_METHODS.includes(m.name));
  }
  return list;
});

const selectedIdentities = computed(() => {
  return getSelectedMethodIdentities(props.modelValue, props.multiple, getId);
});

function selectMethod(methodObj: any) {
  if (props.disabled) return;

  const targetId = getId(methodObj);
  const targetIdentity = getMethodIdentity(methodObj, getId);

  if (props.multiple) {
    const currentArray = Array.isArray(props.modelValue) ? props.modelValue : [];
    const existingIndex = currentArray.findIndex((m: any) => getMethodIdentity(m, getId) === targetIdentity);

    if (existingIndex >= 0) {
      const newArray = [...currentArray];
      newArray.splice(existingIndex, 1);
      emit('update:modelValue', newArray);
    } else {
      const newMethod = targetId ? methodObj : { name: methodObj.name };
      emit('update:modelValue', [...currentArray, newMethod]);
    }
  } else {
    if (targetIdentity && selectedIdentities.value.has(targetIdentity)) {
      emit('update:modelValue', null);
    } else {
      const newMethod = targetId ? methodObj : { name: methodObj.name };
      emit('update:modelValue', newMethod);
    }
  }
}

function isSelected(methodObj: any): boolean {
  const identity = getMethodIdentity(methodObj, getId);
  return identity ? selectedIdentities.value.has(identity) : false;
}

function getMethodButtonStyle(methodObj: any) {
  const colors = getMethodColors(methodObj);
  return {
    backgroundColor: isSelected(methodObj) ? colors.buttonColor : 'transparent',
    color: isSelected(methodObj) ? colors.textColor : 'var(--text-secondary)',
    borderColor: isSelected(methodObj) ? `${colors.textColor}55` : 'var(--border-strong)',
  };
}

watch([() => props.modelValue, () => props.allowedMethods], () => {
  const allowed = props.allowedMethods;
  if (!Array.isArray(allowed)) return;

  if (props.multiple && Array.isArray(props.modelValue)) {
    const filtered = filterMethodsByAllowedMethodNames(props.modelValue, allowed);
    if (filtered.length !== props.modelValue.length) {
      emit('update:modelValue', filtered);
    }
  } else if (props.modelValue) {
    const filtered = filterMethodsByAllowedMethodNames(props.modelValue, allowed);
    if (filtered === null) {
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
    <button
      v-for="m in availableMethods"
      :key="getId(m) || m.name"
      :disabled="disabled"
      :aria-pressed="isSelected(m)"
      type="button"
      class="inline-flex min-h-7 items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs font-semibold uppercase transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
      :style="getMethodButtonStyle(m)"
      @click="selectMethod(m)"
    >
      {{ m.name }}
      <UIcon
        :name="isSelected(m) ? 'lucide:check' : 'lucide:circle'"
        class="size-3.5 shrink-0"
        :class="isSelected(m) ? '' : 'opacity-45'"
      />
    </button>
    <UButton
      v-if="!disabled"
      to="/settings/methods?create=true"
      type="button"
      icon="lucide:plus"
      variant="outline"
      color="neutral"
      size="xs"
      title="Create method"
      @click.stop
    />
  </div>
</template>
