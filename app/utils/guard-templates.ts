import type { GuardScope, GuardTemplate } from '~/types/guard-template';

export const guardTemplates: GuardTemplate[] = [
  {
    key: 'ip-burst-limit',
    title: 'IP Burst Limit',
    description: 'Blocks repeated bursts from the same client IP before auth runs.',
    icon: 'lucide:gauge',
    color: 'warning',
    position: 'pre_auth',
    ruleType: 'rate_limit_by_ip',
    config: { maxRequests: 100, perSeconds: 60 },
    recommendedScope: 'route',
  },
  {
    key: 'route-traffic-cap',
    title: 'Route Traffic Cap',
    description: 'Caps total traffic for one route regardless of user or IP.',
    icon: 'lucide:route',
    color: 'primary',
    position: 'pre_auth',
    ruleType: 'rate_limit_by_route',
    config: { maxRequests: 500, perSeconds: 60 },
    recommendedScope: 'route',
  },
  {
    key: 'user-quota',
    title: 'User Quota',
    description: 'Limits authenticated users after JWT and role checks have completed.',
    icon: 'lucide:user-check',
    color: 'info',
    position: 'post_auth',
    ruleType: 'rate_limit_by_user',
    config: { maxRequests: 60, perSeconds: 60 },
    recommendedScope: 'route',
  },
  {
    key: 'allowlist',
    title: 'IP Allowlist',
    description: 'Allows only specific IP addresses or CIDR ranges.',
    icon: 'lucide:shield-check',
    color: 'success',
    position: 'pre_auth',
    ruleType: 'ip_whitelist',
    config: { ips: [''] },
    recommendedScope: 'global',
  },
  {
    key: 'blocklist',
    title: 'IP Blocklist',
    description: 'Blocks known IP addresses or CIDR ranges before auth runs.',
    icon: 'lucide:shield-x',
    color: 'error',
    position: 'pre_auth',
    ruleType: 'ip_blacklist',
    config: { ips: [''] },
    recommendedScope: 'global',
  },
];

export function getGuardTemplate(key: string | null | undefined) {
  return guardTemplates.find((template) => template.key === key) || null;
}

export function getGuardTemplatesForScope(scope: GuardScope) {
  return guardTemplates.filter((template) => !template.allowedScopes || template.allowedScopes.includes(scope));
}

export function buildGuardTemplateName(template: GuardTemplate, scope: GuardScope, routePath?: string | null) {
  if (scope === 'global') return `Global ${template.title}`;
  return routePath ? `${template.title} ${routePath}` : template.title;
}

export function buildGuardBodyFromTemplate(
  template: GuardTemplate,
  options: {
    scope: GuardScope;
    idField: string;
    routeId?: string | null;
    routePath?: string | null;
    methods?: string[];
  },
) {
  const body: Record<string, any> = {
    name: buildGuardTemplateName(template, options.scope, options.routePath),
    description: template.description,
    position: template.position,
    combinator: template.combinator || 'and',
    priority: template.priority ?? 0,
    isEnabled: true,
    isGlobal: options.scope === 'global',
  };

  if (options.scope === 'route' && options.routeId) {
    body.route = { [options.idField]: options.routeId };
  }

  if (options.methods?.length) {
    body.methods = options.methods.map((method) => ({ method }));
  }

  return body;
}

export function buildGuardRuleBodyFromTemplate(
  template: GuardTemplate,
  options: {
    idField: string;
    guardId: string;
  },
) {
  return {
    guard: { [options.idField]: options.guardId },
    type: template.ruleType,
    config: template.config,
    priority: 0,
    isEnabled: true,
    description: template.description,
  };
}
