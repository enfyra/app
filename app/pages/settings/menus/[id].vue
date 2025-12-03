<script setup lang="ts">
const route = useRoute();

const toast = useToast();
const { confirm } = useConfirm();

const tableName = "menu_definition";

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

const { validate, getIncludeFields } = useSchema(tableName);
const { schemas } = useSchema();
const { getIdFieldName } = useDatabase();

const { fetchMenuDefinitions } = useMenuApi();
const { reregisterAllMenus, registerDataMenuItems } = useMenuRegistry();

const {
  data: menuData,
  pending: loading,
  execute: executeFetchMenu,
} = useApi(() => `/${tableName}`, {
  query: {
    fields: getIncludeFields(),
    filter: { [getIdFieldName()]: { _eq: route.params.id } },
  },
  errorContext: "Fetch Menu",
});

const {
  execute: executeUpdateMenu,
  pending: updateLoading,
  error: updateError,
} = useApi(() => `/${tableName}`, {
  method: "patch",
  errorContext: "Update Menu",
});

const {
  execute: executeDeleteMenu,
  pending: deleteLoading,
  error: deleteError,
} = useApi(() => `/${tableName}`, {
  method: "delete",
  errorContext: "Delete Menu",
});

const form = ref<Record<string, any>>({});

const errors = ref<Record<string, string>>({});

// Dynamic excluded fields based on form state (same logic as create page)
const excludedFields = computed(() => {
  const baseExcluded = [
    "id",
    "createdAt",
    "updatedAt",
    "isSystem",
    "children",
    "menus",
  ];

  // If no type selected, hide all relation fields
  if (!form.value.type) {
    baseExcluded.push("sidebar", "parent", "extension");
  }
  // If type is "Mini Sidebar" - shows in sidebar, has path, no parent/sidebar
  else if (form.value.type === "Mini Sidebar") {
    baseExcluded.push("sidebar", "parent");
  }
  // If type is "Dropdown Menu" - shows inside a sidebar, no path, no parent/extension
  else if (form.value.type === "Dropdown Menu") {
    baseExcluded.push("path", "parent", "extension");
  }
  // If type is "Menu" - shows inside sidebar or dropdown, can have everything
  else if (form.value.type === "Menu") {
    // If parent is selected, exclude sidebar (child inherits parent's sidebar)
    // But keep path field visible as it might be required
    if (form.value.parent) {
      baseExcluded.push("sidebar");
    }
    // If sidebar is selected, exclude parent (direct menu under sidebar)
    else if (form.value.sidebar) {
      baseExcluded.push("parent");
    }
  }

  return baseExcluded;
});

// Static type map to avoid reactive interference with inputs
const typeMap = {
  permission: {
    type: "permission",
  },
};

async function initializeForm() {
  await executeFetchMenu();
  const data = menuData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

// Watch type changes and clear conflicting fields
watch(
  () => form.value.type,
  (newType, oldType) => {
    if (oldType && newType !== oldType) {
      // Clear fields that should be excluded for the new type
      if (newType === "Mini Sidebar") {
        // Mini Sidebar: no parent, no sidebar, but has path
        form.value.sidebar = null;
        form.value.parent = null;
      } else if (newType === "Dropdown Menu") {
        // Dropdown: no path, no parent, no extension, but has sidebar
        form.value.path = "";
        form.value.parent = null;
        form.value.extension = null;
      } else if (newType === "Menu") {
        // Menu: can have everything, don't auto-clear as user might want to keep values
        // Ensure mutual exclusion if both are set
        if (form.value.parent && form.value.sidebar) {
          form.value.sidebar = null; // Prefer parent
        }
      } else {
        // If clearing type, clear all relation fields
        form.value.sidebar = null;
        form.value.parent = null;
        form.value.extension = null;
        form.value.path = "";
      }
    }
  }
);

// Watch parent/sidebar mutual exclusion for Menu type
watch(
  () => form.value.parent,
  (newParent) => {
    if (newParent && form.value.type === "Menu") {
      form.value.sidebar = null;
      // Don't clear path - user might want to set custom path for child menu
    }
  }
);

watch(
  () => form.value.sidebar,
  (newSidebar) => {
    if (newSidebar && form.value.type === "Menu") {
      form.value.parent = null;
    }
  }
);

// Watch path changes for Mini Sidebar type (warn if missing)
watch(
  () => form.value.path,
  (newPath) => {
    if (form.value.type === "Mini Sidebar" && !newPath) {
      toast.add({
        title: "Path Required",
        description: "Mini Sidebar must have a path",
        color: "warning",
      });
    }
  }
);

// Watch sidebar changes for Dropdown Menu type (warn if missing)
watch(
  () => form.value.sidebar,
  (newSidebar) => {
    if (form.value.type === "Dropdown Menu" && !newSidebar) {
      toast.add({
        title: "Sidebar Required",
        description: "Dropdown Menu must be assigned to a sidebar",
        color: "warning",
      });
    }
  }
);

async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) {
    return;
  }

  if (formChanges.originalData.value) {
    form.value = formChanges.discardChanges(form.value);
    hasFormChanges.value = false;
    
    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

useHeaderActionRegistry([
  {
    id: "reset-menu",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "save-menu",
    label: "Save Changes",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    loading: updateLoading,
    disabled: computed(() => !hasFormChanges.value),
    onClick: updateMenuDetail,
    permission: {
      and: [
        {
          route: "/menu_definition",
          actions: ["update"],
        },
      ],
    },
  },
  {
    id: "delete-menu",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    onClick: deleteMenuDetail,
    loading: deleteLoading,
    disabled: computed(() => menuData.value?.data?.[0]?.isSystem || false),
    permission: {
      and: [
        {
          route: "/menu_definition",
          actions: ["delete"],
        },
      ],
    },
  },
]);

async function updateMenuDetail() {
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

  await executeUpdateMenu({ id: Number(route.params.id), body: form.value });

  if (updateError.value) {
    return;
  }

  await fetchMenuDefinitions();
  await reregisterAllMenus(fetchMenuDefinitions as any);

  // Also reregister table menus to restore them
  const schemaValues = Object.values(schemas.value);
  if (schemaValues.length > 0) {
    await registerDataMenuItems(schemaValues);
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Menu updated!",
  });
  errors.value = {};

  // Confirm form changes as new baseline
  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

async function deleteMenuDetail() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteMenu({ id: Number(route.params.id) });

  if (deleteError.value) {
    return;
  }

  await fetchMenuDefinitions();
  await reregisterAllMenus(fetchMenuDefinitions as any);

  // Also reregister table menus to restore them
  const schemaValues = Object.values(schemas.value);
  if (schemaValues.length > 0) {
    await registerDataMenuItems(schemaValues);
  }

  toast.add({
    title: "Success",
    description: "Menu deleted successfully",
    color: "success"
  });
  await navigateTo("/settings/menus");
}

const { registerPageHeader } = usePageHeaderRegistry();

watch(menuData, (data) => {
  if (data?.data?.[0]) {
    registerPageHeader({
      title: `Menu: ${data.data[0].label || 'Loading...'}`,
      gradient: "purple",
    });
  }
}, { immediate: true });

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <FormEditorLazy
          ref="formEditorRef"
          v-model="form"
          v-model:errors="errors"
          @has-changed="(hasChanged) => hasFormChanges = hasChanged"
          :table-name="tableName"
          :excluded="excludedFields"
          :field-map="typeMap"
          :loading="loading"
        />
      </CommonFormCard>
    </div>
  </div>
</template>
