<script setup lang="ts">
import { CalendarDate } from "@internationalized/date";

type ApiTokenRecord = {
  id: string;
  name: string;
  prefix: string;
  last4: string;
  expiresAt: string;
  lastUsedAt: string | null;
  createdAt: string | null;
};

const notify = useNotify();
const { confirm } = useConfirm();

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

watch(() => apiTokenForm.value.expiryPreset, (value) => {
  if (value === "custom" && !apiTokenCustomCalendarDate.value) {
    apiTokenCustomCalendarDate.value = todayCalendarDate();
  }
});

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
  fetchApiTokens();
});

onBeforeUnmount(() => {
  clearApiTokenCopiedTimer();
});
</script>

<template>
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

    <CommonModal
      v-model:open="apiTokenModalOpen"
      :cancel-action="!newlyCreatedToken ? { label: 'Close', tone: 'neutral', onClick: () => (apiTokenModalOpen = false) } : false"
      :primary-action="!newlyCreatedToken
        ? {
          label: 'Create token',
          icon: 'lucide:key',
          loading: createApiTokenLoading,
          disabled: createApiTokenLoading,
          onClick: handleCreateApiToken,
        }
        : false"
    >
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
    </CommonModal>
  </div>
</template>

<style scoped>
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

.profile-token-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  transition: background-color 160ms ease;
}

.profile-token-row:hover {
  background: var(--nav-item-hover-bg);
}

.profile-list > * + * {
  border-top: 1px solid var(--border-subtle);
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
