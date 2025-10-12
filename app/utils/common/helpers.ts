/**
 * Legacy helpers - use useDatabase() composable instead for better type safety
 * These are kept for backward compatibility in non-Vue contexts
 */

/**
 * Simple helper to get id from both SQL (id) and MongoDB (_id) systems
 * NOTE: For Vue components, prefer using useDatabase().getId() instead
 * @param item - The item to get id from
 * @returns The id as a string, or null if not found
 */
export const getId = (item: any): string | null => {
  const id = item?.id || item?._id;
  return id ? String(id) : null;
};

