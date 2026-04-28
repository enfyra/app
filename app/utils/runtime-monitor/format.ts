import type { RuntimeMetricsPayload } from '~/types/runtime-monitor';

export function fmtNumber(value: number, digits = 0) {
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function fmtMs(value: number) {
  return `${fmtNumber(value, value < 10 ? 1 : 0)}ms`;
}

export function fmtSec(value: number) {
  return `${fmtNumber(value / 1000, value < 10_000 ? 1 : 0)}s`;
}

export function fmtMb(value: number) {
  return `${fmtNumber(value, value < 100 ? 1 : 0)}MB`;
}

export function fmtPercent(value: number) {
  return `${fmtNumber(value * 100, 0)}%`;
}

export function fmtDateTime(value: string | Date | null | undefined) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function sampleAgeLabel(metrics: RuntimeMetricsPayload) {
  const sampledAt = Date.parse(metrics.sampledAt);
  if (!Number.isFinite(sampledAt)) return '-';
  const seconds = Math.max(0, Math.round((Date.now() - sampledAt) / 1000));
  return seconds === 0 ? 'now' : `${seconds}s ago`;
}

export function averageWindowLabel(metrics: RuntimeMetricsPayload) {
  const samples = metrics.averages?.samples ?? 0;
  if (!samples) return 'avg warming up';
  const seconds = Math.round((metrics.averages?.onlineMs ?? 0) / 1000);
  if (seconds >= 60) return `avg since boot ${Math.round(seconds / 60)}m`;
  return `avg since boot ${seconds}s`;
}

export function hardwareMemoryLabel(metrics: RuntimeMetricsPayload) {
  const effective = metrics.hardware?.effectiveMemoryMb;
  if (!effective) return '-';
  return fmtMb(effective);
}

export function hardwareCpuLabel(metrics: RuntimeMetricsPayload) {
  const effective = metrics.hardware?.effectiveCpuCount;
  if (!effective) return '-';
  return String(effective);
}

export function hostHardwareLabel(metrics: RuntimeMetricsPayload) {
  const hostMemory = metrics.hardware?.hostMemoryMb;
  const hostCpu = metrics.hardware?.hostCpuCount;
  if (!hostMemory && !hostCpu) return '-';
  const memory = hostMemory ? fmtMb(hostMemory) : '-';
  const cpu = hostCpu ? `${hostCpu} CPU` : '-';
  return `${memory} / ${cpu}`;
}
