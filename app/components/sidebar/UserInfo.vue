<script setup lang="ts">
import { defineComponent, h, resolveComponent } from "vue";
import type { ComputedRef, Ref } from "vue";

import ThemeAccountPanelItem from "~/components/sidebar/ThemeAccountPanelItem.vue";
import type { AccountPanelItem } from "~/types/ui";

const props = defineProps<{
  collapsed?: boolean;
}>();

const { me, logout } = useAuth();
const { confirm } = useConfirm();
const router = useRouter();

const isOpen = ref(false);
const userEmail = computed(() => me.value?.email || '');

const userInitial = computed(() => {
  const email = userEmail.value;
  if (!email) return '?';
  return email.charAt(0).toUpperCase();
});

const panelGridClass = computed(() => (isOpen.value ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'));
const { accountPanelItems, register } = useAccountPanelRegistry();

const accountPanelButtonClass = "flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-subcontrol)] px-2.5 py-2 text-left text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--nav-item-hover-bg)] hover:text-[var(--nav-item-hover-text)]";
const logoutPanelButtonClass = "flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-subcontrol)] bg-[var(--action-danger-bg)] px-2.5 py-2 text-left text-sm font-bold text-[var(--action-danger-text)] shadow-theme-xs transition-all hover:bg-[var(--action-danger-bg-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--danger-ring)]";

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

function handleAccountPanelItemClick(item: AccountPanelItem) {
  if (item.disabled && unref(item.disabled)) return;
  if (item.onClick) {
    item.onClick();
    return;
  }
  if (item.onToggle) {
    item.onToggle();
    return;
  }
}

function resolveAccountPanelValue<T>(value: T | Ref<T> | Readonly<Ref<T>> | ComputedRef<T> | undefined): T | undefined {
  return isRef(value) ? unref(value) : value;
}

function handleAccountPanelItemKeydown(event: KeyboardEvent, item: AccountPanelItem) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  handleAccountPanelItemClick(item);
}

function accountPanelBadgeClass(item: AccountPanelItem) {
  const color = resolveAccountPanelValue(item.badgeColor) || "neutral";
  const base = "ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold";
  if (color === "error") return `${base} bg-[var(--state-danger-soft-bg)] text-[var(--state-danger-soft-text)]`;
  if (color === "warning") return `${base} bg-[var(--state-warning-soft-bg)] text-[var(--state-warning-soft-text)]`;
  if (color === "success") return `${base} bg-[var(--state-success-soft-bg)] text-[var(--state-success-soft-text)]`;
  if (color === "primary") return `${base} bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)]`;
  return `${base} bg-[var(--surface-muted)] text-[var(--text-tertiary)]`;
}

function hasAccountPanelBadge(item: AccountPanelItem) {
  const badge = resolveAccountPanelValue(item.badge);
  return badge !== undefined && badge !== null && badge !== "";
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
      class="flex items-center justify-center w-full rounded-[var(--radius-control)] border border-[var(--card-border)] bg-[var(--block-base)] p-2 shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--card-border-hover)] cursor-pointer"
      aria-label="Open profile"
      @click="togglePanel"
    >
      <UAvatar :text="userInitial" size="xs" class="!bg-[var(--state-primary-soft-bg)] !text-[var(--state-primary-soft-text)] ring-1 ring-inset ring-[var(--state-primary-outline-border)]" />
    </button>

    <div
      v-else
      class="overflow-hidden rounded-[var(--radius-card)] border border-[var(--card-border)] bg-[var(--block-base)] shadow-[var(--shadow-sm)] backdrop-blur-xl transition-colors duration-200 hover:border-[var(--card-border-hover)]"
    >
      <div
        role="button"
        tabindex="0"
        class="flex cursor-pointer items-center gap-3 w-full p-2.5 text-left"
        :aria-expanded="isOpen"
        @click="togglePanel"
        @keydown.enter.prevent="togglePanel"
        @keydown.space.prevent="togglePanel"
      >
        <UAvatar :text="userInitial" size="xs" class="!bg-[var(--state-primary-soft-bg)] !text-[var(--state-primary-soft-text)] ring-1 ring-inset ring-[var(--state-primary-outline-border)]" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold truncate text-[var(--text-secondary)] leading-tight">{{ userEmail || 'No user' }}</p>
          <p class="text-xs truncate font-semibold text-[var(--text-tertiary)] leading-tight">Account</p>
        </div>
        <UIcon name="lucide:chevrons-up-down" class="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
      </div>

      <div
        class="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        :class="panelGridClass"
      >
        <div class="min-h-0 overflow-hidden">
          <div class="border-t border-[var(--card-border)]">
          <div class="p-2 space-y-1">
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
                    :name="resolveAccountPanelValue(item.icon)"
                    :class="item.iconClass || 'h-5 w-5 shrink-0 text-[var(--text-tertiary)]'"
                  />
                  <span class="min-w-0 flex-1">
                    <span :class="item.labelClass || 'block truncate'">
                      {{ resolveAccountPanelValue(item.label) }}
                    </span>
                    <span
                      v-if="resolveAccountPanelValue(item.description)"
                      class="mt-0.5 block truncate text-xs font-normal text-[var(--text-tertiary)]"
                    >
                      {{ resolveAccountPanelValue(item.description) }}
                    </span>
                  </span>
                  <span
                    v-if="hasAccountPanelBadge(item)"
                    :class="accountPanelBadgeClass(item)"
                  >
                    {{ resolveAccountPanelValue(item.badge) }}
                  </span>
                  <UIcon
                    v-if="item.trailingIcon || item.contentComponent || item.onToggle"
                    :name="item.trailingIcon ? resolveAccountPanelValue(item.trailingIcon) : resolveAccountPanelValue(item.expanded) ? 'lucide:chevron-up' : 'lucide:chevron-right'"
                    class="h-4 w-4 shrink-0 text-[var(--text-tertiary)]"
                  />
                </div>
                <component
                  v-if="!item.component && item.contentComponent && resolveAccountPanelValue(item.expanded)"
                  :is="item.contentComponent"
                  v-bind="item.contentProps"
                  :class="item.contentClass || 'mx-1 mb-1 overflow-hidden rounded-[var(--radius-subcontrol)] border border-[var(--border-default)] bg-[var(--surface-default)]'"
                />
              </PermissionGate>
            </template>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
