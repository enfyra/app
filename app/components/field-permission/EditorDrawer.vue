<template>
  <CommonDrawer
    v-model="localOpen"
    :handle="false"
    direction="right"
    :show-close="false"
    nested
  >
    <template #header>
      <div class="flex items-start justify-between gap-3 w-full">
        <div class="min-w-0 flex-1">
          <h2 class="text-xl font-semibold truncate">
            {{ title }}
          </h2>
          <p class="text-sm text-[var(--text-tertiary)] mt-1 truncate">
            {{ subtitle }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <CommonFormCard :bordered="false">
          <UForm :state="localForm" @submit="$emit('save')">
            <FormEditorLazy
              v-model="localForm"
              v-model:errors="localErrors"
              :table-name="tableName"
              :field-map="fieldMap"
              :excluded="excluded"
              :mode="props.mode"
            />
          </UForm>
        </CommonFormCard>

        <div
          v-if="conditionErrors.length"
          class="rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-3"
        >
          <div class="text-sm font-medium text-[var(--text-primary)] mb-1">
            Condition validation
          </div>
          <ul class="text-xs text-[var(--text-tertiary)] space-y-1">
            <li v-for="(e, idx) in conditionErrors" :key="idx">
              {{ e }}
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton variant="outline" color="neutral" @click="handleCancel">
          Cancel
        </UButton>
        <UButton
          variant="solid"
          color="primary"
          :loading="loading"
          :disabled="loading || !isConditionValid"
          @click="handleSaveClick"
        >
          Save
        </UButton>
      </div>
    </template>
  </CommonDrawer>

  <CommonModal v-model="showDiscardModal">
    <template #title>Discard Changes</template>
    <template #body>
      <div class="text-sm text-[var(--text-secondary)]">
        You have unsaved changes. Are you sure you want to close? All changes will be lost.
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" @click="showDiscardModal = false">Cancel</UButton>
        <UButton @click="confirmDiscard">Discard Changes</UButton>
      </div>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import { parseConditionJson, validateFieldPermissionCondition } from "~/utils/field-permissions/condition";

interface Props {
  modelValue: boolean;
  tableName?: string;
  title?: string;
  subtitle?: string;
  excluded?: string[];
  mode?: "create" | "update";
  form: Record<string, any>;
  errors: Record<string, string>;
  loading: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  tableName: "field_permission_definition",
  title: "Field Permission",
  subtitle: "Create or update field-level rules",
  mode: "create",
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "update:form": [value: Record<string, any>];
  "update:errors": [value: Record<string, string>];
  save: [];
  cancel: [];
}>();

const { schema, definition } = useSchema(toRef(props, "tableName"));

const hasChanged = ref(false);
const showDiscardModal = ref(false);
const { isMobile, isTablet } = useScreen();

const localForm = computed({
  get: () => props.form,
  set: (value) => emit("update:form", value),
});

const localErrors = computed({
  get: () => props.errors,
  set: (value) => emit("update:errors", value),
});

const excluded = computed(() => {
  const base = ["allowedUsers"];
  const extra = Array.isArray(props.excluded) ? props.excluded : [];
  return Array.from(new Set([...base, ...extra]));
});

function normalizeForDirtyCheck(input: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of Object.keys(input || {})) {
    const v = (input as any)[key];
    out[key] = v === "" ? null : v;
  }
  return out;
}

const initialSnapshot = ref<string>("");

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    await nextTick();
    initialSnapshot.value = JSON.stringify(normalizeForDirtyCheck(localForm.value || {}));
    hasChanged.value = false;
  },
  { immediate: true }
);

watch(
  () => props.modelValue,
  (open, prevOpen) => {
    if (open) return;
    if (!prevOpen) return;
    showDiscardModal.value = false;
    hasChanged.value = false;
  }
);

watch(
  () => localForm.value,
  (v) => {
    if (!props.modelValue) return;
    const snap = JSON.stringify(normalizeForDirtyCheck(v || {}));
    hasChanged.value = snap !== initialSnapshot.value;
  },
  { deep: true }
);

const localOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!value && hasChanged.value) {
      showDiscardModal.value = true;
    } else {
      emit("update:modelValue", value);
    }
  },
});

const conditionText = computed<string>({
  get: () => {
    const v = (localForm.value as any)?.condition;
    if (v == null) return "";
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return "";
    }
  },
  set: (value) => {
    (localForm.value as any).condition = value;
  },
});

const conditionParse = computed(() => parseConditionJson(conditionText.value));
const conditionValidation = computed(() =>
  validateFieldPermissionCondition(conditionParse.value.condition)
);

const conditionErrors = computed(() => {
  const errors: string[] = [];
  if (conditionParse.value.error) errors.push(conditionParse.value.error);
  errors.push(...conditionValidation.value.errors);
  return errors;
});

const isConditionValid = computed(
  () => !conditionParse.value.error && conditionValidation.value.ok
);

function handleSaveClick() {
  emit("save");
}

watch(
  () => ({
    open: props.modelValue,
    loading: props.loading,
    hasChanged: hasChanged.value,
    isConditionValid: isConditionValid.value,
    conditionParseError: conditionParse.value.error,
    conditionErrors: conditionErrors.value,
    conditionPreview: conditionText.value.slice(0, 200),
    role: (localForm.value as any)?.role ?? null,
    allowedUsersLen: Array.isArray((localForm.value as any)?.allowedUsers)
      ? ((localForm.value as any)?.allowedUsers || []).length
      : null,
  }),
  (v) => {
    return v;
  },
  { deep: true }
);

function handleCancel() {
  if (hasChanged.value) {
    showDiscardModal.value = true;
  } else {
    emit("cancel");
  }
}

function confirmDiscard() {
  showDiscardModal.value = false;
  hasChanged.value = false;
  emit("update:modelValue", false);
  emit("cancel");
}

const fieldMap = computed(() => {
  return {
    action: {
      disableUniqueCheck: true,
    },
    actions: {
      disableUniqueCheck: true,
    },
    role: {
      label: "Config",
      disableUniqueCheck: true,
      component: resolveComponent("FormFieldPermissionConfig"),
      componentProps: {
        formData: localForm.value,
        onUpdateRole: (role: any) => {
          localForm.value = { ...localForm.value, role };
        },
        onUpdateAllowedUsers: (users: any[]) => {
          localForm.value = { ...localForm.value, allowedUsers: users };
        },
      },
    },
    condition: {
      type: "code",
      componentProps: {
        language: "json",
        placeholder:
          '{\n  "_and": [\n    { "owner": { "id": { "_eq": "@USER.id" } } }\n  ]\n}',
      },
    },
  };
});
</script>

