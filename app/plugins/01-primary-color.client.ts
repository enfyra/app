import {
  DEFAULT_PRIMARY_COLOR,
  getPrimaryColorMeta,
  getPrimaryColorStyle,
  normalizePrimaryColor,
  primaryColors,
  PRIMARY_COLOR_STORAGE_KEY,
  PRIMARY_COLOR_STYLE_ID,
  type PrimaryColorValue,
} from "~/utils/primary-colors";

interface PrimaryColorOption {
  label: string;
  value: PrimaryColorValue;
  swatch: string;
}

interface PrimaryColorService {
  colors: readonly PrimaryColorOption[];
  current: Ref<PrimaryColorValue>;
  set: (value: string | null) => void;
}

export default defineNuxtPlugin(() => {
  const colorMode = useColorMode();
  let themeTransitionFrame: number | null = null;
  let themeTransitionTimeout: number | null = null;

  function initialPrimaryColor() {
    const storedColor = localStorage.getItem(PRIMARY_COLOR_STORAGE_KEY);
    return normalizePrimaryColor(storedColor);
  }

  const current = useState<PrimaryColorValue>("primary-color", initialPrimaryColor);

  function withThemeTransitionSuppressed(apply: () => void) {
    const root = document.documentElement;
    root.classList.add("eapp-theme-color-changing");

    apply();

    if (themeTransitionFrame !== null) {
      window.cancelAnimationFrame(themeTransitionFrame);
      themeTransitionFrame = null;
    }
    if (themeTransitionTimeout !== null) {
      window.clearTimeout(themeTransitionTimeout);
      themeTransitionTimeout = null;
    }

    themeTransitionFrame = window.requestAnimationFrame(() => {
      themeTransitionFrame = window.requestAnimationFrame(() => {
        themeTransitionFrame = null;
        themeTransitionTimeout = window.setTimeout(() => {
          themeTransitionTimeout = null;
          root.classList.remove("eapp-theme-color-changing");
        }, 120);
      });
    });
  }

  function syncPrimaryColorStyle(primary: PrimaryColorValue) {
    const element = document.getElementById(PRIMARY_COLOR_STYLE_ID) as HTMLStyleElement | null;

    if (!element) {
      const element = document.createElement("style");
      element.id = PRIMARY_COLOR_STYLE_ID;
      element.textContent = getPrimaryColorStyle(primary);
      document.head.appendChild(element);
      return;
    }

    if (element.textContent !== getPrimaryColorStyle(primary)) {
      element.textContent = getPrimaryColorStyle(primary);
    }

    document.querySelectorAll<HTMLStyleElement>(`style#${PRIMARY_COLOR_STYLE_ID}`).forEach((duplicate, index) => {
      if (index > 0) duplicate.remove();
    });
  }

  function ensurePrimaryColorStyle(primary: PrimaryColorValue) {
    let element = document.getElementById(PRIMARY_COLOR_STYLE_ID) as HTMLStyleElement | null;

    if (!element) {
      element = document.createElement("style");
      element.id = PRIMARY_COLOR_STYLE_ID;
      element.textContent = getPrimaryColorStyle(primary);
      document.head.appendChild(element);
    }
  }

  function syncThemeColorMeta(primary: PrimaryColorValue) {
    const color = getPrimaryColorMeta(primary, colorMode.value === "dark" ? "dark" : "light");
    let element = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

    if (!element) {
      element = document.createElement("meta");
      element.name = "theme-color";
      document.head.appendChild(element);
    }

    element.content = color;
  }

  function setPrimaryColor(value: string | null) {
    const primary = normalizePrimaryColor(value);
    if (primary === current.value) return;

    withThemeTransitionSuppressed(() => {
      current.value = primary;
      updateAppConfig({
        ui: {
          colors: {
            primary,
          },
        },
      });

      localStorage.setItem(PRIMARY_COLOR_STORAGE_KEY, primary);
      syncPrimaryColorStyle(primary);
      syncThemeColorMeta(primary);
    });
  }

  const initial = initialPrimaryColor();
  current.value = initial;
  updateAppConfig({
    ui: {
      colors: {
        primary: initial,
      },
    },
  });
  ensurePrimaryColorStyle(initial);
  syncThemeColorMeta(initial);
  watch(() => colorMode.value, () => syncThemeColorMeta(current.value));

  return {
    provide: {
      primaryColor: {
        colors: primaryColors,
        current,
        set: setPrimaryColor,
      } satisfies PrimaryColorService,
    },
  };
});

declare module "#app" {
  interface NuxtApp {
    $primaryColor: PrimaryColorService;
  }
}
