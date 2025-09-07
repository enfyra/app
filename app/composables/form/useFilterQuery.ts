
export function useFilterQuery() {
  function buildQuery(filter: FilterGroup): Record<string, any> {
    const filterObj = buildFilterObject(filter);
    return filterObj || {};
  }

  function buildFilterObject(group: FilterGroup): Record<string, any> | null {
    if (!group.conditions.length) return null;

    const conditions = group.conditions
      .map((condition) => {
        if ("field" in condition) {
          // It's a FilterCondition
          return buildConditionObject(condition);
        } else {
          // It's a FilterGroup (nested)
          return buildFilterObject(condition);
        }
      })
      .filter(Boolean);

    if (conditions.length === 0) return null;

    if (conditions.length === 1) {
      return conditions[0] as Record<string, any>;
    }

    // Multiple conditions - use _and/_or
    if (group.operator === "or") {
      return { _or: conditions };
    } else {
      return { _and: conditions };
    }
  }

  function buildConditionObject(
    condition: FilterCondition
  ): Record<string, any> | null {
    const { field, operator, value } = condition;

    if (!field || !operator) return null;

    // Handle nested field paths (e.g., "user.profile.name")
    const buildNestedObject = (
      path: string,
      operatorObj: Record<string, any>
    ): Record<string, any> => {
      const parts = path.split(".");
      if (parts.length === 1) {
        return { [parts[0]!]: operatorObj };
      }

      const [first, ...rest] = parts;
      return { [first!]: buildNestedObject(rest.join("."), operatorObj) };
    };

    // Handle _is_null special case
    if (operator === "_is_null") {
      return buildNestedObject(field, { [operator]: true });
    }

    // Handle operators that need values
    if (!value && value !== 0 && value !== false) return null;

    // For _between, value should be an array of 2 elements
    if (operator === "_between") {
      if (!Array.isArray(value) || value.length !== 2) return null;
      return buildNestedObject(field, { [operator]: value });
    }

    // For _in and _not_in, ensure value is an array
    if (["_in", "_not_in"].includes(operator)) {
      const arrayValue = Array.isArray(value) ? value : [value];
      return buildNestedObject(field, { [operator]: arrayValue });
    }

    // Standard operators
    return buildNestedObject(field, { [operator]: value });
  }

  function parseFilterFromUrl(
    searchParams: URLSearchParams
  ): FilterGroup | null {
    const filterParam = searchParams.get("filter");
    if (!filterParam) return null;

    try {
      return JSON.parse(decodeURIComponent(filterParam));
    } catch {
      return null;
    }
  }

  function encodeFilterToUrl(filter: FilterGroup): string {
    if (!filter.conditions.length) return "";
    return encodeURIComponent(JSON.stringify(filter));
  }

  function createEmptyFilter(): FilterGroup {
    return {
      id: Math.random().toString(36).substr(2, 9),
      operator: "and",
      conditions: [],
    };
  }

  function hasActiveFilters(filter: FilterGroup): boolean {
    return filter.conditions.some((condition) => {
      if ("field" in condition) {
        // Only consider active if field, operator AND value are set
        // Special case: _null and _nnull operators don't need values
        if (!condition.field || !condition.operator) return false;
        if (condition.operator === "_null" || condition.operator === "_nnull") return true;
        return condition.value !== null && condition.value !== undefined && condition.value !== "";
      } else {
        return hasActiveFilters(condition);
      }
    });
  }

  function getFilterSummary(
    filter: FilterGroup,
    fields: Array<{ key: string; label: string }>
  ): string {
    if (!hasActiveFilters(filter)) return "No filters";

    const summaries = filter.conditions
      .map((condition) => {
        if ("field" in condition) {
          const field = fields.find((f) => f.key === condition.field);
          const fieldLabel = field?.label || condition.field;

          switch (condition.operator) {
            case "_eq":
              return `${fieldLabel} = ${condition.value}`;
            case "_neq":
              return `${fieldLabel} ≠ ${condition.value}`;
            case "_gt":
              return `${fieldLabel} > ${condition.value}`;
            case "_gte":
              return `${fieldLabel} ≥ ${condition.value}`;
            case "_lt":
              return `${fieldLabel} < ${condition.value}`;
            case "_lte":
              return `${fieldLabel} ≤ ${condition.value}`;
            case "_contains":
              return `${fieldLabel} contains "${condition.value}"`;
            case "_starts_with":
              return `${fieldLabel} starts with "${condition.value}"`;
            case "_ends_with":
              return `${fieldLabel} ends with "${condition.value}"`;
            case "_is_null":
              return `${fieldLabel} is null`;
            case "_in":
              return `${fieldLabel} in [${
                Array.isArray(condition.value)
                  ? condition.value.join(", ")
                  : condition.value
              }]`;
            case "_not_in":
              return `${fieldLabel} not in [${
                Array.isArray(condition.value)
                  ? condition.value.join(", ")
                  : condition.value
              }]`;
            case "_between":
              return `${fieldLabel} between ${condition.value?.[0]} and ${condition.value?.[1]}`;
            default:
              return `${fieldLabel} ${condition.operator} ${condition.value}`;
          }
        } else {
          return getFilterSummary(condition, fields);
        }
      })
      .filter(Boolean);

    if (summaries.length === 0) return "No filters";
    if (summaries.length === 1) return summaries[0]!;

    const connector = filter.operator === "or" ? " OR " : " AND ";
    return `(${summaries.join(connector)})`;
  }

  return {
    buildQuery,
    buildFilterObject,
    buildConditionObject,
    parseFilterFromUrl,
    encodeFilterToUrl,
    createEmptyFilter,
    hasActiveFilters,
    getFilterSummary,
  };
}
