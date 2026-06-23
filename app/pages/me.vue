<script setup lang="ts">
const { register: registerSubHeaderActions } = useSubHeaderActionRegistry();
const { register: registerHeaderActions } = useHeaderActionRegistry();
import { CalendarDate } from "@internationalized/date";

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

type ApiTokenRecord = {
  id: string;
  name: string;
  prefix: string;
  last4: string;
  expiresAt: string;
  lastUsedAt: string | null;
  createdAt: string | null;
};

const {
  data: apiTokenData,
  pending: apiTokensLoading,
  execute: fetchApiTokens,
} = useApi<{ data: ApiTokenRecord[] }>(() => "/auth/api-tokens", {
  errorContext: "Fetch API Tokens",
  disableErrorPage: true,
  onError: () => true,
});

const {
  data: createdApiTokenData,
  pending: createApiTokenLoading,
  error: createApiTokenError,
  execute: createApiToken,
} = useApi<ApiTokenRecord & { token: string }>(() => "/auth/api-tokens", {
  method: "post",
  errorContext: "Create API Token",
  disableErrorPage: true,
  onError: () => true,
});

const {
  pending: revokeApiTokenLoading,
  error: revokeApiTokenError,
  execute: revokeApiToken,
} = useApi(() => "/auth/api-tokens", {
  method: "delete",
  errorContext: "Revoke API Token",
  disableErrorPage: true,
  onError: () => true,
});

const apiTokens = computed(() => apiTokenData.value?.data || []);
const apiTokenModalOpen = ref(false);
const apiTokenForm = ref({
  name: "MCP token",
  expiryPreset: "90d",
  customDate: "",
});
const apiTokenCustomCalendarDate = shallowRef<any>(null);
const apiTokenCustomCalendarOpen = ref(false);
const apiTokenErrors = ref<Record<string, string>>({});
const newlyCreatedToken = ref("");
const apiTokenCopied = ref(false);
let apiTokenCopiedTimer: ReturnType<typeof setTimeout> | null = null;

const apiTokenExpiryPresets = [
  { label: "30 days", value: "30d", days: 30 },
  { label: "90 days", value: "90d", days: 90 },
  { label: "1 year", value: "365d", days: 365 },
  { label: "No expiration", value: "never", days: null },
  { label: "Custom", value: "custom", days: null },
];

function todayCalendarDate() {
  const date = new Date();
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function calendarDateToDateString(value: CalendarDate | { year: number; month: number; day: number } | null) {
  if (!value) return "";
  return [
    value.year,
    String(value.month).padStart(2, "0"),
    String(value.day).padStart(2, "0"),
  ].join("-");
}

watch(apiTokenCustomCalendarDate, (value) => {
  apiTokenForm.value.customDate = calendarDateToDateString(value);
});

watch(apiTokenModalOpen, (open) => {
  if (!open) resetApiTokenCopiedState();
});

onBeforeUnmount(() => {
  clearApiTokenCopiedTimer();
});

watch(() => apiTokenForm.value.expiryPreset, (value) => {
  if (value === "custom" && !apiTokenCustomCalendarDate.value) {
    apiTokenCustomCalendarDate.value = todayCalendarDate();
  }
});

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
    await Promise.all([fetchOauthAccounts(), fetchApiTokens()]);
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

const {
  execute: changePasswordApi,
  pending: passwordLoading,
  error: passwordError,
} = useApi(() => `/me`, {
  method: "patch",
  errorContext: "Change Password",
});

const passwordForm = ref({
  newPassword: "",
  confirmPassword: "",
});
const showPassword = reactive({ new: false, confirm: false });
const passwordModalOpen = ref(false);
const passwordErrors = ref<Record<string, string>>({});

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
    color: "neutral",
    side: "right",
    onClick: () => { passwordModalOpen.value = true; },
  },
  {
    id: "create-api-token",
    label: "Create API token",
    icon: "lucide:key",
    variant: "outline",
    color: "neutral",
    side: "right",
    onClick: () => { openApiTokenModal(); },
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

function validatePasswordForm() {
  const errs: Record<string, string> = {};
  if (!passwordForm.value.newPassword) {
    errs.newPassword = "New password is required";
  } else if (passwordForm.value.newPassword.length < 6) {
    errs.newPassword = "Password must be at least 6 characters";
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    errs.confirmPassword = "Passwords do not match";
  }
  passwordErrors.value = errs;
  return Object.keys(errs).length === 0;
}

async function handleChangePassword() {
  if (!validatePasswordForm()) {
    notify.error("Validation Error", "Please check the password fields.");
    return;
  }

  await changePasswordApi({
    body: {
      password: passwordForm.value.newPassword,
    },
  });

  if (passwordError.value) {
    return;
  }

  notify.success("Success", "Password updated successfully!");
  passwordForm.value = {
    newPassword: "",
    confirmPassword: "",
  };
  passwordErrors.value = {};
  showPassword.new = false;
  showPassword.confirm = false;
  passwordModalOpen.value = false;
}

function openApiTokenModal() {
  apiTokenModalOpen.value = true;
  newlyCreatedToken.value = "";
  resetApiTokenCopiedState();
  apiTokenErrors.value = {};
  apiTokenForm.value = {
    name: "MCP token",
    expiryPreset: "90d",
    customDate: "",
  };
  apiTokenCustomCalendarDate.value = null;
  apiTokenCustomCalendarOpen.value = false;
}

function clearApiTokenCopiedTimer() {
  if (!apiTokenCopiedTimer) return;
  clearTimeout(apiTokenCopiedTimer);
  apiTokenCopiedTimer = null;
}

function resetApiTokenCopiedState() {
  clearApiTokenCopiedTimer();
  apiTokenCopied.value = false;
}

function resolveApiTokenExpiresAt() {
  const preset = apiTokenExpiryPresets.find(
    (item) => item.value === apiTokenForm.value.expiryPreset,
  );
  if (!preset) return null;
  if (preset.value === "never") return "never";
  if (preset.value === "custom") {
    if (!apiTokenForm.value.customDate) return null;
    const date = new Date(`${apiTokenForm.value.customDate}T23:59:59.999`);
    return date.toISOString();
  }
  const date = new Date();
  date.setDate(date.getDate() + (preset.days || 0));
  return date.toISOString();
}

function validateApiTokenForm() {
  const errs: Record<string, string> = {};
  if (!apiTokenForm.value.name.trim()) {
    errs.name = "Token name is required";
  }
  const expiresAt = resolveApiTokenExpiresAt();
  if (!expiresAt) {
    errs.expiresAt = "Expiration is required";
  } else if (expiresAt !== "never" && new Date(expiresAt).getTime() <= Date.now()) {
    errs.expiresAt = "Expiration must be in the future";
  }
  apiTokenErrors.value = errs;
  return Object.keys(errs).length === 0;
}

async function handleCreateApiToken() {
  if (!validateApiTokenForm()) {
    notify.error("Validation Error", "Please check the API token fields.");
    return;
  }

  await createApiToken({
    body: {
      name: apiTokenForm.value.name.trim(),
      expiresAt: resolveApiTokenExpiresAt(),
    },
  });

  if (createApiTokenError.value || !createdApiTokenData.value?.token) {
    notify.error(
      "Create API token failed",
      createApiTokenError.value?.message || "Unable to create API token.",
    );
    return;
  }

  newlyCreatedToken.value = createdApiTokenData.value.token;
  resetApiTokenCopiedState();
  await fetchApiTokens();
}

async function handleCopyApiToken(token: string) {
  await navigator.clipboard.writeText(token);
  clearApiTokenCopiedTimer();
  apiTokenCopied.value = true;
  apiTokenCopiedTimer = setTimeout(() => {
    apiTokenCopied.value = false;
    apiTokenCopiedTimer = null;
  }, 1500);
}

async function handleRevokeApiToken(token: ApiTokenRecord) {
  const ok = await confirm({
    title: "Revoke API token",
    content: `Revoke ${token.name}? This deletes the token immediately.`,
  });
  if (!ok) return;

  await revokeApiToken({ id: token.id });
  if (revokeApiTokenError.value) {
    notify.error(
      "Revoke API token failed",
      revokeApiTokenError.value.message || "Unable to revoke API token.",
    );
    return;
  }

  notify.success("API token revoked", "The token can no longer be used.");
  await fetchApiTokens();
}

function formatTokenDate(value: string | null) {
  if (!value) return "Never used";
  if (value === "never") return "No expiration";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function tokenPreview(token: ApiTokenRecord) {
  return `${token.prefix}...${token.last4}`;
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

      <div class="profile-card">
        <div class="profile-card-header actions">
          <div>
            <h3>API Tokens</h3>
            <p>Create long-lived tokens for MCP servers and external API clients</p>
          </div>
          <UButton
            color="primary"
            variant="solid"
            icon="lucide:plus"
            @click="openApiTokenModal"
          >
            Create token
          </UButton>
        </div>

        <CommonLoadingState
          v-if="apiTokensLoading"
          title="Loading..."
          description="Fetching API tokens"
          size="sm"
          type="card"
        />
        <div v-else-if="apiTokens.length > 0" class="profile-list">
          <div
            v-for="token in apiTokens"
            :key="token.id"
            class="profile-token-row"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm font-semibold text-[var(--text-primary)]">{{ token.name }}</p>
                <UBadge color="neutral" variant="soft">{{ tokenPreview(token) }}</UBadge>
              </div>
              <p class="text-xs text-[var(--text-tertiary)] mt-1">
                Expires {{ formatTokenDate(token.expiresAt) }} · Last used {{ formatTokenDate(token.lastUsedAt) }}
              </p>
            </div>
            <UButton
              color="error"
              variant="ghost"
              icon="lucide:trash-2"
              :loading="revokeApiTokenLoading"
              @click="handleRevokeApiToken(token)"
            >
              Revoke
            </UButton>
          </div>
        </div>
        <CommonEmptyState
          v-else
          class="profile-empty"
          title="No API tokens"
          description="Create a token to connect MCP servers or custom API clients"
          icon="lucide:key"
          size="sm"
        />
      </div>

    </template>
  </div>

  <CommonModal v-model:open="passwordModalOpen">
    <template #header>Change Password</template>
    <template #body>
      <UForm id="password-form" :state="passwordForm" @submit="handleChangePassword" class="space-y-5">
        <UFormField
          label="New password"
          :error="passwordErrors.newPassword"
          required
        >
          <UInput
            v-model="passwordForm.newPassword"
            :type="showPassword.new ? 'text' : 'password'"
            placeholder="Enter new password"
            size="md"
            class="w-full"
            autocomplete="new-password"
          >
            <template #trailing>
              <UIcon
                :name="showPassword.new ? 'lucide:eye-off' : 'lucide:eye'"
                class="w-4 h-4 text-[var(--text-quaternary)] cursor-pointer hover:text-[var(--text-secondary)]"
                @click="showPassword.new = !showPassword.new"
              />
            </template>
          </UInput>
        </UFormField>
        <UFormField
          label="Confirm new password"
          :error="passwordErrors.confirmPassword"
          required
        >
          <UInput
            v-model="passwordForm.confirmPassword"
            :type="showPassword.confirm ? 'text' : 'password'"
            placeholder="Confirm new password"
            size="md"
            class="w-full"
            autocomplete="new-password"
          >
            <template #trailing>
              <UIcon
                :name="showPassword.confirm ? 'lucide:eye-off' : 'lucide:eye'"
                class="w-4 h-4 text-[var(--text-quaternary)] cursor-pointer hover:text-[var(--text-secondary)]"
                @click="showPassword.confirm = !showPassword.confirm"
              />
            </template>
          </UInput>
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          variant="outline"
          color="neutral"
          size="md"
          @click="passwordModalOpen = false"
        >
          Cancel
        </UButton>
        <UButton
          type="submit"
          form="password-form"
          color="primary"
          variant="solid"
          size="md"
          :loading="passwordLoading"
          :disabled="passwordLoading"
        >
          Update password
        </UButton>
      </div>
    </template>
  </CommonModal>

  <CommonModal v-model:open="apiTokenModalOpen">
    <template #header>{{ newlyCreatedToken ? "API Token" : "Create API Token" }}</template>
    <template #body>
      <div v-if="newlyCreatedToken" class="space-y-3">
        <UAlert
          icon="lucide:alert-triangle"
          color="warning"
          variant="soft"
          title="Save this token now"
          description="This API token is shown only once. Copy and store it securely before closing this dialog; it cannot be viewed again."
        />
        <UFormField label="API token">
          <div class="flex gap-2">
            <UInput
              :model-value="newlyCreatedToken"
              readonly
              class="flex-1 font-mono"
            />
            <UButton
              type="button"
              color="primary"
              variant="solid"
              :icon="apiTokenCopied ? 'lucide:check' : 'lucide:copy'"
              @click="handleCopyApiToken(newlyCreatedToken)"
            >
              {{ apiTokenCopied ? "Copied" : "Copy" }}
            </UButton>
          </div>
        </UFormField>
      </div>
      <div v-else class="space-y-5">
        <UForm :state="apiTokenForm" class="space-y-5" @submit="handleCreateApiToken">
          <UFormField label="Token name" :error="apiTokenErrors.name" required>
            <UInput
              v-model="apiTokenForm.name"
              placeholder="MCP token"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Expiration" :error="apiTokenErrors.expiresAt" required>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="preset in apiTokenExpiryPresets"
                :key="preset.value"
                type="button"
                :color="apiTokenForm.expiryPreset === preset.value ? 'primary' : 'neutral'"
                :variant="apiTokenForm.expiryPreset === preset.value ? 'solid' : 'soft'"
                class="min-w-[120px] justify-center"
                @click="apiTokenForm.expiryPreset = preset.value"
              >
                {{ preset.label }}
              </UButton>
            </div>
            <UPopover
              v-if="apiTokenForm.expiryPreset === 'custom'"
              v-model:open="apiTokenCustomCalendarOpen"
            >
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                icon="lucide:calendar"
                class="mt-3 w-full justify-start"
              >
                {{ apiTokenForm.customDate ? formatTokenDate(`${apiTokenForm.customDate}T00:00:00.000`) : "Select a date" }}
              </UButton>
              <template #content="{ close }">
                <div class="space-y-3 p-3">
                  <UCalendar v-model="apiTokenCustomCalendarDate" class="w-fit" />
                  <div class="flex justify-end">
                    <UButton
                      size="sm"
                      color="primary"
                      variant="solid"
                      @click="() => { close(); apiTokenCustomCalendarOpen = false; }"
                    >
                      Done
                    </UButton>
                  </div>
                </div>
              </template>
            </UPopover>
          </UFormField>
        </UForm>
      </div>
    </template>
    <template #footer>
      <div v-if="!newlyCreatedToken" class="flex justify-end gap-2 w-full">
        <UButton
          variant="outline"
          color="neutral"
          size="md"
          @click="apiTokenModalOpen = false"
        >
          Close
        </UButton>
        <UButton
          color="primary"
          variant="solid"
          size="md"
          icon="lucide:key"
          :loading="createApiTokenLoading"
          :disabled="createApiTokenLoading"
          @click="handleCreateApiToken"
        >
          Create token
        </UButton>
      </div>
    </template>
  </CommonModal>
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

.profile-card-header.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
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

.profile-list-item,
.profile-token-row {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  transition: background-color 160ms ease;
}

.profile-list-item {
  align-items: center;
  cursor: pointer;
}

.profile-list-item:hover,
.profile-token-row:hover {
  background: var(--nav-item-hover-bg);
}

.profile-token-row {
  flex-direction: column;
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

@media (min-width: 640px) {
  .profile-token-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

@media (max-width: 640px) {
  .profile-card {
    padding: 16px;
  }

  .profile-card-header.actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
