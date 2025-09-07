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
  "view-details": [item: any];
}>();

function toggle(id: any) {
  if (props.disabled) return;
  emit("toggle", id);
}

function isSelected(id: any) {
  return props.selected.some((sel) => sel.id === id);
}

function viewDetails(item: any) {
  emit("view-details", item);
}

const { checkPermissionCondition } = usePermissions();

function getDisplayLabel(
  item: Record<string, any>,
  tableMeta?: { definition: { fieldType: string; propertyName: string }[] }
): string {
  if (!item || typeof item !== "object") return "";

  const MAX_LABEL_LENGTH = 50;

  // Helper: safely get a non-empty string from any field
  const getValueAsString = (
    obj: Record<string, any>,
    key: string
  ): string | null => {
    const raw: unknown = obj[key as keyof typeof obj];
    if (raw === undefined || raw === null) return null;
    const str = String(raw).trim();
    return str === "" ? null : str;
  };

  // Helper: truncate string to fit within limit
  const truncateString = (str: string, maxLength: number): string => {
    return str.length > maxLength ? `${str.slice(0, maxLength - 1)}…` : str;
  };

  // Get list of relation keys
  const relationKeys = new Set(
    (tableMeta?.definition || [])
      .filter((def) => def.fieldType === "relation")
      .map((def) => def.propertyName)
  );

  // Filter out fields that are not relations
  const nonRelationKeys: string[] = Object.keys(item).filter(
    (key) => !relationKeys.has(key)
  );

  // Prioritize common keys but only in non-relation
  const preferredKeys: string[] = [
    "name",
    "title",
    "propertyName",
    "label",
    "path",
    "method",
    "description",
  ];

  const foundFields: string[] = [];

  // Tìm 2 fields đầu tiên từ preferred keys
  for (const key of preferredKeys) {
    if (!nonRelationKeys.includes(key) || foundFields.length >= 2) continue;
    const str = getValueAsString(item, key);
    if (str) foundFields.push(str);
  }

  // Nếu chưa đủ 2 fields, tìm thêm từ các fields còn lại (bỏ id)
  for (const key of nonRelationKeys) {
    if (key === "id" || foundFields.length >= 2) continue;
    const str = getValueAsString(item, key);
    if (str) foundFields.push(str);
  }

  // Kết hợp 2 fields với giới hạn ký tự
  let result: string;
  if (foundFields.length === 0) {
    const idStr = getValueAsString(item, "id");
    result = idStr ? `ID: ${idStr}` : "";
  } else if (foundFields.length === 1) {
    result = foundFields[0]!;
  } else {
    const firstField = foundFields[0]!;
    const secondField = foundFields[1]!;
    const combined = `${firstField} - ${secondField}`;

    if (combined.length > MAX_LABEL_LENGTH) {
      // Nếu quá dài, ưu tiên field đầu tiên và cắt ngắn field thứ hai
      const separator = " - ";
      const remainingLength =
        MAX_LABEL_LENGTH - firstField.length - separator.length - 1; // -1 for ellipsis

      if (remainingLength > 5) {
        const truncatedSecond = truncateString(secondField, remainingLength);
        result = `${firstField}${separator}${truncatedSecond}`;
      } else {
        // Nếu field đầu quá dài, chỉ dùng field đầu
        result = truncateString(firstField, MAX_LABEL_LENGTH);
      }
    } else {
      result = combined;
    }
  }

  return truncateString(result, MAX_LABEL_LENGTH);
}

function shortenId(id: string | number): string {
  if (id === undefined || id === null) return "";
  const str = String(id);
  // Ngắn hơn nữa: 4 ký tự đầu + … + 3 ký tự cuối
  return str.length > 12 ? `${str.slice(0, 4)}…${str.slice(-3)}` : str;
}
</script>

<template>
  <div class="space-y-1">
    <UButton
      v-for="item in data"
      :key="item.id"
      class="w-full px-4 py-3 lg:hover:bg-muted flex items-center justify-between"
      @click.stop="toggle(item.id)"
      variant="outline"
      :color="isSelected(item.id) ? 'primary' : 'neutral'"
    >
      <div
        class="flex items-center gap-2 min-w-0 flex-1"
        :title="`${shortenId(item.id)} - ${getDisplayLabel(item)}`"
      >
        <UIcon
          v-if="isSelected(item.id)"
          name="lucide:check"
          class="w-4 h-4 flex-shrink-0"
        />
        <span class="truncate"
          >{{ shortenId(item.id) }} - {{ getDisplayLabel(item) }}</span
        >
      </div>
      <div class="flex gap-1 flex-shrink-0">
        <UButton
          icon="lucide:info"
          size="md"
          variant="outline"
          @click.stop="viewDetails(item)"
        />
      </div>
    </UButton>
  </div>
</template>
