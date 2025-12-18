<script setup lang="ts">
const colorMode = useColorMode();
const { me } = useEnfyraAuth();
const { width, isMobile, isTablet } = useScreen();
const { setSidebarVisible, sidebarCollapsed } = useGlobalState();

const userEmail = computed(() => {
  if (!me.value) return '';
  return me.value.email || me.value.username || '';
});

const isCollapsed = computed(() => {
  if (isMobile.value || isTablet.value) return false;
  return sidebarCollapsed.value;
});

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (val: boolean) => {
    colorMode.preference = val ? 'dark' : 'light';
  }
});

function toggleTheme() {
  isDark.value = !isDark.value;
}

function handleProfileClick() {
  if (width.value <= 1024) setSidebarVisible(false);
}
</script>

<template>
  <div v-if="isCollapsed" class="flex flex-col items-center gap-2 w-full">
    <NuxtLink
      to="/me"
      class="w-10 h-10 flex items-center justify-center rounded-lg transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400"
      active-class="bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
      @click="handleProfileClick"
    >
      <UIcon name="lucide:user" class="w-5 h-5" />
    </NuxtLink>
    <button
      @click="toggleTheme"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      class="w-10 h-10 flex items-center justify-center rounded-lg transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400"
    >
      <UIcon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="w-5 h-5" />
    </button>
  </div>

  <div v-else class="flex items-center justify-start gap-3 w-full">
    <div v-if="userEmail" class="flex items-center gap-2 min-w-0 flex-1">
      <UBadge
        color="primary"
        variant="soft"
        class="min-w-0 overflow-hidden normal-case flex-1 text-sm"
      >
        <span class="truncate block">{{ userEmail }}</span>
      </UBadge>
      <NuxtLink
        to="/me"
        class="shrink-0"
        active-class="[&_button]:bg-brand-50 [&_button]:text-brand-500 dark:[&_button]:bg-brand-500/15 dark:[&_button]:text-brand-400"
        @click="handleProfileClick"
      >
        <UButton
          icon="lucide:user"
          variant="ghost"
          color="neutral"
          size="md"
          aria-label="Edit profile"
        />
      </NuxtLink>
    </div>
    <div v-else class="text-sm text-gray-500 dark:text-gray-400 truncate flex-1">
      No user info
    </div>
    
    <UButton
      :icon="isDark ? 'lucide:sun' : 'lucide:moon'"
      variant="ghost"
      color="neutral"
      size="sm"
      @click="toggleTheme"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      class="shrink-0 ml-auto"
    />
  </div>
</template>

