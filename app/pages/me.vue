<script setup lang="ts">
const toast = useToast();
const { confirm } = useConfirm();
const { validateForm } = useFormValidation("user_definition");

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

    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

useSubHeaderActionRegistry([
  {
    id: "change-password",
    label: "Change Password",
    icon: "lucide:key-round",
    variant: "outline",
    color: "neutral",
    side: "right",
    onClick: () => { passwordModalOpen.value = true; },
  },
]);

useHeaderActionRegistry([
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
    toast.add({
      title: "Validation Error",
      description: "Please check the password fields.",
      color: "error",
    });
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

  toast.add({
    title: "Success",
    color: "success",
    description: "Password updated successfully!",
  });
  passwordForm.value = {
    newPassword: "",
    confirmPassword: "",
  };
  passwordErrors.value = {};
  showPassword.new = false;
  showPassword.confirm = false;
  passwordModalOpen.value = false;
}

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="space-y-6 max-w-[1000px]">
    <CommonEmptyState
      v-if="!loading && !apiData?.data?.[0]"
      title="Profile not found"
      description="Unable to load your profile information"
      icon="lucide:user-x"
      size="sm"
    />

    <template v-else>
      <div class="surface-card rounded-xl p-6">
        <div class="mb-5">
          <h3 class="text-base font-semibold text-[var(--text-primary)]">Personal Information</h3>
          <p class="text-sm text-[var(--text-tertiary)] mt-0.5">Update your account details and preferences</p>
        </div>
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
      </div>

      <div class="surface-card rounded-xl p-6">
        <div class="mb-5">
          <h3 class="text-base font-semibold text-[var(--text-primary)]">Linked Accounts</h3>
          <p class="text-sm text-[var(--text-tertiary)] mt-0.5">OAuth providers connected to your profile</p>
        </div>
        <CommonLoadingState
          v-if="oauthLoading"
          title="Loading..."
          description="Fetching linked accounts"
          size="sm"
          type="card"
        />
        <div v-else-if="oauthAccounts.length > 0" class="divide-y divide-[var(--border-subtle)]">
          <div
            v-for="account in oauthAccounts"
            :key="account.id ?? account._id"
            class="flex items-center gap-3 py-3 cursor-pointer transition-colors group"
            @click="navigateToOauthAccount(account)"
          >
            <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--surface-muted)]">
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
          title="No linked accounts"
          description="Connect your account with Google, GitHub, or other providers"
          icon="lucide:link"
          size="sm"
        />
      </div>

    </template>
  </div>

  <CommonModal v-model="passwordModalOpen">
    <template #title>Change Password</template>
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
</template>
