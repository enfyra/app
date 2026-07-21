# Enfyra App v2.2.11-patch-2

## Operational Flow

Before: Route handlers and hooks were presented in a dense graph layout with incomplete connectors, compact actions, and limited responsive behavior. Flow steps were arranged vertically with continuously animated edges.

After: Each HTTP method now renders as a clear Pre-hooks → Handler → Post-hooks lane with full-span connectors, stage-specific actions, state badges, and a stacked mobile layout. General flows use a horizontal canvas with separate condition branches, context-aware add nodes, execution-only edge animation, and a minimap for larger flows.

## Bug Fixes

- Fixed `ExecutionFlowVisualization.vue` connectors so every stage link spans the full gap and switches to a vertical connector on narrow viewports.
- Improved `FlowNode.vue` with dropdown actions, readable active, disabled, global, and built-in states, and explicit default-handler customization.
- Improved `FlowCanvas.vue` and `FlowStepNode.vue` with horizontal step and branch layout, selected and execution states, keyboard activation, fit-to-view behavior, and a minimap for flows with more than six nodes.
- Updated `vue-flow.css` and `flow.constants.ts` to use shared theme tokens and execution-aware edge styling consistently.
