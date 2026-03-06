/**
 * Map table names to their dedicated detail page paths.
 * When a relation points to one of these tables, the "view detail" button
 * will navigate to the settings/custom page instead of /data/{table}/{id}.
 *
 * Add or modify entries here when new settings pages are added.
 */
export const TABLE_DETAIL_PATH_MAP: Record<string, string> = {
  // Settings
  user_definition: "/settings/users",
  role_definition: "/settings/roles",
  route_definition: "/settings/routings",
  extension_definition: "/settings/extensions",
  websocket_definition: "/settings/websockets",
  bootstrap_script_definition: "/settings/bootstrap",
  oauth_config_definition: "/settings/oauth/config",
  oauth_account_definition: "/settings/oauth/accounts",

  // Storage
  storage_config_definition: "/storage/config",
  file_definition: "/storage/management/file",
  folder_definition: "/storage/management/folder",

  // Packages
  package_definition: "/packages",

  // AI
  ai_config_definition: "/ai-agent/config",
  ai_conversation_definition: "/ai-agent/chat",
};

export function getDetailPathForTable(tableName: string, id: string | number): string | null {
  const basePath = TABLE_DETAIL_PATH_MAP[tableName];
  if (!basePath) return null;
  return `${basePath}/${id}`;
}
