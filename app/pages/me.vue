<script setup lang="ts">
const { register: registerSubHeaderActions } = useSubHeaderActionRegistry();
const { register: registerHeaderActions } = useHeaderActionRegistry();

const notify = useNotify();
const { confirm } = useConfirm();
const { validateForm } = useFormValidation("enfyra_user");

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Profile",
  description: "Update your personal information",
  variant: "default",
  gradient: "blue",
});

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

const {
  data: apiData,
  pending: loading,
  execute: fetchMe,
} = useApi(() => `/me`, {
  query: {
    fields: "*",
  },
  errorContext: "Load Profile",
});

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const { getId } = useDatabase();

const userId = computed(() => {
  const data = apiData.value?.data?.[0];
  return data ? getId(data) : null;
});

const {
  data: oauthData,
  pending: oauthLoading,
  execute: fetchOauthAccounts,
} = useApi(() => "/enfyra_oauth_account", {
  query: computed(() => ({
    fields: "*,user.id,user._id,user.email",
    filter: userId.value ? { user: { _eq: userId.value } } : undefined,
    sort: "-createdAt",
  })),
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

function maskProviderId(id: string) {
  if (!id || id.length < 12) return id ?? "-";
  return id.substring(0, 6) + "..." + id.substring(id.length - 4);
}

function navigateToOauthAccount(account: any) {
  navigateTo(`/settings/oauth/accounts/${getId(account)}`);
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
  await fetchMe();
  const data = apiData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
    await fetchOauthAccounts();
  }
}

const {
  execute: updateProfile,
  pending: updateLoading,
  error: updateError,
} = useApi(() => `/me`, {
  method: "patch",
  errorContext: "Update Profile",
});

const passwordModalOpen = ref(false);

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

registerSubHeaderActions([
  {
    id: "change-password",
    label: "Change Password",
    icon: "lucide:key-round",
    variant: "outline",
    color: "primary",
    side: "right",
    onClick: () => { passwordModalOpen.value = true; },
  },
]);

registerHeaderActions([
  {
    id: "reset-profile",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    order: 1,
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "save-profile",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    order: 999,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    submit: saveProfile,
  },
]);

async function saveProfile() {
  if (!form.value) return;

  if (!await validateForm(form.value, errors)) return;

  await updateProfile({ body: form.value });

  if (updateError.value) {
    return;
  }

  notify.success("Success", "Profile updated successfully!");
  errors.value = {};

  await fetchMe();
  const updatedData = apiData.value?.data?.[0];
  if (updatedData) {
    form.value = { ...updatedData };
    formChanges.update(updatedData);
  }

  formEditorRef.value?.confirmChanges();
}

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="profile-page">
    <CommonEmptyState
      v-if="!loading && !apiData?.data?.[0]"
      title="Profile not found"
      description="Unable to load your profile information"
      icon="lucide:user-x"
      size="sm"
    />

    <template v-else>
      <div class="profile-card">
        <div class="profile-card-header">
          <h3>Personal Information</h3>
          <p>Update your account details and preferences</p>
        </div>
        <UForm :state="form" @submit="saveProfile">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            table-name="enfyra_user"
            :excluded="['isRootAdmin', 'isSystem', 'allowedRoutePermissions', 'createdAt', 'updatedAt', 'password']"
            :field-map="fieldMap"
            :loading="loading"
            mode="update"
            layout="grid"
          />
        </UForm>
      </div>

      <div class="profile-card">
        <div class="profile-card-header">
          <h3>Linked Accounts</h3>
          <p>OAuth providers connected to your profile</p>
        </div>
        <CommonLoadingState
          v-if="oauthLoading"
          title="Loading..."
          description="Fetching linked accounts"
          size="sm"
          type="card"
        />
        <div v-else-if="oauthAccounts.length > 0" class="profile-list">
          <div
            v-for="account in oauthAccounts"
            :key="getId(account)"
            class="profile-list-item group"
            @click="navigateToOauthAccount(account)"
          >
            <div class="profile-list-icon">
              <UIcon :name="getProviderIcon(account.provider)" class="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-[var(--text-primary)]">
                {{ getProviderLabel(account.provider) }}
              </p>
              <p class="text-xs text-[var(--text-tertiary)]">
                {{ maskProviderId(account.providerUserId ?? '') }}
              </p>
            </div>
            <UIcon name="lucide:chevron-right" class="w-4 h-4 text-[var(--text-quaternary)] group-hover:text-[var(--text-tertiary)] transition-colors flex-shrink-0" />
          </div>
        </div>
        <CommonEmptyState
          v-else
          class="profile-empty"
          title="No linked accounts"
          description="Connect your account with Google, GitHub, or other providers"
          icon="lucide:link"
          size="sm"
        />
      </div>

      <ProfileApiTokensCard />

    </template>
  </div>

  <ProfileChangePasswordModal v-model:open="passwordModalOpen" />
</template>

<style scoped>
.profile-page {
  display: grid;
  gap: 18px;
  max-width: 980px;
}

.profile-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--card-border);
  border-radius: 18px;
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  padding: 22px;
  backdrop-filter: blur(18px);
}

.profile-card-header {
  position: relative;
  margin-bottom: 18px;
}

.profile-card-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0;
}

.profile-card-header p {
  margin: 4px 0 0;
  color: var(--text-tertiary);
  font-size: 14px;
  font-weight: 600;
}

.profile-list {
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: 13px;
}

.profile-list-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  transition: background-color 160ms ease;
}

.profile-list-item {
  align-items: center;
  cursor: pointer;
}

.profile-list-item:hover {
  background: var(--nav-item-hover-bg);
}

.profile-list > * + * {
  border-top: 1px solid var(--border-subtle);
}

.profile-list-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 11px;
  background: var(--surface-muted);
}

.profile-empty {
  min-height: 172px;
  border: 1px solid var(--border-subtle);
  border-radius: 13px;
}

@media (max-width: 640px) {
  .profile-card {
    padding: 16px;
  }
}
</style>
