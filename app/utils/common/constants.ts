export const ACCESS_TOKEN_KEY = "accessToken";
export const EXP_TIME_KEY = "exp_time";
export const REFRESH_TOKEN_KEY = "refreshToken";

export const DEFAULT_ME_FIELDS = [
  "id",
  "email",
  "isRootAdmin",
  "isSystem",
"roles.id",
"roles.name",
"roles.routePermissions.id",
"roles.routePermissions.isEnabled",
"roles.routePermissions.allowedUsers.id",
"roles.routePermissions.methods.id",
"roles.routePermissions.methods.name",
"roles.routePermissions.route.id",
"roles.routePermissions.route.path",
  "allowedRoutePermissions.id",
  "allowedRoutePermissions.isEnabled",
  "allowedRoutePermissions.allowedUsers.id",
  "allowedRoutePermissions.methods.id",
  "allowedRoutePermissions.methods.name",
  "allowedRoutePermissions.route.id",
  "allowedRoutePermissions.route.path",
];
