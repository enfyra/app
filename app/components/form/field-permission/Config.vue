<script setup lang="ts">
import { debounce } from "lodash-es";

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
const selectedUserId = computed(() => {
  const users = props.formData?.allowedUsers;
  if (!Array.isArray(users) || users.length === 0) return null;
  return normalizeId(users[0]);
});

watch(
  () => [selectedRoleId.value, selectedUserId.value],
  ([rid, uid]) => {
    if (hasManualMode.value) return;
    if (uid) {
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

const roleItems = ref<Array<{ label: string; value: string; description?: string }>>([]);
const userItems = ref<Array<{ label: string; value: string; description?: string }>>([]);

async function fetchDefaultList() {
  if (mode.value === "role") {
    await searchRoles();
  } else {
    await searchUsers();
  }
}

const { data: rolesData, execute: searchRoles, pending: rolesLoading } = useApi(
  () => "/role_definition",
  {
    immediate: false,
    watch: false,
    query: computed(() => ({
      fields: "id,name",
      limit: 10,
      ...(searchTerm.value.trim().length
        ? { filter: { name: { _contains: searchTerm.value.trim() } } }
        : {}),
    })),
  }
);

const { data: usersData, execute: searchUsers, pending: usersLoading } = useApi(
  () => "/user_definition",
  {
    immediate: false,
    watch: false,
    query: computed(() => ({
      fields: "id,name,email",
      limit: 10,
      ...(searchTerm.value.trim().length
        ? { filter: { email: { _contains: searchTerm.value.trim() } } }
        : {}),
    })),
  }
);

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

watch(
  searchTerm,
  debounce(async (q: string) => {
    if (suppressSearch.value) return;
    const s = q.trim();
    if (!menuOpen.value) return;
    menuOpen.value = false;
    await fetchDefaultList();
    if (!loading.value) menuOpen.value = true;
  }, 250)
);

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

  const uid = selectedUserId.value;
  if (!uid) return null;
  const fromList = userItems.value.find((i) => String(i.value) === String(uid));
  if (fromList) return fromList;
  const users = props.formData?.allowedUsers;
  const first = Array.isArray(users) && users.length ? users[0] : null;
  const label =
    first && typeof first === "object"
      ? String(first.email ?? first.name ?? first.label ?? "Selected user")
      : "Selected user";
  return { label, value: uid };
});

const selectedMenuItem = ref<any>(null);

watch(
  selectedItem,
  (v) => {
    syncingFromForm.value = true;
    if (v == null) {
      selectedMenuItem.value = null;
      syncingFromForm.value = false;
      return;
    }

    const value = (v as any)?.value ?? v;
    const items = mode.value === "role" ? roleItems.value : userItems.value;
    const found = items.find((i) => String(i.value) === String(value));
    selectedMenuItem.value = found || v;
    syncingFromForm.value = false;
  },
  { immediate: true }
);

function applySelection(item: any) {
  const id =
    item == null
      ? null
      : typeof item === "string" || typeof item === "number"
        ? String(item)
        : item?.value != null
          ? String(item.value)
          : null;
  if (!id) return;

  if (mode.value === "role") {
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
    props.formData.allowedUsers = [{ id }];
  }
  props.onUpdateRole?.(null);
  emit("update:modelValue", null);
  props.onUpdateAllowedUsers?.([{ id }]);
}

watch(
  selectedMenuItem,
  (item, prev) => {
    if (item == null) return;
    if (syncingFromForm.value) return;
    const nextVal = typeof item === "object" ? item?.value : item;
    const prevVal = typeof prev === "object" ? prev?.value : prev;
    if (nextVal != null && prevVal != null && String(nextVal) === String(prevVal)) return;
    applySelection(item);
    menuOpen.value = false;
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
  selectedMenuItem.value = null;
  searchTerm.value = "";
  nextTick(() => {
    suppressSearch.value = false;
  });
}

async function setMode(next: Mode) {
  hasManualMode.value = true;
  mode.value = next;
  syncingFromForm.value = true;
  selectedMenuItem.value = null;
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
        class="rounded-full !aspect-square"
        @click="clearSelection"
      />
    </div>

    <UInputMenu
      v-model="selectedMenuItem"
      :items="mode === 'role' ? roleItems : userItems"
      v-model:search-term="searchTerm"
      v-model:open="menuOpen"
      :loading="loading"
      :placeholder="mode === 'role' ? 'Search role...' : 'Search user (email)...'"
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
</template>

