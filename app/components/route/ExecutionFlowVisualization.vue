<template>
  <CommonFormCard v-if="routeData">
    <template #header>
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="flex-shrink-0 min-w-0">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Execution Flow</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Execution flow grouped by HTTP method. Click on any node to edit.
          </p>
        </div>
        <div class="flex items-center gap-2 justify-end md:justify-start flex-wrap">
          <UButton
            icon="lucide:plus"
            size="sm"
            variant="solid"
            color="success"
            @click="$emit('createHandler')"
          >
            Add Handler
          </UButton>
          <UButton
            icon="lucide:plus"
            size="sm"
            variant="solid"
            color="primary"
            @click="$emit('createHook', 'pre')"
          >
            Add Pre-Hook
          </UButton>
          <UButton
            icon="lucide:plus"
            size="sm"
            variant="solid"
            color="secondary"
            @click="$emit('createHook', 'post')"
          >
            Add Post-Hook
          </UButton>
        </div>
      </div>
    </template>

    <div
      v-if="!hasAvailableMethods"
      class="text-center py-12 px-4 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10"
    >
      <UIcon name="lucide:list-filter" class="w-12 h-12 mx-auto mb-3 text-amber-500 dark:text-amber-400" />
      <p class="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">No Available Methods</p>
      <p class="text-xs text-amber-700 dark:text-amber-300/90">Please add Available Methods in the form above to display the execution flow for each HTTP method.</p>
    </div>

    <div v-else-if="allNodes.length > 0" class="h-[500px] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/50">
      <VueFlow
        ref="vueFlowRef"
        :nodes="allNodes"
        :edges="allEdges"
        :node-types="nodeTypes"
        :fit-view-on-init="true"
        class="vue-flow-container"
        @node-click="handleNodeClick"
        :nodes-draggable="false"
        :nodes-connectable="false"
        :elements-selectable="false"
        :pan-on-drag="true"
        :zoom-on-scroll="false"
        :zoom-on-pinch="true"
        :pan-on-scroll="false"
        @pane-ready="handlePaneReady"
      >
        <Controls />
      </VueFlow>
    </div>

    <div
      v-else
      class="text-center py-12 text-gray-500 dark:text-gray-400"
    >
      <UIcon name="lucide:git-branch" class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p class="text-sm">No handlers or hooks configured for this route</p>
    </div>
  </CommonFormCard>
</template>

<script setup lang="ts">
import { h, computed, markRaw, defineComponent, ref, watch, nextTick, onMounted } from 'vue';
import { VueFlow, Handle, Position } from '@vue-flow/core';
import { Controls } from '@vue-flow/controls';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import FlowNode from './FlowNode.vue';

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
}

const props = defineProps<Props>();

const emit = defineEmits<{
  editHandler: [handler: any];
  editHook: [hook: any];
  createHandler: [methodObject?: { method: string; id?: string }];
  createHook: [type: 'pre' | 'post'];
  deleteHandler: [handler: any];
  deleteHook: [hook: any];
  toggleHook: [hook: any, enabled: boolean];
}>();

const vueFlowRef = ref<any>(null);
const hasFitted = ref(false);

function handleNodeDelete(nodeData: any, nodeType: string) {
  if (nodeType === 'handler') {
    emit('deleteHandler', nodeData);
  } else if (nodeType === 'prehook' || nodeType === 'posthook') {
    const hookData = {
      ...nodeData,
      _hookType: nodeType === 'prehook' ? 'pre' : 'post',
    };
    emit('deleteHook', hookData);
  }
}

const nodeTypes = markRaw({
  prehook: markRaw({
    props: ['data', 'id'],
    setup(props: any) {
      return () => h(FlowNode, {
        data: props.data,
        type: 'prehook',
        onClick: () => {
          const nodeData = props.data;
          const hookData = {
            ...nodeData,
            _hookType: 'pre',
          };
          emit('editHook', hookData);
        },
        onDelete: () => {
          handleNodeDelete(props.data, 'prehook');
        },
      });
    },
  }),
  handler: markRaw({
    props: ['data', 'id'],
    setup(props: any) {
      return () => h(FlowNode, {
        data: props.data,
        type: 'handler',
        onClick: () => {
          if (props.data._isDefault || props.data.isDefault) {
            emit('createHandler', props.data._methodObject);
          } else {
            emit('editHandler', props.data);
          }
        },
        onDelete: () => {
          handleNodeDelete(props.data, 'handler');
        },
      });
    },
  }),
  posthook: markRaw({
    props: ['data', 'id'],
    setup(props: any) {
      return () => h(FlowNode, {
        data: props.data,
        type: 'posthook',
        onClick: () => {
          const nodeData = props.data;
          const hookData = {
            ...nodeData,
            _hookType: 'post',
          };
          emit('editHook', hookData);
        },
        onDelete: () => {
          handleNodeDelete(props.data, 'posthook');
        },
      });
    },
  }),
  methodLabel: markRaw({
    props: ['data', 'id'],
    setup(props: any) {
      return () => h('div', {
        class: 'px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 relative',
        style: { height: '40px', display: 'flex', alignItems: 'center' },
      }, [
        h(Handle, {
          type: 'source',
          position: Position.Right,
          style: { top: '50%', transform: 'translateY(-50%)', opacity: 0 },
        }),
        h('span', {
          class: 'text-[7px] font-semibold text-gray-900 dark:text-white uppercase tracking-wide',
        }, props.data.label),
      ]);
    },
  }),
});

const hasAvailableMethods = computed(() => {
  const list = props.availableMethods || [];
  return Array.isArray(list) && list.length > 0;
});

const methodLookup = computed(() => {
  const lookup: Record<string, any> = {};

  props.sortedPreHooks.forEach((hook) => {
    if (hook.methods && Array.isArray(hook.methods)) {
      hook.methods.forEach((method: any) => {
        if (method.method && props.getId(method)) {
          lookup[method.method] = method;
        }
      });
    }
  });

  props.sortedAfterHooks.forEach((hook) => {
    if (hook.methods && Array.isArray(hook.methods)) {
      hook.methods.forEach((method: any) => {
        if (method.method && props.getId(method)) {
          lookup[method.method] = method;
        }
      });
    }
  });

  return lookup;
});

const methodGroups = computed(() => {
  const groups: Record<string, {
    method: string;
    preHooks: any[];
    handler: any | null;
    postHooks: any[];
  }> = {};

  const list = props.availableMethods || [];
  const availableMethodsList = Array.isArray(list) ? list : [];
  if (availableMethodsList.length === 0) return [];

  const allowedMethods = new Set(availableMethodsList);

  availableMethodsList.forEach((method) => {
    groups[method] = {
      method,
      preHooks: [],
      handler: null,
      postHooks: [],
    };
  });

  props.sortedPreHooks.forEach((hook) => {
    const hookId = props.getId(hook);
    const isGlobal = hook.isGlobal === true;
    const hasMethods = hook.methods && Array.isArray(hook.methods) && hook.methods.length > 0;
    const targetMethods = (isGlobal || !hasMethods)
      ? [...allowedMethods]
      : hook.methods.map((m: any) => m?.method).filter(Boolean).filter((m: string) => allowedMethods.has(m));

    targetMethods.forEach((methodKey: string) => {
      if (groups[methodKey] && !groups[methodKey]!.preHooks.find((h: any) => props.getId(h) === hookId)) {
        groups[methodKey]!.preHooks.push(hook);
      }
    });
  });

  props.handlers.forEach((handler) => {
    if (handler.method?.method && allowedMethods.has(handler.method.method) && groups[handler.method.method]) {
      groups[handler.method.method]!.handler = handler;
    } else if (handler._isDefault) {
      availableMethodsList.forEach((methodKey) => {
        if (groups[methodKey] && !groups[methodKey]!.handler) {
          groups[methodKey]!.handler = { ...handler, _methodObject: handler._methodObject || { method: methodKey } };
        }
      });
    }
  });

  if (props.hasMainTable && props.defaultHandler) {
    availableMethodsList.forEach((methodKey) => {
      const group = groups[methodKey];
      if (group && !group.handler) {
        group.handler = { ...props.defaultHandler, _methodObject: { method: methodKey } };
      }
    });
  }

  props.sortedAfterHooks.forEach((hook) => {
    const hookId = props.getId(hook);
    const isGlobal = hook.isGlobal === true;
    const hasMethods = hook.methods && Array.isArray(hook.methods) && hook.methods.length > 0;
    const targetMethods = (isGlobal || !hasMethods)
      ? [...allowedMethods]
      : hook.methods.map((m: any) => m?.method).filter(Boolean).filter((m: string) => allowedMethods.has(m));

    targetMethods.forEach((methodKey: string) => {
      if (groups[methodKey] && !groups[methodKey]!.postHooks.find((h: any) => props.getId(h) === hookId)) {
        groups[methodKey]!.postHooks.push(hook);
      }
    });
  });

  Object.values(groups).forEach((group) => {
    group.preHooks.sort((a: any, b: any) => (props.getPreHookPriority(a) || 0) - (props.getPreHookPriority(b) || 0));
    group.postHooks.sort((a: any, b: any) => (props.getAfterHookPriority(a) || 0) - (props.getAfterHookPriority(b) || 0));
  });

  return Object.values(groups).filter((group) => 
    group.preHooks.length > 0 || group.handler || group.postHooks.length > 0
  );
});

const allNodes = computed(() => {
  const nodes: any[] = [];
  const methodList = methodGroups.value;
  const nodeWidth = 140;
  const rowHeight = 80;
  const startX = 20;
  const startY = 40;
  const nodeSpacing = 30;

  methodList.forEach((group, groupIndex) => {
    const groupY = startY + (groupIndex * rowHeight);
    let currentX = startX;

    const methodLabelId = `method-${group.method}`;
    nodes.push({
      id: methodLabelId,
      type: 'methodLabel',
      position: { x: currentX, y: groupY },
      data: { label: group.method },
      draggable: false,
      selectable: false,
    });

    currentX += 60;

    group.preHooks.forEach((hook: any) => {
      const nodeId = `prehook-${group.method}-${props.getId(hook)}`;
      nodes.push({
        id: nodeId,
        type: 'prehook',
        position: { x: currentX, y: groupY },
        data: {
          ...hook,
          label: hook.name || 'Unnamed Hook',
          priority: props.getPreHookPriority(hook) || 0,
          enabled: hook.isEnabled !== false,
          route: hook.route,
        },
        draggable: false,
        selectable: false,
      });
      currentX += nodeWidth + nodeSpacing;
    });

    if (group.handler) {
      const handlerId = `handler-${group.method}-${group.handler._isDefault ? 'default' : props.getId(group.handler)}`;
      const methodObject = group.handler._isDefault
        ? (methodLookup.value[group.method] || { method: group.method })
        : group.handler.method;
      nodes.push({
        id: handlerId,
        type: 'handler',
        position: { x: currentX, y: groupY },
        data: {
          ...group.handler,
          label: group.handler.name || group.handler.logic?.substring(0, 20) || 'Unnamed Handler',
          isDefault: group.handler._isDefault || false,
          enabled: group.handler.isEnabled !== false,
          _method: group.method,
          _methodObject: methodObject,
        },
        draggable: false,
        selectable: false,
      });
      currentX += nodeWidth + nodeSpacing;
    }

    group.postHooks.forEach((hook: any) => {
      const hookId = `posthook-${group.method}-${props.getId(hook)}`;
      nodes.push({
        id: hookId,
        type: 'posthook',
        position: { x: currentX, y: groupY },
        data: {
          ...hook,
          label: hook.name || 'Unnamed Hook',
          priority: props.getAfterHookPriority(hook) || 0,
          enabled: hook.isEnabled !== false,
          route: hook.route,
        },
        draggable: false,
        selectable: false,
      });
      currentX += nodeWidth + nodeSpacing;
    });
  });

  return nodes;
});

const allEdges = computed(() => {
  const edges: any[] = [];
  const methodList = methodGroups.value;

  methodList.forEach((group) => {
    const methodPrefix = group.method;
    const methodLabelId = `method-${methodPrefix}`;
    let lastNodeId: string | null = methodLabelId;

    group.preHooks.forEach((hook: any, index: number) => {
      const nodeId = `prehook-${methodPrefix}-${props.getId(hook)}`;
      
      edges.push({
        id: `edge-${lastNodeId}-${nodeId}`,
        source: lastNodeId,
        target: nodeId,
        type: 'straight',
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5' },
      });

      lastNodeId = nodeId;
    });

    if (group.handler) {
      const handlerId = `handler-${methodPrefix}-${group.handler._isDefault ? 'default' : props.getId(group.handler)}`;
      
      edges.push({
        id: `edge-${lastNodeId}-${handlerId}`,
        source: lastNodeId,
        target: handlerId,
        type: 'straight',
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5' },
      });
      
      lastNodeId = handlerId;
    }

    group.postHooks.forEach((hook: any) => {
      const hookId = `posthook-${methodPrefix}-${props.getId(hook)}`;
      
      edges.push({
        id: `edge-${lastNodeId}-${hookId}`,
        source: lastNodeId,
        target: hookId,
        type: 'straight',
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5' },
      });

      lastNodeId = hookId;
    });
  });

  return edges;
});

function handleNodeClick(event: any) {
  const node = event.node || event;
  const nodeData = node?.data;
  if (!nodeData) return;

  const nodeType = node?.type;
}

function handlePaneReady() {
  if (!hasFitted.value && vueFlowRef.value) {
    nextTick(() => {
      setTimeout(() => {
        try {
          if (vueFlowRef.value && typeof vueFlowRef.value.fitView === 'function') {
            vueFlowRef.value.fitView({ padding: 0.2, duration: 300, maxZoom: 1.5 });
            hasFitted.value = true;
          }
        } catch (e) {
          console.error('Error fitting view:', e);
        }
      }, 150);
    });
  }
}

watch(() => allNodes.value.length, (newLength, oldLength) => {
  if (newLength > 0 && newLength !== oldLength && vueFlowRef.value) {
    nextTick(() => {
      setTimeout(() => {
        try {
          if (vueFlowRef.value && typeof vueFlowRef.value.fitView === 'function') {
            vueFlowRef.value.fitView({ padding: 0.2, duration: 300, maxZoom: 1.5 });
          }
        } catch (e) {
          console.error('Error fitting view:', e);
        }
      }, 150);
    });
  }
});
</script>

