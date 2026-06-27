<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const notify = useNotify();

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
const passwordErrors = ref<Record<string, string>>({});

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

function resetPasswordForm() {
  passwordForm.value = {
    newPassword: "",
    confirmPassword: "",
  };
  passwordErrors.value = {};
  showPassword.new = false;
  showPassword.confirm = false;
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
  resetPasswordForm();
  open.value = false;
}

watch(open, (value) => {
  if (!value) resetPasswordForm();
});
</script>

<template>
  <CommonModal v-model:open="open">
    <template #header>Change Password</template>
    <template #body>
      <UForm id="password-form" :state="passwordForm" class="space-y-5" @submit="handleChangePassword">
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
          @click="open = false"
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
