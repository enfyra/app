import type { ExtensionDefinition } from './extensions';
import type { FileLibraryRecord } from './file';
import type { FlowDefinition, FlowStep, FlowTrigger } from './flow';
import type { MenuDefinition } from './menu';
import type { RouteMethodFileFieldDraft } from './route-method-config';

export interface FeatureCollection<T> {
  data: T[];
  meta?: { totalCount?: number; filterCount?: number };
}

export interface FeatureIdentity {
  id?: string | number;
  _id?: string;
}

export interface FeatureTableOption extends FeatureIdentity {
  name: string;
  alias?: string | null;
  description?: string | null;
}

export interface FeatureMethod extends FeatureIdentity {
  name: string;
  buttonColor?: string | null;
  textColor?: string | null;
}

export interface FeatureRouteMethodConfig extends FeatureIdentity {
  method: FeatureMethod;
  available: boolean;
  isPublic: boolean;
  skipRoleGuard: boolean;
  timeout: number | null;
  requestBodyType?: string | null;
  maxUploadFileSize?: number | null;
  maxFiles?: number | null;
  description?: string | null;
  fileFields?: RouteMethodFileFieldDraft[];
}

export interface FeatureRoute extends FeatureIdentity {
  path: string;
  isEnabled: boolean;
  isSystem: boolean;
  description?: string | null;
  icon?: string | null;
  mainTable?: FeatureTableOption | null;
  methodConfigs?: FeatureRouteMethodConfig[];
  availableMethods?: FeatureMethod[];
  publicMethods?: FeatureMethod[];
  skipRoleGuardMethods?: FeatureMethod[];
  handlers?: { method?: FeatureMethod | null }[];
}

export type FeatureRouteHeader = Pick<FeatureRoute, 'id' | '_id' | 'path' | 'isSystem'>;
export type FeatureRouteOption = Pick<FeatureRoute, 'id' | '_id' | 'path'>;
export type FeatureRouteList = Pick<FeatureRoute, 'id' | '_id' | 'path' | 'description' | 'isEnabled' | 'isSystem' | 'mainTable' | 'availableMethods' | 'publicMethods'>;
export type FeatureTriggerRoute = FeatureRouteOption & {
  methodConfigs?: { available: boolean; method?: Pick<FeatureMethod, 'id' | '_id' | 'name'> | null }[];
};

export interface FeatureRouteHandler extends FeatureIdentity {
  name: string;
  description?: string | null;
  isEnabled: boolean;
  isSystem: boolean;
  method?: FeatureMethod | null;
}

export interface FeatureRouteHook extends Omit<FeatureRouteHandler, 'method'> {
  isGlobal: boolean;
  priority?: number | null;
  route?: FeatureRouteOption | null;
  methods?: FeatureMethod[];
}

export interface FeatureGuard extends FeatureIdentity {
  name: string;
  description?: string | null;
  isEnabled: boolean;
  isGlobal: boolean;
  type?: string;
  gqlOperation?: string | null;
  position?: string | null;
  combinator?: string;
  priority?: number;
  route?: FeatureRouteOption | null;
  table?: FeatureTableOption | null;
  methods?: FeatureMethod[];
  parent?: FeatureIdentity | string | number | null;
}

export type FeatureEditableRecord = FeatureIdentity & Record<string, unknown>;

export type FeatureFlowDetail = FlowDefinition & {
  description?: string | null;
  isSystem?: boolean;
  steps?: FlowStep[];
};

export type FeatureFlowList = Pick<FeatureFlowDetail, 'id' | 'name' | 'description' | 'isEnabled' | 'isSystem' | 'timeout'> & {
  icon?: string | null;
  steps?: FeatureIdentity[];
  triggers?: Pick<FlowTrigger, 'id' | 'type' | 'isEnabled'>[];
};

export interface FeatureFlowExecution extends FeatureIdentity {
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  duration?: number | null;
  currentStep?: string | null;
  completedSteps?: unknown;
  error?: unknown;
  context?: unknown;
  flow?: FeatureIdentity | string | number | null;
}

export interface FeatureAttachedFlowTrigger extends FeatureIdentity {
  type: string;
  isEnabled: boolean;
  config?: { method?: string } | null;
  tableEvent?: string | null;
  flow?: { id?: string | number; _id?: string; name: string } | null;
}

export interface FeaturePackage extends FeatureIdentity {
  name: string;
  version: string;
  description?: string | null;
  flags?: string | null;
  createdAt?: string;
  status?: string;
  type?: string;
  lastError?: string | null;
}

export interface FeatureWebsocket extends FeatureIdentity {
  path: string;
  description?: string | null;
  isEnabled: boolean;
  isSystem: boolean;
  requireAuth?: boolean;
  events?: FeatureIdentity[];
}

export interface FeatureWebsocketEvent extends FeatureIdentity {
  eventName: string;
  description?: string | null;
  isEnabled: boolean;
}

export interface FeatureStorageConfig extends FeatureIdentity {
  name: string;
  description?: string | null;
  type: string;
  driver?: string | null;
  isEnabled: boolean;
}

export interface FeatureFolder extends FeatureIdentity {
  name: string;
}

export interface FeatureFileDetail extends FileLibraryRecord {
  createdAt?: string;
  location?: string | null;
  url?: string | null;
}

export type FeatureExtensionEditor = Omit<ExtensionDefinition, 'compiledCode'>;
export type FeatureExtensionRuntime = Pick<ExtensionDefinition, 'id' | '_id' | 'type' | 'name' | 'version' | 'isEnabled' | 'updatedAt'> & {
  extensionId: string;
  compiledCode: string | null;
};
export type FeatureRuntimeMenu = Omit<MenuDefinition, 'extension'> & {
  extension?: FeatureExtensionRuntime | null;
};

export interface NpmPackage {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  author: string;
  date: string;
  score: number;
  popularity: number;
  quality: number;
  maintenance: number;
  searchScore: number;
  links: {
    npm: string;
    homepage?: string;
    repository?: string;
  };
}
