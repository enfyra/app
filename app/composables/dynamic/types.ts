import type { Ref } from "vue";

export interface PackageMetadata {
  name: string;
  dependencies: string[];
  exports: string[];
}

export interface LoadedPackageMeta {
  exports: string[];
  globalName: string;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: string;
  keys: string[];
  memoryEstimate: string;
}

export interface PreviewState {
  headerActions: Ref<any[]>;
  subHeaderActions: Ref<any[]>;
  pageHeader: Ref<any>;
}

export interface LoadOptions {
  forceReload?: boolean;
  previewState?: PreviewState;
  originalCode?: string;
}
