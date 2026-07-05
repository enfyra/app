import { isRef, unref } from "vue";
import type { HeaderAction } from "~/types";

const circularButtonClassPatterns = [
  /^!?rounded-full$/,
  /^!?rounded-\[var\(--radius-pill\)\]$/,
  /^!?rounded-\[9999?px\]$/,
  /^!?rounded-\[9999?rem\]$/,
  /^!?rounded-\[9999?em\]$/,
  /^!?rounded-\[9999?\]$/,
];

export function getHeaderActionButtonClass(
  action: Pick<HeaderAction, "class">,
  options: { compact?: boolean } = {},
) {
  const actionClass = action.class
    ?.split(/\s+/)
    .filter((className) => className && !circularButtonClassPatterns.some((pattern) => pattern.test(className)))
    .join(" ");

  return [
    actionClass,
    options.compact
      ? "!rounded-[var(--radius-subcontrol)]"
      : "!rounded-[var(--radius-control)]",
  ]
    .filter(Boolean)
    .join(" ");
}

export function isHeaderActionIconOnly(action: Pick<HeaderAction, "label">, hideLabel = false) {
  if (hideLabel) {
    return true;
  }
  const label = isRef(action.label) ? unref(action.label) : action.label;
  return !label;
}
