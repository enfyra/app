export const PRIMARY_COLOR_STORAGE_KEY = "enfyra-app-primary-color";
export const PRIMARY_COLOR_STYLE_ID = "enfyra-app-primary-color-preflight";
export const DEFAULT_PRIMARY_COLOR = "violet";

const primaryColorShades = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
const brandColorShades = ["25", ...primaryColorShades] as const;

const primaryColorFallbacks = {
  red: {
    25: "#fffbfa",
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a",
  },
  orange: {
    25: "#fffaf5",
    50: "#fff7ed",
    100: "#ffedd5",
    200: "#fed7aa",
    300: "#fdba74",
    400: "#fb923c",
    500: "#f97316",
    600: "#ea580c",
    700: "#c2410c",
    800: "#9a3412",
    900: "#7c2d12",
    950: "#431407",
  },
  amber: {
    25: "#fffcf5",
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },
  green: {
    25: "#f6fef9",
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
    950: "#052e16",
  },
  blue: {
    25: "#f5fbff",
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
  cyan: {
    25: "#f5feff",
    50: "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4",
    600: "#0891b2",
    700: "#0e7490",
    800: "#155e75",
    900: "#164e63",
    950: "#083344",
  },
  violet: {
    25: "#faf5ff",
    50: "#f5f3ff",
    100: "#ede9fe",
    200: "#ddd6fe",
    300: "#c4b5fd",
    400: "#a78bfa",
    500: "#8b5cf6",
    600: "#7c3aed",
    700: "#6d28d9",
    800: "#5b21b6",
    900: "#4c1d95",
    950: "#2e1065",
  },
  purple: {
    25: "#faf5ff",
    50: "#faf5ff",
    100: "#f3e8ff",
    200: "#e9d5ff",
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7",
    600: "#9333ea",
    700: "#7c3aed",
    800: "#6d28d9",
    900: "#5b21b6",
    950: "#3b0764",
  },
  pink: {
    25: "#fdf2f8",
    50: "#fdf2f8",
    100: "#fce7f3",
    200: "#fbcfe8",
    300: "#f9a8d4",
    400: "#f472b6",
    500: "#ec4899",
    600: "#db2777",
    700: "#be185d",
    800: "#9d174d",
    900: "#831843",
    950: "#500724",
  },
} as const;

export const primaryColors = [
  { label: "Red", value: "red", class: "bg-red-500" },
  { label: "Orange", value: "orange", class: "bg-orange-500" },
  { label: "Amber", value: "amber", class: "bg-amber-500" },
  { label: "Green", value: "green", class: "bg-green-500" },
  { label: "Blue", value: "blue", class: "bg-blue-500" },
  { label: "Cyan", value: "cyan", class: "bg-cyan-500" },
  { label: "Violet", value: "violet", class: "bg-violet-500" },
  { label: "Purple", value: "purple", class: "bg-purple-500" },
  { label: "Pink", value: "pink", class: "bg-pink-500" },
] as const;

export type PrimaryColorValue = keyof typeof primaryColorFallbacks;

export function isPrimaryColor(value: string | null | undefined): value is PrimaryColorValue {
  return Boolean(value && value in primaryColorFallbacks);
}

function channelLuminance(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  return (
    0.2126 * channelLuminance(parseInt(h.slice(0, 2), 16)) +
    0.7152 * channelLuminance(parseInt(h.slice(2, 4), 16)) +
    0.0722 * channelLuminance(parseInt(h.slice(4, 6), 16))
  );
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function useWhiteOnPrimary(bgHex: string, darkTextHex: string): boolean {
  return contrastRatio("#ffffff", bgHex) >= contrastRatio(darkTextHex, bgHex);
}

const primaryOnText = Object.fromEntries(
  (Object.keys(primaryColorFallbacks) as PrimaryColorValue[]).map((color) => {
    const f = primaryColorFallbacks[color];
    return [color, { light: useWhiteOnPrimary(f[700], f[950]), dark: useWhiteOnPrimary(f[700], f[950]) }];
  }),
) as Record<PrimaryColorValue, { light: boolean; dark: boolean }>;

export function getPrimaryColorStyle(primary: PrimaryColorValue) {
  const fallbacks = primaryColorFallbacks[primary];
  const onText = primaryOnText[primary];
  const uiVariables = primaryColorShades.map((shade) => `--ui-color-primary-${shade}:var(--color-${primary}-${shade},${fallbacks[shade]})`);
  const brandVariables = brandColorShades.map((shade) => `--brand-${shade}:var(--color-${primary}-${shade},${fallbacks[shade]})`);
  const aliases = [
    "--ui-primary:var(--ui-color-primary-500)",
    "--brand-violet-deep:var(--brand-700)",
    "--brand-violet-electric:var(--brand-500)",
    "--brand-violet-bright:var(--brand-400)",
    "--brand-indigo-deep:var(--brand-800)",
    "--brand-indigo-electric:var(--brand-600)",
    "--brand-indigo-bright:var(--brand-400)",
    "--border-accent:color-mix(in srgb,var(--brand-500) 35%,transparent)",
    "--gradient-primary:linear-gradient(135deg,var(--brand-500) 0%,var(--brand-600) 50%,var(--brand-400) 100%)",
    "--gradient-primary-reverse:linear-gradient(135deg,var(--brand-400) 0%,var(--brand-600) 50%,var(--brand-500) 100%)",
    "--gradient-violet-cyan:linear-gradient(135deg,var(--brand-500) 0%,var(--brand-400) 100%)",
    "--shadow-primary:0 4px 20px color-mix(in srgb,var(--brand-500) 18%,transparent),0 2px 8px color-mix(in srgb,var(--brand-600) 12%,transparent)",
    "--shadow-primary-lg:0 8px 32px color-mix(in srgb,var(--brand-500) 24%,transparent),0 4px 16px color-mix(in srgb,var(--brand-600) 16%,transparent)",
    "--glow-primary:0 0 40px color-mix(in srgb,var(--brand-500) 24%,transparent),0 0 80px color-mix(in srgb,var(--brand-600) 14%,transparent)",
    "--glow-violet:0 0 30px color-mix(in srgb,var(--brand-500) 28%,transparent)",
    "--prose-link:var(--brand-600)",
    "--prose-link-hover:var(--brand-700)",
    "--selection-bg:color-mix(in srgb,var(--brand-500) 22%,transparent)",
    "--prose-selection-bg:color-mix(in srgb,var(--brand-500) 22%,transparent)",
    "--column-resize-handle:var(--brand-600)",
  ];

  const rootDeclarations = [
    ...uiVariables,
    ...brandVariables,
    ...aliases,
    `--action-primary-text:${onText.light ? "#ffffff" : "var(--brand-950)"}`,
  ];
  return `:root{${rootDeclarations.map((declaration) => `${declaration}!important`).join(";")}}.dark{--action-primary-text:${onText.dark ? "#ffffff" : "var(--brand-950)"}!important}`;
}

export function getPrimaryColorMeta(primary: PrimaryColorValue) {
  return primaryColorFallbacks[primary][500];
}

export function getPrimaryColorPreflightScript() {
  const colors = JSON.stringify(primaryColors.map((color) => color.value));
  const fallbacks = JSON.stringify(primaryColorFallbacks);
  const uiShades = JSON.stringify(primaryColorShades);
  const brandShades = JSON.stringify(brandColorShades);
  const onText = JSON.stringify(primaryOnText);

  return `try{var c=localStorage.getItem('${PRIMARY_COLOR_STORAGE_KEY}');var p=${fallbacks};var u=${uiShades};var b=${brandShades};var o=${onText};if(!${colors}.includes(c)){c='${DEFAULT_PRIMARY_COLOR}'}document.querySelectorAll('style#${PRIMARY_COLOR_STYLE_ID}').forEach(function(n){n.remove()});var e=document.createElement('style');e.id='${PRIMARY_COLOR_STYLE_ID}';e.textContent=':root{'+u.map(function(x){return '--ui-color-primary-'+x+':var(--color-'+c+'-'+x+','+p[c][x]+')!important'}).concat(b.map(function(x){return '--brand-'+x+':var(--color-'+c+'-'+x+','+p[c][x]+')!important'})).concat(['--ui-primary:var(--ui-color-primary-500)!important','--brand-violet-deep:var(--brand-700)!important','--brand-violet-electric:var(--brand-500)!important','--brand-violet-bright:var(--brand-400)!important','--brand-indigo-deep:var(--brand-800)!important','--brand-indigo-electric:var(--brand-600)!important','--brand-indigo-bright:var(--brand-400)!important','--border-accent:color-mix(in srgb,var(--brand-500) 35%,transparent)!important','--gradient-primary:linear-gradient(135deg,var(--brand-500) 0%,var(--brand-600) 50%,var(--brand-400) 100%)!important','--gradient-primary-reverse:linear-gradient(135deg,var(--brand-400) 0%,var(--brand-600) 50%,var(--brand-500) 100%)!important','--gradient-violet-cyan:linear-gradient(135deg,var(--brand-500) 0%,var(--brand-400) 100%)!important','--shadow-primary:0 4px 20px color-mix(in srgb,var(--brand-500) 18%,transparent),0 2px 8px color-mix(in srgb,var(--brand-600) 12%,transparent)!important','--shadow-primary-lg:0 8px 32px color-mix(in srgb,var(--brand-500) 24%,transparent),0 4px 16px color-mix(in srgb,var(--brand-600) 16%,transparent)!important','--glow-primary:0 0 40px color-mix(in srgb,var(--brand-500) 24%,transparent),0 0 80px color-mix(in srgb,var(--brand-600) 14%,transparent)!important','--glow-violet:0 0 30px color-mix(in srgb,var(--brand-500) 28%,transparent)!important','--prose-link:var(--brand-600)!important','--prose-link-hover:var(--brand-700)!important','--selection-bg:color-mix(in srgb,var(--brand-500) 22%,transparent)!important','--prose-selection-bg:color-mix(in srgb,var(--brand-500) 22%,transparent)!important','--column-resize-handle:var(--brand-600)!important','--action-primary-text:'+(o[c].light?'#ffffff':'var(--brand-950)')+'!important']).join(';')+'}'+'.dark{--action-primary-text:'+(o[c].dark?'#ffffff':'var(--brand-950)')+'!important}';document.head.appendChild(e)}catch(e){}`;
}
