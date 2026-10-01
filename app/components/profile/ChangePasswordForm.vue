<script setup lang="ts">
const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true });
const { register: registerHeaderActions } = useHeaderActionRegistry();

const notify = useNotify();

const {
  executeWithResult: changePasswordApi,
  pending: passwordLoading,
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
  if (!props.active || passwordLoading.value) return;
  if (!validatePasswordForm()) {
    notify.error("Validation Error", "Please check the password fields.");
    return;
  }

  const result = await changePasswordApi({
    body: {
      password: passwordForm.value.newPassword,
    },
  });

  if (!result.ok) {
    return;
  }

  notify.success("Success", "Password updated successfully!");
  resetPasswordForm();
}

const hasPasswordChanges = computed(() => Boolean(passwordForm.value.newPassword || passwordForm.value.confirmPassword));
registerHeaderActions([
  {
    id: "reset-password",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "neutral",
    order: 1,
    show: computed(() => props.active && hasPasswordChanges.value),
    disabled: passwordLoading,
    onClick: resetPasswordForm,
  },
  {
    id: "change-password",
    label: "Update password",
    icon: "lucide:key-round",
    variant: "solid",
    color: "primary",
    order: 999,
    show: computed(() => props.active),
    loading: passwordLoading,
    disabled: computed(() => passwordLoading.value || !hasPasswordChanges.value),
    submit: handleChangePassword,
  },
]);
</script>

<template>
  <CommonFormCard :bordered="false" description="Choose a new password with at least 6 characters for your account.">
    <UForm :state="passwordForm" class="grid gap-5 md:grid-cols-2" @submit="handleChangePassword">
      <UFormField label="New password" :error="passwordErrors.newPassword" required>
        <UInput v-model="passwordForm.newPassword" :type="showPassword.new ? 'text' : 'password'" placeholder="Enter new password" class="w-full" autocomplete="new-password">
          <template #trailing>
            <UButton type="button" color="neutral" variant="ghost" size="xs" :icon="showPassword.new ? 'lucide:eye-off' : 'lucide:eye'" :aria-label="showPassword.new ? 'Hide new password' : 'Show new password'" @click="showPassword.new = !showPassword.new" />
          </template>
        </UInput>
      </UFormField>
      <UFormField label="Confirm new password" :error="passwordErrors.confirmPassword" required>
        <UInput v-model="passwordForm.confirmPassword" :type="showPassword.confirm ? 'text' : 'password'" placeholder="Confirm new password" class="w-full" autocomplete="new-password">
          <template #trailing>
            <UButton type="button" color="neutral" variant="ghost" size="xs" :icon="showPassword.confirm ? 'lucide:eye-off' : 'lucide:eye'" :aria-label="showPassword.confirm ? 'Hide password confirmation' : 'Show password confirmation'" @click="showPassword.confirm = !showPassword.confirm" />
          </template>
        </UInput>
      </UFormField>
    </UForm>
  </CommonFormCard>
</template>
