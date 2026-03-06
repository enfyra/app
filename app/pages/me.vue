<script setup lang="ts">
const toast = useToast();
const { confirm } = useConfirm();
const { validate } = useSchema("user_definition");
const { me } = useEnfyraAuth();

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
} = useApi(() => "/oauth_account_definition", {
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
        { route: '/user_definition', actions: ['update'] }
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

const {
  execute: changePasswordApi,
  pending: passwordLoading,
  error: passwordError,
} = useApi(() => `/me`, {
  method: "patch",
  errorContext: "Change Password",
});

const passwordForm = ref({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
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
    
    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

useHeaderActionRegistry([
  {
    id: "reset-profile",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
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
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    submit: saveProfile,
  },
]);

async function saveProfile() {
  if (!form.value) return;

  const { isValid, errors: validationErrors } = validate(form.value);
  if (!isValid) {
    errors.value = validationErrors;
    toast.add({
      title: "Missing information",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  await updateProfile({ body: form.value });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Profile updated successfully!",
  });
  errors.value = {};

  await fetchMe();
  const updatedData = apiData.value?.data?.[0];
  if (updatedData) {
    form.value = { ...updatedData };
  }

  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

function validatePasswordForm() {
  const errs: Record<string, string> = {};
  if (!passwordForm.value.currentPassword) {
    errs.currentPassword = "Current password is required";
  }
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
    toast.add({
      title: "Validation Error",
      description: "Please check the password fields.",
      color: "error",
    });
    return;
  }

  await changePasswordApi({
    body: {
      currentPassword: passwordForm.value.currentPassword,
      password: passwordForm.value.newPassword,
    },
  });

  if (passwordError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Password updated successfully!",
  });
  passwordForm.value = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
  passwordErrors.value = {};
}

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="space-y-8 max-w-[1000px]">
    <CommonEmptyState
      v-if="!loading && !apiData?.data?.[0]"
      title="Profile not found"
      description="Unable to load your profile information"
      icon="lucide:user-x"
      size="sm"
    />

    <template v-else>
      <section class="space-y-6">
        <CommonFormCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-500/20">
                <UIcon name="lucide:user-circle" class="w-5 h-5 text-brand-500" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Personal Information
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Update your account information
                </p>
              </div>
            </div>
          </template>
          <UForm :state="form" @submit="saveProfile">
            <FormEditorLazy
              ref="formEditorRef"
              v-model="form"
              v-model:errors="errors"
              @has-changed="(hasChanged) => hasFormChanges = hasChanged"
              table-name="user_definition"
              :excluded="['isRootAdmin', 'isSystem', 'allowedRoutePermissions', 'createdAt', 'updatedAt', 'password']"
              :field-map="fieldMap"
              :loading="loading"
              mode="update"
              layout="grid"
            />
          </UForm>
        </CommonFormCard>

        <CommonFormCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                <UIcon name="lucide:link" class="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Linked OAuth Accounts
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Accounts connected to your profile
                </p>
              </div>
            </div>
          </template>
          <CommonLoadingState
            v-if="oauthLoading"
            title="Loading..."
            description="Fetching linked accounts"
            size="sm"
            type="card"
          />
          <div
            v-else-if="oauthAccounts.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <CommonSettingsCard
              v-for="account in oauthAccounts"
              :key="account.id ?? account._id"
              :title="getProviderLabel(account.provider)"
              :description="`Connected as ${maskProviderId(account.providerUserId ?? '')}`"
              :icon="getProviderIcon(account.provider)"
              icon-color="primary"
              card-class="cursor-pointer transition-all"
              @click="navigateToOauthAccount(account)"
              :stats="[
                { label: 'Provider', value: getProviderLabel(account.provider) },
                { label: 'Provider ID', value: maskProviderId(account.providerUserId) },
              ]"
            />
          </div>
          <CommonEmptyState
            v-else
            title="No linked accounts"
            description="Connect your account with Google, GitHub, or other providers"
            icon="lucide:link"
            size="sm"
          />
        </CommonFormCard>

        <CommonFormCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
                <UIcon name="lucide:lock" class="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Change Password
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Update your login password
                </p>
              </div>
            </div>
          </template>
          <UForm :state="passwordForm" @submit="handleChangePassword" class="space-y-5 max-w-md">
            <UFormField
              label="Current password"
              :error="passwordErrors.currentPassword"
              required
            >
              <UInput
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="••••••••"
                icon="lucide:lock"
                size="md"
                class="w-full"
                autocomplete="current-password"
              />
            </UFormField>
            <UFormField
              label="New password"
              :error="passwordErrors.newPassword"
              required
            >
              <UInput
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="••••••••"
                icon="lucide:key"
                size="md"
                class="w-full"
                autocomplete="new-password"
              />
            </UFormField>
            <UFormField
              label="Confirm new password"
              :error="passwordErrors.confirmPassword"
              required
            >
              <UInput
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="••••••••"
                icon="lucide:key-round"
                size="md"
                class="w-full"
                autocomplete="new-password"
              />
            </UFormField>
            <UButton
              type="submit"
              color="primary"
              variant="soft"
              size="md"
              :loading="passwordLoading"
              icon="lucide:shield-check"
            >
              Update password
            </UButton>
          </UForm>
        </CommonFormCard>
      </section>
    </template>
  </div>
</template>
