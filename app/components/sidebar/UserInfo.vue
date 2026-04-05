<script setup lang="ts">
defineProps<{
  collapsed?: boolean;
}>();

const { me, logout } = useAuth();
const { confirm } = useConfirm();
const colorMode = useColorMode();
const router = useRouter();

const userEmail = computed(() => me.value?.email || '');

const userInitial = computed(() => {
  const email = userEmail.value;
  if (!email) return '?';
  return email.charAt(0).toUpperCase();
});

const isDark = computed(() => colorMode.value === 'dark');

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark';
}

const items = computed(() => [
  [{
    label: 'Profile',
    icon: 'lucide:user',
    onSelect: () => router.push('/me'),
  }, {
    label: isDark.value ? 'Dark' : 'Light',
    icon: isDark.value ? 'lucide:moon' : 'lucide:sun',
    slot: 'theme' as const,
    isDark: isDark.value,
    onToggle: toggleTheme,
    onSelect: toggleTheme,
  }],
  [{
    label: 'Logout',
    icon: 'lucide:log-out',
    color: 'error' as const,
    onSelect: async () => {
      const ok = await confirm({ content: 'Are you sure you want to logout?' });
      if (ok) await logout();
    },
  }],
]);
</script>

<template>
    <UDropdownMenu :items="items" :content="{ align: 'end' }">
      <template #theme-trailing="{ item }">
        <USwitch
          class="ms-4"
          size="sm"
          :model-value="(item as any).isDark"
          @update:model-value="(item as any).onToggle()"
          @click.stop
        />
      </template>
      <button
        v-if="collapsed"
        class="flex items-center justify-center w-full rounded-md p-1.5 border border-[var(--border-default)] bg-[var(--surface-default)] shadow-xs transition-all hover:shadow-md hover:border-[var(--border-strong)] cursor-pointer"
      >
        <UAvatar :text="userInitial" size="xs" />
      </button>
      <button
        v-else
        class="flex items-center gap-2 w-full rounded-md p-1.5 border border-[var(--border-default)] bg-[var(--surface-default)] shadow-xs transition-all hover:shadow-md hover:border-[var(--border-strong)] text-left cursor-pointer"
      >
        <UAvatar :text="userInitial" size="xs" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate text-[var(--text-secondary)] leading-tight">{{ userEmail || 'No user' }}</p>
          <p class="text-xs truncate text-[var(--text-tertiary)] leading-tight">Account</p>
        </div>
        <UIcon name="lucide:chevrons-up-down" class="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
      </button>
    </UDropdownMenu>
</template>
