<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-900 px-4"
  >
    <UCard class="w-full max-w-md lg:p-6 p-2 sm:p-8">
      <!-- Branding -->
      <template #header>
        <div class="text-center space-y-2">
          <div class="flex justify-center items-center gap-3">
            <UIcon name="lucide:shield-check" class="text-primary" size="40" />
            <h1 class="lg:text-3xl md:text-xl text-lg font-bold text-primary">
              Enfyra App
            </h1>
          </div>
          <p class="text-sm text-gray-400">Login to continue</p>
        </div>
      </template>

      <!-- Form -->
      <UForm :state="form" @submit="handleLogin" aria-label="Login form">
        <div class="flex flex-col gap-y-5">
          <!-- Email -->
          <div>
            <UFormField
              :error="error.email ?? undefined"
              label="Email"
              required
            >
              <UInput
                v-model="form.email"
                placeholder="you@example.com"
                icon="lucide:mail"
                size="sm"
                class="w-full"
                id="email"
                :color="error.email ? 'error' : 'primary'"
                :error="!!error.email"
                :required="true"
                autocomplete="email"
                aria-describedby="email-error"
              />
            </UFormField>
          </div>

          <!-- Password -->
          <div>
            <UFormField
              :error="error.password ?? undefined"
              label="Password"
              required
            >
              <UInput
                v-model="form.password"
                type="password"
                placeholder="••••••••"
                icon="lucide:lock"
                size="sm"
                class="w-full"
                id="password"
                autocomplete="current-password"
                aria-describedby="password-error"
            /></UFormField>
          </div>

          <!-- Checkbox -->
          <div class="flex justify-end">
            <USwitch v-model="form.remember" label="Remember me" />
          </div>

          <!-- Submit -->
          <UButton
            type="submit"
            size="sm"
            class="w-full justify-center"
            loading-auto
          >
            Login
          </UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const { login } = useEnfyraAuth();
const toast = useToast();
const form = reactive({
  email: "",
  password: "",
  remember: true,
});
const error = reactive<{ email: string | null; password: string | null }>({
  email: null,
  password: null,
});
async function handleLogin() {
  const ok = await login(form);
  if (ok) window.location.reload();
  else {
    toast.add({
      title: "Login failed!",
      description: "Invalid email or password",
      icon: "lucide:octagon-x",
      color: "error",
    });
  }
}
watch(
  () => form.email,
  (newVal) => {
    if (!newVal) {
      error.email = "Cannot be empty!";
    } else if (!emailPattern.test(newVal)) {
      error.email = "Must be valid format!";
    } else {
      error.email = null;
    }
  }
);

watch(
  () => form.password,
  (newVal) => {
    if (!newVal) {
      error.password = "Cannot be empty!";
    } else {
      error.password = null;
    }
  }
);

definePageMeta({
  layout: false,
});
</script>
