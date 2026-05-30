<script setup lang="ts">
const props = defineProps<{
  collapsed?: boolean;
}>();

const { me, logout } = useAuth();
const { confirm } = useConfirm();
const colorMode = useColorMode();
const router = useRouter();

const isOpen = ref(false);
const userEmail = computed(() => me.value?.email || '');

const userInitial = computed(() => {
  const email = userEmail.value;
  if (!email) return '?';
  return email.charAt(0).toUpperCase();
});

const isDark = computed(() => colorMode.value === 'dark');
const themeLabel = computed(() => (isDark.value ? 'Dark' : 'Light'));
const themeIcon = computed(() => (isDark.value ? 'lucide:moon' : 'lucide:sun'));
const panelGridClass = computed(() => (isOpen.value ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'));

watch(
  () => props.collapsed,
  (collapsed) => {
    if (collapsed) isOpen.value = false;
  },
);

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark';
}

function togglePanel() {
  if (props.collapsed) {
    router.push('/me');
    return;
  }
  isOpen.value = !isOpen.value;
}

async function handleLogout() {
  const ok = await confirm({ content: 'Are you sure you want to logout?' });
  if (ok) await logout();
}
</script>

<template>
  <div class="w-full overflow-hidden">
    <button
      v-if="collapsed"
      type="button"
      class="flex items-center justify-center w-full rounded-md p-1.5 border border-[var(--border-default)] bg-[var(--surface-default)] shadow-xs transition-all hover:shadow-md hover:border-[var(--border-strong)] cursor-pointer"
      aria-label="Open profile"
      @click="togglePanel"
    >
      <UAvatar :text="userInitial" size="xs" />
    </button>

    <div
      v-else
      class="overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--surface-default)] shadow-xs transition-all duration-200 hover:shadow-md hover:border-[var(--border-strong)]"
      :class="isOpen ? 'rounded-lg' : ''"
    >
      <button
        type="button"
        class="flex items-center gap-2 w-full p-1.5 text-left cursor-pointer"
        :aria-expanded="isOpen"
        @click="togglePanel"
      >
        <UAvatar :text="userInitial" size="xs" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate text-[var(--text-secondary)] leading-tight">{{ userEmail || 'No user' }}</p>
          <p class="text-xs truncate text-[var(--text-tertiary)] leading-tight">Account</p>
        </div>
        <UIcon name="lucide:chevrons-up-down" class="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
      </button>

      <div
        class="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        :class="panelGridClass"
      >
        <div class="min-h-0 overflow-hidden">
          <div class="border-t border-[var(--border-default)]">
          <div class="p-1.5 space-y-1">
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)]"
              @click="router.push('/me')"
            >
              <UIcon name="lucide:user" class="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
              <span class="truncate">Profile</span>
            </button>

            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)]"
              @click="toggleTheme"
            >
              <UIcon :name="themeIcon" class="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
              <span class="min-w-0 flex-1 truncate">{{ themeLabel }}</span>
              <USwitch size="sm" :model-value="isDark" @update:model-value="toggleTheme" @click.stop />
            </button>

            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md bg-red-50 px-2.5 py-2 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
              @click="handleLogout"
            >
              <UIcon name="lucide:log-out" class="h-5 w-5 shrink-0" />
              <span class="truncate">Logout</span>
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
