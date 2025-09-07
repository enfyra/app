<template>
  <div class="space-y-6">
    <!-- Header - Full width -->
    <CommonPageHeader
      :title="`Route: ${routeData?.data?.[0]?.path}`"
      title-size="lg"
      show-background
      background-gradient="from-lime-500/6 via-green-400/4 to-transparent"
      padding-y="py-6"
    >
      <template #badges>
        <!-- Route Status Badges -->
        <div class="flex items-center gap-3">
          <UIcon
            :name="routeData?.data?.[0]?.icon || 'lucide:circle'"
            class="text-xl text-primary mr-2"
          />
          <UBadge color="primary" v-if="routeData?.data?.[0].isSystem"
            >System Route</UBadge
          >
          <UBadge color="secondary" v-if="routeData?.data?.[0].isEnabled"
            >Enabled</UBadge
          >
        </div>
      </template>
    </CommonPageHeader>

    <!-- Content - Limited width -->
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full space-y-6">
      <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <UForm :state="form" @submit="updateRoute">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            v-model:has-changes="hasFormChanges"
            :table-name="tableName"
            :excluded="['routePermissions']"
            :loading="loading"
          />
        </UForm>
      </div>

      <!-- Route Permissions Section -->
      <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <PermissionManager
          table-name="route_permission_definition"
          :current-field-id="{ field: 'route', value: route.params.id as string }"
          icon="lucide:shield"
          title="Route Permissions"
        />
      </div>
    </div>
  </div>

  <CommonEmptyState
    v-if="!loading && !routeData?.data?.[0]"
    title="Route not found"
    description="The requested route could not be loaded"
    icon="lucide:route"
    size="sm"
  />
</template>

<script setup lang="ts">
// useEnfyraApi is auto-imported in Nuxt

const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();

const tableName = "route_definition";

// Form changes tracking via FormEditor
const hasFormChanges = ref(false);
const formEditorRef = ref();

const { validate, getIncludeFields } = useSchema(tableName);

useHeaderActionRegistry([
  {
    id: "save-routing",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    submit: updateRoute,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/route_definition",
          actions: ["update"],
        },
      ],
    },
  },
  {
    id: "delete-routing",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    onClick: deleteRoute,
    loading: computed(() => deleteLoading.value),
    permission: {
      and: [
        {
          route: "/route_definition",
          actions: ["delete"],
        },
      ],
    },
  },
]);

const {
  data: routeData,
  pending: loading,
  execute: executeGetRoute,
} = useEnfyraApi(`/${tableName}`, {
  query: {
    fields: getIncludeFields(),
    filter: { id: { _eq: route.params.id } },
  },
  errorContext: "Fetch Route",
});

const {
  error: updateError,
  execute: executeUpdateRoute,
  pending: updateLoading,
} = useEnfyraApi(`/${tableName}`, {
  method: "patch",
  errorContext: "Update Route",
});

const {
  error: deleteError,
  execute: executeDeleteRoute,
  pending: deleteLoading,
} = useEnfyraApi(`/${tableName}`, {
  method: "delete",
  errorContext: "Delete Route",
});

const form = ref<Record<string, any>>({});

const errors = ref<Record<string, string>>({});

// Initialize form data
async function initializeForm() {
  await executeGetRoute();
  const data = routeData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
  }
}

async function updateRoute() {
  if (!form.value) return;

  const { isValid, errors: validationErrors } = validate(form.value);
  if (!isValid) {
    errors.value = validationErrors;
    toast.add({
      title: "Missing information",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  await executeUpdateRoute({
    id: route.params.id as string,
    body: form.value,
  });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Route updated!",
  });
  errors.value = {};

  // Confirm form changes as new baseline
  formEditorRef.value?.confirmChanges();
}

async function deleteRoute() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteRoute({ id: route.params.id as string });

  if (deleteError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Route deleted successfully", 
    color: "success" 
  });
  await navigateTo("/settings/routings");
}

onMounted(() => {
  initializeForm();
});
</script>
