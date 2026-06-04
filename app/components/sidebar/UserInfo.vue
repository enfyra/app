<script setup lang="ts">
import { defineComponent, h, resolveComponent } from "vue";

import type { AccountPanelItem } from "~/types/ui";

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
const { accountPanelItems, register } = useAccountPanelRegistry();

const accountPanelButtonClass = "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)]";
const logoutPanelButtonClass = "flex w-full cursor-pointer items-center gap-2 rounded-md bg-red-50 px-2.5 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15 dark:hover:text-red-200";

const ProfileAccountPanelItem = defineComponent({
  name: "ProfileAccountPanelItem",
  setup() {
    const UIcon = resolveComponent("UIcon");
    const activate = () => router.push("/me");
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activate();
    };

    return () => h(
      "div",
      {
        role: "button",
        tabindex: 0,
        class: accountPanelButtonClass,
        onClick: activate,
        onKeydown,
      },
      [
        h(UIcon, { name: "lucide:user", class: "h-5 w-5 shrink-0 text-[var(--text-tertiary)]" }),
        h("span", { class: "truncate" }, "Profile"),
      ],
    );
  },
});

const ThemeAccountPanelItem = defineComponent({
  name: "ThemeAccountPanelItem",
  setup() {
    const UIcon = resolveComponent("UIcon");
    const USwitch = resolveComponent("USwitch");
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleTheme();
    };

    return () => h(
      "div",
      {
        role: "button",
        tabindex: 0,
        class: accountPanelButtonClass,
        onClick: toggleTheme,
        onKeydown,
      },
      [
        h(UIcon, { name: themeIcon.value, class: "h-5 w-5 shrink-0 text-[var(--text-tertiary)]" }),
        h("span", { class: "min-w-0 flex-1 truncate" }, themeLabel.value),
        h(USwitch, {
          size: "sm",
          modelValue: isDark.value,
          "onUpdate:modelValue": toggleTheme,
          onClick: (event: MouseEvent) => event.stopPropagation(),
        }),
      ],
    );
  },
});

const LogoutAccountPanelItem = defineComponent({
  name: "LogoutAccountPanelItem",
  setup() {
    const UIcon = resolveComponent("UIcon");
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handleLogout();
    };

    return () => h(
      "div",
      {
        role: "button",
        tabindex: 0,
        class: logoutPanelButtonClass,
        onClick: handleLogout,
        onKeydown,
      },
      [
        h(UIcon, { name: "lucide:log-out", class: "h-5 w-5 shrink-0" }),
        h("span", { class: "truncate" }, "Logout"),
      ],
    );
  },
});

register([
  { id: "profile", order: 10, component: ProfileAccountPanelItem },
  { id: "theme", order: 20, component: ThemeAccountPanelItem },
  { id: "logout", order: 100, component: LogoutAccountPanelItem },
]);

const visibleAccountPanelItems = computed(() => accountPanelItems.value.filter((item) => {
  const showValue = item.show === undefined
    ? true
    : isRef(item.show)
      ? unref(item.show)
      : item.show;
  return Boolean(showValue);
}));

watch(
  () => props.collapsed,
  (collapsed) => {
    if (collapsed) isOpen.value = false;
  },
);

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark';
}

function handleAccountPanelItemClick(item: AccountPanelItem) {
  if (item.disabled && unref(item.disabled)) return;
  item.onClick?.();
}

function handleAccountPanelItemKeydown(event: KeyboardEvent, item: AccountPanelItem) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  handleAccountPanelItemClick(item);
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
      <div
        role="button"
        tabindex="0"
        class="flex cursor-pointer items-center gap-2 w-full p-1.5 text-left"
        :aria-expanded="isOpen"
        @click="togglePanel"
        @keydown.enter.prevent="togglePanel"
        @keydown.space.prevent="togglePanel"
      >
        <UAvatar :text="userInitial" size="xs" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate text-[var(--text-secondary)] leading-tight">{{ userEmail || 'No user' }}</p>
          <p class="text-xs truncate text-[var(--text-tertiary)] leading-tight">Account</p>
        </div>
        <UIcon name="lucide:chevrons-up-down" class="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
      </div>

      <div
        class="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        :class="panelGridClass"
      >
        <div class="min-h-0 overflow-hidden">
          <div class="border-t border-[var(--border-default)]">
          <div class="p-1.5 space-y-1">
            <template v-for="item in visibleAccountPanelItems" :key="item.id">
              <PermissionGate :condition="item.permission">
                <component
                  v-if="item.component"
                  :is="item.component"
                  v-bind="item.props"
                />
                <div
                  v-else
                  role="button"
                  tabindex="0"
                  :class="[
                    accountPanelButtonClass,
                    item.class,
                    item.disabled && unref(item.disabled) ? 'cursor-not-allowed opacity-50' : '',
                  ]"
                  @click="handleAccountPanelItemClick(item)"
                  @keydown="handleAccountPanelItemKeydown($event, item)"
                >
                  <UIcon
                    v-if="item.icon"
                    :name="isRef(item.icon) ? unref(item.icon) : item.icon"
                    :class="item.iconClass || 'h-5 w-5 shrink-0 text-[var(--text-tertiary)]'"
                  />
                  <span class="truncate">{{ isRef(item.label) ? unref(item.label) : item.label }}</span>
                </div>
              </PermissionGate>
            </template>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
