import type { CodeVersionConfirmation } from '~/types/code-audit';
import { compareCodeVersions, normalizeCodeVersion, validCodeVersion } from '~/utils/code-version';

const resolvers = new WeakMap<object, (value: string | null) => void>();

export function useCodeVersion() {
  const app = useNuxtApp();
  const open = useState('code-version:open', () => false);
  const input = useState<CodeVersionConfirmation | null>('code-version:input', () => null);
  const version = useState('code-version:draft', () => '');
  const valid = computed(() => validCodeVersion(version.value) && !!input.value && compareCodeVersions(version.value, input.value.currentVersion) > 0);

  function finish(value: string | null) {
    const resolve = resolvers.get(app);
    resolvers.delete(app);
    open.value = false;
    resolve?.(value);
  }

  async function confirm(details: CodeVersionConfirmation, signal?: AbortSignal): Promise<string | null> {
    if (signal?.aborted) return null;
    if (resolvers.has(app)) throw new Error('Finish the current version confirmation before saving another record.');
    input.value = details;
    version.value = details.suggestedVersion;
    open.value = true;
    const abort = () => finish(null);
    signal?.addEventListener('abort', abort, { once: true });
    try {
      return await new Promise<string | null>(resolve => { resolvers.set(app, resolve); });
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  }

  return { open, input, version, valid, confirm, cancel: () => finish(null), accept: () => { if (valid.value) finish(normalizeCodeVersion(version.value)); } };
}
