<template>
  <div class="flow-canvas-wrapper">
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
      :min-zoom="0.2"
      :max-zoom="2"
      @pane-ready="handlePaneReady"
    >
      <Background :variant="BackgroundVariant.Dots" :gap="20" :size="1" />
      <Controls :show-interactive="false" />
      <MiniMap v-if="nodes.length > 6" pannable zoomable />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { VueFlow } from '@vue-flow/core';
import { Background, BackgroundVariant } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import { FlowStepNode } from '#components';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';
import type { FlowStep, FlowDefinition } from '~/types/flow';
import {
  NODE_SPACING_X, CENTER_Y, START_X, BRANCH_OFFSET_Y,
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
    props: ['data', 'id', 'selected'],
    setup(nodeProps: any) {
      return () => h(FlowStepNode, {
        data: nodeProps.data,
        selected: nodeProps.selected,
        disabled: props.reordering,
        onClick: () => {
          if (nodeProps.data.stepType === 'add') {
            emit('addStep', nodeProps.data._addContext || undefined);
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
  let currentX = START_X;
  const sorted = [...props.steps].sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));
  const rootSteps = sorted.filter((s) => !s.parentId && !s.parent?.id);
  const getChildren = (parentId: any, branch: string) =>
    sorted.filter((s) => (String(s.parentId || s.parent?.id || '') === String(parentId)) && s.branch === branch);

  result.push({
    id: 'trigger',
    type: 'flowStep',
    position: { x: currentX, y: CENTER_Y },
    data: {
      label: props.flow?.triggerType?.toUpperCase() || 'TRIGGER',
      stepType: 'trigger',
      triggerInfo: getTriggerInfo(props.flow),
    },
    draggable: false,
    selectable: true,
  });
  currentX += NODE_SPACING_X;

  for (let ri = 0; ri < rootSteps.length; ri++) {
    const step = rootSteps[ri];
    if (!step) continue;
    result.push(makeStepNode(step, currentX, CENTER_Y, ri === 0, ri === rootSteps.length - 1));
    currentX += NODE_SPACING_X;

    if (step.type === 'condition') {
      const trueChildren = getChildren(step.id, 'true');
      const falseChildren = getChildren(step.id, 'false');

      let trueX = currentX;
      const trueBranchY = CENTER_Y - BRANCH_OFFSET_Y;
      for (let ti = 0; ti < trueChildren.length; ti++) {
        result.push(makeStepNode(trueChildren[ti], trueX, trueBranchY, ti === 0, ti === trueChildren.length - 1));
        trueX += NODE_SPACING_X;
      }
      const trueLastOrder = trueChildren.length > 0 ? trueChildren[trueChildren.length - 1]!.stepOrder : 0;
      result.push({
        id: `add-true-${step.id}`,
        type: 'flowStep',
        position: { x: trueX, y: trueBranchY },
        data: { label: 'Add step', stepType: 'add', _addContext: { parentId: step.id, branch: 'true', afterOrder: trueLastOrder } },
        draggable: false, selectable: true,
      });

      let falseX = currentX;
      const falseBranchY = CENTER_Y + BRANCH_OFFSET_Y;
      for (let fi = 0; fi < falseChildren.length; fi++) {
        result.push(makeStepNode(falseChildren[fi], falseX, falseBranchY, fi === 0, fi === falseChildren.length - 1));
        falseX += NODE_SPACING_X;
      }
      const falseLastOrder = falseChildren.length > 0 ? falseChildren[falseChildren.length - 1]!.stepOrder : 0;
      result.push({
        id: `add-false-${step.id}`,
        type: 'flowStep',
        position: { x: falseX, y: falseBranchY },
        data: { label: 'Add step', stepType: 'add', _addContext: { parentId: step.id, branch: 'false', afterOrder: falseLastOrder } },
        draggable: false, selectable: true,
      });

      const maxBranchWidth = Math.max(trueChildren.length + 1, falseChildren.length + 1);
      currentX += maxBranchWidth * NODE_SPACING_X;
    }
  }

  result.push({
    id: 'add-step',
    type: 'flowStep',
    position: { x: currentX, y: CENTER_Y },
    data: { label: 'Add step', stepType: 'add' },
    draggable: false,
    selectable: true,
  });

  return result;
});

const isExecuting = computed(() => props.executionOverlay?.status === 'running');

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
      animated: isExecuting.value,
      style: EDGE_STYLE_DEFAULT,
    });

    if (step.type === 'condition') {
      const trueChildren = getChildren(step.id, 'true');
      const falseChildren = getChildren(step.id, 'false');

      const trueAddId = `add-true-${step.id}`;
      const falseAddId = `add-false-${step.id}`;

      if (trueChildren.length > 0 && trueChildren[0]) {
        result.push({ id: `edge-${stepNodeId}-true-${trueChildren[0]!.id}`, source: stepNodeId, target: `step-${trueChildren[0]!.id}`, type: 'smoothstep', animated: isExecuting.value, label: 'true', labelStyle: EDGE_LABEL_STYLE_TRUE, labelBgStyle: { fill: 'var(--surface-default)', fillOpacity: 0.9 }, style: EDGE_STYLE_TRUE });
        for (let i = 0; i < trueChildren.length - 1; i++) {
          result.push({ id: `edge-true-${trueChildren[i]!.id}-${trueChildren[i + 1]!.id}`, source: `step-${trueChildren[i]!.id}`, target: `step-${trueChildren[i + 1]!.id}`, type: 'smoothstep', animated: isExecuting.value, style: EDGE_STYLE_TRUE });
        }
        result.push({ id: `edge-true-last-${step.id}`, source: `step-${trueChildren[trueChildren.length - 1]!.id}`, target: trueAddId, type: 'smoothstep', animated: false, style: EDGE_STYLE_TRUE_DASHED });
      } else {
        result.push({ id: `edge-${stepNodeId}-true-add`, source: stepNodeId, target: trueAddId, type: 'smoothstep', animated: false, label: 'true', labelStyle: EDGE_LABEL_STYLE_TRUE, labelBgStyle: { fill: 'var(--surface-default)', fillOpacity: 0.9 }, style: EDGE_STYLE_TRUE_DASHED });
      }

      if (falseChildren.length > 0 && falseChildren[0]) {
        result.push({ id: `edge-${stepNodeId}-false-${falseChildren[0]!.id}`, source: stepNodeId, target: `step-${falseChildren[0]!.id}`, type: 'smoothstep', animated: isExecuting.value, label: 'false', labelStyle: EDGE_LABEL_STYLE_FALSE, labelBgStyle: { fill: 'var(--surface-default)', fillOpacity: 0.9 }, style: EDGE_STYLE_FALSE });
        for (let i = 0; i < falseChildren.length - 1; i++) {
          result.push({ id: `edge-false-${falseChildren[i]!.id}-${falseChildren[i + 1]!.id}`, source: `step-${falseChildren[i]!.id}`, target: `step-${falseChildren[i + 1]!.id}`, type: 'smoothstep', animated: isExecuting.value, style: EDGE_STYLE_FALSE });
        }
        result.push({ id: `edge-false-last-${step.id}`, source: `step-${falseChildren[falseChildren.length - 1]!.id}`, target: falseAddId, type: 'smoothstep', animated: false, style: EDGE_STYLE_FALSE_DASHED });
      } else {
        result.push({ id: `edge-${stepNodeId}-false-add`, source: stepNodeId, target: falseAddId, type: 'smoothstep', animated: false, label: 'false', labelStyle: EDGE_LABEL_STYLE_FALSE, labelBgStyle: { fill: 'var(--surface-default)', fillOpacity: 0.9 }, style: EDGE_STYLE_FALSE_DASHED });
      }
    }

    prevNodeId = stepNodeId;
  }

  result.push({
    id: `edge-${prevNodeId}-add`,
    source: prevNodeId,
    target: 'add-step',
    type: 'smoothstep',
    animated: false,
    style: { ...EDGE_STYLE_DEFAULT, strokeDasharray: '6 4' },
  });

  return result;
});

async function fitCanvas() {
  await nextTick();
  try {
    vueFlowRef.value?.fitView?.({ padding: 0.25, duration: 300, maxZoom: 1.2 });
  } catch {}
}

async function handlePaneReady() {
  if (!hasFitted.value && vueFlowRef.value) {
    await fitCanvas();
    hasFitted.value = true;
  }
}

watch(() => nodes.value.length, async () => {
  if (vueFlowRef.value) {
    await fitCanvas();
  }
});
</script>

<style scoped>
.flow-canvas-wrapper {
  width: 100%;
  height: 100%;
  min-height: 350px;
  border-radius: var(--radius-panel);
  overflow: hidden;
  border: 1px solid var(--border-default);
  background: var(--surface-default);
}

.flow-canvas-wrapper :deep(.vue-flow__node) {
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  z-index: 10 !important;
}

.flow-canvas-wrapper :deep(.vue-flow__edges) {
  z-index: 1 !important;
}

.flow-canvas-wrapper :deep(.vue-flow__edge-path) {
  transition: stroke 0.2s ease;
}

.flow-canvas-wrapper :deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  stroke-width: 2.5;
}

.flow-canvas-wrapper :deep(.vue-flow__minimap) {
  border-radius: var(--radius-subcontrol) !important;
  overflow: hidden;
  border: 1px solid var(--border-default) !important;
  background: var(--surface-default) !important;
  box-shadow: var(--shadow-sm) !important;
}

.flow-canvas-wrapper :deep(.vue-flow__minimap-mask) {
  fill: color-mix(in srgb, var(--md-primary) 8%, transparent) !important;
}

.flow-canvas-wrapper :deep(.vue-flow__controls) {
  border-radius: var(--radius-subcontrol) !important;
  overflow: hidden;
  border: 1px solid var(--border-default) !important;
  box-shadow: var(--shadow-sm) !important;
}

.flow-canvas-wrapper :deep(.vue-flow__controls-button) {
  background: var(--surface-default) !important;
  border-bottom: 1px solid var(--border-subtle) !important;
  color: var(--text-secondary) !important;
  transition: all 0.15s ease !important;
}

.flow-canvas-wrapper :deep(.vue-flow__controls-button:hover) {
  background: var(--surface-muted) !important;
  color: var(--text-primary) !important;
}

.flow-canvas-wrapper :deep(.vue-flow__controls-button:last-child) {
  border-bottom: none !important;
}

.flow-canvas-wrapper :deep(.vue-flow__background) {
  color: var(--border-subtle) !important;
}
</style>
