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
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const DEMO_LOGIN_EMAIL = "enfyra@admin.com";
const DEMO_LOGIN_PASSWORD = "1234";

const runtimeConfig = useRuntimeConfig();
const showDemoLogin = computed(() => {
  const v = runtimeConfig.public.demoLoginPrefill as boolean | string | undefined;
  return v === true || v === "true" || v === "1";
});

const { login } = useAuth();
const route = useRoute();
const notify = useNotify();
const demoLoading = ref(false);
const form = reactive({
  email: "",
  password: "",
  remember: true,
});
const error = reactive<{ email: string | null; password: string | null }>({
  email: null,
  password: null,
});

function redirectAfterLogin() {
  const redirect = route.query.redirect as string | undefined;
  if (redirect) window.location.href = redirect;
  else window.location.reload();
}

async function handleLogin() {
  const ok = await login(form);
  if (ok) redirectAfterLogin();
  else {
    notify.error("Login failed!", "Invalid email or password");
  }
}

async function handleDemoLogin() {
  demoLoading.value = true;
  try {
    const ok = await login({
      email: DEMO_LOGIN_EMAIL,
      password: DEMO_LOGIN_PASSWORD,
      remember: true,
    });
    if (ok) redirectAfterLogin();
    else {
      notify.error("Demo login failed", "Check server ADMIN_EMAIL / ADMIN_PASSWORD match defaults.");
    }
  } finally {
    demoLoading.value = false;
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
