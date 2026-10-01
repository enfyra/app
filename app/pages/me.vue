<script setup lang="ts">
import { buildProfileUpdatePayload } from "~/utils/profile-update";

const { register: registerHeaderActions } = useHeaderActionRegistry();

const notify = useNotify();
const { confirm } = useConfirm();
const { validateForm } = useFormValidation("enfyra_user");

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Account",
  description: "Manage your profile, password, linked accounts, and API tokens",
  variant: "default",
});

const hasFormChanges = ref(false);
const savingProfile = ref(false);
const formEditorRef = ref();
const { getReadableFields, useFormChanges } = useSchema("enfyra_user");
const formChanges = useFormChanges();
const profileFields = getReadableFields();

const {
  data: apiData,
  pending: loading,
  executeWithResult: fetchMe,
} = useApi(() => `/me`, {
  query: {
    fields: profileFields,
  },
  errorContext: "Load Profile",
});

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const { getId } = useDatabase();

const {
  data: oauthData,
  pending: oauthLoading,
  execute: fetchOauthAccounts,
} = useApi(() => "/me/oauth-accounts", {
  errorContext: "Fetch OAuth Accounts",
});

const oauthAccounts = computed(() => oauthData.value?.data || []);

function getProviderIcon(provider: string) {
  switch (provider) {
    case "google": return "logos:google-icon";
    case "facebook": return "logos:facebook";
    case "github": return "mdi:github";
    default: return "lucide:link";
  }
}

function getProviderLabel(provider: string) {
  switch (provider) {
    case "google": return "Google";
    case "facebook": return "Facebook";
    case "github": return "GitHub";
    default: return provider || "-";
  }
}

const fieldMap = computed(() => ({
  email: {
    disabled: true
  },
  role: {
    permission: {
      and: [
        { route: '/enfyra_user', methods: ['PATCH'] }
      ]
    }
  }
}));

async function initializeForm() {
  const result = await fetchMe();
  if (!result.ok) return;
  const data = (result.data as any)?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
    await fetchOauthAccounts();
  }
}

const {
  executeWithResult: updateProfile,
  pending: updateLoading,
} = useApi(() => `/me`, {
  method: "patch",
  errorContext: "Update Profile",
});

const route = useRoute();
const router = useRouter();
const profileTabs = [
  { label: 'Profile', value: 'profile', slot: 'profile', icon: 'lucide:user' },
  { label: 'Password', value: 'password', slot: 'password', icon: 'lucide:key-round' },
  { label: 'API Tokens', value: 'api-tokens', slot: 'api-tokens', icon: 'lucide:key' },
];
const activeTab = computed({
  get: () => profileTabs.some(tab => tab.value === route.query.tab) ? String(route.query.tab) : 'profile',
  set: (value: string | number) => {
    void router.push({ query: { ...route.query, tab: profileTabs.some(tab => tab.value === value) ? value : 'profile' } });
  },
});

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

    notify.success("Reset Complete", "All changes have been discarded.");
  }
}

registerHeaderActions([
  {
    id: "reset-profile",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    order: 1,
    disabled: computed(() => !hasFormChanges.value || savingProfile.value || updateLoading.value),
    onClick: handleReset,
    show: computed(() => activeTab.value === 'profile' && hasFormChanges.value),
  },
  {
    id: "save-profile",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    order: 999,
    loading: computed(() => updateLoading.value || savingProfile.value),
    disabled: computed(() => !hasFormChanges.value || savingProfile.value || updateLoading.value),
    show: computed(() => activeTab.value === 'profile'),
    submit: saveProfile,
  },
]);

async function saveProfile() {
  if (!form.value || savingProfile.value) return;
  savingProfile.value = true;
  try {
    if (!await validateForm(form.value, errors)) return;

    const body = buildProfileUpdatePayload(
      form.value,
      formChanges.originalData.value,
    );
    if (Object.keys(body).length === 0) {
      hasFormChanges.value = false;
      formEditorRef.value?.confirmChanges();
      return;
    }

    const updateResult = await updateProfile({ body });
    if (!updateResult.ok) return;

    notify.success("Success", "Profile updated successfully!");
    errors.value = {};

    const refreshResult = await fetchMe();
    const updatedData = refreshResult.ok
      ? (refreshResult.data as any)?.data?.[0]
      : null;
    if (updatedData) {
      form.value = { ...updatedData };
      formChanges.update(updatedData);
    } else {
      formChanges.update({ ...formChanges.originalData.value, ...body });
    }

    hasFormChanges.value = false;
    formEditorRef.value?.confirmChanges();
  } finally {
    savingProfile.value = false;
  }
}

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="eapp-page-constrained-wide">
    <CommonEmptyState
      v-if="!loading && !apiData?.data?.[0]"
      title="Profile not found"
      description="Unable to load your profile information"
      icon="lucide:user-x"
      size="sm"
    />
    <CommonTabbedPanel v-else v-model="activeTab" :items="profileTabs">
      <template #profile>
        <CommonFormCard :bordered="false">
          <UForm :state="form" @submit="saveProfile">
            <FormEditorLazy
              ref="formEditorRef"
              v-model="form"
              v-model:errors="errors"
              @has-changed="(hasChanged) => hasFormChanges = hasChanged"
              table-name="enfyra_user"
              :excluded="['isRootAdmin', 'isSystem', 'roles', 'allowedRoutePermissions', 'createdAt', 'updatedAt', 'password']"
              :field-map="fieldMap"
              :loading="loading"
              mode="update"
              layout="grid"
            />
          </UForm>
        </CommonFormCard>
        <section class="space-y-4 border-t border-default pt-6">
          <h3 class="text-base font-semibold text-highlighted">Linked accounts</h3>
          <CommonLoadingState v-if="oauthLoading" title="Loading..." description="Fetching linked accounts" size="sm" type="list" />
          <div v-else-if="oauthAccounts.length" class="divide-y divide-default">
            <div v-for="account in oauthAccounts" :key="getId(account)" class="space-y-3 py-4">
              <p class="flex items-center gap-3 text-sm font-medium text-highlighted">
                <UIcon :name="getProviderIcon(account.provider)" class="size-5 shrink-0" />
                {{ getProviderLabel(account.provider) }}
              </p>
              <dl class="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div class="min-w-0">
                  <dt class="text-xs text-muted">Account ID</dt>
                  <dd class="mt-1 break-all font-mono">{{ getId(account) || '_' }}</dd>
                </div>
                <div class="min-w-0">
                  <dt class="text-xs text-muted">Provider user ID</dt>
                  <dd class="mt-1 break-all font-mono">{{ account.providerUserId || '_' }}</dd>
                </div>
                <div v-if="account.createdAt" class="min-w-0">
                  <dt class="text-xs text-muted">Linked on</dt>
                  <dd class="mt-1">{{ new Date(account.createdAt).toLocaleString() }}</dd>
                </div>
                <div v-if="account.updatedAt" class="min-w-0">
                  <dt class="text-xs text-muted">Updated</dt>
                  <dd class="mt-1">{{ new Date(account.updatedAt).toLocaleString() }}</dd>
                </div>
              </dl>
            </div>
          </div>
          <CommonEmptyState v-else variant="naked" title="No linked accounts" description="Connect your account with Google, GitHub, or other providers" icon="lucide:link" size="sm" />
        </section>
      </template>
      <template #password>
        <ProfileChangePasswordForm :active="activeTab === 'password'" />
      </template>
      <template #api-tokens>
        <ProfileApiTokensTable :active="activeTab === 'api-tokens'" />
      </template>
    </CommonTabbedPanel>
  </div>
</template>
