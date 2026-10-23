export type OAuthProvider = "google" | "facebook" | "github";

export interface User {
  id: string;
  email: string;
  isRootAdmin: boolean;
  isSystem: boolean;
  roles?: Array<{
    id: string;
    name: string;
    routePermissions: RoutePermission[];
  }>;
  allowedRoutePermissions?: RoutePermission[];
}

export interface RoutePermission {
  id: string;
  isEnabled: boolean;
  allowedUsers?: { id: string }[];
  role?: { id?: string; _id?: string } | null;
  routeMethodConfigs: { id?: string; available: boolean; method: string | { id?: string; name?: string } }[];
  route: { id: string; path: string; isEnabled?: boolean };
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
  redirect?: string;
}
