<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="form" @submit="save">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            table-name="field_permission_definition"
            mode="update"
            :excluded="excluded"
            :field-map="fieldMap"
            :loading="loading"
            :field-positions="fieldPermissionFormPositions"
            :virtual-fields="fieldPermissionVirtualFields"
            @has-changed="(v) => (hasFormChanges = v)"
          />
        </UForm>
      </CommonFormCard>
    </div>

    <CommonEmptyState
      v-if="!loading && !apiData?.data?.[0]"
      title="Rule not found"
      description="The requested field permission rule could not be loaded"
      icon="lucide:lock"
      size="sm"
    />
  </div>
</template>

<script setup lang="ts">
import { parseConditionJson, validateFieldPermissionCondition } from "~/utils/field-permissions/condition";
import { validateFieldPermissionScope } from "~/utils/field-permissions/scope";
import type { FormEditorVirtualField } from "~/types/form-editor";

const fieldPermissionFormPositions = {
  action: 1,
  effect: 2,
  config: 3,
};

const fieldPermissionVirtualFields: FormEditorVirtualField[] = [
  { name: "config", fieldType: "relation", label: "Config" },
];

const route = useRoute();
const notify = useNotify();
const { confirm } = useConfirm();

const id = computed(() => String(route.params.id));

const errors = ref<Record<string, string>>({});
const form = ref<Record<string, any>>({});
const formEditorRef = ref();
const hasFormChanges = ref(false);

const { registerPageHeader } = usePageHeaderRegistry();
const { useFormChanges, getIncludeFields } = useSchema("field_permission_definition");
const formChanges = useFormChanges();

registerPageHeader({
  title: "Field Permission",
  gradient: "purple",
});

const excluded = computed(() => ["id", "createdAt", "updatedAt", "role"]);
const fieldMap = computed(() => ({
  action: { disableUniqueCheck: true },
  config: {
    label: "Config",
    disableUniqueCheck: true,
    component: resolveComponent("FormFieldPermissionConfig"),
    componentProps: {
      formData: form.value,
      modelValue: form.value?.role,
      "onUpdate:modelValue": (val: any) => {
        form.value = { ...form.value, role: val };
      },
      onUpdateRole: (role: any) => {
        form.value = { ...form.value, role };
      },
      onUpdateAllowedUsers: (users: any[]) => {
        form.value = { ...form.value, allowedUsers: users };
      },
    },
  },
}));

watch(
  () => [form.value?.role, form.value?.allowedUsers],
  () => {
    const role = form.value?.role;
    const users = form.value?.allowedUsers;
    const hasRole = role != null && role !== "";
    const hasUser = Array.isArray(users) && users.length > 0;
    if (!hasRole && !hasUser) return;
    if (!errors.value?.role) return;
    const next = { ...(errors.value || {}) };
    delete next.role;
    errors.value = next;
  },
  { deep: true }
);

const {
  data: apiData,
  pending: loading,
  execute: fetchRule,
} = useApi(() => "/field_permission_definition", {
  query: computed(() => ({
    fields: getIncludeFields(),
    filter: { id: { _eq: id.value } },
    limit: 1,
  })),
  errorContext: "Fetch Field Permission",
});

watch(
  () => apiData.value?.data?.[0],
  (data) => {
    if (!data) return;
    form.value = { ...data };
    formChanges.update(data);
    registerPageHeader({
      title: data.name ? `Rule: ${data.name}` : "Field Permission",
      gradient: "purple",
    });
  },
  { immediate: true }
);

const { execute: patchApi, pending: saving, error: patchError } = useApi(
  () => `/field_permission_definition/${id.value}`,
  { method: "patch", errorContext: "Update Field Permission" }
);

const { execute: deleteApi, pending: deleting, error: deleteError } = useApi(
  () => `/field_permission_definition/${id.value}`,
  { method: "delete", errorContext: "Delete Field Permission" }
);

function normalizeConditionBeforeSave(body: any): { ok: boolean; message?: string } {
  const raw = body?.condition;
  if (raw == null || raw === "") {
    body.condition = null;
    return { ok: true };
  }
  if (typeof raw === "object") {
    const v = validateFieldPermissionCondition(raw);
    if (!v.ok) return { ok: false, message: v.errors[0] || "Invalid condition" };
    return { ok: true };
  }
  if (typeof raw === "string") {
    const parsed = parseConditionJson(raw);
    if (parsed.error) return { ok: false, message: parsed.error };
    const v = validateFieldPermissionCondition(parsed.condition);
    if (!v.ok) return { ok: false, message: v.errors[0] || "Invalid condition" };
    body.condition = parsed.condition;
    return { ok: true };
  }
  return { ok: false, message: "Condition must be JSON object or empty" };
}

async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) return;
  form.value = formChanges.discardChanges(form.value);
  hasFormChanges.value = false;
  notify.success("Reset Complete", "All changes have been discarded.");
}

async function save() {
  const body: any = { ...form.value };

  const scope = validateFieldPermissionScope(body);
  if (!scope.ok) {
    errors.value = { ...errors.value, role: scope.message };
    notify.error("Validation Error", scope.message);
    return;
  }

  const cond = normalizeConditionBeforeSave(body);
  if (!cond.ok) {
    notify.error("Validation Error", cond.message);
    return;
  }

  await patchApi({ body });
  if (patchError.value) return;

  notify.success("Success", "Rule updated!");
  errors.value = {};
  hasFormChanges.value = false;

  await fetchRule();
  formEditorRef.value?.confirmChanges();
}

async function remove() {
  const ok = await confirm({
    title: "Delete Rule",
    content: "Delete this field permission rule? This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel",
  });
  if (!ok) return;

  await deleteApi();
  if (deleteError.value) return;

  notify.success("Success", "Rule deleted");
  await navigateTo("/settings/field-permissions", { replace: true });
}

useHeaderActionRegistry([
  {
    id: "reset-field-permission",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    order: 1,
    disabled: computed(() => !hasFormChanges.value || saving.value || deleting.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "delete-field-permission",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    order: 2,
    onClick: remove,
    loading: computed(() => deleting.value),
    permission: {
      and: [{ route: "/field_permission_definition", actions: ["delete"] }],
    },
  },
  {
    id: "save-field-permission",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    order: 999,
    submit: save,
    loading: computed(() => saving.value),
    disabled: computed(() => !hasFormChanges.value || deleting.value),
    permission: {
      and: [{ route: "/field_permission_definition", actions: ["update"] }],
    },
  },
]);
</script>

