<template>
  <div class="space-y-6">
    <div class="max-w-[1200px] lg:max-w-[1200px] md:w-full space-y-6">
      <CommonFormCard>
        <UForm :state="form" @submit="updateGuard">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => (hasFormChanges = hasChanged)"
            :table-name="tableName"
            :excluded="['createdAt', 'updatedAt', 'children', 'rules', 'parent']"
            :field-map="fieldMap"
            :loading="loading"
          />

          <div
            class="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-6"
          >
            <UButton
              v-if="hasFormChanges"
              label="Reset"
              icon="lucide:rotate-ccw"
              variant="outline"
              color="warning"
              :disabled="!hasFormChanges"
              @click="handleReset"
            />
            <UButton
              v-if="canUpdateGuard"
              label="Save"
              icon="lucide:save"
              variant="solid"
              color="primary"
              type="submit"
              :loading="updateLoading"
              :disabled="!hasFormChanges"
            />
          </div>
        </UForm>
      </CommonFormCard>

      <CommonFormCard>
        <template #header>
          <div
            :class="(isMobile || isTablet)
              ? 'flex flex-col gap-3 w-full'
              : 'flex flex-row items-center justify-between gap-3 w-full'"
          >
            <div class="flex items-center gap-2 min-w-0">
              <UIcon
                name="lucide:git-branch"
                class="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400"
              />
              <h3
                :class="(isMobile || isTablet)
                  ? 'text-base font-semibold text-[var(--text-primary)]'
                  : 'text-lg font-semibold text-[var(--text-primary)]'"
              >
                Guard Tree
              </h3>
            </div>
            <div
              v-if="rootGuard"
              :class="(isMobile || isTablet)
                ? 'flex flex-wrap items-center gap-2 w-full'
                : 'flex flex-shrink-0 flex-wrap items-center justify-end gap-2'"
            >
              <UButton icon="lucide:plus" label="Add Rule" size="sm" variant="solid" color="primary" @click="handleAddRule(rootGuard)" />
              <UButton icon="lucide:git-branch" label="Add Sub-guard" size="sm" variant="solid" color="neutral" @click="handleAddChild(rootGuard)" />
            </div>
          </div>
        </template>

        <Transition name="loading-fade" mode="out-in">
          <CommonLoadingState
            v-if="treeLoading"
            title="Loading guard tree..."
            size="sm"
            type="form"
            context="inline"
          />
          <div v-else class="space-y-4" :class="isReordering ? 'pointer-events-none opacity-60' : ''">
            <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
              <p class="text-xs text-[var(--text-tertiary)]">
                Define guard logic using nested AND/OR combinators.
                <strong>AND</strong> requires all conditions to pass.
                <strong>OR</strong> requires at least one condition to pass.
                Rules are the actual checks (rate limiting, IP filtering).
                Sub-guards allow nesting complex logic.
              </p>
            </div>

            <template v-if="rootGuard">
              <div v-if="localRootRules.length > 0" class="space-y-2">
                <div class="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                  Rules
                </div>
                <draggable
                  v-model="localRootRules"
                  :animation="200"
                  handle=".drag-handle-rule"
                  ghost-class="guard-ghost"
                  item-key="id"
                  :group="{ name: 'root-rules', pull: false, put: false }"
                  @end="handleRootRuleReorder"
                  :disabled="isReordering"
                  class="space-y-2"
                >
                  <template #item="{ element: rule }">
                    <div
                      class="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-transparent surface-muted hover:border-[var(--border-default)] transition-all cursor-pointer"
                      @click="handleEditRule(rule)"
                    >
                      <div class="flex items-center gap-2 min-w-0 flex-1">
                        <UIcon name="lucide:grip-vertical" class="w-3.5 h-3.5 text-[var(--text-quaternary)] cursor-grab drag-handle-rule flex-shrink-0" @click.stop />
                        <UIcon :name="getRuleIcon(rule.type)" :class="['w-4 h-4 flex-shrink-0', getRuleIconColor(rule.type)]" />
                        <div class="min-w-0 flex-1">
                          <div class="text-xs font-medium text-[var(--text-primary)]">{{ getRuleLabel(rule.type) }}</div>
                          <div class="text-xs text-[var(--text-tertiary)]">{{ getRuleDescription(rule) }}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-1.5 flex-shrink-0">
                        <UBadge v-if="rule.users && rule.users.length > 0" color="info" variant="subtle" size="sm" class="hidden md:inline-flex">
                          {{ rule.users.length }} user{{ rule.users.length > 1 ? 's' : '' }}
                        </UBadge>
                        <UBadge :color="rule.isEnabled ? 'success' : 'warning'" variant="subtle" size="sm" class="hidden md:inline-flex">
                          {{ rule.isEnabled ? 'Enabled' : 'Disabled' }}
                        </UBadge>
                        <UIcon :name="rule.isEnabled ? 'lucide:circle-check' : 'lucide:circle-x'" :class="['w-5 h-5 md:hidden', rule.isEnabled ? 'text-green-500' : 'text-amber-500']" />
                        <UButton icon="lucide:trash-2" color="error" variant="ghost" size="xs" @click.stop="handleDeleteRule(rule)" />
                      </div>
                    </div>
                  </template>
                </draggable>
              </div>

              <div v-if="localRootChildren.length > 0" class="space-y-3">
                <div class="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                  Sub-guards
                  <UBadge color="neutral" variant="soft" size="xs" class="ml-1">{{ localRootChildren.length }}</UBadge>
                </div>
                <draggable
                  v-model="localRootChildren"
                  :animation="200"
                  handle=".drag-handle-guard"
                  ghost-class="guard-ghost"
                  item-key="id"
                  :group="{ name: 'root-children', pull: false, put: false }"
                  @end="handleRootChildReorder"
                  :disabled="isReordering"
                  class="space-y-3"
                >
                  <template #item="{ element: child }">
                    <GuardTreeNode
                      :guard="child"
                      :rules="getChildRules(child)"
                      :children="getChildChildren(child)"
                      :all-guards="allDescendants"
                      :all-rules="allRulesData"
                      :depth="1"
                      @edit-guard="handleEditGuard"
                      @delete-guard="handleDeleteGuard"
                      @toggle-guard="(payload) => handleToggleGuard(payload.guard, payload.enabled)"
                      @add-rule="handleAddRule"
                      @edit-rule="handleEditRule"
                      @delete-rule="handleDeleteRule"
                      @add-child="handleAddChild"
                      @reorder-rules="handleReorderRules"
                      @reorder-children="handleReorderChildren"
                    />
                  </template>
                </draggable>
              </div>

              <CommonEmptyState
                v-if="rootRules.length === 0 && rootChildren.length === 0"
                title="No rules or sub-guards"
                description="Add rules to define conditions, or sub-guards to nest logic."
                icon="lucide:git-branch"
                size="sm"
              />

            </template>

            <CommonEmptyState
              v-else-if="!loading"
              title="Guard not found"
              description="The requested guard could not be loaded"
              icon="lucide:shield"
              size="sm"
            />
          </div>
        </Transition>
      </CommonFormCard>
    </div>
  </div>

  <GuardCreateRuleDrawer
    v-model="showCreateRuleDrawer"
    v-model:form="ruleForm"
    v-model:errors="ruleErrors"
    :loading="createRuleLoading"
    :guard-position="rootPosition"
    @save="saveRule"
    @cancel="showCreateRuleDrawer = false"
  />

  <GuardEditRuleDrawer
    v-model="showEditRuleDrawer"
    v-model:form="editRuleForm"
    v-model:errors="editRuleErrors"
    :loading="updateRuleLoading"
    :guard-position="rootPosition"
    @save="saveEditRule"
    @cancel="showEditRuleDrawer = false"
  />

  <GuardCreateChildDrawer
    v-model="showCreateChildDrawer"
    v-model:form="childForm"
    v-model:errors="childErrors"
    :loading="createChildLoading"
    :parent-guard="addChildTargetGuard"
    @save="saveChild"
    @cancel="showCreateChildDrawer = false"
  />

  <GuardEditChildDrawer
    v-model="showEditChildDrawer"
    v-model:form="editChildForm"
    v-model:errors="editChildErrors"
    :loading="updateChildLoading"
    @save="saveEditChild"
    @cancel="showEditChildDrawer = false"
  />
</template>

<script setup lang="ts">
import draggable from 'vuedraggable';

const route = useRoute();
const notify = useNotify();
const { confirm } = useConfirm();
const { getId, getIdFieldName } = useDatabase();
const { isMobile, isTablet } = useScreen();

const tableName = 'guard_definition';
const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges, getIncludeFields } = useSchema(tableName);
const formChanges = useFormChanges();
const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const fieldMap = {
  position: { component: resolveComponent('GuardPositionPicker') },
  combinator: { component: resolveComponent('GuardCombinatorPicker') },
  methods: { type: 'methods-selector', componentProps: { excludeGqlMethods: true } },
};

registerPageHeader({
  title: 'Guard Details',
  gradient: 'purple',
});

const guardId = computed(() => route.params.id as string);

const { checkPermissionCondition } = usePermissions();
const canUpdateGuard = computed(() =>
  checkPermissionCondition({
    and: [{ route: '/guard_definition', actions: ['update'] }],
  })
);

useHeaderActionRegistry([
  {
    id: 'delete-guard',
    label: 'Delete',
    icon: 'lucide:trash',
    variant: 'solid',
    color: 'error',
    size: 'md',
    order: 2,
    onClick: deleteGuard,
    loading: computed(() => deleteLoading.value),
    permission: {
      and: [
        {
          route: '/guard_definition',
          actions: ['delete'],
        },
      ],
    },
  },
]);

const {
  data: guardData,
  pending: loading,
  execute: fetchGuard,
} = useApi(`/${tableName}`, {
  query: {
    fields: getIncludeFields(),
    filter: { [getIdFieldName()]: { _eq: route.params.id } },
  },
  errorContext: 'Fetch Guard',
});

watch(
  () => guardData.value?.data?.[0]?.name,
  (name) => {
    if (name) {
      registerPageHeader({
        title: `Guard: ${name}`,
        gradient: 'purple',
      });
    }
  },
  { immediate: true },
);

const {
  error: updateError,
  execute: executeUpdateGuard,
  pending: updateLoading,
} = useApi(`/${tableName}`, {
  method: 'patch',
  errorContext: 'Update Guard',
});

const {
  error: deleteError,
  execute: executeDeleteGuard,
  pending: deleteLoading,
} = useApi(`/${tableName}`, {
  method: 'delete',
  errorContext: 'Delete Guard',
});

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const rootGuard = computed(() => guardData.value?.data?.[0] || null);
const rootPosition = computed(() => rootGuard.value?.position || null);

const {
  data: descendantsData,
  pending: descendantsLoading,
  execute: fetchDescendants,
} = useApi(() => '/guard_definition', {
  query: computed(() => ({
    fields: getIncludeFields(),
    filter: { parent: { _nnull: true } },
    sort: ['priority'],
    limit: -1,
  })),
  errorContext: 'Fetch Descendant Guards',
});

const {
  data: rulesData,
  pending: rulesLoading,
  execute: fetchRules,
} = useApi(() => '/guard_rule_definition', {
  query: computed(() => ({
    fields: '*,guard,users.id',
    sort: ['priority'],
    limit: -1,
  })),
  errorContext: 'Fetch Guard Rules',
});

const treeLoading = computed(
  () => loading.value || descendantsLoading.value || rulesLoading.value,
);

const allDescendants = computed(() => {
  const descendants = descendantsData.value?.data || [];
  return descendants.filter((g: any) => {
    return belongsToRoot(g, guardId.value, descendants);
  });
});

function belongsToRoot(
  guard: any,
  rootId: string,
  allGuards: any[],
): boolean {
  const parentId = guard.parent
    ? String(getId(guard.parent) || getId(guard.parent?.id))
    : null;
  if (!parentId) return false;
  if (parentId === String(rootId)) return true;
  const parent = allGuards.find(
    (g: any) => String(getId(g)) === parentId,
  );
  if (!parent) return false;
  return belongsToRoot(parent, rootId, allGuards);
}

const allRulesData = computed(() => {
  const rules = rulesData.value?.data || [];
  const validIds = new Set([
    String(guardId.value),
    ...allDescendants.value.map((g: any) => String(getId(g))),
  ]);
  return rules.filter((r: any) => {
    const gid = String(getId(r.guard) || getId(r.guard?.id));
    return validIds.has(gid);
  });
});

const rootRules = computed(() => {
  return allRulesData.value.filter((r: any) => {
    const gid = String(getId(r.guard) || getId(r.guard?.id));
    return gid === String(guardId.value);
  });
});

const rootChildren = computed(() => {
  return allDescendants.value.filter((g: any) => {
    const parentId = g.parent
      ? String(getId(g.parent) || getId(g.parent?.id))
      : null;
    return parentId === String(guardId.value);
  });
});

const localRootRules = ref<any[]>([]);
const localRootChildren = ref<any[]>([]);
const isReordering = ref(false);

watch(rootRules, (v) => { localRootRules.value = [...v]; }, { immediate: true, deep: true });
watch(rootChildren, (v) => { localRootChildren.value = [...v]; }, { immediate: true, deep: true });

const { execute: reorderRuleApi } = useApi(() => '/guard_rule_definition', {
  method: 'patch',
  errorContext: 'Reorder Rule',
});

const { execute: reorderGuardApi } = useApi(() => '/guard_definition', {
  method: 'patch',
  errorContext: 'Reorder Guard',
});

async function handleRootRuleReorder() {
  isReordering.value = true;
  const updates = localRootRules.value.map((r, i) => reorderRuleApi({ id: getId(r), body: { priority: i } }));
  await Promise.all(updates);
  await fetchRules();
  isReordering.value = false;
}

async function handleRootChildReorder() {
  isReordering.value = true;
  const updates = localRootChildren.value.map((g, i) => reorderGuardApi({ id: getId(g), body: { priority: i } }));
  await Promise.all(updates);
  await fetchDescendants();
  isReordering.value = false;
}

async function handleReorderRules(payload: { items: { id: any; priority: number }[] }) {
  isReordering.value = true;
  const updates = payload.items.map((item) => reorderRuleApi({ id: item.id, body: { priority: item.priority } }));
  await Promise.all(updates);
  await fetchRules();
  isReordering.value = false;
}

async function handleReorderChildren(payload: { items: { id: any; priority: number }[] }) {
  isReordering.value = true;
  const updates = payload.items.map((item) => reorderGuardApi({ id: item.id, body: { priority: item.priority } }));
  await Promise.all(updates);
  await fetchDescendants();
  isReordering.value = false;
}

function getChildRules(child: any) {
  return allRulesData.value.filter(
    (r: any) => String(getId(r.guard) || getId(r.guard?.id)) === String(getId(child)),
  );
}

function getChildChildren(child: any) {
  return allDescendants.value.filter((g: any) => {
    const parentId = g.parent ? String(getId(g.parent) || getId(g.parent?.id)) : null;
    return parentId === String(getId(child));
  });
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
  const config = typeof rule.config === 'string' ? JSON.parse(rule.config) : rule.config;
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

async function initializeForm() {
  await fetchGuard();
  const data = guardData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

async function updateGuard() {
  if (!form.value) return;

  const body = { ...form.value };
  if (!(await validateForm(body, errors))) return;

  await executeUpdateGuard({ id: route.params.id as string, body });
  if (updateError.value) return;

  notify.success('Success', 'Guard updated!');
  errors.value = {};
  hasFormChanges.value = false;

  await fetchGuard();
  const freshData = guardData.value?.data?.[0];
  if (freshData) {
    form.value = { ...freshData };
    formChanges.update(freshData);
  }
  formEditorRef.value?.confirmChanges();
}

async function handleReset() {
  const ok = await confirm({
    title: 'Reset Changes',
    content:
      'Are you sure you want to discard all changes? All modifications will be lost.',
  });
  if (!ok) return;

  if (formChanges.originalData.value) {
    form.value = formChanges.discardChanges(form.value);
    hasFormChanges.value = false;
    notify.success('Reset Complete', 'All changes have been discarded.');
  }
}

async function deleteGuard() {
  const ok = await confirm({
    title: 'Are you sure?',
    content:
      'This will delete the guard, all its child guards, and all rules. This action cannot be undone.',
  });
  if (!ok) return;

  await executeDeleteGuard({ id: route.params.id as string });
  if (deleteError.value) return;

  notify.success('Success', 'Guard deleted successfully');
  await navigateTo('/settings/guards');
}

const showCreateRuleDrawer = ref(false);
const ruleForm = ref<Record<string, any>>({});
const ruleErrors = ref<Record<string, string>>({});
const addRuleTargetGuard = ref<any>(null);

const {
  error: createRuleError,
  execute: executeCreateRule,
  pending: createRuleLoading,
} = useApi(() => '/guard_rule_definition', {
  method: 'post',
  errorContext: 'Create Rule',
});

function getDefaultConfig(type: string): Record<string, any> {
  if (['rate_limit_by_ip', 'rate_limit_by_user', 'rate_limit_by_route'].includes(type)) {
    return { maxRequests: 100, perSeconds: 60 };
  }
  if (['ip_whitelist', 'ip_blacklist'].includes(type)) {
    return { ips: [] };
  }
  return {};
}

function handleAddRule(targetGuard: any) {
  addRuleTargetGuard.value = targetGuard;
  ruleForm.value = {
    type: '',
    config: {},
    priority: 0,
    isEnabled: true,
    description: '',
    guard: { [getIdFieldName()]: getId(targetGuard) },
  };
  showCreateRuleDrawer.value = true;
}

watch(
  () => ruleForm.value?.type,
  (type, oldType) => {
    if (type && type !== oldType) {
      ruleForm.value = { ...ruleForm.value, config: getDefaultConfig(type) };
    }
  },
);

async function saveRule() {
  if (!ruleForm.value.type) {
    notify.error('Validation Error', 'Please select a rule type');
    return;
  }

  const body = { ...ruleForm.value };
  const config = typeof body.config === 'object' ? body.config : {};
  if (Object.keys(config).length === 0) {
    body.config = JSON.stringify(getDefaultConfig(body.type));
  } else if (typeof body.config === 'object') {
    body.config = JSON.stringify(body.config);
  }

  await executeCreateRule({ body });
  if (createRuleError.value) return;

  notify.success('Rule created successfully');
  showCreateRuleDrawer.value = false;
  await fetchRules();
}

const showEditRuleDrawer = ref(false);
const editRuleForm = ref<Record<string, any>>({});
const editRuleErrors = ref<Record<string, string>>({});
const editingRuleId = ref<string | null>(null);

const {
  error: updateRuleError,
  execute: executeUpdateRule,
  pending: updateRuleLoading,
} = useApi(() => '/guard_rule_definition', {
  method: 'patch',
  errorContext: 'Update Rule',
});

function handleEditRule(rule: any) {
  editingRuleId.value = String(getId(rule));
  const config =
    typeof rule.config === 'string' ? JSON.parse(rule.config) : rule.config;
  editRuleForm.value = {
    ...rule,
    config: config || {},
  };
  showEditRuleDrawer.value = true;
}

async function saveEditRule() {
  if (!editingRuleId.value) return;

  const body = { ...editRuleForm.value };
  if (typeof body.config === 'object') {
    body.config = JSON.stringify(body.config);
  }

  await executeUpdateRule({ id: editingRuleId.value, body });
  if (updateRuleError.value) return;

  notify.success('Rule updated successfully');
  showEditRuleDrawer.value = false;
  await fetchRules();
}

const { execute: deleteRuleApi, error: deleteRuleError } = useApi(
  () => '/guard_rule_definition',
  { method: 'delete', errorContext: 'Delete Rule' },
);

async function handleDeleteRule(rule: any) {
  const ok = await confirm({
    title: 'Delete Rule',
    content: 'Are you sure you want to delete this rule?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
  });
  if (!ok) return;

  await deleteRuleApi({ id: getId(rule) });
  if (deleteRuleError.value) return;

  notify.success('Rule deleted successfully');
  await fetchRules();
}

const showCreateChildDrawer = ref(false);
const childForm = ref<Record<string, any>>({});
const childErrors = ref<Record<string, string>>({});
const addChildTargetGuard = ref<any>(null);

const {
  error: createChildError,
  execute: executeCreateChild,
  pending: createChildLoading,
} = useApi(() => '/guard_definition', {
  method: 'post',
  errorContext: 'Create Sub-guard',
});

function handleAddChild(targetGuard: any) {
  addChildTargetGuard.value = targetGuard;
  childForm.value = {
    name: '',
    description: '',
    combinator: 'and',
    priority: 0,
    isEnabled: true,
    parent: { [getIdFieldName()]: getId(targetGuard) },
  };
  showCreateChildDrawer.value = true;
}

async function saveChild() {
  if (!childForm.value.name) {
    notify.error('Validation Error', 'Please enter a name');
    return;
  }

  await executeCreateChild({ body: childForm.value });
  if (createChildError.value) return;

  notify.success('Sub-guard created successfully');
  showCreateChildDrawer.value = false;
  await fetchDescendants();
}

const showEditChildDrawer = ref(false);
const editChildForm = ref<Record<string, any>>({});
const editChildErrors = ref<Record<string, string>>({});
const editingChildId = ref<string | null>(null);

const {
  error: updateChildError,
  execute: executeUpdateChild,
  pending: updateChildLoading,
} = useApi(() => '/guard_definition', {
  method: 'patch',
  errorContext: 'Update Guard',
});

function handleEditGuard(guard: any) {
  if (String(getId(guard)) === String(guardId.value)) {
    return;
  }
  editingChildId.value = String(getId(guard));
  editChildForm.value = {
    name: guard.name,
    description: guard.description,
    combinator: guard.combinator,
    priority: guard.priority,
    isEnabled: guard.isEnabled,
  };
  showEditChildDrawer.value = true;
}

async function saveEditChild() {
  if (!editingChildId.value) return;

  await executeUpdateChild({
    id: editingChildId.value,
    body: editChildForm.value,
  });
  if (updateChildError.value) return;

  notify.success('Guard updated successfully');
  showEditChildDrawer.value = false;
  await fetchDescendants();
}

async function handleDeleteGuard(guard: any) {
  const ok = await confirm({
    title: 'Delete Guard',
    content: `Delete "${guard.name}" and all its children and rules?`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
  });
  if (!ok) return;

  await executeDeleteGuard({ id: getId(guard) });
  if (deleteError.value) return;

  notify.success('Guard deleted successfully');
  await Promise.all([fetchDescendants(), fetchRules()]);
}

const { execute: toggleGuardApi, error: toggleGuardError } = useApi(
  () => '/guard_definition',
  { method: 'patch', errorContext: 'Toggle Guard' },
);

async function handleToggleGuard(guard: any, enabled: boolean) {
  await toggleGuardApi({ id: getId(guard), body: { isEnabled: enabled } });
  if (toggleGuardError.value) return;

  notify.success('Success', `Guard ${enabled ? 'enabled' : 'disabled'}`);

  if (String(getId(guard)) === String(guardId.value)) {
    hasFormChanges.value = false;
    await fetchGuard();
    const freshData = guardData.value?.data?.[0];
    if (freshData) {
      form.value = { ...freshData };
      formChanges.update(freshData);
    }
    formEditorRef.value?.confirmChanges();
  } else {
    await fetchDescendants();
  }
}

onMounted(async () => {
  await initializeForm();
  await Promise.all([fetchDescendants(), fetchRules()]);
});
</script>

<style scoped>
.guard-ghost {
  opacity: 0.4;
  border: 2px dashed rgb(139, 92, 246) !important;
  border-radius: 0.75rem;
}
</style>
