import type { TableDefinitionField } from '~/types/database';

import { debugApplyFieldPositions } from '~/utils/form/field-order-debug';

function fieldKey(f: TableDefinitionField): string {
  return String(f.name || f.propertyName || '');
}

function compareValues(va: unknown, vb: unknown): number {
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  if (typeof va === 'number' && typeof vb === 'number') return va - vb;
  if (typeof va === 'boolean' && typeof vb === 'boolean') {
    return Number(va) - Number(vb);
  }
  if (typeof va === 'string' && typeof vb === 'string') {
    const na = Number(va);
    const nb = Number(vb);
    if (
      !Number.isNaN(na) &&
      !Number.isNaN(nb) &&
      String(na) === va.trim() &&
      String(nb) === vb.trim()
    ) {
      return na - nb;
    }
    return va.localeCompare(vb);
  }
  return String(va).localeCompare(String(vb));
}

export function sortDefinitionFieldsByKey(
  fields: TableDefinitionField[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'asc',
): TableDefinitionField[] {
  return [...fields].sort((a, b) => {
    const va = (a as unknown as Record<string, unknown>)[sortBy];
    const vb = (b as unknown as Record<string, unknown>)[sortBy];
    const cmp = compareValues(va, vb);
    if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
    return fieldKey(a).localeCompare(fieldKey(b));
  });
}

export function applyFieldPositions(
  fields: TableDefinitionField[],
  positions: Record<string, number>,
): TableDefinitionField[] {
  const n = fields.length;
  const fieldKeys = fields.map(fieldKey);
  if (n === 0) {
    debugApplyFieldPositions({ step: 'skip', reason: 'empty fields', positions });
    return fields;
  }

  const positionKeys = Object.keys(positions);
  const unmatched = positionKeys.filter(
    (k) => !fields.some((f) => fieldKey(f) === k),
  );

  const pinnedKeys = new Set(
    positionKeys.filter((k) => fields.some((f) => fieldKey(f) === k)),
  );
  if (pinnedKeys.size === 0) {
    debugApplyFieldPositions({
      step: 'no-op',
      reason: 'no position key matches any field name',
      positionKeys,
      fieldKeys,
      unmatchedPositionKeys: unmatched,
    });
    return fields;
  }

  const floating = fields.filter((f) => !pinnedKeys.has(fieldKey(f)));
  const slots: (TableDefinitionField | undefined)[] = Array(n).fill(undefined);

  const pinnedList = [...pinnedKeys]
    .map((k) => {
      const field = fields.find((f) => fieldKey(f) === k)!;
      const raw = positions[k]!;
      const idx = Math.min(Math.max(0, Math.floor(Number(raw))), n - 1);
      return { field, idx };
    })
    .sort(
      (a, b) =>
        a.idx - b.idx || fields.indexOf(a.field) - fields.indexOf(b.field),
    );

  function firstEmpty(from = 0): number {
    for (let i = from; i < n; i++) {
      if (!slots[i]) return i;
    }
    for (let i = 0; i < from; i++) {
      if (!slots[i]) return i;
    }
    return -1;
  }

  for (const { field, idx } of pinnedList) {
    let s = idx;
    while (s < n && slots[s]) s++;
    if (s < n) {
      slots[s] = field;
      continue;
    }
    const fallback = firstEmpty();
    if (fallback !== -1) slots[fallback] = field;
  }

  let fi = 0;
  for (let i = 0; i < n; i++) {
    if (slots[i]) continue;
    if (fi < floating.length) {
      slots[i] = floating[fi]!;
      fi++;
    }
  }

  while (fi < floating.length) {
    const empty = firstEmpty();
    if (empty === -1) break;
    slots[empty] = floating[fi]!;
    fi++;
  }

  const out = slots.filter(Boolean) as TableDefinitionField[];
  const seen = new Set(out.map(fieldKey));
  for (const f of fields) {
    const k = fieldKey(f);
    if (!seen.has(k)) {
      out.push(f);
      seen.add(k);
    }
  }
  const result = out.slice(0, n);
  debugApplyFieldPositions({
    step: 'applied',
    pinnedKeys: [...pinnedKeys],
    beforeKeys: fieldKeys,
    afterKeys: result.map(fieldKey),
  });
  return result;
}
