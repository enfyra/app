<script setup lang="ts">
const toast = useToast();

const tableName = "menu_definition";
const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const { validate, generateEmptyForm } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Create New Menu",
  gradient: "purple",
});

// Dynamic excluded fields based on form state
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
  // If type is "Dropdown" - shows inside a sidebar, no path, no parent/extension
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
  order: {
    componentProps: {
      min: 0,
      step: 1,
    },
  },
  permission: {
    type: "permission",
  },
};

// Menu registry composables for reregistering after changes
const { fetchMenuDefinitions } = useMenuApi();
const { reregisterAllMenus, registerDataMenuItems } =
  useMenuRegistry();
const { schemas } = useSchema();

const {
  execute: createMenu,
  pending: creating,
  error: createError,
} = useApi(() => "/menu_definition", {
  method: "post",
  errorContext: "Create Menu",
});

useHeaderActionRegistry([
  {
    id: "save-menu",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    submit: saveMenu,
    loading: computed(() => creating.value),
    permission: {
      and: [
        {
          route: "/menu_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

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
        // Keep path as it's required for Mini Sidebar
      } else if (newType === "Dropdown Menu") {
        // Dropdown: no path, no parent, no extension, but has sidebar
        form.value.path = "";
        form.value.parent = null;
        form.value.extension = null;
        // Keep sidebar as it's required for Dropdown
      } else if (newType === "Menu") {
        // Menu: can have everything, don't auto-clear as user might want to keep values
        // But ensure mutual exclusion between parent and sidebar
        if (form.value.parent && form.value.sidebar) {
          form.value.sidebar = null; // Prefer parent over sidebar
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

// Watch path changes for Mini Sidebar type
watch(
  () => form.value.path,
  (newPath) => {
    if (form.value.type === "Mini Sidebar" && !newPath) {
      // Mini Sidebar requires a path
      toast.add({
        title: "Path Required",
        description: "Mini Sidebar must have a path",
        color: "warning",
      });
    }
  }
);

// Watch sidebar changes for Dropdown Menu type
watch(
  () => form.value.sidebar,
  (newSidebar) => {
    if (form.value.type === "Dropdown Menu" && !newSidebar) {
      // Dropdown Menu requires a sidebar
      toast.add({
        title: "Sidebar Required",
        description: "Dropdown Menu must be assigned to a sidebar",
        color: "warning",
      });
    }
  }
);

onMounted(() => {
  form.value = generateEmptyForm();
});

async function saveMenu() {
  // Custom validation based on menu type
  let validationErrors: string[] = [];

  if (form.value.type === "Mini Sidebar") {
    if (!form.value.path) {
      validationErrors.push("Path is required for Mini Sidebar");
    }
    if (form.value.parent || form.value.sidebar) {
      validationErrors.push("Mini Sidebar cannot have parent or sidebar");
    }
  } else if (form.value.type === "Dropdown Menu") {
    if (!form.value.sidebar) {
      validationErrors.push("Sidebar is required for Dropdown Menu");
    }
    if (form.value.path) {
      validationErrors.push("Dropdown Menu cannot have path");
    }
    if (form.value.parent || form.value.extension) {
      validationErrors.push("Dropdown Menu cannot have parent or extension");
    }
  } else if (form.value.type === "Menu") {
    if (!form.value.sidebar && !form.value.parent) {
      validationErrors.push("Menu must have either sidebar or parent");
    }
    if (form.value.sidebar && form.value.parent) {
      validationErrors.push("Menu cannot have both sidebar and parent");
    }
  }

  if (validationErrors.length > 0) {
    toast.add({
      title: "Validation Error",
      description: validationErrors.join(", "),
      color: "error",
    });
    return;
  }

  // Validate form using existing validation
  const validationResult = validate(form.value);
  if (
    !validationResult.isValid &&
    Object.keys(validationResult.errors).length > 0
  ) {
    errors.value = validationResult.errors;
    toast.add({
      title: "Validation Error",
      description: "Please check the form for errors",
      color: "error",
    });
    return;
  }

  // Create menu
  await createMenu({ body: form.value });

  if (createError.value) {
    return;
  }

  // Reregister all menus after create
  await reregisterAllMenus(fetchMenuDefinitions as any);

  // Also reregister table menus to ensure consistency
  const schemaValues = Object.values(schemas.value);
  if (schemaValues.length > 0) {
    await registerDataMenuItems(schemaValues);
  }

  toast.add({
    title: "Success",
    description: "Menu created successfully",
    color: "success",
  });

  // Redirect to menus list
  await navigateTo("/settings/menus");
}
</script>

<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="form" @submit="saveMenu">
          <FormEditorLazy
            v-model="form"
            v-model:errors="errors"
            :table-name="tableName"
            :excluded="excludedFields"
            :field-map="typeMap"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>
