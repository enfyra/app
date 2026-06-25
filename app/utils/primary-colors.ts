import {
  Hct,
  hexFromArgb,
  argbFromHex,
  SchemeTonalSpot,
  MaterialDynamicColors,
  customColor,
  type DynamicScheme,
} from "@material/material-color-utilities";

export const PRIMARY_COLOR_STORAGE_KEY = "enfyra-app-primary-color";
export const PRIMARY_COLOR_STYLE_ID = "enfyra-app-primary-color-preflight";
export const DEFAULT_PRIMARY_COLOR = "violet";

const primaryColorSeeds = {
  red: "#ef4444",
  orange: "#f97316",
  green: "#22c55e",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  pink: "#ec4899",
} as const;

export const primaryColors = [
  { label: "Red", value: "red", class: "bg-red-500" },
  { label: "Orange", value: "orange", class: "bg-orange-500" },
  { label: "Green", value: "green", class: "bg-green-500" },
  { label: "Blue", value: "blue", class: "bg-blue-500" },
  { label: "Violet", value: "violet", class: "bg-violet-500" },
  { label: "Pink", value: "pink", class: "bg-pink-500" },
] as const;

export type PrimaryColorValue = keyof typeof primaryColorSeeds;

export function isPrimaryColor(value: string | null | undefined): value is PrimaryColorValue {
  return Boolean(value && value in primaryColorSeeds);
}

const STATUS_SEEDS = {
  success: "#16a34a",
  warning: "#d97706",
  info: "#2563eb",
  error: "#dc2626",
} as const;

const ROLES = [
  "primary", "onPrimary", "primaryContainer", "onPrimaryContainer", "inversePrimary",
  "secondary", "onSecondary", "secondaryContainer", "onSecondaryContainer",
  "tertiary", "onTertiary", "tertiaryContainer", "onTertiaryContainer",
  "error", "onError", "errorContainer", "onErrorContainer",
  "background", "onBackground",
  "surface", "surfaceDim", "surfaceBright",
  "surfaceContainerLowest", "surfaceContainerLow", "surfaceContainer", "surfaceContainerHigh", "surfaceContainerHighest",
  "surfaceVariant", "onSurface", "onSurfaceVariant",
  "outline", "outlineVariant",
  "inverseSurface", "inverseOnSurface", "surfaceTint", "shadow", "scrim",
] as const;

const dynamicColors = new MaterialDynamicColors();

function kebab(role: string): string {
  return "--md-" + role.replace(/([A-Z])/g, (m) => "-" + m.toLowerCase());
}

function roleToCssVar(role: string, scheme: DynamicScheme): string {
  const dc = (dynamicColors as unknown as Record<string, () => { getArgb: (s: DynamicScheme) => number }>)[role].call(dynamicColors);
  return `${kebab(role)}:${hexFromArgb(dc.getArgb(scheme))}`;
}

type StatusQuartet = { color: string; onColor: string; container: string; onContainer: string };
type ModeTheme = { roles: Record<string, string>; statuses: Record<string, StatusQuartet> };
type SeedTheme = { light: ModeTheme; dark: ModeTheme };

function extractRoles(scheme: DynamicScheme): Record<string, string> {
  const roles: Record<string, string> = {};
  for (const role of ROLES) {
    const dc = (dynamicColors as unknown as Record<string, () => { getArgb: (s: DynamicScheme) => number }>)[role].call(dynamicColors);
    roles[role] = hexFromArgb(dc.getArgb(scheme));
  }
  return roles;
}

function extractStatuses(source: number, isDark: boolean): Record<string, StatusQuartet> {
  const out: Record<string, StatusQuartet> = {};
  for (const [name, hex] of Object.entries(STATUS_SEEDS)) {
    const group = customColor(source, { value: argbFromHex(hex), name, blend: true });
    const g = isDark ? group.dark : group.light;
    out[name] = { color: hexFromArgb(g.color), onColor: hexFromArgb(g.onColor), container: hexFromArgb(g.colorContainer), onContainer: hexFromArgb(g.onColorContainer) };
  }
  return out;
}

function buildSeedTheme(seedHex: string): SeedTheme {
  const source = argbFromHex(seedHex);
  return {
    light: { roles: extractRoles(new SchemeTonalSpot(Hct.fromInt(source), false, 0)), statuses: extractStatuses(source, false) },
    dark: { roles: extractRoles(new SchemeTonalSpot(Hct.fromInt(source), true, 0)), statuses: extractStatuses(source, true) },
  };
}

const seedThemes = Object.fromEntries(
  (Object.keys(primaryColorSeeds) as PrimaryColorValue[]).map((color) => [color, buildSeedTheme(primaryColorSeeds[color])]),
) as Record<PrimaryColorValue, SeedTheme>;

function modeDeclarations(theme: ModeTheme): string[] {
  const roles = { ...theme.roles };
  const err = theme.statuses.error!;
  roles.error = err.color;
  roles.onError = err.onColor;
  roles.errorContainer = err.container;
  roles.onErrorContainer = err.onContainer;
  const decls: string[] = Object.entries(roles).map(([role, hex]) => `${kebab(role)}:${hex}`);
  for (const [name, q] of Object.entries(theme.statuses)) {
    decls.push(`--st-${name}:${q.color}`, `--st-on-${name}:${q.onColor}`, `--st-${name}-container:${q.container}`, `--st-on-${name}-container:${q.onContainer}`);
  }
  return decls;
}

export function getPrimaryColorStyle(primary: PrimaryColorValue) {
  const theme = seedThemes[primary];
  const root = modeDeclarations(theme.light).map((d) => `${d}!important`).join(";");
  const dark = modeDeclarations(theme.dark).map((d) => `${d}!important`).join(";");
  return `:root{${root}}.dark{${dark}}`;
}

export function getPrimaryColorMeta(primary: PrimaryColorValue) {
  return seedThemes[primary].light.roles.primary;
}

export function getPrimaryColorPreflightScript() {
  const validColors = JSON.stringify(primaryColors.map((c) => c.value));
  const themes = JSON.stringify(seedThemes);

  return `try{var c=localStorage.getItem('${PRIMARY_COLOR_STORAGE_KEY}');var T=${themes};var V=${validColors};if(!V.includes(c)){c='${DEFAULT_PRIMARY_COLOR}'}document.querySelectorAll('style#${PRIMARY_COLOR_STYLE_ID}').forEach(function(n){n.remove()});function K(r){return '--md-'+r.replace(/([A-Z])/g,function(m){return '-'+m.toLowerCase()})}function B(m){var t=T[c][m];var a=[];for(var r in t.roles){a.push(K(r)+':'+t.roles[r])}var er=t.statuses.error;a.push('--md-error:'+er.color,'--md-on-error:'+er.onColor,'--md-error-container:'+er.container,'--md-on-error-container:'+er.onContainer);for(var s in t.statuses){var q=t.statuses[s];a.push('--st-'+s+':'+q.color,'--st-on-'+s+':'+q.onColor,'--st-'+s+'-container:'+q.container,'--st-on-'+s+'-container:'+q.onContainer)}return a.map(function(d){return d+'!important'}).join(';')}var e=document.createElement('style');e.id='${PRIMARY_COLOR_STYLE_ID}';e.textContent=':root{'+B('light')+'}.dark{'+B('dark')+'}';document.head.appendChild(e)}catch(e){}`;
}
