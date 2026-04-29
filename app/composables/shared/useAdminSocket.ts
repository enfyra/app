import { io, type Socket } from 'socket.io-client';

import { ENFYRA_SOCKET_AUTH_ERROR } from '~/constants/enfyra';
import type { RuntimeMetricsPayload } from '~/types/runtime-monitor';
import { runtimeCacheFlowLabel } from '~/utils/runtime-monitor/cache';

type ReloadPayload = {
  flow: string;
  status: 'pending' | 'done';
  steps?: string[];
  reloadId?: string;
  instanceId?: string;
};

type ActiveReload = {
  key: string;
  flow: string;
  steps: string[];
  startedAt: number;
  instanceId?: string;
};

let socket: Socket | null = null;

export const activeReloads = ref<ActiveReload[]>([]);
export const reloadDoneCountdown = ref(0);
export const runtimeMetricsByInstance = ref<Record<string, RuntimeMetricsPayload>>({});
export const runtimeMetricsUpdatedAt = ref<number | null>(null);

const isReloadingRef = computed(() => activeReloads.value.length > 0);
const showReloadBannerRef = computed(
  () => activeReloads.value.length > 0 || reloadDoneCountdown.value > 0,
);
const reloadLabelsRef = computed(() =>
  activeReloads.value.map((r) => runtimeCacheFlowLabel(r.flow)),
);

export const isReloading = isReloadingRef;
export const showReloadBanner = showReloadBannerRef;
export const reloadLabels = reloadLabelsRef;

let reloadDoneTimer: ReturnType<typeof setTimeout> | null = null;
let countdownInterval: ReturnType<typeof setInterval> | null = null;

function clearReloadTimers() {
  if (reloadDoneTimer) {
    clearTimeout(reloadDoneTimer);
    reloadDoneTimer = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

export function dismissReloadBanner() {
  activeReloads.value = [];
  reloadDoneCountdown.value = 0;
  clearReloadTimers();
}

function startDoneCountdown() {
  clearReloadTimers();
  reloadDoneCountdown.value = 5;
  countdownInterval = setInterval(() => {
    reloadDoneCountdown.value--;
    if (reloadDoneCountdown.value <= 0) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }
  }, 1000);
  reloadDoneTimer = setTimeout(() => {
    reloadDoneCountdown.value = 0;
    reloadDoneTimer = null;
  }, 5000);
}

export function useAdminSocket() {
  const notify = useNotify();
  const schema = useSchema();
  const routes = useRoutes();
  const menuRegistry = useMenuRegistry();

  if (!socket) {
    socket = io('/ws/enfyra-admin', {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30_000,
    });

    const shouldToastConnection = () => {
      if (typeof document === 'undefined') return true;
      if (document.visibilityState !== 'visible') return false;
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
      return true;
    };

    socket.on('connect', () => {
      console.log('Connected to admin socket');
    });

    socket.on('connect_error', (err: Error) => {
      if (err?.message === ENFYRA_SOCKET_AUTH_ERROR) return;
      if (!shouldToastConnection()) return;
      console.error('Connection error:', err);
    });

    socket.on('disconnect', (_reason: string) => {
      if (!shouldToastConnection()) return;
    });

    socket.io.on('reconnect', () => {
      if (!shouldToastConnection()) return;
    });

    socket.io.on('reconnect_failed', () => {
      if (!shouldToastConnection()) return;
    });

    socket.on('$system:reload', async (data: ReloadPayload) => {
      const flow = data?.flow;
      if (!flow) return;
      const key = data.reloadId || `${data.instanceId || 'default'}:${flow}`;

      if (data.status === 'pending') {
        reloadDoneCountdown.value = 0;
        clearReloadTimers();
        if (!activeReloads.value.some((r) => r.key === key)) {
          activeReloads.value = [
            ...activeReloads.value,
            {
              key,
              flow,
              steps: data.steps ?? [flow],
              startedAt: Date.now(),
              instanceId: data.instanceId,
            },
          ];
        }
        return;
      }

      if (data.status === 'done') {
        const entry = activeReloads.value.find((r) => r.key === key);
        const steps = entry?.steps ?? data.steps ?? [flow];

        const needsSchema = steps.includes('metadata') || steps.includes('graphql');
        const needsRoutes = steps.includes('metadata') || steps.includes('route');
        const needsMenus = steps.includes('metadata');

        if (needsSchema) await schema.forceRefreshSchema();
        if (needsRoutes) await routes.loadRoutes();
        if (needsMenus) {
          await menuRegistry.registerDataMenuItems(
            Object.values(schema.schemas.value),
          );
        }

        activeReloads.value = activeReloads.value.filter((r) => r.key !== key);

        if (activeReloads.value.length === 0) {
          startDoneCountdown();
        }
      }
    });

    socket.on('$system:runtime:metrics', (data: RuntimeMetricsPayload) => {
      const id = data?.instance?.id;
      if (!id) return;
      runtimeMetricsByInstance.value = {
        ...runtimeMetricsByInstance.value,
        [id]: data,
      };
      runtimeMetricsUpdatedAt.value = Date.now();
    });

    socket.on('$system:package:installed', (data: any) => {
      notify.success('Package ready', `${data.name}@${data.version} installed successfully`);
    });

    socket.on('$system:package:uninstalled', (data: any) => {
      notify.success('Package removed', `${data.name} has been uninstalled`);
    });

    socket.on('$system:package:failed', (data: any) => {
      notify.error('Package operation failed', data.error || `Failed to ${data.operation} ${data.name}`);
    });
  }

  return {
    adminSocket: socket,
    activeReloads,
    isReloading,
    showReloadBanner,
    runtimeMetricsByInstance,
    runtimeMetricsUpdatedAt,
  };
}
