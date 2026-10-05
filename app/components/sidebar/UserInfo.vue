<script setup lang="ts">
import { unref, type ComputedRef, type Ref } from 'vue';
import type { DropdownMenuItem } from '@nuxt/ui';
import { UDropdownMenu } from '#components';
import type { AccountPanelItem } from '~/types/ui';

interface AccountMenuItem extends DropdownMenuItem {
  slot?: `account-${string}`;
  swatch?: string;
  children?: AccountMenuItem[];
  accountPanelItem?: AccountPanelItem;
}

const props = defineProps<{ collapsed?: boolean }>();
const { me, logout } = useAuth();
const { confirm } = useConfirm();
const router = useRouter();
const route = useRoute();
const { isDesktop } = useScreen();
const mobileOpen = useState('account-sheet-open', () => false);
const mobilePath = ref<number[]>([]);
const { enfyraVersion } = useSchema();
const { checkPermissionCondition } = usePermissions();
const { $primaryColor } = useNuxtApp();
const colorMode = useColorMode();
const { accountPanelItems, register } = useAccountPanelRegistry();
const userLabel = computed(() => me.value?.email || 'Account');
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
    color: item.id === 'logout' ? 'error' : undefined,
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
  const items = visibleAccountPanelItems.value.filter(item => item.id !== 'logout');
  return [
    items.filter(item => (item.order ?? 0) < 20).map(toMenuItem),
    items.filter(item => (item.order ?? 0) >= 20 && (item.order ?? 0) < 30).map(toMenuItem),
    items.filter(item => (item.order ?? 0) >= 30).map(toMenuItem),
    visibleAccountPanelItems.value.filter(item => item.id === 'logout').map(toMenuItem),
  ].filter(group => group.length);
});
const mobilePage = computed(() => {
  let groups = menuItems.value;
  let parent: AccountMenuItem | undefined;
  for (const index of mobilePath.value) {
    parent = groups.flat()[index];
    if (!parent || parent.disabled) return { groups: menuItems.value, parent: undefined };
    groups = [parent.children ?? []];
  }
  return { groups, parent };
});
watch(mobileOpen, () => { mobilePath.value = []; });
watch(isDesktop, () => { mobileOpen.value = false; });
watch(() => route.path, () => { mobileOpen.value = false; });
onUnmounted(() => { mobileOpen.value = false; });

async function activateMobileItem(item: AccountMenuItem, event: Event) {
  if (item.disabled) return;
  if (item.children?.length || item.accountPanelItem?.contentComponent) {
    mobilePath.value.push(mobilePage.value.groups.flat().indexOf(item));
    if (item.accountPanelItem?.contentComponent) return item.onSelect?.(event);
    return;
  }
  if (item.type === 'checkbox') item.onUpdateChecked?.(!item.checked);
  return item.onSelect?.(event);
}
async function handleLogout() {
  const ok = await confirm({ content: 'Are you sure you want to logout?' });
  if (ok) await logout();
}
</script>

<template>
  <div class="w-full shrink-0">
    <component
      :is="isDesktop ? UDropdownMenu : 'div'"
      v-bind="isDesktop ? { items: menuItems, content: { align: 'center', side: collapsed ? 'right' : 'top', sideOffset: 8 }, ui: { content: 'min-w-60 w-(--reka-popper-anchor-width)' } } : {}"
    >
      <UButton
        color="primary"
        variant="soft"
        size="lg"
        :aria-label="collapsed ? 'Open account menu' : userLabel"
        :icon="collapsed ? 'lucide:circle-user' : undefined"
        :trailing-icon="collapsed ? undefined : 'lucide:chevrons-up-down'"
        class="w-full"
        :class="collapsed ? 'justify-center px-2' : 'justify-start'"
        :ui="{ trailingIcon: 'ms-auto' }"
        :aria-haspopup="isDesktop ? undefined : 'dialog'"
        :aria-expanded="isDesktop ? undefined : mobileOpen"
        @click="!isDesktop && (mobileOpen = true)"
      >
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
    </component>
    <CommonDrawer v-if="!isDesktop" v-model="mobileOpen" direction="bottom" title="Account menu">
      <template #header>
        <div class="flex min-w-0 items-center gap-3">
          <UButton v-if="mobilePath.length" icon="lucide:arrow-left" aria-label="Back to account menu" color="neutral" variant="ghost" class="shrink-0 pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]" @click="mobilePath.pop()" />
          <div class="min-w-0">
            <h2 class="font-semibold">{{ mobilePage.parent?.label || 'Account' }}</h2>
            <p v-if="!mobilePath.length" class="break-all text-sm text-muted">{{ userLabel }}</p>
          </div>
        </div>
      </template>
      <template #body>
        <component
          v-if="mobilePage.parent?.accountPanelItem?.contentComponent"
          :is="mobilePage.parent.accountPanelItem.contentComponent"
          v-bind="mobilePage.parent.accountPanelItem.contentProps"
          :class="mobilePage.parent.accountPanelItem.contentClass"
        />
        <div v-else>
          <template v-for="(group, groupIndex) in mobilePage.groups" :key="groupIndex">
            <USeparator v-if="groupIndex" />
            <div class="py-1">
              <template v-for="(item, index) in group" :key="index">
                <component v-if="item.accountPanelItem?.component" :is="item.accountPanelItem.component" v-bind="item.accountPanelItem.props" />
                <USeparator v-else-if="item.type === 'separator'" />
                <p v-else-if="item.type === 'label'" class="px-3 py-2 text-sm font-medium text-muted">{{ item.label }}</p>
                <UButton
                  v-else
                  :disabled="item.disabled"
                  :to="item.to"
                  :href="item.href"
                  :target="item.target"
                  :color="item.color || (item.accountPanelItem?.id === 'logout' ? 'error' : 'neutral')"
                  :variant="item.checked ? 'soft' : 'ghost'"
                  :loading-auto="true"
                  class="w-full justify-start gap-3 px-2 py-2 text-left pointer-coarse:min-h-[44px]"
                  :class="item.checked ? 'text-primary' : undefined"
                  :aria-pressed="item.type === 'checkbox' ? !!item.checked : undefined"
                  @click="event => activateMobileItem(item, event)"
                >
                  <span v-if="item.swatch" class="size-5 shrink-0 rounded-full" :style="{ backgroundColor: item.swatch }" />
                  <UIcon v-else-if="item.icon" :name="item.icon" class="size-5 shrink-0 text-muted" />
                  <span class="min-w-0 flex-1">
                    <span class="block">{{ item.label }}</span>
                    <span v-if="item.description" class="block text-sm font-normal text-muted">{{ item.description }}</span>
                  </span>
                  <UBadge v-if="item.badge !== undefined" :label="String(item.badge)" color="neutral" variant="soft" size="xs" />
                  <UIcon v-if="item.children?.length || item.accountPanelItem?.contentComponent" name="lucide:chevron-right" class="size-5 shrink-0 text-muted" />
                  <UIcon v-else-if="item.checked" name="lucide:check" class="size-5 shrink-0 text-primary" />
                </UButton>
              </template>
            </div>
          </template>
        </div>
      </template>
    </CommonDrawer>
    <div v-if="!collapsed && enfyraVersionLabel" class="mt-3 flex items-center justify-center gap-1.5 px-1 text-[11px] font-medium leading-5 text-muted">
      <span>Powered by Enfyra</span>
      <UBadge :label="enfyraVersionLabel" color="neutral" variant="subtle" size="xs" />
    </div>
  </div>
</template>
