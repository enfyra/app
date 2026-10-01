<script setup lang="ts">
import { unref, type ComputedRef, type Ref } from 'vue';
import type { DropdownMenuItem } from '@nuxt/ui';
import type { AccountPanelItem } from '~/types/ui';

interface AccountMenuItem extends DropdownMenuItem {
  slot?: `account-${string}`;
  swatch?: string;
  children?: AccountMenuItem[];
}

const props = defineProps<{ collapsed?: boolean }>();
const { me, logout } = useAuth();
const { confirm } = useConfirm();
const router = useRouter();
const { enfyraVersion } = useSchema();
const { checkPermissionCondition } = usePermissions();
const { $primaryColor } = useNuxtApp();
const colorMode = useColorMode();
const { accountPanelItems, register } = useAccountPanelRegistry();
const userLabel = computed(() => me.value?.email || 'Account');
const userInitial = computed(() => userLabel.value.charAt(0).toUpperCase());
const enfyraVersionLabel = computed(() => {
  const version = enfyraVersion.value?.trim();
  return version ? version.startsWith('v') ? version : `v${version}` : null;
});
const appearanceItems = computed<AccountMenuItem[]>(() => [
  { label: 'Light', icon: 'lucide:sun', value: 'light' },
  { label: 'Dark', icon: 'lucide:moon', value: 'dark' },
  { label: 'System', icon: 'lucide:monitor', value: 'system' },
].map(item => ({
  label: item.label,
  icon: item.icon,
  type: 'checkbox',
  checked: colorMode.preference === item.value,
  onSelect: event => event.preventDefault(),
  onUpdateChecked: () => { colorMode.preference = item.value; },
})));
const accentItems = computed<AccountMenuItem[]>(() => $primaryColor.colors.map(color => ({
  label: color.label,
  type: 'checkbox',
  checked: $primaryColor.current.value === color.value,
  icon: 'lucide:circle',
  ui: { itemLeadingIcon: 'fill-current' },
  swatch: color.swatch,
  onSelect: event => event.preventDefault(),
  onUpdateChecked: () => $primaryColor.set(color.value),
})));
register([
  { id: 'profile', order: 10, label: 'Profile', icon: 'lucide:user', onClick: () => router.push('/me') },
  { id: 'theme', order: 20, label: 'Appearance', icon: 'lucide:sun-moon', children: appearanceItems },
  { id: 'accent', order: 21, label: 'Accent', icon: 'lucide:palette', children: accentItems },
  { id: 'logout', order: 100, label: 'Log out', icon: 'lucide:log-out', onClick: handleLogout },
]);
const visibleAccountPanelItems = computed(() => accountPanelItems.value.filter(item =>
  (item.show === undefined || unref(item.show)) && (!item.permission || checkPermissionCondition(item.permission)),
));
function resolveValue<T>(value: T | Ref<T> | Readonly<Ref<T>> | ComputedRef<T> | undefined): T | undefined {
  return unref(value);
}
function itemBadge(item: AccountPanelItem) {
  return resolveValue(item.count) ?? resolveValue(item.badge);
}
const triggerBadge = computed(() => {
  const badges = visibleAccountPanelItems.value.map(itemBadge).filter(value => value !== undefined && value !== null && value !== '');
  const numbers = badges.filter(value => String(value).trim() !== '' && !Number.isNaN(Number(value)));
  if (numbers.length) {
    const total = numbers.reduce<number>((sum, value) => sum + Number(value), 0);
    return total > 99 ? '99+' : total || undefined;
  }
  return badges[0];
});
function toMenuItem(item: AccountPanelItem): AccountMenuItem {
  return {
    type: item.component ? 'label' : undefined,
    label: resolveValue(item.label),
    description: resolveValue(item.description),
    icon: resolveValue(item.icon),
    disabled: resolveValue(item.disabled),
    children: resolveValue(item.children) as AccountMenuItem[] | undefined,
    slot: item.component || item.contentComponent ? `account-${item.id}` : undefined,
    accountPanelItem: item,
    badge: itemBadge(item) ?? undefined,
    onSelect: event => {
      if (item.disabled && unref(item.disabled)) return;
      if (item.contentComponent || item.onToggle) event.preventDefault();
      return item.onClick ? item.onClick() : item.onToggle?.();
    },
  };
}
const menuItems = computed<AccountMenuItem[][]>(() => {
  const items = visibleAccountPanelItems.value;
  return [
    items.filter(item => (item.order ?? 0) < 20).map(toMenuItem),
    items.filter(item => (item.order ?? 0) >= 20 && (item.order ?? 0) < 30).map(toMenuItem),
    items.filter(item => (item.order ?? 0) >= 30).map(toMenuItem),
  ].filter(group => group.length);
});
async function handleLogout() {
  const ok = await confirm({ content: 'Are you sure you want to logout?' });
  if (ok) await logout();
}
</script>

<template>
  <div class="w-full shrink-0">
    <UDropdownMenu :items="menuItems" :content="{ align: 'center', side: collapsed ? 'right' : 'top', sideOffset: 8 }" :ui="{ content: 'min-w-60 w-(--reka-popper-anchor-width)' }">
      <UButton
        color="primary"
        variant="soft"
        size="lg"
        :aria-label="collapsed ? 'Open account menu' : userLabel"
        :trailing-icon="collapsed ? undefined : 'lucide:chevrons-up-down'"
        class="w-full"
        :class="collapsed ? 'justify-center px-2' : 'justify-start'"
        :ui="{ trailingIcon: 'ms-auto' }"
      >
        <UAvatar :text="userInitial" size="xs" class="bg-primary/10 text-primary" />
        <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-left">{{ userLabel }}</span>
        <UBadge v-if="triggerBadge !== undefined" :label="String(triggerBadge)" size="xs" variant="soft" />
      </UButton>
      <template #item-label="{ item }">
        <span>{{ item.label }}</span>
        <UBadge v-if="item.badge !== undefined" :label="String(item.badge)" color="neutral" variant="soft" size="xs" class="ms-2" />
      </template>
      <template #item-leading="{ item, ui }">
        <span v-if="item.swatch" class="size-4 shrink-0 rounded-full" :style="{ backgroundColor: item.swatch }" />
        <UIcon v-else-if="item.icon" :name="item.icon" :class="ui.itemLeadingIcon({ color: item.color })" />
      </template>
      <template v-for="item in visibleAccountPanelItems.filter(item => item.component || item.contentComponent)" :key="item.id" #[`account-${item.id}`]>
        <component v-if="item.component" :is="item.component" v-bind="item.props" />
        <div v-else class="w-full">
          <span>{{ resolveValue(item.label) }}</span>
          <component v-if="item.contentComponent && resolveValue(item.expanded)" :is="item.contentComponent" v-bind="item.contentProps" :class="item.contentClass" />
        </div>
      </template>
    </UDropdownMenu>
    <div v-if="!collapsed && enfyraVersionLabel" class="mt-3 flex items-center justify-center gap-1.5 px-1 text-[11px] font-medium leading-5 text-muted">
      <span>Powered by Enfyra</span>
      <UBadge :label="enfyraVersionLabel" color="neutral" variant="subtle" size="xs" />
    </div>
  </div>
</template>
