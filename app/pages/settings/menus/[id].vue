<script setup lang="ts">
// useApi is auto-imported in Nuxt
const route = useRoute();

const toast = useToast();
const { confirm } = useConfirm();

const tableName = "menu_definition";

// Form changes tracking via FormEditor
const hasFormChanges = ref(false);
const formEditorRef = ref();

const { validate, getIncludeFields } = useSchema(tableName);

const { fetchMenuDefinitions } = useMenuApi();
const { reregisterAllMenus } = useMenuRegistry();

const {
  data: menuData,
  pending: loading,
  execute: executeFetchMenu,
} = useApi(() => `/${tableName}`, {
  query: {
    fields: getIncludeFields(),
    filter: { id: { _eq: Number(route.params.id) } },
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

// Initialize form data
async function initializeForm() {
  await executeFetchMenu();
  const data = menuData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
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

useHeaderActionRegistry([
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

  toast.add({
    title: "Success",
    color: "success",
    description: "Menu updated!",
  });
  errors.value = {};

  // Confirm form changes as new baseline
  formEditorRef.value?.confirmChanges();
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

  toast.add({ 
    title: "Success",
    description: "Menu deleted successfully", 
    color: "success" 
  });
  await navigateTo("/settings/menus");
}

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header - Full width -->
    <CommonPageHeader
      :title="`Menu: ${menuData?.data?.[0]?.label || 'Loading...'}`"
      title-size="lg"
      show-background
      background-gradient="from-violet-500/6 via-purple-400/4 to-transparent"
      padding-y="py-6"
    >
      <template #badges>
        <!-- Menu Status Badges -->
        <div class="flex items-center gap-3">
          <UIcon
            :name="menuData?.data?.[0]?.icon || 'lucide:circle'"
            class="text-xl text-primary mr-2"
          />
          <UBadge color="primary" v-if="menuData?.data?.[0]?.isSystem"
            >System Menu</UBadge
          >
          <UBadge color="secondary" v-if="menuData?.data?.[0]?.isEnabled"
            >Enabled</UBadge
          >
        </div>
      </template>
    </CommonPageHeader>

    <!-- Content - Limited width -->
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <FormEditorLazy
          ref="formEditorRef"
          v-model="form"
          v-model:errors="errors"
          v-model:has-changes="hasFormChanges"
          :table-name="tableName"
          :excluded="excludedFields"
          :type-map="typeMap"
          :loading="loading"
        />
      </div>
    </div>
  </div>
</template>
