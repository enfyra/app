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

const excludedFields = computed(() => {
  const baseExcluded = [
    "id",
    "createdAt",
    "updatedAt",
    "isSystem",
    "children",
    "menus",
  ];

  if (!form.value.type) {
    baseExcluded.push("sidebar", "parent", "extension");
  }
  
  else if (form.value.type === "Mini Sidebar") {
    baseExcluded.push("sidebar", "parent");
  }
  
  else if (form.value.type === "Dropdown Menu") {
    baseExcluded.push("path", "parent", "extension");
  }
  
  else if (form.value.type === "Menu") {

    if (form.value.parent) {
      baseExcluded.push("sidebar");
    }
    
    else if (form.value.sidebar) {
      baseExcluded.push("parent");
    }
  }

  return baseExcluded;
});

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

watch(
  () => form.value.type,
  (newType, oldType) => {
    if (oldType && newType !== oldType) {
      
      if (newType === "Mini Sidebar") {
        
        form.value.sidebar = null;
        form.value.parent = null;
        
      } else if (newType === "Dropdown Menu") {
        
        form.value.path = "";
        form.value.parent = null;
        form.value.extension = null;
        
      } else if (newType === "Menu") {

        if (form.value.parent && form.value.sidebar) {
          form.value.sidebar = null; 
        }
      } else {
        
        form.value.sidebar = null;
        form.value.parent = null;
        form.value.extension = null;
        form.value.path = "";
      }
    }
  }
);

watch(
  () => form.value.parent,
  (newParent) => {
    if (newParent && form.value.type === "Menu") {
      form.value.sidebar = null;
      
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

onMounted(() => {
  form.value = generateEmptyForm();
});

async function saveMenu() {
  
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

  await createMenu({ body: form.value });

  if (createError.value) {
    return;
  }

  await reregisterAllMenus(fetchMenuDefinitions as any);

  const schemaValues = Object.values(schemas.value);
  if (schemaValues.length > 0) {
    await registerDataMenuItems(schemaValues);
  }

  toast.add({
    title: "Success",
    description: "Menu created successfully",
    color: "success",
  });

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
