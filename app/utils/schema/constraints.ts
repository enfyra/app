export function getConstraintGroups(value: unknown): string[][] {
  if (typeof value === 'string') {
    try { return getConstraintGroups(JSON.parse(value)) } catch { return [] }
  }
  if (!Array.isArray(value)) return []
  return value.map(group => Array.isArray(group) ? group : group?.value)
    .filter((group): group is string[] => Array.isArray(group) && group.every(field => typeof field === 'string'))
}

export function getRedundantIndexes(table: Record<string, any>): string[][] {
  const uniques = getConstraintGroups(table.uniques)
  return getConstraintGroups(table.indexes).filter(index => index.length > 0 && index.every(Boolean) &&
    uniques.some(unique => unique.length >= index.length && index.every((field, position) => unique[position] === field)))
}

export function isAutomaticIndex(table: Record<string, any>, group: string[]): boolean {
  if (group.length !== 1) return false
  const field = group[0]
  return field === 'createdAt' || field === 'updatedAt' ||
    (table.columns || []).some((column: any) => column.name === field && ['date', 'datetime', 'timestamp'].includes(column.type)) ||
    (table.relations || []).some((relation: any) => relation.propertyName === field && !relation.mappedBy && !relation.mappedById && ['many-to-one', 'one-to-one'].includes(relation.type))
}

export function schemaConstraintsMatch(submitted: Record<string, any>, persisted: Record<string, any>): boolean {
  const keys = (value: unknown) => getConstraintGroups(value).map(group => JSON.stringify(group)).sort()
  const expectedIndexes = getConstraintGroups(submitted.indexes)
  const savedIndexes = getConstraintGroups(persisted.indexes)
  return JSON.stringify(keys(submitted.uniques)) === JSON.stringify(keys(persisted.uniques)) &&
    expectedIndexes.every(group => savedIndexes.some(saved => JSON.stringify(saved) === JSON.stringify(group))) &&
    savedIndexes.every(group => expectedIndexes.some(expected => JSON.stringify(expected) === JSON.stringify(group)) ||
      (isAutomaticIndex(submitted, group) && !getRedundantIndexes({ ...submitted, indexes: [group] }).length))
}
