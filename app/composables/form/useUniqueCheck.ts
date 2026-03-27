import type { UniqueCheckStatus } from '~/types/ui';

interface UniqueCheckState {
  status: UniqueCheckStatus;
  message: string;
  checkedValue: any;
}

export function useUniqueCheck(
  tableName: string | Ref<string>,
  uniques: Ref<string[][] | null | undefined>,
  currentId?: Ref<string | number | null>
) {
  const checkStates = ref<Record<string, UniqueCheckState>>({});
  const { getIdFieldName } = useDatabase();

  const tableNameRef = isRef(tableName) ? tableName : ref(tableName);
  const currentIdRef = currentId || ref(null);

  function getUniqueGroupsForField(fieldName: string): string[][] {
    if (!uniques.value) return [];
    return uniques.value.filter(group => group.includes(fieldName));
  }

  function isFieldInUnique(fieldName: string): boolean {
    return getUniqueGroupsForField(fieldName).length > 0;
  }

  function getSingleUniqueFields(): string[] {
    if (!uniques.value) return [];
    return uniques.value
      .filter(group => group.length === 1)
      .map(group => group[0])
      .filter((field): field is string => Boolean(field));
  }

  function getCompositeUniqueGroups(): string[][] {
    if (!uniques.value) return [];
    return uniques.value.filter(group => group.length > 1);
  }

  async function checkUnique(
    fieldName: string,
    value: any,
    allFormData?: Record<string, any>
  ): Promise<boolean> {
    if (value === null || value === undefined || value === '') {
      setCheckStatus(fieldName, 'idle', '', value);
      return true;
    }

    const groups = getUniqueGroupsForField(fieldName);

    if (groups.length === 0) {
      setCheckStatus(fieldName, 'valid', '', value);
      return true;
    }

    setCheckStatus(fieldName, 'checking', '', value);

    for (const group of groups) {
      const filter: Record<string, any> = {};

      if (group.length === 1 && group[0]) {
        filter[group[0]] = { _eq: value };
      } else {
        if (!allFormData) {
          setCheckStatus(fieldName, 'incomplete', 'Missing form data for composite unique check', value);
          return false;
        }
        const missingFields: string[] = [];
        for (const field of group) {
          const fieldValue = field === fieldName ? value : allFormData[field];
          if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
            missingFields.push(field);
          }
          filter[field] = { _eq: fieldValue };
        }
        if (missingFields.length > 0) {
          const msg = `Fill all fields first: ${group.join(' + ')}`;
          setCheckStatus(fieldName, 'incomplete', msg, value);
          return false;
        }
      }

      const idFieldName = getIdFieldName();

      const finalFilter: Record<string, any> = {
        _and: [
          filter,
          ...(currentIdRef.value
            ? [{ [idFieldName]: { _neq: currentIdRef.value } }]
            : []),
        ],
      };

      try {
        const response = await $fetch<{ data: any[]; meta?: { total?: number } }>(
          `/api/${tableNameRef.value}`,
          {
            query: {
              filter: finalFilter,
              limit: 1,
              fields: getIdFieldName(),
            },
          }
        );
        const exists = (response?.data?.length ?? 0) > 0;

        if (exists) {
          const groupLabel = group.length === 1
            ? fieldName
            : group.join(' + ');
          setCheckStatus(fieldName, 'invalid', `Value already exists for ${groupLabel}`, value);
          return false;
        }
      } catch (error) {
        console.error('[useUniqueCheck] Error checking uniqueness:', error);
        setCheckStatus(fieldName, 'idle', 'Error checking uniqueness', value);
        return false;
      }
    }

    setCheckStatus(fieldName, 'valid', '', value);
    return true;
  }

  function setCheckStatus(
    fieldName: string,
    status: UniqueCheckStatus,
    message: string,
    checkedValue: any
  ) {
    checkStates.value[fieldName] = {
      status,
      message,
      checkedValue,
    };
  }

  function getCheckStatus(fieldName: string): UniqueCheckState {
    return checkStates.value[fieldName] || {
      status: 'idle' as UniqueCheckStatus,
      message: '',
      checkedValue: null,
    };
  }

  function resetCheck(fieldName: string) {
    delete checkStates.value[fieldName];
  }

  function resetAllChecks() {
    checkStates.value = {};
  }

  function isUniqueCheckRequired(fieldName: string): boolean {
    return isFieldInUnique(fieldName);
  }

  function hasPassedUniqueCheck(fieldName: string, currentValue: any): boolean {
    const state = checkStates.value[fieldName];
    if (!state) return false;
    return state.status === 'valid' && state.checkedValue === currentValue;
  }

  function needsUniqueCheck(fieldName: string, currentValue: any): boolean {
    if (!isFieldInUnique(fieldName)) return false;

    const state = checkStates.value[fieldName];
    if (!state) return true;
    if (state.checkedValue !== currentValue) return true;
    return false;
  }

  return {
    checkStates,
    checkUnique,
    getCheckStatus,
    resetCheck,
    resetAllChecks,
    isFieldInUnique,
    isUniqueCheckRequired,
    hasPassedUniqueCheck,
    needsUniqueCheck,
    getSingleUniqueFields,
    getCompositeUniqueGroups,
    getUniqueGroupsForField,
  };
}
