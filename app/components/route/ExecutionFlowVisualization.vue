<template>
  <CommonFormCard v-if="routeData">
    <template #header>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2.5">
            <span class="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)]">
              <UIcon name="lucide:workflow" class="size-4.5" />
            </span>
            <div>
              <h3 class="text-lg font-semibold text-[var(--text-primary)]">Execution Flow</h3>
              <p class="text-sm text-[var(--text-tertiary)]">
                Requests move through pre-hooks, a handler, then post-hooks for each method.
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 lg:justify-end">
          <UButton
            icon="lucide:plus"
            label="Add Handler"
            size="sm"
            color="primary"
            :disabled="canCreateHandler === false"
            @click="emit('createHandler')"
          />
          <UDropdownMenu :items="createHookItems">
            <UButton
              icon="lucide:plus"
              trailing-icon="lucide:chevron-down"
              label="Add Hook"
              size="sm"
              color="neutral"
              variant="outline"
            />
          </UDropdownMenu>
        </div>
      </div>
    </template>

    <CommonEmptyState
      v-if="!hasAvailableMethods"
      title="No available methods"
      description="Add at least one HTTP method to the route before configuring its execution flow."
      icon="lucide:list-filter"
      variant="soft"
      size="sm"
    />

    <div v-else class="route-execution-flow">
      <div class="route-execution-legend">
        <span>
          <span class="route-execution-legend-dot route-execution-legend-dot-pre" />
          Pre-hooks
        </span>
        <UIcon name="lucide:arrow-right" class="size-3.5" />
        <span>
          <span class="route-execution-legend-dot route-execution-legend-dot-handler" />
          Handler
        </span>
        <UIcon name="lucide:arrow-right" class="size-3.5" />
        <span>
          <span class="route-execution-legend-dot route-execution-legend-dot-post" />
          Post-hooks
        </span>
      </div>

      <section
        v-for="group in methodGroups"
        :key="group.method"
        class="route-execution-lane"
      >
        <header class="route-execution-lane-header">
          <div class="flex min-w-0 items-center gap-3">
            <span class="route-method-badge">{{ group.method }}</span>
            <span class="truncate text-xs text-[var(--text-tertiary)]">
              {{ getLaneSummary(group) }}
            </span>
          </div>
        </header>

        <div class="route-execution-pipeline">
          <div class="route-execution-stage route-execution-stage-pre">
            <div class="route-execution-stage-header">
              <div class="flex min-w-0 items-center gap-2">
                <span class="route-execution-stage-icon">
                  <UIcon name="lucide:log-in" class="size-3.5" />
                </span>
                <span class="text-xs font-semibold text-[var(--text-primary)]">Pre-hooks</span>
                <span class="route-execution-stage-count">{{ group.preHooks.length }}</span>
              </div>
              <UDropdownMenu :items="getHookCreateItems(group, 'pre')">
                <UButton
                  icon="lucide:plus"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="Add pre-hook"
                />
              </UDropdownMenu>
            </div>

            <button
              v-if="group.preHooks.length === 0"
              type="button"
              class="route-execution-empty"
              @click="emit('createHook', 'pre', group.method, 0)"
            >
              <UIcon name="lucide:plus" class="size-4" />
              <span>Add pre-hook</span>
            </button>
            <div v-else class="route-execution-node-list">
              <RouteFlowNode
                v-for="(hook, index) in group.preHooks"
                :key="`pre-${group.method}-${getId(hook)}`"
                :data="getHookNodeData(hook, 'pre', index)"
                type="prehook"
                :on-click="() => editHook(hook, 'pre')"
                :on-delete="hook.isSystem ? undefined : () => deleteHook(hook, 'pre')"
                :on-insert-after="hook.isGlobal ? undefined : () => emit('createHook', 'pre', group.method, getLocalPriorityAfter(group.preHooks, index))"
                :on-toggle="hook.isSystem ? undefined : (enabled) => toggleHook(hook, 'pre', enabled)"
              />
            </div>
          </div>

          <div class="route-execution-connector" aria-hidden="true">
            <span class="route-execution-connector-arrow">
              <UIcon name="lucide:chevron-right" class="size-4" />
            </span>
          </div>

          <div class="route-execution-stage route-execution-stage-handler">
            <div class="route-execution-stage-header">
              <div class="flex min-w-0 items-center gap-2">
                <span class="route-execution-stage-icon">
                  <UIcon name="lucide:play" class="size-3.5" />
                </span>
                <span class="text-xs font-semibold text-[var(--text-primary)]">Handler</span>
                <span class="route-execution-stage-count">{{ hasRealHandler(group) ? 1 : 0 }}</span>
              </div>
            </div>

            <RouteFlowNode
              v-if="group.handler"
              :data="getHandlerNodeData(group)"
              type="handler"
              :on-click="() => handleHandlerClick(group)"
              :on-delete="hasRealHandler(group) ? () => emit('deleteHandler', group.handler) : undefined"
            />
            <button
              v-else
              type="button"
              class="route-execution-empty route-execution-empty-handler"
              @click="createHandlerFor(group)"
            >
              <UIcon name="lucide:plus" class="size-4" />
              <span>Add handler</span>
            </button>
          </div>

          <div class="route-execution-connector" aria-hidden="true">
            <span class="route-execution-connector-arrow">
              <UIcon name="lucide:chevron-right" class="size-4" />
            </span>
          </div>

          <div class="route-execution-stage route-execution-stage-post">
            <div class="route-execution-stage-header">
              <div class="flex min-w-0 items-center gap-2">
                <span class="route-execution-stage-icon">
                  <UIcon name="lucide:log-out" class="size-3.5" />
                </span>
                <span class="text-xs font-semibold text-[var(--text-primary)]">Post-hooks</span>
                <span class="route-execution-stage-count">{{ group.postHooks.length }}</span>
              </div>
              <UDropdownMenu :items="getHookCreateItems(group, 'post')">
                <UButton
                  icon="lucide:plus"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="Add post-hook"
                />
              </UDropdownMenu>
            </div>

            <button
              v-if="group.postHooks.length === 0"
              type="button"
              class="route-execution-empty"
              @click="emit('createHook', 'post', group.method, 0)"
            >
              <UIcon name="lucide:plus" class="size-4" />
              <span>Add post-hook</span>
            </button>
            <div v-else class="route-execution-node-list">
              <RouteFlowNode
                v-for="(hook, index) in group.postHooks"
                :key="`post-${group.method}-${getId(hook)}`"
                :data="getHookNodeData(hook, 'post', index)"
                type="posthook"
                :on-click="() => editHook(hook, 'post')"
                :on-delete="hook.isSystem ? undefined : () => deleteHook(hook, 'post')"
                :on-insert-after="hook.isGlobal ? undefined : () => emit('createHook', 'post', group.method, getLocalPriorityAfter(group.postHooks, index))"
                :on-toggle="hook.isSystem ? undefined : (enabled) => toggleHook(hook, 'post', enabled)"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  </CommonFormCard>
</template>

<script setup lang="ts">
type HookType = 'pre' | 'post';

interface MethodGroup {
  method: string;
  preHooks: any[];
  handler: any | null;
  postHooks: any[];
}

interface Props {
  routeData?: any;
  availableMethods?: string[];
  handlers: any[];
  sortedPreHooks: any[];
  sortedAfterHooks: any[];
  getPreHookPriority: (hook: any) => number | null;
  getAfterHookPriority: (hook: any) => number | null;
  getId: (item: any) => string;
  hasMainTable?: boolean;
  defaultHandler?: any;
  canCreateHandler?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  editHandler: [handler: any];
  editHook: [hook: any];
  createHandler: [methodObject?: { name: string; id?: string }];
  createHook: [type: HookType, method?: string, priority?: number];
  deleteHandler: [handler: any];
  deleteHook: [hook: any];
  toggleHook: [hook: any, enabled: boolean];
}>();

const createHookItems = computed(() => [[
  {
    label: 'Pre-hook',
    description: 'Run logic before the handler',
    icon: 'lucide:log-in',
    onSelect: () => emit('createHook', 'pre'),
  },
  {
    label: 'Post-hook',
    description: 'Run logic after the handler',
    icon: 'lucide:log-out',
    onSelect: () => emit('createHook', 'post'),
  },
]]);

const filteredAvailableMethods = computed(() => {
  const methods = Array.isArray(props.availableMethods) ? props.availableMethods : [];
  return methods;
});

const hasAvailableMethods = computed(() => filteredAvailableMethods.value.length > 0);

const methodLookup = computed(() => {
  const lookup: Record<string, any> = {};
  const hooks = [...props.sortedPreHooks, ...props.sortedAfterHooks];

  for (const hook of hooks) {
    if (!Array.isArray(hook.methods)) continue;
    for (const method of hook.methods) {
      if (method?.name && props.getId(method)) lookup[method.name] = method;
    }
  }

  return lookup;
});

const methodGroups = computed<MethodGroup[]>(() => {
  const allowedMethods = new Set(filteredAvailableMethods.value);
  const groups = new Map<string, MethodGroup>();

  for (const method of filteredAvailableMethods.value) {
    groups.set(method, { method, preHooks: [], handler: null, postHooks: [] });
  }

  assignHooksToGroups(groups, allowedMethods, props.sortedPreHooks, 'preHooks');

  for (const handler of props.handlers) {
    const methodName = handler.method?.name;
    if (methodName && groups.has(methodName)) {
      groups.get(methodName)!.handler = handler;
      continue;
    }
    if (handler._isDefault) {
      for (const group of groups.values()) {
        if (!group.handler) {
          group.handler = {
            ...handler,
            _methodObject: handler._methodObject || { name: group.method },
          };
        }
      }
    }
  }

  if (props.hasMainTable && props.defaultHandler) {
    for (const group of groups.values()) {
      if (!group.handler) {
        group.handler = { ...props.defaultHandler, _methodObject: { name: group.method } };
      }
    }
  }

  assignHooksToGroups(groups, allowedMethods, props.sortedAfterHooks, 'postHooks');

  for (const group of groups.values()) {
    group.preHooks.sort((a, b) => (props.getPreHookPriority(a) || 0) - (props.getPreHookPriority(b) || 0));
    group.postHooks.sort((a, b) => (props.getAfterHookPriority(a) || 0) - (props.getAfterHookPriority(b) || 0));
  }

  return [...groups.values()];
});

function assignHooksToGroups(
  groups: Map<string, MethodGroup>,
  allowedMethods: Set<string>,
  hooks: any[],
  target: 'preHooks' | 'postHooks',
) {
  for (const hook of hooks) {
    const hookId = props.getId(hook);
    const hasMethods = Array.isArray(hook.methods) && hook.methods.length > 0;
    const targetMethods = hook.isGlobal === true || !hasMethods
      ? [...allowedMethods]
      : hook.methods.map((method: any) => method?.name).filter((method: string) => allowedMethods.has(method));

    for (const method of targetMethods) {
      const group = groups.get(method);
      if (group && !group[target].some(item => props.getId(item) === hookId)) {
        group[target].push(hook);
      }
    }
  }
}

function getHookCreateItems(group: MethodGroup, type: HookType) {
  const hooks = type === 'pre' ? group.preHooks : group.postHooks;
  const typeLabel = type === 'pre' ? 'pre-hook' : 'post-hook';
  const lastPriority = getLocalHookCount(hooks);

  if (hooks.length === 0) {
    return [[{
      label: `Add ${typeLabel}`,
      icon: 'lucide:plus',
      onSelect: () => emit('createHook', type, group.method, 0),
    }]];
  }

  return [[
    {
      label: 'Insert first',
      icon: 'lucide:arrow-up-to-line',
      onSelect: () => emit('createHook', type, group.method, 0),
    },
    {
      label: 'Add to end',
      icon: 'lucide:arrow-down-to-line',
      onSelect: () => emit('createHook', type, group.method, lastPriority),
    },
  ]];
}

function getLocalHookCount(hooks: any[]) {
  return hooks.filter(hook => hook.isGlobal !== true).length;
}

function getLocalPriorityAfter(hooks: any[], index: number) {
  return getLocalHookCount(hooks.slice(0, index + 1));
}

function getHookNodeData(hook: any, type: HookType, index: number) {
  return {
    ...hook,
    label: hook.name || 'Unnamed hook',
    enabled: hook.isEnabled !== false,
    sequence: index + 1,
    priority: type === 'pre' ? props.getPreHookPriority(hook) : props.getAfterHookPriority(hook),
  };
}

function getHandlerNodeData(group: MethodGroup) {
  const handler = group.handler;
  return {
    ...handler,
    label: handler?.name || `${group.method} handler`,
    isDefault: handler?._isDefault === true || handler?.isDefault === true,
    enabled: handler?.isEnabled !== false,
  };
}

function getLaneSummary(group: MethodGroup) {
  const hookCount = group.preHooks.length + group.postHooks.length;
  const handlerLabel = hasRealHandler(group) ? 'custom handler' : group.handler ? 'built-in handler' : 'no handler';
  return `${hookCount} ${hookCount === 1 ? 'hook' : 'hooks'} · ${handlerLabel}`;
}

function hasRealHandler(group: MethodGroup) {
  return !!group.handler && group.handler._isDefault !== true && group.handler.isDefault !== true;
}

function resolveMethodObject(method: string) {
  return methodLookup.value[method] || { name: method };
}

function createHandlerFor(group: MethodGroup) {
  emit('createHandler', resolveMethodObject(group.method));
}

function handleHandlerClick(group: MethodGroup) {
  if (!group.handler) {
    createHandlerFor(group);
    return;
  }
  if (!hasRealHandler(group)) {
    emit('createHandler', group.handler._methodObject || resolveMethodObject(group.method));
    return;
  }
  emit('editHandler', group.handler);
}

function editHook(hook: any, type: HookType) {
  emit('editHook', { ...hook, _hookType: type });
}

function deleteHook(hook: any, type: HookType) {
  emit('deleteHook', { ...hook, _hookType: type });
}

function toggleHook(hook: any, type: HookType, enabled: boolean) {
  emit('toggleHook', { ...hook, _hookType: type }, enabled);
}
</script>

<style scoped>
.route-execution-flow {
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-panel);
  background: var(--surface-nested);
}

.route-execution-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-tertiary);
  font-size: 0.6875rem;
}

.route-execution-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.route-execution-legend-dot {
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: var(--radius-pill);
}

.route-execution-legend-dot-pre {
  background: var(--md-primary);
}

.route-execution-legend-dot-handler {
  background: var(--st-success);
}

.route-execution-legend-dot-post {
  background: var(--st-info);
}

.route-execution-lane + .route-execution-lane {
  border-top: 1px solid var(--border-default);
}

.route-execution-lane-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--surface-default) 72%, transparent);
}

.route-method-badge {
  display: inline-flex;
  min-width: 3.5rem;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--state-primary-outline-border);
  border-radius: var(--radius-subcontrol);
  color: var(--state-primary-soft-text);
  background: var(--state-primary-soft-bg);
  font-size: 0.6875rem;
  font-weight: 750;
  letter-spacing: 0.04em;
}

.route-execution-pipeline {
  display: grid;
  grid-template-columns: minmax(13rem, 1fr) 2.5rem minmax(13rem, 1fr) 2.5rem minmax(13rem, 1fr);
  align-items: stretch;
  padding: 1rem;
}

.route-execution-stage {
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-default);
}

.route-execution-stage-pre {
  --execution-stage-accent: var(--md-primary);
  --execution-stage-soft: var(--state-primary-soft-bg);
  --execution-stage-text: var(--state-primary-soft-text);
}

.route-execution-stage-handler {
  --execution-stage-accent: var(--st-success);
  --execution-stage-soft: var(--state-success-soft-bg);
  --execution-stage-text: var(--state-success-soft-text);
}

.route-execution-stage-post {
  --execution-stage-accent: var(--st-info);
  --execution-stage-soft: var(--state-info-soft-bg);
  --execution-stage-text: var(--state-info-soft-text);
}

.route-execution-stage-header {
  display: flex;
  min-height: 2rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
}

.route-execution-stage-icon {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-subcontrol);
  color: var(--execution-stage-text);
  background: var(--execution-stage-soft);
}

.route-execution-stage-count {
  display: inline-flex;
  min-width: 1.125rem;
  height: 1.125rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  color: var(--text-tertiary);
  background: var(--surface-muted);
  font-size: 0.625rem;
  font-weight: 700;
}

.route-execution-node-list {
  display: grid;
  gap: 0.5rem;
}

.route-execution-empty {
  display: flex;
  width: 100%;
  min-height: 4.5rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px dashed color-mix(in srgb, var(--execution-stage-accent) 38%, var(--border-default));
  border-radius: var(--radius-control);
  color: var(--execution-stage-text);
  background: color-mix(in srgb, var(--execution-stage-soft) 38%, var(--surface-default));
  font-size: 0.75rem;
  font-weight: 650;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.route-execution-empty:hover,
.route-execution-empty:focus-visible {
  border-color: var(--execution-stage-accent);
  background: var(--execution-stage-soft);
}

.route-execution-connector {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  color: var(--text-quaternary);
}

.route-execution-connector::before {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 1px;
  content: '';
  background: var(--flow-edge);
}

.route-execution-connector-arrow {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: 1.25rem;
  height: 1.25rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-subcontrol);
  background: var(--surface-nested);
}

@media (max-width: 1023px) {
  .route-execution-pipeline {
    grid-template-columns: minmax(0, 1fr);
  }

  .route-execution-connector {
    width: 100%;
    height: 2rem;
  }

  .route-execution-connector::before {
    top: 0;
    right: auto;
    bottom: 0;
    left: 50%;
    width: 1px;
    height: auto;
  }

  .route-execution-connector-arrow {
    transform: rotate(90deg);
  }
}

@media (max-width: 639px) {
  .route-execution-legend {
    display: none;
  }

  .route-execution-lane-header,
  .route-execution-pipeline {
    padding: 0.75rem;
  }
}
</style>
