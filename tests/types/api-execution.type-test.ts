import { useApi } from '../../app/composables/shared/useApi';
import type { ApiExecutionResult } from '../../app/types/api';

type RecordResponse = { data: Array<{ id: number; title: string }> };
type Assert<T extends true> = T;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

export function checkApiResults() {
  const single = useApi<RecordResponse>('/records');
  const batch = useApi<RecordResponse>('/records', { method: 'delete', batch: true });
  const singleResult: Promise<RecordResponse | null> = single.execute({ id: 0 });
  const batchResult: Promise<RecordResponse[] | null> = batch.execute({ ids: [0, 1] });
  const result: Promise<ApiExecutionResult<RecordResponse[]>> = batch.executeWithResult({ ids: [1] });
  // @ts-expect-error Batch results remain arrays, never a single response envelope.
  const invalidBatch: Promise<RecordResponse | null> = batch.execute({ ids: [1] });
  // @ts-expect-error Single requests do not accept batch identifiers.
  single.execute({ ids: [1] });
  // @ts-expect-error Batch execution requires explicit targets.
  batch.execute();
  // @ts-expect-error Batch identifiers and files are mutually exclusive.
  batch.execute({ ids: [1], files: [] });
  // @ts-expect-error Native methods do not accept misspellings.
  useApi('/records', { method: 'pacth' });
  // @ts-expect-error API options cannot invent ignored useFetch behavior.
  useApi('/records', { lazy: true });
  // @ts-expect-error Concurrency must be numeric.
  batch.execute({ ids: [1], concurrent: '4' });
  return { singleResult, batchResult, result, invalidBatch };
}

const dynamic = useApi('/records');
export type DefaultResponseIsNotAny = Assert<Equal<IsAny<typeof dynamic.data.value>, false>>;
export type DefaultResponseIsUnknown = Assert<Equal<typeof dynamic.data.value, unknown>>;
