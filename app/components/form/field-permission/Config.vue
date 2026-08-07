<script setup lang="ts">
import { debounce } from "lodash-es";
import { switchFieldPermissionScope } from "~/utils/field-permissions/normalize";

type Mode = "role" | "user";

const props = defineProps<{
  modelValue: any;
  formData: Record<string, any>;
  onUpdateRole?: (role: any) => void;
  onUpdateAllowedUsers?: (users: any[]) => void;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: any];
}>();

const { getId } = useDatabase();

const mode = ref<Mode>("role");
const hasManualMode = ref(false);

function normalizeId(v: any): string | null {
  if (v == null) return null;
  if (typeof v === "object") return String(v.id ?? v._id ?? v.value ?? "");
  return String(v);
}

const selectedRoleId = computed(() => normalizeId(props.modelValue));
const selectedUserIds = computed(() => {
  const users = props.formData?.allowedUsers;
  if (!Array.isArray(users)) return [];
  return users.map(normalizeId).filter((id): id is string => Boolean(id));
});

watch(
  () => [selectedRoleId.value, selectedUserIds.value.join(",")],
  ([rid, userIds]) => {
    if (hasManualMode.value) return;
    if (userIds) {
      mode.value = "user";
      return;
    }
    if (rid) {
      mode.value = "role";
      return;
    }
    mode.value = "role";
  },
  { immediate: true }
);

const searchTerm = ref("");
const menuOpen = ref(false);
const suppressSearch = ref(false);
const syncingFromForm = ref(false);
const userMenuAnchor = ref<HTMLElement | null>(null);
const userMenuWidth = ref<number | null>(null);
let userMenuResizeObserver: ResizeObserver | null = null;

const roleItems = ref<Array<{ label: string; value: string; description?: string }>>([]);
const userItems = ref<Array<{ label: string; value: string; description?: string }>>([]);

const userMenuContent = computed(() => {
  if (mode.value !== "user" || !userMenuWidth.value) return undefined;
  return {
    align: "start" as const,
    style: { width: `${userMenuWidth.value}px` },
  };
});

async function fetchDefaultList() {
  if (mode.value === "role") {
    await searchRoles();
  } else {
    await searchUsers();
  }
}

const {
  data: rolesData,
  execute: searchRoles,
  pending: rolesLoading,
  cancel: cancelRoleSearch,
} = useApi(() => "/enfyra_role", {
  immediate: false,
  watch: false,
  query: computed(() => ({
    fields: "id,name",
    limit: 10,
    ...(searchTerm.value.trim().length
      ? { filter: { name: { _contains: searchTerm.value.trim() } } }
      : {}),
  })),
});

const {
  data: usersData,
  execute: searchUsers,
  pending: usersLoading,
  cancel: cancelUserSearch,
} = useApi(() => "/enfyra_user", {
  immediate: false,
  watch: false,
  query: computed(() => ({
    fields: "id,name,email",
    limit: 10,
    ...(searchTerm.value.trim().length
      ? { filter: { email: { _contains: searchTerm.value.trim() } } }
      : {}),
  })),
});

watch(
  rolesData,
  (v) => {
    const data = (v as any)?.data || [];
    roleItems.value = data.map((r: any) => ({
      label: r.name || String(getId(r)),
      value: String(getId(r)),
    }));
  },
  { immediate: true }
);

watch(
  usersData,
  (v) => {
    const data = (v as any)?.data || [];
    userItems.value = data.map((u: any) => ({
      label: u.email || u.name || String(getId(u)),
      description: u.name && u.email ? u.name : undefined,
      value: String(getId(u)),
    }));
  },
  { immediate: true }
);

const loading = computed(() => (mode.value === "role" ? rolesLoading.value : usersLoading.value));

const debouncedSearch = debounce(async () => {
  if (suppressSearch.value) return;
  if (!menuOpen.value) return;
  menuOpen.value = false;
  await fetchDefaultList();
  if (!loading.value) menuOpen.value = true;
}, 250);

watch(searchTerm, debouncedSearch);

onBeforeUnmount(() => {
  debouncedSearch.cancel();
  cancelRoleSearch();
  cancelUserSearch();
  userMenuResizeObserver?.disconnect();
});

onMounted(() => {
  if (typeof ResizeObserver === "undefined" || !userMenuAnchor.value) return;
  const updateWidth = () => {
    userMenuWidth.value = userMenuAnchor.value?.getBoundingClientRect().width ?? null;
  };
  updateWidth();
  userMenuResizeObserver = new ResizeObserver(updateWidth);
  userMenuResizeObserver.observe(userMenuAnchor.value);
});

watch(
  menuOpen,
  async (open) => {
    if (!open) return;
    const items = mode.value === "role" ? roleItems.value : userItems.value;
    if (items.length > 0) return;
    await fetchDefaultList();
  }
);

const selectedItem = computed(() => {
  if (mode.value === "role") {
    const id = selectedRoleId.value;
    if (!id) return null;
    const fromList = roleItems.value.find((i) => String(i.value) === String(id));
    if (fromList) return fromList;
    const fromForm = props.formData?.role;
    const label =
      typeof fromForm === "object" && fromForm
        ? String(fromForm.name ?? fromForm.label ?? fromForm.email ?? "Selected role")
        : "Selected role";
    return { label, value: id };
  }

  const users = props.formData?.allowedUsers;
  if (!Array.isArray(users) || users.length === 0) return null;
  return selectedUserIds.value.map((uid) => {
    const fromList = userItems.value.find((i) => String(i.value) === String(uid));
    if (fromList) return fromList;
    const selected = users.find((user: any) => normalizeId(user) === uid);
    const label = selected && typeof selected === "object"
      ? String(selected.email ?? selected.name ?? selected.label ?? "Selected user")
      : "Selected user";
    return { label, value: uid };
  });
});

const selectedMenuItem = ref<any>(null);

watch(
  selectedItem,
  (v) => {
    syncingFromForm.value = true;
    if (v == null) {
      selectedMenuItem.value = mode.value === "user" ? [] : null;
      syncingFromForm.value = false;
      return;
    }

    if (mode.value === "user") {
      selectedMenuItem.value = Array.isArray(v) ? v : [];
    } else {
      const value = (v as any)?.value ?? v;
      const found = roleItems.value.find((i) => String(i.value) === String(value));
      selectedMenuItem.value = found || v;
    }
    syncingFromForm.value = false;
  },
  { immediate: true }
);

function applySelection(item: any) {
  const selections = mode.value === "user"
    ? (Array.isArray(item) ? item : item == null ? [] : [item])
    : [item];
  const ids = [...new Set(
    selections
      .map((entry: any) => normalizeId(entry))
      .filter((id): id is string => Boolean(id)),
  )];

  if (mode.value === "role") {
    const id = ids[0];
    if (!id) return;
    hasManualMode.value = true;
    if (props.formData) {
      props.formData.role = id;
      props.formData.allowedUsers = [];
    }
    props.onUpdateRole?.(id);
    emit("update:modelValue", id);
    props.onUpdateAllowedUsers?.([]);
    return;
  }

  hasManualMode.value = true;
  if (props.formData) {
    props.formData.role = null;
    props.formData.allowedUsers = ids.map((id) => ({ id }));
  }
  props.onUpdateRole?.(null);
  emit("update:modelValue", null);
  props.onUpdateAllowedUsers?.(ids.map((id) => ({ id })));
}

watch(
  selectedMenuItem,
  (item, prev) => {
    if (syncingFromForm.value) return;
    const nextIds = (mode.value === "user" ? (Array.isArray(item) ? item : []) : [item])
      .map((entry: any) => normalizeId(entry))
      .filter((id): id is string => Boolean(id));
    const prevIds = (mode.value === "user" ? (Array.isArray(prev) ? prev : []) : [prev])
      .map((entry: any) => normalizeId(entry))
      .filter((id): id is string => Boolean(id));
    if (nextIds.join(",") === prevIds.join(",")) return;
    applySelection(item);
    if (mode.value === "role") menuOpen.value = false;
  }
);

function clearSelection() {
  hasManualMode.value = true;
  suppressSearch.value = true;
  if (props.formData) {
    props.formData.role = null;
    props.formData.allowedUsers = [];
  }
  props.onUpdateRole?.(null);
  emit("update:modelValue", null);
  props.onUpdateAllowedUsers?.([]);
  selectedMenuItem.value = mode.value === "user" ? [] : null;
  searchTerm.value = "";
  nextTick(() => {
    suppressSearch.value = false;
  });
}

async function setMode(next: Mode) {
  hasManualMode.value = true;
  mode.value = next;
  const scoped = switchFieldPermissionScope(props.formData, next);
  if (props.formData) {
    props.formData.role = scoped.role;
    props.formData.allowedUsers = scoped.allowedUsers;
  }
  if (next === "role") {
    props.onUpdateRole?.(scoped.role);
    props.onUpdateAllowedUsers?.([]);
    emit("update:modelValue", scoped.role);
  } else {
    props.onUpdateRole?.(null);
    props.onUpdateAllowedUsers?.(scoped.allowedUsers);
    emit("update:modelValue", null);
  }
  syncingFromForm.value = true;
  selectedMenuItem.value = next === "user" ? [] : null;
  syncingFromForm.value = false;
  suppressSearch.value = true;
  searchTerm.value = "";
  nextTick(() => {
    suppressSearch.value = false;
  });
  roleItems.value = [];
  userItems.value = [];
  await fetchDefaultList();
  menuOpen.value = true;
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <UBadge
          :variant="mode === 'role' ? 'solid' : 'soft'"
          color="primary"
          class="cursor-pointer"
          @click="setMode('role')"
        >
          Role
        </UBadge>
        <UBadge
          :variant="mode === 'user' ? 'solid' : 'soft'"
          color="primary"
          class="cursor-pointer"
          @click="setMode('user')"
        >
          User
        </UBadge>
      </div>
      <UButton
        v-if="selectedItem"
        size="xs"
        variant="ghost"
        color="neutral"
        icon="lucide:x"
        class="!rounded-[var(--radius-subcontrol)] !aspect-square"
        @click="clearSelection"
      />
    </div>

    <div ref="userMenuAnchor" class="w-full min-w-0">
      <UInputMenu
        v-model="selectedMenuItem"
        :items="mode === 'role' ? roleItems : userItems"
        v-model:search-term="searchTerm"
        v-model:open="menuOpen"
        :multiple="mode === 'user'"
        :loading="loading"
        :placeholder="mode === 'role' ? 'Search role...' : 'Search user (email)...'"
        :content="userMenuContent"
        by="value"
        class="w-full"
      >
        <template #leading>
          <UIcon :name="mode === 'role' ? 'lucide:shield' : 'lucide:user'" class="w-4 h-4 text-muted-foreground" />
        </template>
        <template #item="{ item }">
          <div class="flex items-start gap-2 w-full min-w-0">
            <UIcon :name="mode === 'role' ? 'lucide:shield' : 'lucide:user'" class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div class="min-w-0">
              <div class="text-sm truncate">{{ item.label }}</div>
              <div v-if="item.description" class="text-xs text-[var(--text-tertiary)] truncate">
                {{ item.description }}
              </div>
            </div>
          </div>
        </template>
        <template #empty>
          <span class="text-xs text-muted-foreground px-2">
            {{ loading ? "Loading..." : "No results" }}
          </span>
        </template>
      </UInputMenu>
    </div>
  </div>
</template>
