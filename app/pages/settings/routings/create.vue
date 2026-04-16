<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            v-model:errors="createErrors"
            :excluded="['routePermissions', 'mainTable', 'handlers', 'hooks', 'preHooks', 'postHooks', 'guards']"
            :field-map="fieldMap"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const notify = useNotify();
const { loadRoutes } = useRoutes();

const tableName = "route_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const fieldMap = {
  publishedMethods: { type: 'methods-selector', allowedMethodsKey: 'availableMethods' },
  availableMethods: { type: 'methods-selector' },
};

registerPageHeader({
  title: "Create New Route",
  gradient: "cyan",
});

useHeaderActionRegistry([
  {
    id: "save-routing",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    order: 999,
    submit: handleCreate,
    loading: computed(() => createLoading.value),
    permission: {
      and: [
        {
          route: "/route_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

const {
  data: createData,
  error: createError,
  execute: executeCreateRoute,
  pending: createLoading,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Route",
});

onMounted(() => {
  createForm.value = generateEmptyForm();
});

function filterPublishedToAvailable(body: Record<string, any>) {
  const available = body.availableMethods || [];
  const availableSet = new Set(available.filter((m: any) => m?.method).map((m: any) => m.method));
  if (Array.isArray(body.publishedMethods)) {
    body.publishedMethods = availableSet.size > 0
      ? body.publishedMethods.filter((m: any) => m?.method && availableSet.has(m.method))
      : [];
  }
}

async function handleCreate() {
  const body = { ...createForm.value };
  filterPublishedToAvailable(body);

  if (!await validateForm(body, createErrors)) return;

  await executeCreateRoute({ body });

  if (createError.value) {
    return;
  }

  notify.success("Route created successfully");

  await loadRoutes();

  const { registerDataMenuItems } = useMenuRegistry();
  const { schemas } = useSchema();
  await registerDataMenuItems(Object.values(schemas.value));

  const { getId } = useDatabase();
  await navigateTo(`/settings/routings/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}
</script>
