<template>
  <div class="min-h-screen flex">
    <div class="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 overflow-hidden">
      <div class="absolute inset-0">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl animate-float" style="animation-delay: 2s;"></div>
        <div class="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-indigo-300/10 rounded-full blur-3xl animate-pulse"></div>
      </div>
      
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      
      <div class="relative z-10 flex flex-col justify-between p-16 w-full">
        <div>
          <div class="flex items-center gap-3 mb-8">
            <div class="p-3 bg-white/10 backdrop-blur-sm rounded-2xl aspect-square flex items-center justify-center">
              <UIcon name="lucide:shield-check" class="text-4xl text-white" />
            </div>
            <span class="text-2xl font-bold text-white">Enfyra</span>
          </div>
        </div>
        
        <div class="space-y-6">
          <h2 class="text-5xl font-bold text-white leading-tight">
            Welcome to<br />
            <span class="text-purple-200">the Future</span>
          </h2>
          <p class="text-lg text-indigo-100 max-w-md">
            Experience the next generation of application management. Secure, powerful, and beautifully simple.
          </p>
          
          <div class="flex gap-4 pt-4">
            <div class="flex items-center gap-2 text-white/80">
              <UIcon name="lucide:check-circle" class="text-xl" />
              <span>Secure</span>
            </div>
            <div class="flex items-center gap-2 text-white/80">
              <UIcon name="lucide:zap" class="text-xl" />
              <span>Fast</span>
            </div>
            <div class="flex items-center gap-2 text-white/80">
              <UIcon name="lucide:layers" class="text-xl" />
              <span>Powerful</span>
            </div>
          </div>
        </div>
        
        <div class="text-sm text-white/60">
          © 2026 Enfyra App. All rights reserved.
        </div>
      </div>
    </div>

    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-slate-200 via-gray-100 to-indigo-200 dark:from-gray-700 dark:via-gray-800 dark:to-indigo-950">
      <div class="w-full max-w-md">
        <div class="lg:hidden flex items-center gap-3 mb-8">
          <div class="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl">
            <UIcon name="lucide:shield-check" class="text-3xl text-white" />
          </div>
          <span class="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Enfyra App</span>
        </div>

        <div class="mb-10">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Sign in to your account
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            Welcome back! Please enter your details.
          </p>
        </div>

        <UForm :state="form" @submit="handleLogin" aria-label="Login form">
          <div class="space-y-6">
            <div
              v-if="loginError"
              role="alert"
              aria-live="assertive"
              class="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
            >
              <UIcon name="lucide:alert-triangle" class="mt-0.5 size-4 shrink-0" />
              <div class="min-w-0 flex-1 break-words">
                <div class="font-semibold mb-0.5">Login failed</div>
                <div>{{ loginError }}</div>
              </div>
              <button
                type="button"
                class="shrink-0 text-red-500/70 hover:text-red-700 dark:text-red-300/70 dark:hover:text-red-100"
                aria-label="Dismiss error"
                @click="loginError = null"
              >
                <UIcon name="lucide:x" class="size-4" />
              </button>
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <UInput
                v-model="form.email"
                type="email"
                placeholder="Enter your email"
                icon="lucide:mail"
                size="lg"
                class="w-full"
                id="email"
                :error="!!error.email"
                :required="true"
                autocomplete="email"
                :aria-describedby="error.email ? 'email-error' : undefined"
              />
              <p v-if="error.email" id="email-error" role="alert" class="text-sm text-red-500 mt-1.5">{{ error.email }}</p>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <UInput
                v-model="form.password"
                type="password"
                placeholder="Enter your password"
                icon="lucide:lock"
                size="lg"
                class="w-full"
                id="password"
                autocomplete="current-password"
                :aria-describedby="error.password ? 'password-error' : undefined"
              />
              <p v-if="error.password" id="password-error" role="alert" class="text-sm text-red-500 mt-1.5">{{ error.password }}</p>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <USwitch v-model="form.remember" size="sm" />
                <label for="remember" class="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                  Remember me
                </label>
              </div>
            </div>

            <UButton
              type="submit"
              size="lg"
              class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white font-semibold shadow-lg"
              loading-auto
            >
              Sign in
            </UButton>

            <div v-if="oauthProviders.length > 0" class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
                <span class="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
                <div class="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
              </div>

              <div class="grid gap-3">
                <UButton
                  v-for="provider in oauthProviders"
                  :key="provider.provider"
                  type="button"
                  size="lg"
                  variant="outline"
                  color="neutral"
                  class="w-full justify-center"
                  :loading="oauthLoadingProvider === provider.provider"
                  @click="handleOAuthLogin(provider.provider)"
                >
                  <template #leading>
                    <UIcon
                      :name="getOAuthProviderIcon(provider.provider)"
                      class="size-5"
                    />
                  </template>
                  Continue with {{ getOAuthProviderLabel(provider.provider) }}
                </UButton>
              </div>
            </div>

            <UButton
              v-if="showDemoLogin"
              type="button"
              size="lg"
              variant="outline"
              color="neutral"
              class="w-full"
              :loading="demoLoading"
              @click="handleDemoLogin"
            >
              Try demo account
            </UButton>
          </div>
        </UForm>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OAuthProvider } from "~/types";

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const DEMO_LOGIN_EMAIL = "enfyra@admin.com";
const DEMO_LOGIN_PASSWORD = "1234";

const runtimeConfig = useRuntimeConfig();
const showDemoLogin = computed(() => {
  const v = runtimeConfig.public.demoLoginPrefill as boolean | string | undefined;
  return v === true || v === "true" || v === "1";
});

const { login, oauthLogin } = useAuth();
const route = useRoute();
const notify = useNotify();
const demoLoading = ref(false);
const oauthLoadingProvider = ref<OAuthProvider | null>(null);
const form = reactive({
  email: "",
  password: "",
  remember: true,
});
const error = reactive<{ email: string | null; password: string | null }>({
  email: null,
  password: null,
});
const loginError = ref<string | null>(null);
const {
  data: oauthProviderData,
  execute: fetchOAuthProviders,
} = useApi<{ data?: { provider: OAuthProvider }[] }>(() => "/auth/providers", {
  errorContext: "Fetch OAuth Providers",
  disableErrorPage: true,
  onError: () => true,
});

const oauthProviders = computed(
  () => oauthProviderData.value?.data ?? []
);

function redirectAfterLogin() {
  const redirect = route.query.redirect as string | undefined;
  if (redirect) window.location.href = redirect;
  else window.location.reload();
}

function getOAuthProviderIcon(provider: OAuthProvider) {
  switch (provider) {
    case "google":
      return "logos:google-icon";
    case "facebook":
      return "logos:facebook";
    case "github":
      return "mdi:github";
  }
}

function getOAuthProviderLabel(provider: OAuthProvider) {
  switch (provider) {
    case "google":
      return "Google";
    case "facebook":
      return "Facebook";
    case "github":
      return "GitHub";
  }
}

async function handleLogin() {
  loginError.value = null;
  const res = await login(form);
  if (res.ok) {
    redirectAfterLogin();
    return;
  }
  loginError.value = res.message;
  notify.error("Login failed", res.message);
}

async function handleDemoLogin() {
  demoLoading.value = true;
  loginError.value = null;
  try {
    const res = await login({
      email: DEMO_LOGIN_EMAIL,
      password: DEMO_LOGIN_PASSWORD,
      remember: true,
    });
    if (res.ok) {
      redirectAfterLogin();
      return;
    }
    const hint = "Check server ADMIN_EMAIL / ADMIN_PASSWORD match defaults.";
    loginError.value = `${res.message} (${hint})`;
    notify.error("Demo login failed", loginError.value);
  } finally {
    demoLoading.value = false;
  }
}

function handleOAuthLogin(provider: OAuthProvider) {
  oauthLoadingProvider.value = provider;
  oauthLogin(provider, route.query.redirect as string | undefined);
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

onMounted(async () => {
  await fetchOAuthProviders();
});
</script>

<style scoped>
@keyframes float {
  0%, 100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(10px, -10px);
  }
  50% {
    transform: translate(-5px, 5px);
  }
  75% {
    transform: translate(5px, 10px);
  }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}
</style>
