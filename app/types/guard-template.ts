export type GuardPosition = 'pre_auth' | 'post_auth';

export type GuardScope = 'route' | 'global' | 'graphql';

export type GuardTargetType = 'route' | 'graphql';

export type GuardRuleType =
  | 'rate_limit_by_ip'
  | 'rate_limit_by_user'
  | 'rate_limit_by_route'
  | 'rate_limit_by_operation'
  | 'ip_whitelist'
  | 'ip_blacklist';

export interface GuardTemplate {
  key: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  position: GuardPosition;
  ruleType: GuardRuleType;
  config: Record<string, any>;
  priority?: number;
  combinator?: 'and' | 'or';
  allowedScopes?: GuardScope[];
  recommendedScope?: GuardScope;
  targetType?: GuardTargetType;
  gqlOperation?: string | null;
}
