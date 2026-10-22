import { isRef, unref } from "vue";
import type { HeaderAction, HeaderActionVariant } from "~/types";

const circularButtonClassPatterns = [
  /^!?rounded-full$/,
  /^!?rounded-\[var\(--radius-pill\)\]$/,
  /^!?rounded-\[9999?px\]$/,
  /^!?rounded-\[9999?rem\]$/,
  /^!?rounded-\[9999?em\]$/,
  /^!?rounded-\[9999?\]$/,
];

export const HEADER_ACTION_BUTTON_SIZE = "md" as const;
export const COMPACT_HEADER_ACTION_BUTTON_SIZE = "sm" as const;

export function getHeaderActionButtonClass(
  action: Pick<HeaderAction, "class" | "label">,
  hideLabel = false,
  compact = false,
) {
  const actionClass = action.class
    ?.split(/\s+/)
    .filter((className) => className && !circularButtonClassPatterns.some((pattern) => pattern.test(className)))
    .join(" ");

  return [
    actionClass,
    compact ? "!h-8" : "!h-9",
    "!rounded-[var(--radius-control)]",
    isHeaderActionIconOnly(action, hideLabel) ? (compact ? "!w-8 !p-0" : "!w-9 !p-0") : "",
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

export function resolveHeaderActionVariant(
  action: Pick<HeaderAction, "variant" | "label">,
  options: { fallback: HeaderActionVariant; hideLabel?: boolean; shaped?: boolean },
): HeaderActionVariant {
  const variant =
    (isRef(action.variant) ? unref(action.variant) : action.variant) || options.fallback;

  if (options.shaped && variant === "ghost" && isHeaderActionIconOnly(action, options.hideLabel)) {
    return "outline";
  }

  return variant;
}
