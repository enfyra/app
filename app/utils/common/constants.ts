export const ACCESS_TOKEN_KEY = "accessToken";
export const EXP_TIME_KEY = "exp_time";
export const REFRESH_TOKEN_KEY = "refreshToken";

export const ENFYRA_API_PREFIX = "/api";

export const DEFAULT_ME_FIELDS = [
  "id",
  "email",
  "isRootAdmin",
  "isSystem",
  "role.id",
  "role.name",
  "role.routePermissions.id",
  "role.routePermissions.isEnabled",
  "role.routePermissions.allowedUsers",
  "role.routePermissions.methods.id",
  "role.routePermissions.methods.method",
  "role.routePermissions.route.id",
  "role.routePermissions.route.path",
  "allowedRoutePermissions.id",
  "allowedRoutePermissions.isEnabled",
  "allowedRoutePermissions.allowedUsers.id",
  "allowedRoutePermissions.methods.id",
  "allowedRoutePermissions.methods.method",
  "allowedRoutePermissions.route.id",
  "allowedRoutePermissions.route.path",
];

