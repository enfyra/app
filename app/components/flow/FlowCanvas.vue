<template>
  <div class="flow-canvas-container border border-[var(--border-default)] rounded-lg overflow-hidden bg-[var(--surface-muted)]" style="width: 100%; height: 100%; min-height: 350px;">
    <VueFlow
      ref="vueFlowRef"
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :fit-view-on-init="true"
      class="vue-flow-container"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="true"
      :pan-on-drag="true"
      :zoom-on-scroll="true"
      :zoom-on-pinch="true"
      @node-click="handleNodeClick"
      @pane-ready="handlePaneReady"
    >
      <Background />
      <Controls />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { FlowStepNode } from '#components';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import type { FlowStep, FlowDefinition } from '~/types/flow';
import {
  NODE_SPACING_Y, CENTER_X, START_Y, BRANCH_OFFSET_X,
  EDGE_STYLE_DEFAULT, EDGE_STYLE_TRUE, EDGE_STYLE_FALSE,
  EDGE_STYLE_TRUE_DASHED, EDGE_STYLE_FALSE_DASHED,
  EDGE_LABEL_STYLE_TRUE, EDGE_LABEL_STYLE_FALSE,
} from '~/utils/flow.constants';

interface ExecutionOverlay {
  status: 'pending' | 'running' | 'completed' | 'failed';
  completedSteps?: string[];
  currentStep?: string;
  error?: { message?: string };
}

interface Props {
  flow: FlowDefinition | null;
  steps: FlowStep[];
  reordering?: boolean;
  executionOverlay?: ExecutionOverlay | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectStep: [step: FlowStep | null];
  addStep: [context?: { parentId?: any; branch?: string; afterOrder?: number }];
  moveStep: [stepId: any, direction: number];
}>();

const vueFlowRef = ref<any>(null);
const hasFitted = ref(false);

function getTriggerInfo(flow: any): string {
  const t = flow?.triggerType;
  const c = flow?.triggerConfig;
  if (t === 'schedule') return `Cron: ${c?.cron || 'not set'}`;
  if (t === 'manual') return 'Manual trigger';
  return t || 'Unknown';
}

const nodeTypes = markRaw({
  flowStep: markRaw({
    props: ['data', 'id'],
    setup(nodeProps: any) {
      return () => h(FlowStepNode, {
        data: nodeProps.data,
        disabled: props.reordering,
        onClick: () => {
          if (nodeProps.data.stepType === 'add') {
            emit('addStep');
          } else if (nodeProps.data.stepType === 'trigger') {
            emit('selectStep', null);
          } else {
            const step = props.steps.find(s =>
              String(s.id) === String(nodeProps.data.stepId) || s.key === nodeProps.data.label
            );
            if (step) emit('selectStep', step);
          }
        },
        onMoveUp: () => {
          if (nodeProps.data.stepId) emit('moveStep', nodeProps.data.stepId, -1);
        },
        onMoveDown: () => {
          if (nodeProps.data.stepId) emit('moveStep', nodeProps.data.stepId, 1);
        },
      });
    },
  }),
});

function getStepExecStatus(stepKey: string): 'completed' | 'failed' | 'running' | 'skipped' | null {
  const overlay = props.executionOverlay;
  if (!overlay) return null;
  if (overlay.completedSteps?.includes(stepKey)) return 'completed';
  if (overlay.status === 'failed' && overlay.currentStep === stepKey) return 'failed';
  if (overlay.status === 'running' && overlay.currentStep === stepKey) return 'running';
  if (overlay.status === 'completed' || overlay.status === 'failed') {
    if (!overlay.completedSteps?.includes(stepKey)) return 'skipped';
  }
  return null;
}

function makeStepNode(step: any, x: number, y: number, isFirst = false, isLast = false) {
  return {
    id: `step-${step.id}`,
    type: 'flowStep',
    position: { x, y },
    data: {
      stepId: step.id,
      label: step.key,
      stepType: step.type,
      config: step.config,
      sourceCode: step.sourceCode ?? step.config?.sourceCode ?? step.config?.code ?? null,
      timeout: step.timeout,
      onError: step.onError,
      retryAttempts: step.retryAttempts,
      enabled: step.isEnabled !== false,
      branch: step.branch || null,
      parentId: step.parentId || step.parent?.id || null,
      execStatus: getStepExecStatus(step.key),
      execError: props.executionOverlay?.status === 'failed' && props.executionOverlay?.currentStep === step.key ? props.executionOverlay?.error?.message : null,
      isFirst,
      isLast,
    },
    draggable: false,
    selectable: true,
  };
}

const nodes = computed(() => {
  const result: any[] = [];
  let currentY = START_Y;
  const sorted = [...props.steps].sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));
  const rootSteps = sorted.filter((s) => !s.parentId && !s.parent?.id);
  const getChildren = (parentId: any, branch: string) =>
    sorted.filter((s) => (String(s.parentId || s.parent?.id || '') === String(parentId)) && s.branch === branch);

  result.push({
    id: 'trigger',
    type: 'flowStep',
    position: { x: CENTER_X, y: currentY },
    data: {
      label: props.flow?.triggerType?.toUpperCase() || 'TRIGGER',
      stepType: 'trigger',
      triggerInfo: getTriggerInfo(props.flow),
    },
    draggable: false,
    selectable: true,
  });
  currentY += NODE_SPACING_Y;

  for (let ri = 0; ri < rootSteps.length; ri++) {
    const step = rootSteps[ri];
    if (!step) continue;
    result.push(makeStepNode(step, CENTER_X, currentY, ri === 0, ri === rootSteps.length - 1));
    currentY += NODE_SPACING_Y;

    if (step.type === 'condition') {
      const trueChildren = getChildren(step.id, 'true');
      const falseChildren = getChildren(step.id, 'false');

      let trueY = currentY;
      for (let ti = 0; ti < trueChildren.length; ti++) {
        result.push(makeStepNode(trueChildren[ti], CENTER_X + BRANCH_OFFSET_X, trueY, ti === 0, ti === trueChildren.length - 1));
        trueY += NODE_SPACING_Y;
      }
      const trueLastOrder = trueChildren.length > 0 ? trueChildren[trueChildren.length - 1]!.stepOrder : 0;
      result.push({
        id: `add-true-${step.id}`,
        type: 'flowStep',
        position: { x: CENTER_X + BRANCH_OFFSET_X, y: trueY },
        data: { label: '+ True', stepType: 'add', _addContext: { parentId: step.id, branch: 'true', afterOrder: trueLastOrder } },
        draggable: false, selectable: true,
      });

      let falseY = currentY;
      for (let fi = 0; fi < falseChildren.length; fi++) {
        result.push(makeStepNode(falseChildren[fi], CENTER_X - BRANCH_OFFSET_X, falseY, fi === 0, fi === falseChildren.length - 1));
        falseY += NODE_SPACING_Y;
      }
      const falseLastOrder = falseChildren.length > 0 ? falseChildren[falseChildren.length - 1]!.stepOrder : 0;
      result.push({
        id: `add-false-${step.id}`,
        type: 'flowStep',
        position: { x: CENTER_X - BRANCH_OFFSET_X, y: falseY },
        data: { label: '+ False', stepType: 'add', _addContext: { parentId: step.id, branch: 'false', afterOrder: falseLastOrder } },
        draggable: false, selectable: true,
      });

      const maxBranchHeight = Math.max(trueChildren.length + 1, falseChildren.length + 1);
      currentY += maxBranchHeight * NODE_SPACING_Y;
    }
  }

  result.push({
    id: 'add-step',
    type: 'flowStep',
    position: { x: CENTER_X, y: currentY },
    data: { label: 'Add Step', stepType: 'add' },
    draggable: false,
    selectable: true,
  });

  return result;
});

const edges = computed(() => {
  const result: any[] = [];
  const sorted = [...props.steps].sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));
  const rootSteps = sorted.filter((s) => !s.parentId && !s.parent?.id);
  const getChildren = (parentId: any, branch: string) =>
    sorted.filter((s) => (String(s.parentId || s.parent?.id || '') === String(parentId)) && s.branch === branch);

  let prevNodeId = 'trigger';

  for (const step of rootSteps) {
    const stepNodeId = `step-${step.id}`;

    result.push({
      id: `edge-${prevNodeId}-${stepNodeId}`,
      source: prevNodeId,
      target: stepNodeId,
      type: 'smoothstep',
      animated: true,
      style: EDGE_STYLE_DEFAULT,
    });

    if (step.type === 'condition') {
      const trueChildren = getChildren(step.id, 'true');
      const falseChildren = getChildren(step.id, 'false');

      const trueAddId = `add-true-${step.id}`;
      const falseAddId = `add-false-${step.id}`;

      if (trueChildren.length > 0 && trueChildren[0]) {
        result.push({ id: `edge-${stepNodeId}-true-${trueChildren[0]!.id}`, source: stepNodeId, target: `step-${trueChildren[0]!.id}`, type: 'smoothstep', animated: true, label: 'true', labelStyle: EDGE_LABEL_STYLE_TRUE, style: EDGE_STYLE_TRUE });
        for (let i = 0; i < trueChildren.length - 1; i++) {
          result.push({ id: `edge-true-${trueChildren[i]!.id}-${trueChildren[i + 1]!.id}`, source: `step-${trueChildren[i]!.id}`, target: `step-${trueChildren[i + 1]!.id}`, type: 'smoothstep', animated: true, style: EDGE_STYLE_TRUE });
        }
        result.push({ id: `edge-true-last-${step.id}`, source: `step-${trueChildren[trueChildren.length - 1]!.id}`, target: trueAddId, type: 'smoothstep', animated: true, style: EDGE_STYLE_TRUE_DASHED });
      } else {
        result.push({ id: `edge-${stepNodeId}-true-add`, source: stepNodeId, target: trueAddId, type: 'smoothstep', animated: true, label: 'true', labelStyle: EDGE_LABEL_STYLE_TRUE, style: EDGE_STYLE_TRUE_DASHED });
      }

      if (falseChildren.length > 0 && falseChildren[0]) {
        result.push({ id: `edge-${stepNodeId}-false-${falseChildren[0]!.id}`, source: stepNodeId, target: `step-${falseChildren[0]!.id}`, type: 'smoothstep', animated: true, label: 'false', labelStyle: EDGE_LABEL_STYLE_FALSE, style: EDGE_STYLE_FALSE });
        for (let i = 0; i < falseChildren.length - 1; i++) {
          result.push({ id: `edge-false-${falseChildren[i]!.id}-${falseChildren[i + 1]!.id}`, source: `step-${falseChildren[i]!.id}`, target: `step-${falseChildren[i + 1]!.id}`, type: 'smoothstep', animated: true, style: EDGE_STYLE_FALSE });
        }
        result.push({ id: `edge-false-last-${step.id}`, source: `step-${falseChildren[falseChildren.length - 1]!.id}`, target: falseAddId, type: 'smoothstep', animated: true, style: EDGE_STYLE_FALSE_DASHED });
      } else {
        result.push({ id: `edge-${stepNodeId}-false-add`, source: stepNodeId, target: falseAddId, type: 'smoothstep', animated: true, label: 'false', labelStyle: EDGE_LABEL_STYLE_FALSE, style: EDGE_STYLE_FALSE_DASHED });
      }
    }

    prevNodeId = stepNodeId;
  }

  result.push({
    id: `edge-${prevNodeId}-add`,
    source: prevNodeId,
    target: 'add-step',
    type: 'smoothstep',
    animated: true,
    style: EDGE_STYLE_DEFAULT,
  });

  return result;
});

function handleNodeClick(event: any) {
  const node = event.node || event;
  const data = node?.data;
  if (!data) return;

  if (data.stepType === 'add') {
    emit('addStep', data._addContext || undefined);
  } else if (data.stepType === 'trigger') {
    emit('selectStep', null);
  } else {
    const step = props.steps.find(s =>
      String(s.id) === String(data.stepId) || s.key === data.label
    );
    if (step) emit('selectStep', step);
  }
}

function handlePaneReady() {
  if (!hasFitted.value && vueFlowRef.value) {
    nextTick(() => {
      setTimeout(() => {
        try {
          if (vueFlowRef.value?.fitView) {
            vueFlowRef.value.fitView({ padding: 0.3, duration: 300, maxZoom: 1.2 });
            hasFitted.value = true;
          }
        } catch {}
      }, 150);
    });
  }
}

watch(() => nodes.value.length, () => {
  if (vueFlowRef.value) {
    nextTick(() => {
      setTimeout(() => {
        try {
          vueFlowRef.value?.fitView?.({ padding: 0.3, duration: 300, maxZoom: 1.2 });
        } catch {}
      }, 150);
    });
  }
});
</script>

<style>
.vue-flow__node {
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  z-index: 10 !important;
}
.vue-flow__edges {
  z-index: 1 !important;
}
</style>
