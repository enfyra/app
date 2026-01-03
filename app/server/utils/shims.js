export const process = {
  env: {},
  cwd: () => '/',
  nextTick: (fn, ...args) => setTimeout(() => fn(...args), 0),
};

export const Buffer = {
  from: (str) => new TextEncoder().encode(str),
  isBuffer: () => false,
};

export const global = globalThis;

export const setImmediate = (fn) => setTimeout(fn, 0);
export const clearImmediate = (id) => clearTimeout(id);
