<script setup lang="ts">
definePageMeta({
  layout: false,
});

const route = useRoute();
const colorMode = useColorMode();

const status = ref<'idle' | 'creating' | 'sending' | 'done' | 'error'>('idle');
const errorMessage = ref('');

const {
  data: createdToken,
  error: createError,
  execute: createApiToken,
} = useApi<{ token?: string }>(() => '/auth/api-tokens', {
  method: 'post',
  errorContext: 'MCP Setup',
  disableErrorPage: true,
  onError: () => true,
});

const isDark = computed(() => colorMode.value === 'dark');
const themeIcon = computed(() => isDark.value ? 'lucide:moon' : 'lucide:sun');
const themeLabel = computed(() => isDark.value ? 'Dark' : 'Light');

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark';
}

function isValidCallback(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

async function createAndRedirect() {
  const callback = route.query.callback as string | undefined;

  if (!isValidCallback(callback)) {
    status.value = 'error';
    errorMessage.value = 'Invalid or missing callback URL. This page must be opened from the Enfyra MCP CLI.';
    return;
  }

  status.value = 'creating';

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
  const date = new Date().toISOString().slice(0, 10);
  const tokenName = `MCP CLI — ${hostname} — ${date}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  await createApiToken({
    body: {
      name: tokenName,
      expiresAt: expiresAt.toISOString(),
    },
  });

  if (createError.value || !createdToken.value?.token) {
    status.value = 'error';
    errorMessage.value = createError.value?.message || 'Failed to create API token.';
    return;
  }

  status.value = 'sending';

  try {
    const res = await fetch(callback!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pat: createdToken.value.token }),
    });
    if (!res.ok) throw new Error(`CLI server responded with ${res.status}`);
    status.value = 'done';
  } catch (err: any) {
    status.value = 'error';
    errorMessage.value = err.message || 'Failed to send token to CLI. The terminal may have timed out.';
  }
}

onMounted(() => {
  const { markInitialReady } = useInitialLoading();
  markInitialReady();
  createAndRedirect();
});
</script>

<template>
  <div class="mcp-setup-page min-h-screen flex">
    <div class="mcp-setup-hero hidden lg:flex lg:w-1/2 relative overflow-hidden">
      <div class="mcp-setup-hero-grid absolute inset-0"></div>
      <div class="relative z-10 flex flex-col justify-between p-16 w-full">
        <div>
          <div class="flex items-center gap-3 mb-8">
            <div class="mcp-setup-brand-mark p-3 rounded-2xl aspect-square flex items-center justify-center">
              <UIcon name="lucide:shield-check" class="text-4xl" />
            </div>
            <span class="text-2xl font-bold">Enfyra</span>
          </div>
        </div>
        <div class="space-y-6">
          <h2 class="text-5xl font-bold leading-tight">
            MCP<br />
            <span>Setup</span>
          </h2>
          <p class="mcp-setup-hero-copy text-lg max-w-md">
            Connect your terminal to Enfyra with a single click. No copy-paste required.
          </p>
          <div class="flex gap-4 pt-4">
            <div class="mcp-setup-hero-chip flex items-center gap-2">
              <UIcon name="lucide:terminal" class="text-xl" />
              <span>CLI</span>
            </div>
            <div class="mcp-setup-hero-chip flex items-center gap-2">
              <UIcon name="lucide:key" class="text-xl" />
              <span>Secure</span>
            </div>
            <div class="mcp-setup-hero-chip flex items-center gap-2">
              <UIcon name="lucide:zap" class="text-xl" />
              <span>Instant</span>
            </div>
          </div>
        </div>
        <div class="mcp-setup-hero-copy text-sm">
          © 2026 Enfyra App. All rights reserved.
        </div>
      </div>
    </div>

    <div class="mcp-setup-form-panel relative w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
      <div class="absolute right-5 top-5 z-20">
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
            MCP CLI Setup
          </h1>
          <p class="text-[var(--text-tertiary)]">
            Creating and sending your API token to the terminal.
          </p>
        </div>

        <div class="mcp-setup-status-card">
          <template v-if="status === 'idle' || status === 'creating'">
            <div class="mcp-setup-status-icon creating">
              <UIcon name="lucide:key-round" class="text-2xl" />
            </div>
            <div class="mcp-setup-status-text">
              <h3>Creating API token</h3>
              <p>Generating a new token for your MCP connection...</p>
            </div>
            <div class="mcp-setup-spinner" />
          </template>

          <template v-else-if="status === 'sending'">
            <div class="mcp-setup-status-icon sending">
              <UIcon name="lucide:send" class="text-2xl" />
            </div>
            <div class="mcp-setup-status-text">
              <h3>Sending to terminal</h3>
              <p>Delivering the token to your CLI session...</p>
            </div>
            <div class="mcp-setup-spinner" />
          </template>

          <template v-else-if="status === 'done'">
            <div class="mcp-setup-status-icon done">
              <UIcon name="lucide:check-circle" class="text-2xl" />
            </div>
            <div class="mcp-setup-status-text">
              <h3>Connected</h3>
              <p>Your terminal is now authenticated. You can close this tab.</p>
            </div>
            <NuxtLink to="/" class="mcp-setup-dashboard-link">
              <UIcon name="lucide:layout-dashboard" class="size-4" />
              Go to Dashboard
            </NuxtLink>
          </template>

          <template v-else>
            <div class="mcp-setup-status-icon error">
              <UIcon name="lucide:alert-triangle" class="text-2xl" />
            </div>
            <div class="mcp-setup-status-text">
              <h3>Connection failed</h3>
              <p>{{ errorMessage }}</p>
            </div>
            <NuxtLink to="/me" class="mcp-setup-fallback-link">
              <UIcon name="lucide:external-link" class="size-4" />
              Manage tokens from your profile
            </NuxtLink>
            <NuxtLink to="/" class="mcp-setup-dashboard-link">
              <UIcon name="lucide:layout-dashboard" class="size-4" />
              Go to Dashboard
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mcp-setup-page {
  background: var(--bg-app);
}

.mcp-setup-hero {
  color: var(--md-on-primary-container);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--md-primary) 30%, var(--block-base)), color-mix(in srgb, var(--md-primary) 10%, var(--block-low)));
}

.mcp-setup-hero-grid {
  opacity: 0.55;
  background-image:
    linear-gradient(color-mix(in srgb, var(--md-on-primary-container) 8%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--md-on-primary-container) 8%, transparent) 1px, transparent 1px);
  background-size: 64px 64px;
}

.mcp-setup-brand-mark {
  color: var(--md-on-primary-container);
  background: color-mix(in srgb, var(--md-primary) 18%, var(--surface-default));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-primary) 26%, transparent);
}

.mcp-setup-hero-copy,
.mcp-setup-hero-chip {
  color: color-mix(in srgb, var(--md-on-primary-container) 78%, transparent);
}

.mcp-setup-form-panel {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--md-primary) 8%, transparent), transparent 26rem),
    linear-gradient(135deg, var(--surface-nested), var(--surface-default));
}

.dark .mcp-setup-hero {
  color: var(--text-primary);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--md-primary) 14%, var(--block-low)), color-mix(in srgb, var(--md-primary) 5%, var(--bg-app)));
}

.dark .mcp-setup-hero-grid {
  opacity: 0.35;
  background-image:
    linear-gradient(color-mix(in srgb, var(--text-primary) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--text-primary) 5%, transparent) 1px, transparent 1px);
  background-size: 64px 64px;
}

.dark .mcp-setup-brand-mark {
  color: color-mix(in srgb, var(--md-primary) 72%, var(--text-primary));
  background: color-mix(in srgb, var(--md-primary) 18%, var(--block-low));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-primary) 32%, transparent);
}

.dark .mcp-setup-hero-copy,
.dark .mcp-setup-hero-chip {
  color: var(--text-secondary);
}

.dark .mcp-setup-form-panel {
  background:
    radial-gradient(circle at bottom right, color-mix(in srgb, var(--md-primary) 7%, transparent), transparent 28rem),
    linear-gradient(135deg, var(--bg-app), var(--block-low));
}

.mcp-setup-status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 24px;
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  background: var(--surface-muted);
  text-align: center;
}

.mcp-setup-status-icon {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  border-radius: 16px;
}

.mcp-setup-status-icon.creating {
  background: var(--state-primary-soft-bg);
  color: var(--state-primary-soft-text);
}

.mcp-setup-status-icon.sending {
  background: var(--state-info-soft-bg, var(--state-primary-soft-bg));
  color: var(--state-info-soft-text, var(--state-primary-soft-text));
}

.mcp-setup-status-icon.done {
  background: var(--state-success-soft-bg);
  color: var(--state-success-soft-text);
}

.mcp-setup-status-icon.error {
  background: var(--state-danger-soft-bg);
  color: var(--state-danger-soft-text);
}

.mcp-setup-status-text h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.mcp-setup-status-text p {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--text-tertiary);
}

.mcp-setup-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--md-primary);
  border-radius: 50%;
  animation: mcp-spin 0.7s linear infinite;
}

@keyframes mcp-spin {
  to { transform: rotate(360deg); }
}

.mcp-setup-fallback-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--md-primary);
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  transition: background-color 150ms ease;
}

.mcp-setup-fallback-link:hover {
  background: var(--surface-muted);
}

.mcp-setup-dashboard-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--action-primary-text);
  background: var(--action-primary-bg);
  text-decoration: none;
  padding: 10px 20px;
  border-radius: 10px;
  transition: opacity 150ms ease, transform 150ms ease;
}

.mcp-setup-dashboard-link:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
