<script setup lang="ts">
import type { MenuDefinition } from '~/types';
import { EXTENSION_MENU_METADATA_FIELDS, prefixFields } from '~/utils/extension-fields';

const props = defineProps<{
  modelValue: boolean;
  menu: MenuDefinition | null;
  allMenus?: MenuDefinition[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'save': [menu: MenuDefinition];
}>();

const notify = useNotify();
const tableName = "enfyra_menu";
const { ensureSchema, validate, getIncludeFields, generateEmptyForm } = useSchema(tableName);
const { getIdFieldName, getId } = useDatabase();

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const showDiscardModal = ref(false);
const initialSnapshot = ref<string | null>(null);
const baseParentPath = ref<string>('');
const formEditorRef = ref();
const editorSettling = ref(false);

defineExpose({
  hasFormChanges,
});

function onEditorChanged(hasChanged: boolean) {
  if (editorSettling.value) return;
  hasFormChanges.value = hasChanged;
}

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (value) {
      emit('update:modelValue', value);
      return;
    }

    handleCancel();
  },
});

const {
  data: menuData,
  pending: loading,
  execute: fetchMenu,
} = useApi(() => `/${tableName}`, {
  query: async () => {
    const includeFields = await getIncludeFields();
    if (props.menu) {
      const menuId = getId(props.menu);
      if (menuId) {
        return {
          fields: `${includeFields},${prefixFields("extension", EXTENSION_MENU_METADATA_FIELDS)}`,
          filter: { [getIdFieldName()]: { _eq: menuId } },
        };
      }
    }
    return {
      fields: `${includeFields},${prefixFields("extension", EXTENSION_MENU_METADATA_FIELDS)}`,
    };
  },
  errorContext: "Fetch Menu",
  immediate: false,
  lazy: true,
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
    "_id",
    "createdAt",
    "updatedAt",
    "isSystem",
    "children",
    "menus",
    "parent",
    "extension",
    "permission",
    "menuPermissions",
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

const editorMode = computed(() => props.menu && getId(props.menu) ? 'update' : 'create');

function buildMenuPayload() {
  const payload = { ...form.value };
  delete payload.permission;
  delete payload.menuPermissions;
  return payload;
}

watch(() => isOpen.value, async (open) => {
  if (open) {
    await ensureSchema();
    editorSettling.value = true;
    hasFormChanges.value = false;
    if (props.menu) {
      await initializeForm();
    } else {
      form.value = generateEmptyForm();
      const menuWithParent = props.menu as MenuDefinition | null;
      if (menuWithParent?.parent) {
        form.value.parent = menuWithParent.parent;
      }
      errors.value = {};
    }
    await nextTick();
    await new Promise((r) => setTimeout(r, 60));
    formEditorRef.value?.confirmChanges?.();
    await nextTick();
    initialSnapshot.value = stableStringify(form.value);
    hasFormChanges.value = false;
    editorSettling.value = false;
  } else {
    editorSettling.value = true;
    form.value = {};
    errors.value = {};
    initialSnapshot.value = null;
    showDiscardModal.value = false;
    hasFormChanges.value = false;
    await nextTick();
    editorSettling.value = false;
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
      form.value.isPublic = form.value.isPublic === true;
      
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
  form.value.isPublic = form.value.isPublic === true;
  
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
    notify.error("Validation Error", "Please fill in all required fields.");
    return;
  }

  const uniqueOk = await formEditorRef.value?.validateAllUniqueFields?.();
  if (uniqueOk === false) {
    notify.error("Duplicate value", "Please verify all unique fields before saving.");
    return;
  }

  if (props.menu && getId(props.menu)) {
    await updateMenu({
      id: Number(getId(props.menu)),
      body: buildMenuPayload(),
    });

    if (updateError.value) {
      return;
    }
  } else {
    await createMenu({ body: buildMenuPayload() });

    if (createError.value) {
      return;
    }
  }

notify.success("Success")

  hasFormChanges.value = false;
  emit('save', form.value as MenuDefinition);
  emit('update:modelValue', false);
}

function handleCancel() {
  if (hasFormChanges.value) {
    showDiscardModal.value = true;
    return;
  }

  emit('update:modelValue', false);
}

function confirmDiscard() {
  showDiscardModal.value = false;
  hasFormChanges.value = false;
  emit('update:modelValue', false);
}

</script>

<template>
  <CommonDrawer 
    v-model="isOpen"
    direction="right"
    :cancel-action="{ label: 'Cancel', onClick: handleCancel }"
    :primary-action="{
      label: menu ? 'Update' : 'Create',
      loading: updateLoading || createLoading,
      disabled: !hasFormChanges || updateLoading || createLoading,
      onClick: handleSave,
    }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="lucide:menu" class="w-5 h-5" />
        <span>{{ menu && getId(menu) ? `Edit Menu: ${menu.label || ''}` : 'Create Menu' }}</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <CommonFormCard :bordered="false">
          <UForm :state="form" @submit="handleSave">
            <FormEditorLazy
              ref="formEditorRef"
              v-model="form"
              v-model:errors="errors"
              @has-changed="onEditorChanged"
              :table-name="tableName"
              :excluded="excludedFields"
              :loading="loading"
              :mode="editorMode"
              :current-record-id="props.menu ? getId(props.menu) : null"
            />
          </UForm>
        </CommonFormCard>
        <MenuPermissionManager
          v-if="menu && getId(menu)"
          :menu-id="getId(menu)!"
          :is-public="form.isPublic === true"
        />
      </div>
    </template>

  </CommonDrawer>

  <CommonUnsavedChangesModal
    v-model="showDiscardModal"
    content="You have unsaved changes. Are you sure you want to close? All changes will be lost."
    @discard="confirmDiscard"
  />
</template>
