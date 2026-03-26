import { resolveComponent, markRaw } from 'vue';

export function processHeaderAction(action: HeaderAction): HeaderAction {
  const processed = Object.create(Object.getPrototypeOf(action));

  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(action))) {
    Object.defineProperty(processed, key, descriptor);
  }

  if (!processed.side) {
    processed.side = "right";
  }

  if (processed.component) {
    if (typeof processed.component === 'string') {
      try {
        const resolved = resolveComponent(processed.component as any);
        if (resolved && typeof resolved !== 'string') {
          processed.component = markRaw(resolved);
        }
      } catch (error) {
        console.warn(`Failed to resolve component: ${processed.component}`, error);
      }
    } else {
      processed.component = markRaw(processed.component);
    }
  }

  return processed;
}
