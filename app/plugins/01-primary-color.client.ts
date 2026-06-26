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

  function initialPrimaryColor() {
    const storedColor = localStorage.getItem(PRIMARY_COLOR_STORAGE_KEY);
    return normalizePrimaryColor(storedColor);
  }

  const current = useState<PrimaryColorValue>("primary-color", initialPrimaryColor);

  function syncPrimaryColorStyle(primary: PrimaryColorValue) {
    const existingElements = Array.from(document.querySelectorAll<HTMLStyleElement>(`style#${PRIMARY_COLOR_STYLE_ID}`));
    let element = existingElements[0];

    if (!element) {
      element = document.createElement("style");
      element.id = PRIMARY_COLOR_STYLE_ID;
    }

    existingElements.slice(1).forEach((duplicate) => duplicate.remove());
    element.textContent = getPrimaryColorStyle(primary);
    document.head.appendChild(element);
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
  }

  setPrimaryColor(initialPrimaryColor());
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
