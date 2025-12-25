<script setup lang="ts">
import type { MenuDefinition } from '~/utils/types/menu';

const props = defineProps<{
  modelValue: boolean;
  menu: MenuDefinition | null;
  allMenus?: MenuDefinition[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'save': [menu: MenuDefinition];
}>();

const toast = useToast();
const tableName = "menu_definition";
const { validate, getIncludeFields, generateEmptyForm } = useSchema(tableName);
const { getIdFieldName, getId } = useDatabase();

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const baseParentPath = ref<string>('');
const formEditorRef = ref();

defineExpose({
  hasFormChanges,
});

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const {
  data: menuData,
  pending: loading,
  execute: fetchMenu,
} = useApi(() => `/${tableName}`, {
  query: computed(() => {
    if (props.menu) {
      const menuId = getId(props.menu);
      if (menuId) {
        return {
          fields: `${getIncludeFields()},extension.*`,
          filter: { [getIdFieldName()]: { _eq: menuId } },
        };
      }
    }
    return {
      fields: `${getIncludeFields()},extension.*`,
    };
  }),
  errorContext: "Fetch Menu",
  immediate: false,
});

const {
  execute: updateMenu,
  pending: updateLoading,
  error: updateError,
} = useApi(() => `/${tableName}`, {
  method: "patch",
  errorContext: "Update Menu",
});

const {
  execute: createMenu,
  pending: createLoading,
  error: createError,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Menu",
});

const excludedFields = computed(() => {
  const baseExcluded = [
    "id",
    "createdAt",
    "updatedAt",
    "isSystem",
    "children",
    "menus",
    "parent",
    "extension",
  ];

  if (!form.value.type) {
    baseExcluded.push("sidebar");
  } else if (form.value.type === "Mini Sidebar") {
    baseExcluded.push("sidebar");
  } else if (form.value.type === "Dropdown Menu") {
    baseExcluded.push("path");
  } else if (form.value.type === "Menu") {
    if (form.value.parent) {
      baseExcluded.push("sidebar");
    } else if (form.value.sidebar) {
    }
  }

  return baseExcluded;
});

const typeMap = {
  permission: {
    type: "permission",
  },
};

watch(() => isOpen.value, async (open) => {
  if (open) {
    if (props.menu) {
      await initializeForm();
      await nextTick();
      if (formEditorRef.value?.confirmChanges) {
        formEditorRef.value.confirmChanges();
      }
      hasFormChanges.value = false;
    } else {
      form.value = generateEmptyForm();
      const menuWithParent = props.menu as MenuDefinition | null;
      if (menuWithParent?.parent) {
        form.value.parent = menuWithParent.parent;
      }
      errors.value = {};
      hasFormChanges.value = false;
    }
  } else {
    form.value = {};
    errors.value = {};
    hasFormChanges.value = false;
  }
});


watch(
  () => form.value.type,
  (newType, oldType) => {
    if (oldType && newType !== oldType) {
      if (newType === "Mini Sidebar") {
        form.value.sidebar = null;
        form.value.parent = null;
      } else if (newType === "Dropdown Menu") {
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
  () => form.value.label,
  async (newLabel) => {
    if (baseParentPath.value && form.value.parent) {
      if (newLabel) {
        const slug = newLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        form.value.path = baseParentPath.value + '/' + slug;
      } else {
        form.value.path = baseParentPath.value + '/';
      }
      
      await nextTick();
    }
  },
  { immediate: false }
);

async function initializeForm() {
  if (!props.menu) return;
  
  const currentMenuId = getId(props.menu);
  if (currentMenuId) {
    await fetchMenu();
    const data = menuData.value?.data?.[0];
    if (data) {
      form.value = { ...data };
      
      if (form.value.parent) {
        const parentId = getId(form.value.parent);
        let parentPath = '';
        
        if (props.allMenus && parentId) {
          const parentMenu = props.allMenus.find(m => String(getId(m)) === String(parentId));
          if (parentMenu) {
            if (parentMenu.path && parentMenu.path !== '/') {
              parentPath = parentMenu.path;
            } else {
              const childMenus = props.allMenus.filter(m => {
                const mParentId = getId(m.parent);
                return mParentId && String(mParentId) === String(parentId) && m.path && m.path !== '/';
              });
              if (childMenus.length > 0 && childMenus[0]?.path) {
                const childMenu = childMenus[0];
                const childPathParts = childMenu.path.split('/').filter(Boolean);
                if (childPathParts.length > 0) {
                  childPathParts.pop();
                  parentPath = '/' + childPathParts.join('/');
                }
              } else if (parentMenu.label) {
                const slug = parentMenu.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                parentPath = '/' + slug;
              }
            }
          }
        }
        
        if (parentPath && parentPath !== '/') {
          baseParentPath.value = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath;
        } else {
          baseParentPath.value = '';
        }
      } else {
        baseParentPath.value = '';
      }
      
      return;
    }
  }
  
  form.value = { ...props.menu };
  
  if (form.value.parent) {
    const parentId = getId(form.value.parent);
    
    let parentPath = props.menu.path || '';
    
    if ((!parentPath || parentPath === '/') && props.allMenus && parentId) {
      const parentMenu = props.allMenus.find(m => String(getId(m)) === String(parentId));
      if (parentMenu) {
        if (parentMenu.path && parentMenu.path !== '/') {
          parentPath = parentMenu.path;
        } else {
          const childMenus = props.allMenus.filter(m => {
            const mParentId = getId(m.parent);
            return mParentId && String(mParentId) === String(parentId) && m.path && m.path !== '/';
          });
          if (childMenus.length > 0 && childMenus[0]?.path) {
            const childMenu = childMenus[0];
            const childPathParts = childMenu.path.split('/').filter(Boolean);
            if (childPathParts.length > 0) {
              childPathParts.pop();
              parentPath = '/' + childPathParts.join('/');
            }
          } else if (parentMenu.label) {
            const slug = parentMenu.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            parentPath = '/' + slug;
          }
        }
      }
    }
    
    if (parentPath && parentPath !== '/') {
      baseParentPath.value = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath;
      if (form.value.label) {
        const slug = form.value.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        form.value.path = baseParentPath.value + '/' + slug;
      } else {
        form.value.path = baseParentPath.value + '/';
      }
    } else {
      baseParentPath.value = '';
    }
  } else {
    baseParentPath.value = '';
  }
  
  await nextTick();
}

async function handleSave() {
  const { isValid, errors: validationErrors } = validate(form.value);

  if (!isValid) {
    errors.value = validationErrors;
    toast.add({
      title: "Validation Error",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  if (props.menu && getId(props.menu)) {
    await updateMenu({
      id: Number(getId(props.menu)),
      body: form.value,
    });

    if (updateError.value) {
      return;
    }
  } else {
    await createMenu({ body: form.value });

    if (createError.value) {
      return;
    }
  }

  toast.add({
    title: "Success",
    color: "success",
    description: props.menu ? "Menu updated!" : "Menu created!",
  });

  hasFormChanges.value = false;
  emit('save', form.value as MenuDefinition);
  emit('update:modelValue', false);
}

</script>

<template>
  <CommonDrawer 
    v-model="isOpen"
    direction="right"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="lucide:menu" class="w-5 h-5" />
        <span>{{ menu && getId(menu) ? `Edit Menu: ${menu.label || ''}` : 'Create Menu' }}</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="text-gray-400">Loading menu data...</div>
        </div>
        
        <div v-else>
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
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          variant="outline"
          color="neutral"
          @click="isOpen = false"
        >
          Cancel
        </UButton>
        <UButton
          variant="solid"
          color="primary"
          :loading="updateLoading || createLoading"
          :disabled="!hasFormChanges"
          @click="handleSave"
        >
          {{ menu ? 'Update' : 'Create' }}
        </UButton>
      </div>
    </template>
  </CommonDrawer>
</template>
