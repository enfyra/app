<script setup lang="ts">
defineOptions({ name: 'SidebarDataSection' });

const props = withDefaults(defineProps<{
  children: any[];
  collapsed?: boolean;
  labelsVisible?: boolean;
  loading?: boolean;
}>(), {
  collapsed: false,
  labelsVisible: true,
  loading: false,
});

const route = useRoute();
const router = useRouter();
const { sidebarCollections, addRecent, isPinned, togglePin } = useDataCollectionPreferences();
const { checkPermissionCondition } = usePermissions();

const currentTable = computed(() => {
  if (!route.path.startsWith('/data/')) return null;
  const slug = route.path.replace('/data/', '');
  return props.children.find((c: any) => {
    const to = c.to || c.route || '';
    return to.endsWith(`/${slug}`);
  }) || null;
});

const currentTableName = computed(() => {
  if (!currentTable.value) return null;
  const to = currentTable.value.to || currentTable.value.route || '';
  return to.split('/').pop() || null;
});

watch(currentTableName, (name) => {
  if (name) addRecent(name);
}, { immediate: true });

const visibleItems = computed(() => {
  const { pinned, recent, maxVisible } = sidebarCollections.value;
  const childMap = new Map<string, any>();
  for (const child of props.children) {
    const to = child.to || child.route || '';
    const name = to.split('/').pop() || '';
    childMap.set(name, child);
  }

  const result: any[] = [];
  const seen = new Set<string>();

  if (currentTableName.value && childMap.has(currentTableName.value)) {
    const item = childMap.get(currentTableName.value)!;
    item._section = 'current';
    result.push(item);
    seen.add(currentTableName.value);
  }

  for (const name of pinned) {
    if (seen.has(name)) continue;
    if (childMap.has(name)) {
      const item = childMap.get(name)!;
      item._section = 'pinned';
      result.push(item);
      seen.add(name);
    }
  }

  for (const name of recent) {
    if (seen.has(name)) continue;
    if (result.length >= maxVisible + (currentTableName.value ? 1 : 0)) break;
    if (childMap.has(name)) {
      const item = childMap.get(name)!;
      item._section = 'recent';
      result.push(item);
      seen.add(name);
    }
  }

  return result;
});

const totalCount = computed(() => props.children.length);

function handleNavigate(item: any) {
  const to = item.to || item.route;
  if (to) {
    const name = to.split('/').pop();
    if (name) addRecent(name);
  }
}

function isActive(item: any): boolean {
  const to = item.to || item.route || '';
  return route.path === to || route.path.startsWith(to + '/');
}
</script>

<template>
  <div class="data-section" :class="{ collapsed }">
    <template v-if="!collapsed">
      <div v-if="loading" class="data-section-skeleton">
        <div v-for="i in 3" :key="i" class="data-section-skeleton-row">
          <span class="data-section-skeleton-dot skeleton-gradient skeleton-pulse-slow" />
          <span class="data-section-skeleton-label skeleton-gradient skeleton-pulse-slow" :style="{ width: `${50 + i * 12}%` }" />
        </div>
      </div>

      <template v-else>
        <NuxtLink
          v-for="item in visibleItems"
          :key="item.to || item.label"
          :to="item.to || item.route"
          class="data-section-item"
          :class="{ active: isActive(item) }"
          @click="handleNavigate(item)"
        >
          <span class="data-section-dot" :class="{ 'is-current': item._section === 'current' }" />
          <span class="data-section-label" :class="{ hidden: !labelsVisible }">{{ item.label }}</span>
          <button
            v-if="labelsVisible"
            type="button"
            class="data-section-pin"
            :class="{ pinned: isPinned((item.to || item.route || '').split('/').pop() || '') }"
            :aria-label="isPinned((item.to || item.route || '').split('/').pop() || '') ? 'Unpin collection' : 'Pin collection'"
            @click.prevent.stop="togglePin((item.to || item.route || '').split('/').pop() || '')"
          >
            <UIcon :name="isPinned((item.to || item.route || '').split('/').pop() || '') ? 'lucide:pin' : 'lucide:pin-off'" class="data-section-pin-icon" />
          </button>
        </NuxtLink>

        <NuxtLink
          to="/data"
          class="data-section-browse"
          :class="{ hidden: !labelsVisible }"
        >
          <UIcon name="lucide:layout-grid" class="data-section-browse-icon" />
          <span class="data-section-browse-label">Browse all {{ totalCount }}</span>
        </NuxtLink>
      </template>
    </template>
  </div>
</template>

<style scoped>
.data-section {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.data-section.collapsed {
  gap: 0;
}

.data-section-item {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 0 6px 0 10px;
  border-radius: var(--radius-subcontrol);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
  transition: background-color 80ms ease, color 80ms ease;
}

.data-section-item:hover {
  background: var(--nav-item-hover-bg);
  color: var(--nav-item-hover-text);
}

.data-section-item.active {
  background: var(--state-primary-soft-bg);
  color: var(--state-primary-soft-text);
}

.data-section-dot {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.42;
  justify-self: center;
}

.data-section-dot.is-current {
  opacity: 0.85;
}

.data-section-item.active .data-section-dot {
  opacity: 0.85;
}

.data-section-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-section-label.hidden {
  opacity: 0;
}

.data-section-pin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: var(--radius-subcontrol);
  background: transparent;
  color: var(--text-quaternary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 80ms ease, color 80ms ease, background-color 80ms ease;
}

.data-section-item:hover .data-section-pin,
.data-section-pin.pinned {
  opacity: 1;
}

.data-section-pin:hover {
  background: var(--nav-item-hover-bg);
  color: var(--text-primary);
}

.data-section-pin.pinned {
  color: var(--brand-500);
}

.data-section-pin-icon {
  width: 12px;
  height: 12px;
}

.data-section-browse {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 6px 0 10px;
  border-radius: var(--radius-subcontrol);
  color: var(--text-quaternary);
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 80ms ease, color 80ms ease;
  margin-top: 2px;
}

.data-section-browse:hover {
  background: var(--nav-item-hover-bg);
  color: var(--text-secondary);
}

.data-section-browse.hidden {
  opacity: 0;
  pointer-events: none;
}

.data-section-browse-icon {
  width: 12px;
  height: 12px;
  opacity: 0.7;
}

.data-section-browse-label {
  white-space: nowrap;
}

.data-section-skeleton {
  display: grid;
  gap: 2px;
  padding-left: 10px;
}

.data-section-skeleton-row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 26px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-subcontrol);
  background: var(--surface-nested);
  padding: 0 6px;
}

.data-section-skeleton-dot {
  width: 4px;
  height: 4px;
  justify-self: center;
  border-radius: 999px;
}

.data-section-skeleton-label {
  height: 10px;
  min-width: 48px;
  max-width: 128px;
  border-radius: var(--radius-pill);
}
</style>
