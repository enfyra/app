<template>
  <div class="guard-tree-node">
    <div
      :class="[
        'relative rounded-xl border transition-all',
        depth === 0
          ? 'border-[var(--border-default)] surface-card p-4'
          : 'border-transparent bg-[var(--surface-muted)] p-3',
      ]"
    >
      <div class="flex items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <UIcon
            v-if="!readonly"
            name="lucide:grip-vertical"
            class="w-4 h-4 text-[var(--text-quaternary)] cursor-grab drag-handle-guard flex-shrink-0"
          />
          <div
            :class="[
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              depth === 0
                ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                : 'bg-gradient-to-br from-slate-500 to-gray-600',
            ]"
          >
            <UIcon
              :name="depth === 0 ? 'lucide:shield' : 'lucide:git-branch'"
              class="w-4 h-4 text-white"
            />
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold text-[var(--text-primary)] truncate">
              {{ guard.name }}
            </h4>
            <p
              v-if="guard.description"
              class="text-xs text-[var(--text-tertiary)] truncate"
            >
              {{ guard.description }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <UBadge
            :color="guard.combinator === 'and' ? 'primary' : 'secondary'"
            variant="subtle"
            size="md"
          >
            {{ (guard.combinator || 'and').toUpperCase() }}
          </UBadge>
          <UBadge
            v-if="depth === 0 && guard.position"
            :color="guard.position === 'pre_auth' ? 'warning' : 'info'"
            variant="subtle"
            size="md"
          >
            {{ guard.position === 'pre_auth' ? 'Pre-Auth' : 'Post-Auth' }}
          </UBadge>
          <UBadge
            :color="guard.isEnabled ? 'success' : 'warning'"
            variant="subtle"
            size="md"
          >
            {{ guard.isEnabled ? 'Enabled' : 'Disabled' }}
          </UBadge>

          <UDropdownMenu
            v-if="!readonly"
            :items="getMenuItems()"
          >
            <UButton
              icon="lucide:more-vertical"
              color="neutral"
              variant="ghost"
              size="xs"
              @click.stop
            />
          </UDropdownMenu>
        </div>
      </div>

      <div v-if="localRules.length > 0" class="space-y-2 mb-3">
        <div class="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
          Rules
        </div>
        <draggable
          v-model="localRules"
          :animation="200"
          handle=".drag-handle-rule"
          ghost-class="guard-ghost"
          item-key="id"
          :group="{ name: `rules-${getId(guard)}`, pull: false, put: false }"
          @end="handleRuleReorder"
          :disabled="readonly"
          class="space-y-2"
        >
          <template #item="{ element: rule }">
            <div
              :class="[
                'flex items-center justify-between gap-2 p-2.5 rounded-lg border border-transparent surface-muted transition-all',
                !readonly ? 'hover:border-[var(--border-default)] cursor-pointer' : '',
              ]"
              @click="!readonly && $emit('editRule', rule, guard)"
            >
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <UIcon
                  v-if="!readonly"
                  name="lucide:grip-vertical"
                  class="w-3.5 h-3.5 text-[var(--text-quaternary)] cursor-grab drag-handle-rule flex-shrink-0"
                  @click.stop
                />
                <UIcon
                  :name="getRuleIcon(rule.type)"
                  :class="['w-4 h-4 flex-shrink-0', getRuleIconColor(rule.type)]"
                />
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-medium text-[var(--text-primary)]">
                    {{ getRuleLabel(rule.type) }}
                  </div>
                  <div class="text-xs text-[var(--text-tertiary)]">
                    {{ getRuleDescription(rule) }}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-1.5 flex-shrink-0">
                <UBadge
                  v-if="rule.users && rule.users.length > 0"
                  color="info"
                  variant="subtle"
                  size="sm"
                  class="hidden md:inline-flex"
                >
                  {{ rule.users.length }} user{{ rule.users.length > 1 ? 's' : '' }}
                </UBadge>
                <UBadge
                  :color="rule.isEnabled ? 'success' : 'warning'"
                  variant="subtle"
                  size="sm"
                  class="hidden md:inline-flex"
                >
                  {{ rule.isEnabled ? 'Enabled' : 'Disabled' }}
                </UBadge>
                <UIcon
                  :name="rule.isEnabled ? 'lucide:circle-check' : 'lucide:circle-x'"
                  :class="['w-5 h-5 md:hidden', rule.isEnabled ? 'text-green-500' : 'text-amber-500']"
                />
                <UButton
                  v-if="!readonly"
                  icon="lucide:trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click.stop="$emit('deleteRule', rule)"
                />
              </div>
            </div>
          </template>
        </draggable>
      </div>

      <div v-if="localChildren.length > 0" class="space-y-3">
        <div class="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
          Sub-guards
          <UBadge color="neutral" variant="soft" size="xs" class="ml-1">
            {{ localChildren.length }}
          </UBadge>
        </div>
        <draggable
          v-model="localChildren"
          :animation="200"
          handle=".drag-handle-guard"
          ghost-class="guard-ghost"
          item-key="id"
          :group="{ name: `children-${getId(guard)}`, pull: false, put: false }"
          @end="handleChildReorder"
          :disabled="readonly"
          class="space-y-3"
        >
          <template #item="{ element: child }">
            <GuardTreeNode
              :guard="child"
              :rules="getChildRules(child)"
              :children="getChildChildren(child)"
              :all-guards="allGuards"
              :all-rules="allRules"
              :depth="depth + 1"
              :readonly="readonly"
              @edit-guard="(g: any) => $emit('editGuard', g)"
              @delete-guard="(g: any) => $emit('deleteGuard', g)"
              @toggle-guard="(p: any) => $emit('toggleGuard', p)"
              @add-rule="(g: any) => $emit('addRule', g)"
              @edit-rule="(r: any, g: any) => $emit('editRule', r, g)"
              @delete-rule="(r: any) => $emit('deleteRule', r)"
              @add-child="(g: any) => $emit('addChild', g)"
              @reorder-rules="(p: any) => $emit('reorderRules', p)"
              @reorder-children="(p: any) => $emit('reorderChildren', p)"
            />
          </template>
        </draggable>
      </div>

      <div
        v-if="!readonly && !guard.isSystem"
        class="flex gap-2 mt-3 pt-3"
        style="border-top: 1px solid var(--border-default)"
      >
        <UButton
          icon="lucide:plus"
          label="Add Rule"
          size="xs"
          variant="soft"
          color="primary"
          @click.stop="$emit('addRule', guard)"
        />
        <UButton
          icon="lucide:git-branch"
          label="Add Sub-guard"
          size="xs"
          variant="soft"
          color="neutral"
          @click.stop="$emit('addChild', guard)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable';

interface Props {
  guard: Record<string, any>;
  rules: any[];
  children: any[];
  allGuards: any[];
  allRules: any[];
  depth?: number;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  readonly: false,
});

const emit = defineEmits<{
  editGuard: [guard: any];
  deleteGuard: [guard: any];
  toggleGuard: [payload: { guard: any; enabled: boolean }];
  addRule: [parentGuard: any];
  editRule: [rule: any, guard: any];
  deleteRule: [rule: any];
  addChild: [parentGuard: any];
  reorderRules: [payload: { items: any[] }];
  reorderChildren: [payload: { items: any[] }];
}>();

const { getId } = useDatabase();

const localRules = ref<any[]>([]);
const localChildren = ref<any[]>([]);

watch(() => props.rules, (v) => { localRules.value = [...v]; }, { immediate: true, deep: true });
watch(() => props.children, (v) => { localChildren.value = [...v]; }, { immediate: true, deep: true });

function handleRuleReorder() {
  const items = localRules.value.map((r, i) => ({ id: getId(r), priority: i }));
  emit('reorderRules', { items });
}

function handleChildReorder() {
  const items = localChildren.value.map((g, i) => ({ id: getId(g), priority: i }));
  emit('reorderChildren', { items });
}

function getChildRules(child: any) {
  return props.allRules.filter(
    (r: any) => String(getId(r.guard) || getId(r.guard?.id)) === String(getId(child)),
  );
}

function getChildChildren(child: any) {
  return props.allGuards.filter(
    (g: any) => {
      const parentId = g.parent ? (getId(g.parent) || getId(g.parent?.id)) : null;
      return String(parentId) === String(getId(child));
    },
  );
}

function getMenuItems() {
  const items: any[] = [];

  items.push({
    label: 'Edit',
    icon: 'lucide:pencil',
    onSelect: () => emit('editGuard', props.guard),
  });

  items.push({
    label: props.guard.isEnabled ? 'Disable' : 'Enable',
    icon: props.guard.isEnabled ? 'lucide:eye-off' : 'lucide:eye',
    onSelect: () =>
      emit('toggleGuard', {
        guard: props.guard,
        enabled: !props.guard.isEnabled,
      }),
  });

  if (!props.guard.isSystem) {
    items.push({
      label: 'Delete',
      icon: 'lucide:trash-2',
      color: 'error',
      onSelect: () => emit('deleteGuard', props.guard),
    });
  }

  return [items];
}

const ruleTypeMap: Record<string, { label: string; icon: string; iconColor: string }> = {
  rate_limit_by_ip: { label: 'Rate Limit (by IP)', icon: 'lucide:gauge', iconColor: 'text-amber-500' },
  rate_limit_by_user: { label: 'Rate Limit (by User)', icon: 'lucide:user-check', iconColor: 'text-blue-500' },
  rate_limit_by_route: { label: 'Rate Limit (by Route)', icon: 'lucide:route', iconColor: 'text-purple-500' },
  ip_whitelist: { label: 'IP Whitelist', icon: 'lucide:shield-check', iconColor: 'text-emerald-500' },
  ip_blacklist: { label: 'IP Blacklist', icon: 'lucide:shield-x', iconColor: 'text-red-500' },
};

function getRuleIcon(type: string): string {
  return ruleTypeMap[type]?.icon || 'lucide:circle';
}

function getRuleIconColor(type: string): string {
  return ruleTypeMap[type]?.iconColor || 'text-[var(--text-tertiary)]';
}

function getRuleLabel(type: string): string {
  return ruleTypeMap[type]?.label || type;
}

function getRuleDescription(rule: any): string {
  const config =
    typeof rule.config === 'string' ? JSON.parse(rule.config) : rule.config;
  if (!config) return 'No configuration';

  if (rule.type?.startsWith('rate_limit')) {
    return `${config.maxRequests || '?'} requests / ${config.perSeconds || '?'}s`;
  }

  if (rule.type === 'ip_whitelist' || rule.type === 'ip_blacklist') {
    const ips = config.ips || [];
    if (ips.length === 0) return 'No IPs configured';
    if (ips.length <= 3) return ips.join(', ');
    return `${ips.slice(0, 2).join(', ')} +${ips.length - 2} more`;
  }

  return rule.description || 'Configured';
}
</script>

<style scoped>
.guard-ghost {
  opacity: 0.4;
  border: 2px dashed rgb(139, 92, 246) !important;
  border-radius: 0.75rem;
}
</style>
