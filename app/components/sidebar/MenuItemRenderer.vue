<script setup lang="ts">
const props = defineProps<{
  item: any;
  level?: number;
  activeRoutes: Set<string>;
  expandedGroups: Set<string>;
}>();

const emit = defineEmits<{
  'toggle-group': [groupId: string];
  'menu-click': [];
}>();

const isExpanded = computed(() => props.expandedGroups.has(props.item.id));
</script>

<template>
  <template v-if="item.type === 'Dropdown Menu'">
    <div class="space-y-1">
      <button
        @click="emit('toggle-group', item.id)"
        :class="[
          'menu-dropdown-item group w-full flex items-center justify-between',
          level && level > 0 ? 'pl-4' : '',
          'menu-dropdown-item-inactive'
        ]"
      >
        <span class="menu-item-icon-inactive">
          <UIcon
            :name="item.icon || 'lucide:circle'"
            class="w-5 h-5 flex-shrink-0"
          />
        </span>
        <span class="menu-item-text flex-1 text-left">{{ item.label }}</span>
        <UIcon
          :name="'lucide:chevron-right'"
          :class="[
            'w-3 h-3 transition-transform duration-300 ease-out flex-shrink-0',
            isExpanded ? 'rotate-90' : ''
          ]"
        />
      </button>

      <div
        :class="[
          'grid transition-all duration-300 ease-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        ]"
      >
        <div class="overflow-hidden">
          <div class="space-y-1.5 pl-4" v-if="item.items && item.items.length > 0">
            <template v-for="child in item.items" :key="child.id">
              <PermissionGate :condition="child.permission as any">
                <MenuItemRenderer
                  v-if="child.type === 'Dropdown Menu'"
                  :item="child"
                  :level="(level || 0) + 1"
                  :active-routes="activeRoutes"
                  :expanded-groups="expandedGroups"
                  @toggle-group="emit('toggle-group', $event)"
                  @menu-click="emit('menu-click')"
                />
                <NuxtLink
                  v-else-if="child.path || child.route"
                  :to="child.path || child.route"
                  @click="emit('menu-click')"
                  :class="[
                    'menu-dropdown-item group',
                    ((child.path && activeRoutes.has(child.path)) || (child.route && activeRoutes.has(child.route))) ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive'
                  ]"
                >
                  <span :class="((child.path && activeRoutes.has(child.path)) || (child.route && activeRoutes.has(child.route))) ? 'menu-item-icon-active' : 'menu-item-icon-inactive'">
                  <UIcon
                    :name="child.icon || 'lucide:circle'"
                    class="w-5 h-5 flex-shrink-0"
                  />
                  </span>
                  <span class="menu-item-text">{{ child.label }}</span>
                </NuxtLink>
              </PermissionGate>
            </template>
          </div>
        </div>
      </div>
    </div>
  </template>

  <NuxtLink
    v-else-if="item.path || item.route"
    :to="item.path || item.route"
    @click="emit('menu-click')"
    :class="[
      level === 0 ? 'menu-item group' : 'menu-dropdown-item group',
      ((item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))) ? (level === 0 ? 'menu-item-active' : 'menu-dropdown-item-active') : (level === 0 ? 'menu-item-inactive' : 'menu-dropdown-item-inactive')
    ]"
  >
    <span :class="((item.path && activeRoutes.has(item.path)) || (item.route && activeRoutes.has(item.route))) ? 'menu-item-icon-active' : 'menu-item-icon-inactive'">
    <UIcon
      :name="item.icon || 'lucide:circle'"
      class="w-5 h-5 flex-shrink-0"
    />
    </span>
    <span class="menu-item-text">{{ item.label }}</span>
  </NuxtLink>
</template>

