<script setup lang="ts">
const props = defineProps<{
  data: any[];
  selected: any[];
  multiple?: boolean;
  disabled?: boolean;

  deletePermission?: {
    and?: { route: string; actions: string[] }[];
    or?: { route: string; actions: string[] }[];
  };
}>();

const emit = defineEmits<{
  toggle: [id: any];
  "navigate-detail": [item: any];
}>();

const { getId } = useDatabase();
const expandedItems = ref<Set<any>>(new Set());
const itemRefs = ref<Record<string, HTMLElement>>({});
const itemWidths = ref<Record<string, string>>({});

function toggle(id: any) {
  if (props.disabled) return;
  emit("toggle", id);
}

function isSelected(id: any) {
  return props.selected.some((sel) => getId(sel) === id);
}

function isExpanded(id: any) {
  return expandedItems.value.has(id);
}

function toggleExpand(id: any) {
  
  const el = itemRefs.value[id];
  if (el && !expandedItems.value.has(id)) {
    
    itemWidths.value[id] = `${el.offsetWidth}px`;
  }
  
  if (expandedItems.value.has(id)) {
    expandedItems.value.delete(id);
  } else {
    expandedItems.value.add(id);
  }
  
  expandedItems.value = new Set(expandedItems.value);
}

function setItemRef(id: any, el: any) {
  if (el) {
    itemRefs.value[id] = el;
  }
}

function getItemWidth(id: any): string {
  return itemWidths.value[id] || '100%';
}

function navigateToDetail(item: any) {
  emit("navigate-detail", item);
}

const { checkPermissionCondition } = usePermissions();

function getDisplayLabel(
  item: Record<string, any>
): string {
  if (!item || typeof item !== "object") return "";

  const MAX_LABEL_LENGTH = 60;

  const isUUID = (str: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  };

  const isObjectId = (str: string): boolean => {
    return /^[0-9a-f]{24}$/i.test(str);
  };

  const shortenIdentifier = (str: string): string => {
    if (isUUID(str)) {
      
      return str.slice(0, 8) + "…";
    }
    if (isObjectId(str)) {
      
      return str.slice(0, 6) + "…" + str.slice(-4);
    }
    return str;
  };

  const isRelationValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;

    if (typeof value === "object" && !Array.isArray(value)) {
      return getId(value as any) !== undefined;
    }

    if (Array.isArray(value) && value.length > 0) {
      return typeof value[0] === "object" && value[0] !== null;
    }

    return false;
  };

  const getValueAsString = (
    obj: Record<string, any>,
    key: string
  ): string | null => {
    const raw: unknown = obj[key as keyof typeof obj];
    if (raw === undefined || raw === null) return null;

    if (isRelationValue(raw)) return null;

    const str = String(raw).trim();
    return str === "" ? null : str;
  };

  const smartTruncate = (str: string, maxLength: number): string => {
    if (isUUID(str) || isObjectId(str)) {
      return shortenIdentifier(str);
    }
    return str.length > maxLength ? `${str.slice(0, maxLength - 1)}…` : str;
  };

  const nonRelationKeys: string[] = Object.keys(item);

  const preferredKeys: string[] = [
    "name",
    "title",
    "propertyName",
    "label",
    "email",
    "username",
    "displayName",
    "path",
    "method",
    "type",
    "status",
  ];

  interface FieldValue {
    key: string;
    value: string;
    isIdentifier: boolean;
  }

  const allFields: FieldValue[] = [];

  for (const key of nonRelationKeys) {
    if (key === "id" || key === "_id" || key === "createdAt" || key === "updatedAt") continue;
    
    const str = getValueAsString(item, key);
    if (str) {
      const isIdentifier = isUUID(str) || isObjectId(str);
      allFields.push({ key, value: str, isIdentifier });
    }
  }

  allFields.sort((a, b) => {
    const aIsPreferred = preferredKeys.includes(a.key);
    const bIsPreferred = preferredKeys.includes(b.key);
    
    if (aIsPreferred && !bIsPreferred) return -1;
    if (!aIsPreferred && bIsPreferred) return 1;
    
    if (!a.isIdentifier && b.isIdentifier) return -1;
    if (a.isIdentifier && !b.isIdentifier) return 1;
    
    return 0;
  });

  let result: string;

  const nonIdentifierFields = allFields.filter(f => !f.isIdentifier);
  
  if (nonIdentifierFields.length >= 2) {
    
    const first = nonIdentifierFields[0];
    const second = nonIdentifierFields[1];
    if (first && second) {
      result = `${smartTruncate(first.value, 25)} • ${smartTruncate(second.value, 25)}`;
    } else {
      result = first ? smartTruncate(first.value, 30) : "No data";
    }
  } else if (nonIdentifierFields.length === 1) {
    
    const first = nonIdentifierFields[0];
    if (first) {
      const firstValue = smartTruncate(first.value, 30);
      const identifierFields = allFields.filter(f => f.isIdentifier);
      
      if (identifierFields.length > 0 && identifierFields[0]) {
        const second = shortenIdentifier(identifierFields[0].value);
        result = `${firstValue} • ${second}`;
      } else {
        result = firstValue;
      }
    } else {
      result = "No data";
    }
  } else if (allFields.length > 0) {
    
    const shortened = allFields.map(f => shortenIdentifier(f.value)).slice(0, 2);
    result = shortened.join(" • ");
  } else {
    
    const idStr = getValueAsString(item, "id") || getValueAsString(item, "_id");
    result = idStr ? shortenIdentifier(idStr) : "No data";
  }

  if (result.length > MAX_LABEL_LENGTH) {
    result = result.slice(0, MAX_LABEL_LENGTH - 1) + "…";
  }

  return result;
}

function shortenId(id: string | number): string {
  if (id === undefined || id === null) return "";
  const str = String(id);
  
  return str.length > 12 ? `${str.slice(0, 4)}…${str.slice(-3)}` : str;
}

function getExpandedFields(item: any): Array<{ key: string; value: any; type: string }> {
  if (!item || typeof item !== "object") return [];
  
  const fields: Array<{ key: string; value: any; type: string }> = [];
  const excludeKeys = new Set(["id", "_id", "createdAt", "updatedAt"]);
  
  Object.entries(item).forEach(([key, value]) => {
    if (excludeKeys.has(key)) return;
    if (value === null || value === undefined) return;

    if (typeof value === "object" && !Array.isArray(value)) {
      if (getId(value)) return; 
    }

    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
      return;
    }
    
    let type = "text";
    if (typeof value === "boolean") type = "boolean";
    else if (typeof value === "number") type = "number";
    else if (Array.isArray(value)) type = "array";
    
    fields.push({ key, value, type });
  });
  
  return fields;
}

function formatFieldValue(value: any, type: string): string {
  if (value === null || value === undefined) return "—";

  if (type === "boolean") {
    return value ? "Yes" : "No";
  }

  if (type === "array") {
    return Array.isArray(value) ? value.join(", ") : String(value);
  }

  const str = String(value);

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str.slice(0, 8) + "…";
  }

  if (/^[0-9a-f]{24}$/i.test(str)) {
    return str.slice(0, 6) + "…" + str.slice(-4);
  }

  return str;
}

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <div :class="(isMobile || isTablet) ? 'space-y-1.5' : 'space-y-2'">
    <div
      v-for="item in data"
      :key="getId(item)"
      class="border rounded-lg overflow-hidden hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
      :class="isSelected(getId(item)) ? 'border-primary-400' : 'border-gray-200 dark:border-gray-700'"
    >
      
      <div
        :ref="(el) => setItemRef(getId(item), el)"
        class="flex items-center min-w-0"
      >
        
        <button
          @click.stop="toggle(getId(item))"
          :class="(isMobile || isTablet) ? 'flex-1 px-2 py-2 flex items-center gap-1.5 text-left min-w-0' : 'flex-1 px-4 py-3 flex items-center gap-2 text-left min-w-0'"
        >
          <UIcon
            v-if="isSelected(getId(item))"
            name="lucide:check-circle"
            :class="(isMobile || isTablet) ? 'w-4 h-4 flex-shrink-0 text-primary-400' : 'w-5 h-5 flex-shrink-0 text-primary-400'"
          />
          <UIcon
            v-else
            name="lucide:circle"
            :class="(isMobile || isTablet) ? 'w-4 h-4 flex-shrink-0 text-muted-foreground' : 'w-5 h-5 flex-shrink-0 text-muted-foreground'"
          />
          <div class="flex-1 min-w-0 overflow-hidden">
            <div v-if="!isMobile && !isTablet" class="text-xs text-muted-foreground mb-0.5 truncate">
              ID: {{ shortenId(getId(item)) }}
            </div>
            <div :class="(isMobile || isTablet) ? 'text-sm truncate' : 'font-medium truncate'">
              {{ getDisplayLabel(item) }}
            </div>
          </div>
        </button>

        <div :class="(isMobile || isTablet) ? 'flex items-center gap-0.5 px-1 border-l border-gray-200 dark:border-gray-700 flex-shrink-0' : 'flex items-center gap-1 px-2 border-l border-gray-200 dark:border-gray-700 flex-shrink-0'">
          <UButton
            :icon="isExpanded(getId(item)) ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            :size="(isMobile || isTablet) ? 'xs' : 'sm'"
            variant="ghost"
            color="neutral"
            @click.stop="toggleExpand(getId(item))"
            :title="isExpanded(getId(item)) ? 'Hide details' : 'Show details'"
            class="flex-shrink-0"
          />
          <UButton
            icon="lucide:external-link"
            :size="(isMobile || isTablet) ? 'xs' : 'sm'"
            variant="ghost"
            color="neutral"
            @click.stop="navigateToDetail(item)"
            title="Navigate to detail page"
            class="flex-shrink-0"
          />
        </div>
      </div>

      <div
        v-if="isExpanded(getId(item))"
        :class="(isMobile || isTablet) ? 'border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/20 px-2 py-2' : 'border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/20 px-4 py-3'"
      >
        <div :class="(isMobile || isTablet) ? 'grid grid-cols-1 gap-2 text-xs' : 'grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'">
          <div
            v-for="field in getExpandedFields(item)"
            :key="field.key"
            class="min-w-0"
          >
            <div 
              class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 overflow-hidden text-ellipsis whitespace-nowrap"
              :title="field.key"
            >
              {{ field.key }}
            </div>
            <div
              class="font-mono text-foreground overflow-hidden text-ellipsis whitespace-nowrap"
              :class="{
                'text-green-500': field.type === 'boolean' && field.value,
                'text-red-500': field.type === 'boolean' && !field.value,
              }"
              :title="String(field.value)"
            >
              {{ formatFieldValue(field.value, field.type) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

