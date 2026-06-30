<template>
  <div class="login-page min-h-screen flex">
    <div
      class="login-hero hidden lg:flex lg:w-1/2 relative overflow-hidden"
    >
      <div class="login-hero-grid absolute inset-0"></div>
      
      <div class="relative z-10 flex flex-col justify-between p-16 w-full">
        <div>
          <div class="flex items-center gap-3 mb-8">
            <div class="login-brand-mark p-3 rounded-2xl aspect-square flex items-center justify-center">
              <UIcon name="lucide:shield-check" class="text-4xl" />
            </div>
            <span class="text-2xl font-bold">Enfyra</span>
          </div>
        </div>
        
        <div class="space-y-6">
          <h2 class="text-5xl font-bold leading-tight">
            Welcome to<br />
            <span>the Future</span>
          </h2>
          <p class="login-hero-copy text-lg max-w-md">
            Experience the next generation of application management. Secure, powerful, and beautifully simple.
          </p>
          
          <div class="flex gap-4 pt-4">
            <div class="login-hero-chip flex items-center gap-2">
              <UIcon name="lucide:check-circle" class="text-xl" />
              <span>Secure</span>
            </div>
            <div class="login-hero-chip flex items-center gap-2">
              <UIcon name="lucide:zap" class="text-xl" />
              <span>Fast</span>
            </div>
            <div class="login-hero-chip flex items-center gap-2">
              <UIcon name="lucide:layers" class="text-xl" />
              <span>Powerful</span>
            </div>
          </div>
        </div>
        
        <div class="login-hero-copy text-sm">
          © 2026 Enfyra App. All rights reserved.
        </div>
      </div>
    </div>

    <div
      class="login-form-panel relative w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8"
    >
      <div class="absolute right-5 top-5 z-20 flex items-center gap-2">
        <UButton
          type="button"
          size="lg"
          variant="outline"
          color="neutral"
          :icon="themeIcon"
          :aria-label="`Switch to ${isDark ? 'light' : 'dark'} theme`"
          :title="themeLabel"
          @click="toggleTheme"
        />
        <UPopover :content="{ align: 'end', sideOffset: 8 }">
          <UButton
            type="button"
            size="lg"
            variant="outline"
            color="neutral"
            icon="lucide:palette"
            aria-label="Choose accent color"
            title="Accent"
          />
          <template #content="{ close }">
            <div class="w-48 space-y-1 p-2">
              <div class="flex items-center justify-between gap-2 px-1 pb-1">
                <div class="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Accent</div>
                <UButton
                  type="button"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="lucide:x"
                  aria-label="Close accent chooser"
                  @click="close()"
                />
              </div>
              <button
                v-for="color in $primaryColor.colors"
                :key="color.value"
                type="button"
                class="flex w-full items-center gap-2 rounded-[var(--radius-subcontrol)] px-2.5 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus-ring-strong)]"
                :class="$primaryColor.current.value === color.value ? 'bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)]' : ''"
                :aria-label="`Use ${color.label} accent`"
                :aria-pressed="$primaryColor.current.value === color.value"
                :title="color.label"
                @click="$primaryColor.set(color.value)"
              >
                <span class="h-4 w-4 shrink-0 rounded-full ring-1 ring-inset ring-[var(--border-default)]" :style="{ backgroundColor: color.swatch }" />
                <span class="min-w-0 flex-1 truncate">{{ color.label }}</span>
                <UIcon
                  v-if="$primaryColor.current.value === color.value"
                  name="lucide:check"
                  class="h-4 w-4 shrink-0"
                />
              </button>
            </div>
          </template>
        </UPopover>
      </div>

      <div class="w-full max-w-md pt-16 lg:pt-0">
        <div class="lg:hidden mb-10 flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--action-primary-bg)]">
            <UIcon name="lucide:shield-check" class="text-2xl text-[var(--action-primary-text)]" />
          </div>
          <span class="text-xl font-bold text-[var(--text-primary)]">Enfyra App</span>
        </div>

        <div class="mb-10">
          <h1 class="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Sign in to your account
          </h1>
          <p class="text-[var(--text-tertiary)]">
            Welcome back! Please enter your details.
          </p>
        </div>

        <UForm :state="form" @submit="handleLogin" aria-label="Login form">
          <div class="space-y-6">
            <div
              v-if="loginError"
              role="alert"
              aria-live="assertive"
              class="flex items-start gap-3 rounded-lg border border-[var(--state-danger-outline-border)] bg-[var(--state-danger-soft-bg)] px-4 py-3 text-sm text-[var(--state-danger-soft-text)]"
            >
              <UIcon name="lucide:alert-triangle" class="mt-0.5 size-4 shrink-0" />
              <div class="min-w-0 flex-1 break-words">
                <div class="font-semibold mb-0.5">Login failed</div>
                <div>{{ loginError }}</div>
              </div>
              <button
                type="button"
                class="shrink-0 text-[var(--state-danger-soft-text)] opacity-70 hover:opacity-100"
                aria-label="Dismiss error"
                @click="loginError = null"
              >
                <UIcon name="lucide:x" class="size-4" />
              </button>
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
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
              <p v-if="error.email" id="email-error" role="alert" class="text-sm text-[var(--form-error-text)] mt-1.5">{{ error.email }}</p>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
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
              <p v-if="error.password" id="password-error" role="alert" class="text-sm text-[var(--form-error-text)] mt-1.5">{{ error.password }}</p>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <USwitch v-model="form.remember" size="sm" />
                <label for="remember" class="text-sm text-[var(--text-tertiary)] cursor-pointer select-none">
                  Remember me
                </label>
              </div>
            </div>

            <UButton
              type="submit"
              size="lg"
              color="primary"
              variant="solid"
              class="w-full font-semibold shadow-lg"
              loading-auto
            >
              Sign in
            </UButton>

            <div v-if="oauthProviders.length > 0" class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="h-px flex-1 bg-[var(--border-default)]" />
                <span class="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Or continue with
                </span>
                <div class="h-px flex-1 bg-[var(--border-default)]" />
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

const { login, oauthLogin, fetchUser } = useAuth();
const route = useRoute();
const notify = useNotify();
const colorMode = useColorMode();
const { $primaryColor } = useNuxtApp();
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
const isDark = computed(() => colorMode.value === "dark");
const themeLabel = computed(() => (isDark.value ? "Dark" : "Light"));
const themeIcon = computed(() => (isDark.value ? "lucide:moon" : "lucide:sun"));

function toggleTheme() {
  colorMode.preference = isDark.value ? "light" : "dark";
}

async function completeLogin() {
  await fetchUser({ fields: DEFAULT_ME_FIELDS });

  const redirect = route.query.redirect as string | undefined;
  if (redirect) window.location.href = redirect;
  else await navigateTo("/");
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
    await completeLogin();
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
      await completeLogin();
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
  const { markInitialReady } = useInitialLoading();
  const oauthError = route.query.error;
  if (typeof oauthError === "string" && oauthError.length > 0) {
    loginError.value = oauthError;
  }
  try {
    await fetchOAuthProviders();
  } finally {
    markInitialReady();
  }
});
</script>

<style scoped>
.login-page {
  background: var(--bg-app);
}

.login-hero {
  color: var(--md-on-primary-container);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--md-primary) 30%, var(--block-base)), color-mix(in srgb, var(--md-primary) 10%, var(--block-low)));
}

.login-hero-grid {
  opacity: 0.55;
  background-image:
    linear-gradient(color-mix(in srgb, var(--md-on-primary-container) 8%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--md-on-primary-container) 8%, transparent) 1px, transparent 1px);
  background-size: 64px 64px;
}

.login-brand-mark {
  color: var(--md-on-primary-container);
  background: color-mix(in srgb, var(--md-primary) 18%, var(--surface-default));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-primary) 26%, transparent);
}

.login-hero-copy,
.login-hero-chip {
  color: color-mix(in srgb, var(--md-on-primary-container) 78%, transparent);
}

.login-form-panel {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--md-primary) 8%, transparent), transparent 26rem),
    linear-gradient(135deg, var(--surface-nested), var(--surface-default));
}

.dark .login-hero {
  color: var(--text-primary);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--md-primary) 14%, var(--block-low)), color-mix(in srgb, var(--md-primary) 5%, var(--bg-app)));
}

.dark .login-hero-grid {
  opacity: 0.35;
  background-image:
    linear-gradient(color-mix(in srgb, var(--text-primary) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--text-primary) 5%, transparent) 1px, transparent 1px);
}

.dark .login-brand-mark {
  color: color-mix(in srgb, var(--md-primary) 72%, var(--text-primary));
  background: color-mix(in srgb, var(--md-primary) 18%, var(--block-low));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-primary) 32%, transparent);
}

.dark .login-hero-copy,
.dark .login-hero-chip {
  color: var(--text-secondary);
}

.dark .login-form-panel {
  background:
    radial-gradient(circle at bottom right, color-mix(in srgb, var(--md-primary) 7%, transparent), transparent 28rem),
    linear-gradient(135deg, var(--bg-app), var(--block-low));
}
</style>
