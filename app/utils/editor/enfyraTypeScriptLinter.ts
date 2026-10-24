import { parse, tokenizer } from 'acorn';
import type { Diagnostic } from '@codemirror/lint';

type TypeScriptModule = typeof import('typescript');

interface TransformedCode {
  code: string;
  sourceMap: number[];
}

type ThrowAliasMode = 'http' | 'validation';

interface SourceRange {
  start: number;
  end: number;
}

const macroReplacements = new Map([
  ['@CACHE', '$ctx.$cache'],
  ['@REPOS', '$ctx.$repos'],
  ['@HELPERS', '$ctx.$helpers'],
  ['@STORAGE', '$ctx.$storage'],
  ['@FETCH', '$ctx.$helpers.$fetch'],
  ['@LOGS', '$ctx.$logs'],
  ['@BODY', '$ctx.$body'],
  ['@ENV', '$ctx.$env'],
  ['@DATA', '$ctx.$data'],
  ['@PARAMS', '$ctx.$params'],
  ['@QUERY', '$ctx.$query'],
  ['@USER', '$ctx.$user'],
  ['@REQ', '$ctx.$req'],
  ['@RES', '$ctx.$res'],
  ['@SHARE', '$ctx.$share'],
  ['@API', '$ctx.$api'],
  ['@UPLOADED_FILE', '$ctx.$uploadedFile'],
  ['@PKGS', '$ctx.$pkgs'],
  ['@SOCKET', '$ctx.$socket'],
  ['@TRIGGER', '$ctx.$trigger'],
  ['@TRANSACTION', '$ctx.$transaction'],
  ['@FLOW', '$ctx.$flow'],
  ['@FLOW_PAYLOAD', '$ctx.$flow.$payload'],
  ['@FLOW_LAST', '$ctx.$flow.$last'],
  ['@FLOW_META', '$ctx.$flow.$meta'],
  ['@THROW', '$ctx.$throw'],
  ['@ERROR', '$ctx.$error'],
  ['@STATUS', '$ctx.$statusCode'],
]);

const throwAliasStatus = new Map([
  ['@THROW400', 400],
  ['@THROW401', 401],
  ['@THROW403', 403],
  ['@THROW404', 404],
  ['@THROW409', 409],
  ['@THROW422', 422],
  ['@THROW429', 429],
  ['@THROW500', 500],
  ['@THROW503', 503],
]);

const libSource = `
type PropertyKey = string | number | symbol;
type Record<K extends PropertyKey, T> = { [P in K]: T };
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Omit<T, K extends PropertyKey> = Pick<T, Exclude<keyof T, K>>;
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T & {};
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ConstructorParameters<T extends abstract new (...args: any) => any> = T extends abstract new (...args: infer P) => any ? P : never;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type InstanceType<T extends abstract new (...args: any) => any> = T extends abstract new (...args: any) => infer R ? R : any;
type Awaited<T> = T extends null | undefined ? T : T extends object & { then(onfulfilled: infer F, ...args: infer _): any } ? F extends (value: infer V, ...args: infer _) => any ? Awaited<V> : never : T;
type Uppercase<S extends string> = intrinsic;
type Lowercase<S extends string> = intrinsic;
type Capitalize<S extends string> = intrinsic;
type Uncapitalize<S extends string> = intrinsic;

interface Symbol {
  readonly description?: string;
  toString(): string;
  valueOf(): symbol;
}
interface SymbolConstructor {
  readonly iterator: unique symbol;
  readonly asyncIterator: unique symbol;
  readonly hasInstance: unique symbol;
  readonly isConcatSpreadable: unique symbol;
  readonly match: unique symbol;
  readonly matchAll: unique symbol;
  readonly replace: unique symbol;
  readonly search: unique symbol;
  readonly species: unique symbol;
  readonly split: unique symbol;
  readonly toPrimitive: unique symbol;
  readonly toStringTag: unique symbol;
  readonly unscopables: unique symbol;
  (description?: string | number): symbol;
  for(key: string): symbol;
  keyFor(sym: symbol): string | undefined;
}
declare const Symbol: SymbolConstructor;

interface IteratorYieldResult<TYield> { done?: false; value: TYield; }
interface IteratorReturnResult<TReturn> { done: true; value: TReturn; }
type IteratorResult<T, TReturn = any> = IteratorYieldResult<T> | IteratorReturnResult<TReturn>;
interface Iterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
  return?(value?: TReturn): IteratorResult<T, TReturn>;
  throw?(e?: any): IteratorResult<T, TReturn>;
}
interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
}
interface IterableIterator<T> extends Iterator<T> {
  [Symbol.iterator](): IterableIterator<T>;
}
interface AsyncIterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>>;
  return?(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T, TReturn>>;
  throw?(e?: any): Promise<IteratorResult<T, TReturn>>;
}
interface AsyncIterable<T> {
  [Symbol.asyncIterator](): AsyncIterator<T>;
}
interface AsyncIterableIterator<T> extends AsyncIterator<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}
interface ArrayLike<T> {
  readonly length: number;
  readonly [n: number]: T;
}
interface ConcatArray<T> {
  readonly length: number;
  readonly [n: number]: T;
  join(separator?: string): string;
  slice(start?: number, end?: number): T[];
}
interface ReadonlyArray<T> {
  readonly length: number;
  readonly [n: number]: T;
  at(index: number): T | undefined;
  concat(...items: (T | ConcatArray<T>)[]): T[];
  entries(): IterableIterator<[number, T]>;
  every<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): this is readonly S[];
  every(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
  filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): S[];
  filter(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): T[];
  find<S extends T>(predicate: (value: T, index: number, obj: readonly T[]) => value is S, thisArg?: any): S | undefined;
  find(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): T | undefined;
  findIndex(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): number;
  findLast<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): S | undefined;
  findLast(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): T | undefined;
  findLastIndex(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): number;
  flat<D extends number = 1>(depth?: D): any[];
  flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | ReadonlyArray<U>, thisArg?: This): U[];
  forEach(callbackfn: (value: T, index: number, array: readonly T[]) => void, thisArg?: any): void;
  includes(searchElement: T, fromIndex?: number): boolean;
  indexOf(searchElement: T, fromIndex?: number): number;
  join(separator?: string): string;
  keys(): IterableIterator<number>;
  lastIndexOf(searchElement: T, fromIndex?: number): number;
  map<U>(callbackfn: (value: T, index: number, array: readonly T[]) => U, thisArg?: any): U[];
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T, initialValue: T): T;
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue: U): U;
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T, initialValue: T): T;
  reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue: U): U;
  slice(start?: number, end?: number): T[];
  some(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
  toLocaleString(): string;
  toReversed(): T[];
  toSorted(compareFn?: (a: T, b: T) => number): T[];
  toSpliced(start: number, deleteCount?: number, ...items: T[]): T[];
  toString(): string;
  values(): IterableIterator<T>;
  with(index: number, value: T): T[];
  [Symbol.iterator](): IterableIterator<T>;
}
interface Array<T> {
  length: number;
  [n: number]: T;
  at(index: number): T | undefined;
  concat(...items: (T | ConcatArray<T>)[]): T[];
  copyWithin(target: number, start: number, end?: number): this;
  entries(): IterableIterator<[number, T]>;
  every<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): this is S[];
  every(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
  fill(value: T, start?: number, end?: number): this;
  filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
  filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[];
  find<S extends T>(predicate: (value: T, index: number, obj: T[]) => value is S, thisArg?: any): S | undefined;
  find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
  findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number;
  findLast<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S | undefined;
  findLast(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T | undefined;
  findLastIndex(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): number;
  flat<D extends number = 1>(depth?: D): any[];
  flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | ReadonlyArray<U>, thisArg?: This): U[];
  forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void;
  includes(searchElement: T, fromIndex?: number): boolean;
  indexOf(searchElement: T, fromIndex?: number): number;
  join(separator?: string): string;
  keys(): IterableIterator<number>;
  lastIndexOf(searchElement: T, fromIndex?: number): number;
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];
  pop(): T | undefined;
  push(...items: T[]): number;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
  reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reverse(): T[];
  shift(): T | undefined;
  slice(start?: number, end?: number): T[];
  some(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
  sort(compareFn?: (a: T, b: T) => number): this;
  splice(start: number, deleteCount?: number, ...items: T[]): T[];
  toLocaleString(): string;
  toReversed(): T[];
  toSorted(compareFn?: (a: T, b: T) => number): T[];
  toSpliced(start: number, deleteCount?: number, ...items: T[]): T[];
  toString(): string;
  unshift(...items: T[]): number;
  values(): IterableIterator<T>;
  with(index: number, value: T): T[];
  [Symbol.iterator](): IterableIterator<T>;
}
interface ArrayConstructor {
  new (arrayLength?: number): any[];
  new <T>(arrayLength: number): T[];
  new <T>(...items: T[]): T[];
  (arrayLength?: number): any[];
  <T>(...items: T[]): T[];
  isArray(arg: any): arg is any[];
  from<T>(arrayLike: ArrayLike<T> | Iterable<T>): T[];
  from<T, U = T>(arrayLike: ArrayLike<T> | Iterable<T> | any, mapfn?: (v: T, k: number) => U, thisArg?: any): U[];
  of<T>(...items: T[]): T[];
  readonly prototype: any[];
}
declare const Array: ArrayConstructor;

interface TemplateStringsArray extends ReadonlyArray<string> {
  readonly raw: readonly string[];
}

interface Boolean {
  valueOf(): boolean;
}
interface BooleanConstructor {
  (value?: any): boolean;
  new (value?: any): Boolean;
  readonly prototype: Boolean;
}
declare const Boolean: BooleanConstructor;

interface Date {
  toString(): string;
  toDateString(): string;
  toTimeString(): string;
  toLocaleString(locales?: string | string[], options?: any): string;
  toLocaleDateString(locales?: string | string[], options?: any): string;
  toLocaleTimeString(locales?: string | string[], options?: any): string;
  valueOf(): number;
  getTime(): number;
  getFullYear(): number;
  getUTCFullYear(): number;
  getMonth(): number;
  getUTCMonth(): number;
  getDate(): number;
  getUTCDate(): number;
  getDay(): number;
  getUTCDay(): number;
  getHours(): number;
  getUTCHours(): number;
  getMinutes(): number;
  getUTCMinutes(): number;
  getSeconds(): number;
  getUTCSeconds(): number;
  getMilliseconds(): number;
  getUTCMilliseconds(): number;
  getTimezoneOffset(): number;
  setTime(time: number): number;
  setMilliseconds(ms: number): number;
  setUTCMilliseconds(ms: number): number;
  setSeconds(sec: number, ms?: number): number;
  setUTCSeconds(sec: number, ms?: number): number;
  setMinutes(min: number, sec?: number, ms?: number): number;
  setUTCMinutes(min: number, sec?: number, ms?: number): number;
  setHours(hours: number, min?: number, sec?: number, ms?: number): number;
  setUTCHours(hours: number, min?: number, sec?: number, ms?: number): number;
  setDate(date: number): number;
  setUTCDate(date: number): number;
  setMonth(month: number, date?: number): number;
  setUTCMonth(month: number, date?: number): number;
  setFullYear(year: number, month?: number, date?: number): number;
  setUTCFullYear(year: number, month?: number, date?: number): number;
  toUTCString(): string;
  toISOString(): string;
  toJSON(key?: any): string;
}
interface DateConstructor {
  new (): Date;
  new (value: number | string | Date): Date;
  new (year: number, monthIndex: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
  (value?: any): string;
  readonly prototype: Date;
  now(): number;
  parse(value: string): number;
  UTC(year: number, monthIndex: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): number;
}
declare const Date: DateConstructor;

interface CallableFunction extends Function {}
interface NewableFunction extends Function {}
interface Function {
  apply(this: Function, thisArg: any, argArray?: any): any;
  call(this: Function, thisArg: any, ...argArray: any[]): any;
  bind(this: Function, thisArg: any, ...argArray: any[]): any;
  toString(): string;
  readonly length: number;
  readonly name: string;
  prototype: any;
}
interface FunctionConstructor {
  new (...args: string[]): Function;
  (...args: string[]): Function;
  readonly prototype: Function;
}
declare const Function: FunctionConstructor;
interface IArguments {
  [index: number]: any;
  length: number;
  callee: Function;
  [Symbol.iterator](): IterableIterator<any>;
}

interface Math {
  readonly E: number;
  readonly LN10: number;
  readonly LN2: number;
  readonly LOG10E: number;
  readonly LOG2E: number;
  readonly PI: number;
  readonly SQRT1_2: number;
  readonly SQRT2: number;
  abs(x: number): number;
  acos(x: number): number;
  acosh(x: number): number;
  asin(x: number): number;
  asinh(x: number): number;
  atan(x: number): number;
  atanh(x: number): number;
  atan2(y: number, x: number): number;
  cbrt(x: number): number;
  ceil(x: number): number;
  clz32(x: number): number;
  cos(x: number): number;
  cosh(x: number): number;
  exp(x: number): number;
  expm1(x: number): number;
  floor(x: number): number;
  fround(x: number): number;
  hypot(...values: number[]): number;
  imul(x: number, y: number): number;
  log(x: number): number;
  log1p(x: number): number;
  log10(x: number): number;
  log2(x: number): number;
  max(...values: number[]): number;
  min(...values: number[]): number;
  pow(x: number, y: number): number;
  random(): number;
  round(x: number): number;
  sign(x: number): number;
  sin(x: number): number;
  sinh(x: number): number;
  sqrt(x: number): number;
  tan(x: number): number;
  tanh(x: number): number;
  trunc(x: number): number;
}
declare const Math: Math;

interface Number {
  toString(radix?: number): string;
  toFixed(fractionDigits?: number): string;
  toExponential(fractionDigits?: number): string;
  toPrecision(precision?: number): string;
  toLocaleString(locales?: string | string[], options?: any): string;
  valueOf(): number;
}
interface NumberConstructor {
  (value?: any): number;
  new (value?: any): Number;
  readonly prototype: Number;
  readonly EPSILON: number;
  readonly MAX_SAFE_INTEGER: number;
  readonly MAX_VALUE: number;
  readonly MIN_SAFE_INTEGER: number;
  readonly MIN_VALUE: number;
  readonly NaN: number;
  readonly NEGATIVE_INFINITY: number;
  readonly POSITIVE_INFINITY: number;
  isFinite(number: unknown): boolean;
  isInteger(number: unknown): boolean;
  isNaN(number: unknown): boolean;
  isSafeInteger(number: unknown): boolean;
  parseFloat(string: string): number;
  parseInt(string: string, radix?: number): number;
}
declare const Number: NumberConstructor;

interface BigInt {
  toString(radix?: number): string;
  toLocaleString(locales?: string | string[], options?: any): string;
  valueOf(): bigint;
}
interface BigIntConstructor {
  (value: bigint | boolean | number | string): bigint;
  readonly prototype: BigInt;
  asIntN(bits: number, int: bigint): bigint;
  asUintN(bits: number, int: bigint): bigint;
}
declare const BigInt: BigIntConstructor;

interface Object {
  constructor: Function;
  hasOwnProperty(v: PropertyKey): boolean;
  isPrototypeOf(v: Object): boolean;
  propertyIsEnumerable(v: PropertyKey): boolean;
  toLocaleString(): string;
  toString(): string;
  valueOf(): Object;
}
interface ObjectConstructor {
  (value?: any): any;
  new (value?: any): Object;
  readonly prototype: Object;
  assign<T extends object, U>(target: T, source: U): T & U;
  assign<T extends object, U, V>(target: T, source1: U, source2: V): T & U & V;
  assign(target: object, ...sources: any[]): any;
  create(o: object | null, properties?: any): any;
  defineProperty<T>(o: T, p: PropertyKey, attributes: any): T;
  defineProperties<T>(o: T, properties: any): T;
  entries<T = any>(o: { [s: string]: T } | ArrayLike<T> | any): [string, T][];
  freeze<T>(o: T): Readonly<T>;
  fromEntries<T = any>(entries: Iterable<readonly [PropertyKey, T]> | Iterable<readonly any[]> | any): Record<string, T> & any;
  getOwnPropertyDescriptor(o: any, p: PropertyKey): any;
  getOwnPropertyDescriptors<T>(o: T): any;
  getOwnPropertyNames(o: any): string[];
  getOwnPropertySymbols(o: any): symbol[];
  getPrototypeOf(o: any): any;
  groupBy<T, K extends PropertyKey>(items: Iterable<T>, keySelector: (item: T, index: number) => K): Partial<Record<K, T[]>>;
  hasOwn(o: object, v: PropertyKey): boolean;
  is(value1: any, value2: any): boolean;
  isExtensible(o: any): boolean;
  isFrozen(o: any): boolean;
  isSealed(o: any): boolean;
  keys(o: any): string[];
  preventExtensions<T>(o: T): T;
  seal<T>(o: T): T;
  setPrototypeOf(o: any, proto: object | null): any;
  values<T = any>(o: { [s: string]: T } | ArrayLike<T> | any): T[];
}
declare const Object: ObjectConstructor;

interface RegExpMatchArray extends Array<string> {
  index?: number;
  input?: string;
  groups?: Record<string, string>;
}
interface RegExpExecArray extends Array<string> {
  index: number;
  input: string;
  groups?: Record<string, string>;
}
interface RegExp {
  exec(string: string): RegExpExecArray | null;
  test(string: string): boolean;
  readonly source: string;
  readonly global: boolean;
  readonly ignoreCase: boolean;
  readonly multiline: boolean;
  readonly dotAll: boolean;
  readonly sticky: boolean;
  readonly unicode: boolean;
  readonly flags: string;
  lastIndex: number;
}
interface RegExpConstructor {
  new (pattern: RegExp | string, flags?: string): RegExp;
  (pattern: RegExp | string, flags?: string): RegExp;
  readonly prototype: RegExp;
}
declare const RegExp: RegExpConstructor;

interface String {
  readonly length: number;
  [index: number]: string;
  [Symbol.iterator](): IterableIterator<string>;
  at(index: number): string | undefined;
  charAt(pos: number): string;
  charCodeAt(index: number): number;
  codePointAt(pos: number): number | undefined;
  concat(...strings: string[]): string;
  endsWith(searchString: string, endPosition?: number): boolean;
  includes(searchString: string, position?: number): boolean;
  indexOf(searchString: string, position?: number): number;
  lastIndexOf(searchString: string, position?: number): number;
  localeCompare(that: string, locales?: string | string[], options?: any): number;
  match(regexp: string | RegExp): RegExpMatchArray | null;
  matchAll(regexp: RegExp): IterableIterator<RegExpExecArray>;
  normalize(form?: string): string;
  padEnd(maxLength: number, fillString?: string): string;
  padStart(maxLength: number, fillString?: string): string;
  repeat(count: number): string;
  replace(searchValue: string | RegExp, replaceValue: string): string;
  replace(searchValue: string | RegExp, replacer: (substring: string, ...args: any[]) => string): string;
  replaceAll(searchValue: string | RegExp, replaceValue: string): string;
  replaceAll(searchValue: string | RegExp, replacer: (substring: string, ...args: any[]) => string): string;
  search(regexp: string | RegExp): number;
  slice(start?: number, end?: number): string;
  split(separator?: string | RegExp, limit?: number): string[];
  startsWith(searchString: string, position?: number): boolean;
  substring(start: number, end?: number): string;
  substr(from: number, length?: number): string;
  toLocaleLowerCase(locales?: string | string[]): string;
  toLocaleUpperCase(locales?: string | string[]): string;
  toLowerCase(): string;
  toUpperCase(): string;
  toString(): string;
  trim(): string;
  trimEnd(): string;
  trimLeft(): string;
  trimRight(): string;
  trimStart(): string;
  valueOf(): string;
}
interface StringConstructor {
  (value?: any): string;
  new (value?: any): String;
  readonly prototype: String;
  fromCharCode(...codes: number[]): string;
  fromCodePoint(...codePoints: number[]): string;
  raw(template: TemplateStringsArray, ...substitutions: any[]): string;
}
declare const String: StringConstructor;

interface JSON {
  parse(text: string, reviver?: (this: any, key: string, value: any) => any): any;
  stringify(value: any, replacer?: ((this: any, key: string, value: any) => any) | (number | string)[] | null, space?: string | number): string;
}
declare const JSON: JSON;

interface Error {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
}
interface ErrorConstructor {
  new (message?: string, options?: { cause?: unknown }): Error;
  (message?: string, options?: { cause?: unknown }): Error;
  readonly prototype: Error;
  captureStackTrace?(targetObject: object, constructorOpt?: Function): void;
}
declare const Error: ErrorConstructor;
interface EvalError extends Error {}
declare const EvalError: ErrorConstructor;
interface RangeError extends Error {}
declare const RangeError: ErrorConstructor;
interface ReferenceError extends Error {}
declare const ReferenceError: ErrorConstructor;
interface SyntaxError extends Error {}
declare const SyntaxError: ErrorConstructor;
interface TypeError extends Error {}
declare const TypeError: ErrorConstructor;
interface URIError extends Error {}
declare const URIError: ErrorConstructor;
interface AggregateError extends Error {
  errors: any[];
}
interface AggregateErrorConstructor {
  new (errors: Iterable<any>, message?: string, options?: { cause?: unknown }): AggregateError;
  (errors: Iterable<any>, message?: string, options?: { cause?: unknown }): AggregateError;
  readonly prototype: AggregateError;
}
declare const AggregateError: AggregateErrorConstructor;
interface DOMException extends Error {
  readonly code: number;
}
declare const DOMException: {
  new (message?: string, name?: string): DOMException;
  readonly prototype: DOMException;
};

declare const NaN: number;
declare const Infinity: number;
declare function parseInt(string: string, radix?: number): number;
declare function parseFloat(string: string | number): number;
declare function isNaN(number: unknown): boolean;
declare function isFinite(number: unknown): boolean;
declare function encodeURI(uri: string): string;
declare function encodeURIComponent(uriComponent: string | number | boolean): string;
declare function decodeURI(encodedURI: string): string;
declare function decodeURIComponent(encodedURIComponent: string): string;
declare function structuredClone<T = any>(value: T, options?: any): T;
declare function queueMicrotask(callback: () => void): void;
declare function atob(data: string): string;
declare function btoa(data: string): string;

interface PromiseLike<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}
interface Promise<T> extends PromiseLike<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | TResult>;
  finally(onfinally?: (() => void) | null): Promise<T>;
}
interface PromiseFulfilledResult<T> {
  status: 'fulfilled';
  value: T;
}
interface PromiseRejectedResult {
  status: 'rejected';
  reason: any;
}
type PromiseSettledResult<T> = PromiseFulfilledResult<T> | PromiseRejectedResult;
interface PromiseConstructor {
  new <T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
  resolve(): Promise<void>;
  resolve<T>(value: T | PromiseLike<T>): Promise<Awaited<T>>;
  reject<T = never>(reason?: any): Promise<T>;
  all<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>;
  all<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>[]>;
  race<T extends readonly unknown[] | []>(values: T): Promise<Awaited<T[number]>>;
  race<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>>;
  allSettled<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>> }>;
  allSettled<T>(values: Iterable<T | PromiseLike<T>>): Promise<PromiseSettledResult<Awaited<T>>[]>;
  any<T extends readonly unknown[] | []>(values: T): Promise<Awaited<T[number]>>;
  any<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>>;
  withResolvers<T = any>(): {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
  };
}
declare const Promise: PromiseConstructor;

interface Set<T> {
  readonly size: number;
  add(value: T): this;
  clear(): void;
  delete(value: T): boolean;
  entries(): IterableIterator<[T, T]>;
  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void;
  has(value: T): boolean;
  keys(): IterableIterator<T>;
  values(): IterableIterator<T>;
  [Symbol.iterator](): IterableIterator<T>;
}
interface SetConstructor {
  new <T = any>(values?: readonly T[] | Iterable<T> | null): Set<T>;
  readonly prototype: Set<any>;
}
declare const Set: SetConstructor;

interface Map<K, V> {
  readonly size: number;
  clear(): void;
  delete(key: K): boolean;
  entries(): IterableIterator<[K, V]>;
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  keys(): IterableIterator<K>;
  set(key: K, value: V): this;
  values(): IterableIterator<V>;
  [Symbol.iterator](): IterableIterator<[K, V]>;
}
interface MapConstructor {
  new <K = any, V = any>(entries?: readonly (readonly [K, V])[] | Iterable<readonly [K, V]> | null): Map<K, V>;
  readonly prototype: Map<any, any>;
  groupBy<K, T>(items: Iterable<T>, keySelector: (item: T, index: number) => K): Map<K, T[]>;
}
declare const Map: MapConstructor;

interface WeakMap<K extends object = object, V = any> {
  delete(key: K): boolean;
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): this;
}
interface WeakMapConstructor {
  new <K extends object = object, V = any>(entries?: readonly [K, V][] | null): WeakMap<K, V>;
}
declare const WeakMap: WeakMapConstructor;

interface WeakSet<T extends object = object> {
  add(value: T): this;
  delete(value: T): boolean;
  has(value: T): boolean;
}
interface WeakSetConstructor {
  new <T extends object = object>(values?: readonly T[] | null): WeakSet<T>;
}
declare const WeakSet: WeakSetConstructor;

declare namespace Intl {
  type DateTimeFormatOptions = Record<string, any>;
  type NumberFormatOptions = Record<string, any>;
  interface DateTimeFormatPart {
    type: string;
    value: string;
    [key: string]: any;
  }
  interface NumberFormatPart {
    type: string;
    value: string;
    [key: string]: any;
  }
  interface DateTimeFormat {
    format(date?: Date | number): string;
    formatToParts(date?: Date | number): DateTimeFormatPart[];
    formatRange?(startDate: Date | number, endDate: Date | number): string;
    resolvedOptions(): Record<string, any>;
  }
  interface DateTimeFormatConstructor {
    new (locales?: string | string[], options?: DateTimeFormatOptions): DateTimeFormat;
    (locales?: string | string[], options?: DateTimeFormatOptions): DateTimeFormat;
    supportedLocalesOf(locales: string | string[], options?: DateTimeFormatOptions): string[];
  }
  interface NumberFormat {
    format(value: number | bigint): string;
    formatToParts(number?: number | bigint): NumberFormatPart[];
    resolvedOptions(): Record<string, any>;
  }
  interface NumberFormatConstructor {
    new (locales?: string | string[], options?: NumberFormatOptions): NumberFormat;
    (locales?: string | string[], options?: NumberFormatOptions): NumberFormat;
    supportedLocalesOf(locales: string | string[], options?: NumberFormatOptions): string[];
  }
  interface RelativeTimeFormat {
    format(value: number, unit: string): string;
    formatToParts(value: number, unit: string): Array<{ type: string; value: string; unit?: string }>;
    resolvedOptions(): Record<string, any>;
  }
  interface RelativeTimeFormatConstructor {
    new (locales?: string | string[], options?: Record<string, any>): RelativeTimeFormat;
  }
  interface Collator {
    compare(x: string, y: string): number;
    resolvedOptions(): Record<string, any>;
  }
  interface CollatorConstructor {
    new (locales?: string | string[], options?: Record<string, any>): Collator;
    (locales?: string | string[], options?: Record<string, any>): Collator;
  }
  interface PluralRules {
    select(n: number): string;
    resolvedOptions(): Record<string, any>;
  }
  interface PluralRulesConstructor {
    new (locales?: string | string[], options?: Record<string, any>): PluralRules;
  }
  interface ListFormat {
    format(list: Iterable<string>): string;
    formatToParts(list: Iterable<string>): Array<{ type: string; value: string }>;
  }
  interface ListFormatConstructor {
    new (locales?: string | string[], options?: Record<string, any>): ListFormat;
  }
  const DateTimeFormat: DateTimeFormatConstructor;
  const NumberFormat: NumberFormatConstructor;
  const RelativeTimeFormat: RelativeTimeFormatConstructor;
  const Collator: CollatorConstructor;
  const PluralRules: PluralRulesConstructor;
  const ListFormat: ListFormatConstructor;
}

interface ArrayBuffer {
  readonly byteLength: number;
  slice(begin: number, end?: number): ArrayBuffer;
}
interface ArrayBufferConstructor {
  new (byteLength: number): ArrayBuffer;
  isView(arg: any): arg is ArrayBufferView;
}
declare const ArrayBuffer: ArrayBufferConstructor;
interface ArrayBufferView {
  buffer: ArrayBuffer;
  byteLength: number;
  byteOffset: number;
}
interface DataView extends ArrayBufferView {
  getFloat32(byteOffset: number, littleEndian?: boolean): number;
  getFloat64(byteOffset: number, littleEndian?: boolean): number;
  getInt8(byteOffset: number): number;
  getInt16(byteOffset: number, littleEndian?: boolean): number;
  getInt32(byteOffset: number, littleEndian?: boolean): number;
  getUint8(byteOffset: number): number;
  getUint16(byteOffset: number, littleEndian?: boolean): number;
  getUint32(byteOffset: number, littleEndian?: boolean): number;
  setFloat32(byteOffset: number, value: number, littleEndian?: boolean): void;
  setFloat64(byteOffset: number, value: number, littleEndian?: boolean): void;
  setInt8(byteOffset: number, value: number): void;
  setInt16(byteOffset: number, value: number, littleEndian?: boolean): void;
  setInt32(byteOffset: number, value: number, littleEndian?: boolean): void;
  setUint8(byteOffset: number, value: number): void;
  setUint16(byteOffset: number, value: number, littleEndian?: boolean): void;
  setUint32(byteOffset: number, value: number, littleEndian?: boolean): void;
}
declare const DataView: {
  new (buffer: ArrayBuffer, byteOffset?: number, byteLength?: number): DataView;
};
interface TypedArrayInstance<TSelf> extends ArrayBufferView {
  readonly BYTES_PER_ELEMENT: number;
  readonly length: number;
  [index: number]: number;
  [Symbol.iterator](): IterableIterator<number>;
  at(index: number): number | undefined;
  copyWithin(target: number, start: number, end?: number): this;
  entries(): IterableIterator<[number, number]>;
  every(predicate: (value: number, index: number, array: this) => unknown, thisArg?: any): boolean;
  fill(value: number, start?: number, end?: number): this;
  filter(predicate: (value: number, index: number, array: this) => any, thisArg?: any): TSelf;
  find(predicate: (value: number, index: number, obj: this) => boolean, thisArg?: any): number | undefined;
  findIndex(predicate: (value: number, index: number, obj: this) => boolean, thisArg?: any): number;
  forEach(callbackfn: (value: number, index: number, array: this) => void, thisArg?: any): void;
  includes(searchElement: number, fromIndex?: number): boolean;
  indexOf(searchElement: number, fromIndex?: number): number;
  join(separator?: string): string;
  keys(): IterableIterator<number>;
  lastIndexOf(searchElement: number, fromIndex?: number): number;
  map(callbackfn: (value: number, index: number, array: this) => number, thisArg?: any): TSelf;
  reduce(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: this) => number, initialValue?: number): number;
  reduce<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: this) => U, initialValue: U): U;
  reverse(): this;
  set(array: ArrayLike<number>, offset?: number): void;
  slice(start?: number, end?: number): TSelf;
  some(predicate: (value: number, index: number, array: this) => unknown, thisArg?: any): boolean;
  sort(compareFn?: (a: number, b: number) => number): this;
  subarray(begin?: number, end?: number): TSelf;
  values(): IterableIterator<number>;
}
interface TypedArrayConstructor<TInstance> {
  readonly BYTES_PER_ELEMENT: number;
  new (length?: number): TInstance;
  new (array: ArrayLike<number> | Iterable<number> | ArrayBuffer, byteOffset?: number, length?: number): TInstance;
  from(arrayLike: ArrayLike<number> | Iterable<number>, mapfn?: (v: number, k: number) => number, thisArg?: any): TInstance;
  of(...items: number[]): TInstance;
}
interface Uint8Array extends TypedArrayInstance<Uint8Array> {}
declare const Uint8Array: TypedArrayConstructor<Uint8Array>;
interface Uint8ClampedArray extends TypedArrayInstance<Uint8ClampedArray> {}
declare const Uint8ClampedArray: TypedArrayConstructor<Uint8ClampedArray>;
interface Int8Array extends TypedArrayInstance<Int8Array> {}
declare const Int8Array: TypedArrayConstructor<Int8Array>;
interface Uint16Array extends TypedArrayInstance<Uint16Array> {}
declare const Uint16Array: TypedArrayConstructor<Uint16Array>;
interface Int16Array extends TypedArrayInstance<Int16Array> {}
declare const Int16Array: TypedArrayConstructor<Int16Array>;
interface Uint32Array extends TypedArrayInstance<Uint32Array> {}
declare const Uint32Array: TypedArrayConstructor<Uint32Array>;
interface Int32Array extends TypedArrayInstance<Int32Array> {}
declare const Int32Array: TypedArrayConstructor<Int32Array>;
interface Float32Array extends TypedArrayInstance<Float32Array> {}
declare const Float32Array: TypedArrayConstructor<Float32Array>;
interface Float64Array extends TypedArrayInstance<Float64Array> {}
declare const Float64Array: TypedArrayConstructor<Float64Array>;

interface Buffer extends Uint8Array {
  toString(encoding?: string, start?: number, end?: number): string;
  write(string: string, offset?: number, length?: number, encoding?: string): number;
  toJSON(): { type: 'Buffer'; data: number[] };
  equals(otherBuffer: Uint8Array): boolean;
  compare(otherBuffer: Uint8Array): number;
  copy(targetBuffer: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
  slice(begin?: number, end?: number): Buffer;
  subarray(begin?: number, end?: number): Buffer;
}
declare const Buffer: {
  from(data: any, encodingOrOffset?: any, length?: number): Buffer;
  alloc(size: number, fill?: any, encoding?: string): Buffer;
  allocUnsafe(size: number): Buffer;
  isBuffer(obj: any): obj is Buffer;
  byteLength(string: string | Uint8Array | ArrayBuffer, encoding?: string): number;
  concat(list: readonly Uint8Array[], totalLength?: number): Buffer;
};

interface TextEncoder {
  readonly encoding: string;
  encode(input?: string): Uint8Array;
  encodeInto(source: string, destination: Uint8Array): { read: number; written: number };
}
declare const TextEncoder: { new (): TextEncoder };
interface TextDecoder {
  readonly encoding: string;
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;
  decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string;
}
declare const TextDecoder: { new (label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }): TextDecoder };

interface URLSearchParams {
  append(name: string, value: string): void;
  delete(name: string, value?: string): void;
  entries(): IterableIterator<[string, string]>;
  forEach(callbackfn: (value: string, key: string, parent: URLSearchParams) => void, thisArg?: any): void;
  get(name: string): string | null;
  getAll(name: string): string[];
  has(name: string, value?: string): boolean;
  keys(): IterableIterator<string>;
  set(name: string, value: string): void;
  sort(): void;
  toString(): string;
  values(): IterableIterator<string>;
  readonly size: number;
  [Symbol.iterator](): IterableIterator<[string, string]>;
}
declare const URLSearchParams: {
  new (init?: string[][] | Record<string, string> | string | URLSearchParams): URLSearchParams;
};
interface URL {
  hash: string;
  host: string;
  hostname: string;
  href: string;
  readonly origin: string;
  password: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  readonly searchParams: URLSearchParams;
  username: string;
  toString(): string;
  toJSON(): string;
}
declare const URL: {
  new (url: string | URL, base?: string | URL): URL;
  canParse?(url: string | URL, base?: string | URL): boolean;
  createObjectURL(obj: any): string;
  revokeObjectURL(url: string): void;
};

interface Blob {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  bytes?(): Promise<Uint8Array>;
  slice(start?: number, end?: number, contentType?: string): Blob;
  stream(): ReadableStream<Uint8Array>;
  text(): Promise<string>;
}
declare const Blob: {
  new (blobParts?: any[], options?: { type?: string; endings?: 'transparent' | 'native' }): Blob;
};
interface File extends Blob {
  readonly lastModified: number;
  readonly name: string;
  readonly webkitRelativePath: string;
}
declare const File: {
  new (fileBits: any[], fileName: string, options?: { type?: string; lastModified?: number }): File;
};
interface FileList {
  readonly length: number;
  item(index: number): File | null;
  [index: number]: File;
  [Symbol.iterator](): IterableIterator<File>;
}
interface FileReader extends EventTarget {
  readonly error: DOMException | null;
  readonly readyState: number;
  readonly result: string | ArrayBuffer | null;
  onload: ((this: FileReader, ev: any) => any) | null;
  onerror: ((this: FileReader, ev: any) => any) | null;
  onabort: ((this: FileReader, ev: any) => any) | null;
  onloadend: ((this: FileReader, ev: any) => any) | null;
  abort(): void;
  readAsArrayBuffer(blob: Blob): void;
  readAsDataURL(blob: Blob): void;
  readAsText(blob: Blob, encoding?: string): void;
}
declare const FileReader: { new (): FileReader };

interface FormData {
  append(name: string, value: string | Blob, fileName?: string): void;
  delete(name: string): void;
  get(name: string): File | string | null;
  getAll(name: string): Array<File | string>;
  has(name: string): boolean;
  set(name: string, value: string | Blob, fileName?: string): void;
  entries(): IterableIterator<[string, File | string]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<File | string>;
  forEach(callbackfn: (value: File | string, key: string, parent: FormData) => void, thisArg?: any): void;
  [Symbol.iterator](): IterableIterator<[string, File | string]>;
}
declare const FormData: { new (form?: any): FormData };

interface Headers {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  getSetCookie?(): string[];
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void;
  entries(): IterableIterator<[string, string]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  [Symbol.iterator](): IterableIterator<[string, string]>;
}
declare const Headers: { new (init?: any): Headers };

interface AbortSignal extends EventTarget {
  readonly aborted: boolean;
  readonly reason: any;
  onabort: ((this: AbortSignal, ev: Event) => any) | null;
  throwIfAborted(): void;
}
declare const AbortSignal: {
  abort(reason?: any): AbortSignal;
  timeout(milliseconds: number): AbortSignal;
  any?(signals: AbortSignal[]): AbortSignal;
};
interface AbortController {
  readonly signal: AbortSignal;
  abort(reason?: any): void;
}
declare const AbortController: { new (): AbortController };

interface ReadableStreamDefaultReader<R = any> {
  readonly closed: Promise<undefined>;
  cancel(reason?: any): Promise<void>;
  read(): Promise<{ done: boolean; value: R }>;
  releaseLock(): void;
}
interface ReadableStream<R = any> extends AsyncIterable<R> {
  readonly locked: boolean;
  cancel(reason?: any): Promise<void>;
  getReader(): ReadableStreamDefaultReader<R>;
  pipeThrough<T>(transform: { writable: any; readable: ReadableStream<T> }, options?: any): ReadableStream<T>;
  pipeTo(destination: any, options?: any): Promise<void>;
  tee(): [ReadableStream<R>, ReadableStream<R>];
}
declare const ReadableStream: { new <R = any>(underlyingSource?: any, strategy?: any): ReadableStream<R> };

interface Request {
  readonly cache: string;
  readonly credentials: string;
  readonly headers: Headers;
  readonly method: string;
  readonly mode: string;
  readonly redirect: string;
  readonly referrer: string;
  readonly signal: AbortSignal;
  readonly url: string;
  readonly body: ReadableStream<Uint8Array> | null;
  readonly bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  json(): Promise<any>;
  text(): Promise<string>;
  clone(): Request;
}
declare const Request: { new (input: string | URL | Request, init?: Record<string, any>): Request };

interface Response {
  readonly headers: Headers;
  readonly ok: boolean;
  readonly redirected: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly type: string;
  readonly url: string;
  readonly body: ReadableStream<Uint8Array> | null;
  readonly bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  json(): Promise<any>;
  text(): Promise<string>;
  clone(): Response;
}
declare const Response: {
  new (body?: any, init?: { status?: number; statusText?: string; headers?: any }): Response;
  json(data: any, init?: { status?: number; statusText?: string; headers?: any }): Response;
  redirect(url: string | URL, status?: number): Response;
  error(): Response;
};

interface Event {
  readonly bubbles: boolean;
  readonly cancelable: boolean;
  readonly currentTarget: EventTarget | null;
  readonly defaultPrevented: boolean;
  readonly eventPhase: number;
  readonly isTrusted: boolean;
  readonly target: any;
  readonly timeStamp: number;
  readonly type: string;
  preventDefault(): void;
  stopImmediatePropagation(): void;
  stopPropagation(): void;
  composedPath(): EventTarget[];
}
declare const Event: { new (type: string, eventInitDict?: { bubbles?: boolean; cancelable?: boolean; composed?: boolean }): Event };
interface CustomEvent<T = any> extends Event {
  readonly detail: T;
}
declare const CustomEvent: { new <T = any>(type: string, eventInitDict?: { bubbles?: boolean; cancelable?: boolean; composed?: boolean; detail?: T }): CustomEvent<T> };
interface EventTarget {
  addEventListener(type: string, callback: ((evt: any) => void) | { handleEvent(object: any): void } | null, options?: boolean | Record<string, any>): void;
  removeEventListener(type: string, callback: ((evt: any) => void) | { handleEvent(object: any): void } | null, options?: boolean | Record<string, any>): void;
  dispatchEvent(event: Event): boolean;
}
declare const EventTarget: { new (): EventTarget };
interface UIEvent extends Event {
  readonly detail: number;
  readonly view: any;
}
interface MouseEvent extends UIEvent {
  readonly altKey: boolean;
  readonly button: number;
  readonly buttons: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly movementX: number;
  readonly movementY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly pageX: number;
  readonly pageY: number;
  readonly relatedTarget: EventTarget | null;
  readonly screenX: number;
  readonly screenY: number;
  readonly shiftKey: boolean;
}
interface PointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly isPrimary: boolean;
}
interface KeyboardEvent extends UIEvent {
  readonly altKey: boolean;
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly isComposing: boolean;
  readonly key: string;
  readonly location: number;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly shiftKey: boolean;
}
interface FocusEvent extends UIEvent {
  readonly relatedTarget: EventTarget | null;
}
interface InputEvent extends UIEvent {
  readonly data: string | null;
  readonly inputType: string;
  readonly isComposing: boolean;
}
interface ClipboardEvent extends Event {
  readonly clipboardData: any;
}
interface DragEvent extends MouseEvent {
  readonly dataTransfer: any;
}
interface WheelEvent extends MouseEvent {
  readonly deltaMode: number;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaZ: number;
}
interface TouchEvent extends UIEvent {
  readonly altKey: boolean;
  readonly changedTouches: any;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly targetTouches: any;
  readonly touches: any;
}
interface MessageEvent<T = any> extends Event {
  readonly data: T;
  readonly lastEventId: string;
  readonly origin: string;
  readonly ports: readonly any[];
  readonly source: any;
}
interface ErrorEvent extends Event {
  readonly colno: number;
  readonly error: any;
  readonly filename: string;
  readonly lineno: number;
  readonly message: string;
}
interface SubmitEvent extends Event {
  readonly submitter: HTMLElement | null;
}
interface ProgressEvent<T extends EventTarget = EventTarget> extends Event {
  readonly lengthComputable: boolean;
  readonly loaded: number;
  readonly target: T | null;
  readonly total: number;
}

interface DOMRect {
  readonly bottom: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
  toJSON(): any;
}
interface CSSStyleDeclaration {
  [key: string]: any;
  cssText: string;
  getPropertyValue(property: string): string;
  removeProperty(property: string): string;
  setProperty(property: string, value: string | null, priority?: string): void;
}
interface DOMTokenList {
  readonly length: number;
  value: string;
  add(...tokens: string[]): void;
  contains(token: string): boolean;
  item(index: number): string | null;
  remove(...tokens: string[]): void;
  replace(token: string, newToken: string): boolean;
  toggle(token: string, force?: boolean): boolean;
  [index: number]: string;
  [Symbol.iterator](): IterableIterator<string>;
}
interface Node extends EventTarget {
  readonly childNodes: any;
  readonly firstChild: Node | null;
  readonly lastChild: Node | null;
  readonly nextSibling: Node | null;
  readonly nodeName: string;
  readonly nodeType: number;
  nodeValue: string | null;
  readonly ownerDocument: Document | null;
  readonly parentElement: HTMLElement | null;
  readonly parentNode: Node | null;
  readonly previousSibling: Node | null;
  textContent: string | null;
  appendChild<T extends Node>(node: T): T;
  cloneNode(deep?: boolean): Node;
  contains(other: Node | null): boolean;
  insertBefore<T extends Node>(node: T, child: Node | null): T;
  removeChild<T extends Node>(child: T): T;
  replaceChild<T extends Node>(node: Node, child: T): T;
}
interface Element extends Node {
  readonly attributes: any;
  readonly children: any;
  readonly classList: DOMTokenList;
  className: string;
  readonly clientHeight: number;
  readonly clientLeft: number;
  readonly clientTop: number;
  readonly clientWidth: number;
  id: string;
  innerHTML: string;
  outerHTML: string;
  readonly scrollHeight: number;
  scrollLeft: number;
  scrollTop: number;
  readonly scrollWidth: number;
  readonly tagName: string;
  closest<E extends Element = Element>(selector: string): E | null;
  getAttribute(qualifiedName: string): string | null;
  getBoundingClientRect(): DOMRect;
  hasAttribute(qualifiedName: string): boolean;
  matches(selectors: string): boolean;
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(selectors: string): any;
  remove(): void;
  removeAttribute(qualifiedName: string): void;
  scrollIntoView(arg?: boolean | Record<string, any>): void;
  scrollTo(options?: Record<string, any> | number, y?: number): void;
  setAttribute(qualifiedName: string, value: string): void;
  [key: string]: any;
}
interface HTMLElement extends Element {
  dataset: Record<string, string | undefined>;
  hidden: boolean;
  innerText: string;
  readonly offsetHeight: number;
  readonly offsetLeft: number;
  readonly offsetParent: Element | null;
  readonly offsetTop: number;
  readonly offsetWidth: number;
  style: CSSStyleDeclaration;
  tabIndex: number;
  title: string;
  blur(): void;
  click(): void;
  focus(options?: { preventScroll?: boolean }): void;
}
interface HTMLInputElement extends HTMLElement {
  checked: boolean;
  disabled: boolean;
  files: FileList | null;
  name: string;
  placeholder: string;
  readOnly: boolean;
  required: boolean;
  selectionEnd: number | null;
  selectionStart: number | null;
  type: string;
  value: string;
  valueAsNumber: number;
  select(): void;
  setSelectionRange(start: number | null, end: number | null, direction?: string): void;
}
interface HTMLTextAreaElement extends HTMLElement {
  cols: number;
  disabled: boolean;
  name: string;
  placeholder: string;
  readOnly: boolean;
  required: boolean;
  rows: number;
  selectionEnd: number;
  selectionStart: number;
  value: string;
  select(): void;
  setSelectionRange(start: number, end: number, direction?: string): void;
}
interface HTMLSelectElement extends HTMLElement {
  disabled: boolean;
  multiple: boolean;
  name: string;
  options: any;
  selectedIndex: number;
  value: string;
}
interface HTMLButtonElement extends HTMLElement {
  disabled: boolean;
  name: string;
  type: string;
  value: string;
}
interface HTMLFormElement extends HTMLElement {
  elements: any;
  name: string;
  reset(): void;
  submit(): void;
  requestSubmit(submitter?: HTMLElement | null): void;
  checkValidity(): boolean;
  reportValidity(): boolean;
}
interface HTMLAnchorElement extends HTMLElement {
  download: string;
  href: string;
  rel: string;
  target: string;
}
interface HTMLImageElement extends HTMLElement {
  alt: string;
  readonly complete: boolean;
  height: number;
  readonly naturalHeight: number;
  readonly naturalWidth: number;
  src: string;
  width: number;
}
interface HTMLCanvasElement extends HTMLElement {
  height: number;
  width: number;
  getContext(contextId: string, options?: any): any;
  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: any): void;
  toDataURL(type?: string, quality?: any): string;
}
interface HTMLVideoElement extends HTMLElement {
  autoplay: boolean;
  controls: boolean;
  currentTime: number;
  readonly duration: number;
  loop: boolean;
  muted: boolean;
   readonly paused: boolean;
  src: string;
  volume: number;
  pause(): void;
  play(): Promise<void>;
}
interface HTMLAudioElement extends HTMLElement {
  autoplay: boolean;
  controls: boolean;
  currentTime: number;
  readonly duration: number;
  loop: boolean;
  muted: boolean;
  readonly paused: boolean;
  src: string;
  volume: number;
  pause(): void;
  play(): Promise<void>;
}
interface HTMLDialogElement extends HTMLElement {
  open: boolean;
  returnValue: string;
  close(returnValue?: string): void;
  show(): void;
  showModal(): void;
}
interface HTMLIFrameElement extends HTMLElement {
  readonly contentDocument: Document | null;
  readonly contentWindow: Window | null;
  src: string;
}
interface SVGElement extends Element {
  style: CSSStyleDeclaration;
}
interface Document extends Node {
  readonly activeElement: Element | null;
  body: HTMLElement;
  cookie: string;
  readonly documentElement: HTMLElement;
  head: HTMLElement;
  readonly hidden: boolean;
  title: string;
  readonly visibilityState: string;
  createElement<K extends string>(tagName: K, options?: any): HTMLElement & any;
  createElementNS(namespaceURI: string | null, qualifiedName: string, options?: any): Element & any;
  createTextNode(data: string): Node;
  createDocumentFragment(): Node;
  getElementById(elementId: string): HTMLElement | null;
  getElementsByClassName(classNames: string): any;
  getElementsByTagName(qualifiedName: string): any;
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(selectors: string): any;
  execCommand(commandId: string, showUI?: boolean, value?: string): boolean;
  [key: string]: any;
}
interface Storage {
  readonly length: number;
  clear(): void;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
  [name: string]: any;
}
interface Location {
  hash: string;
  host: string;
  hostname: string;
  href: string;
  readonly origin: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  assign(url: string | URL): void;
  reload(): void;
  replace(url: string | URL): void;
  toString(): string;
}
interface History {
  readonly length: number;
  scrollRestoration: 'auto' | 'manual';
  readonly state: any;
  back(): void;
  forward(): void;
  go(delta?: number): void;
  pushState(data: any, unused: string, url?: string | URL | null): void;
  replaceState(data: any, unused: string, url?: string | URL | null): void;
}
interface Navigator {
  readonly clipboard: {
    readText(): Promise<string>;
    writeText(newClipText: string): Promise<void>;
    read?(): Promise<any[]>;
    write?(data: any): Promise<void>;
  };
  readonly language: string;
  readonly languages: readonly string[];
  readonly onLine: boolean;
  readonly platform: string;
  readonly userAgent: string;
  readonly maxTouchPoints: number;
  sendBeacon?(url: string | URL, data?: any): boolean;
  share?(data?: { title?: string; text?: string; url?: string; files?: File[] }): Promise<void>;
  [key: string]: any;
}
interface MediaQueryList extends EventTarget {
  readonly matches: boolean;
  readonly media: string;
  onchange: ((this: MediaQueryList, ev: any) => any) | null;
}
interface MutationObserver {
  disconnect(): void;
  observe(target: Node, options?: Record<string, any>): void;
  takeRecords(): any[];
}
declare const MutationObserver: { new (callback: (mutations: any[], observer: MutationObserver) => void): MutationObserver };
interface ResizeObserver {
  disconnect(): void;
  observe(target: Element, options?: Record<string, any>): void;
  unobserve(target: Element): void;
}
declare const ResizeObserver: { new (callback: (entries: any[], observer: ResizeObserver) => void): ResizeObserver };
interface IntersectionObserver {
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];
  disconnect(): void;
  observe(target: Element): void;
  takeRecords(): any[];
  unobserve(target: Element): void;
}
declare const IntersectionObserver: { new (callback: (entries: any[], observer: IntersectionObserver) => void, options?: Record<string, any>): IntersectionObserver };
interface Crypto {
  readonly subtle: Record<string, any>;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  randomUUID(): string;
}
interface Performance extends EventTarget {
  now(): number;
  readonly timeOrigin: number;
  mark?(markName: string, markOptions?: any): any;
  measure?(measureName: string, startOrMeasureOptions?: any, endMark?: string): any;
  [key: string]: any;
}
interface Window extends EventTarget {
  readonly document: Document;
  readonly location: Location;
  readonly history: History;
  readonly navigator: Navigator;
  readonly localStorage: Storage;
  readonly sessionStorage: Storage;
  readonly crypto: Crypto;
  readonly performance: Performance;
  readonly innerHeight: number;
  readonly innerWidth: number;
  readonly outerHeight: number;
  readonly outerWidth: number;
  readonly pageXOffset: number;
  readonly pageYOffset: number;
  readonly scrollX: number;
  readonly scrollY: number;
  readonly devicePixelRatio: number;
  open(url?: string | URL, target?: string, features?: string): Window | null;
  close(): void;
  focus(): void;
  blur(): void;
  scrollTo(options?: Record<string, any> | number, y?: number): void;
  scrollBy(options?: Record<string, any> | number, y?: number): void;
  getComputedStyle(elt: Element, pseudoElt?: string | null): CSSStyleDeclaration;
  matchMedia(query: string): MediaQueryList;
  requestAnimationFrame(callback: (time: number) => void): number;
  cancelAnimationFrame(handle: number): void;
  setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
  clearTimeout(id?: number): void;
  setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
  clearInterval(id?: number): void;
  fetch(input: string | URL | Request, init?: Record<string, any>): Promise<Response>;
  [key: string]: any;
}

type EnfyraQueryResult<T = any> = {
  data: T[];
  meta?: {
    totalCount?: number;
    total_count?: number;
    filterCount?: number;
    filter_count?: number;
    [key: string]: any;
  };
  [key: string]: any;
};
type EnfyraFindArgs = {
  id?: string | number;
  filter?: any;
  fields?: string | string[];
  page?: number;
  limit?: number;
  cursor?: string;
  search?: string;
  sort?: string;
  meta?: 'filterCount' | 'totalCount' | '*' | string | string[];
  deep?: Record<string, any>;
  debugMode?: boolean | string;
  aggregate?: any;
};
type EnfyraAggregateArgs = {
  filter?: any;
  dimensions?: string[];
  measures?: Record<string, any>;
  sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
  page?: number;
  limit?: number;
  [key: string]: any;
};
type EnfyraCreateArgs = {
  data: any;
  fields?: string | string[];
  [key: string]: any;
};
type EnfyraUpdateArgs = {
  id?: string | number;
  filter?: any;
  data: any;
  fields?: string | string[];
  [key: string]: any;
};
type EnfyraDeleteArgs = {
  id?: string | number;
  filter?: any;
  [key: string]: any;
};
type EnfyraDeleteResult = {
  message: string;
  statusCode: number;
  [key: string]: any;
};
type EnfyraRepository = {
  find(args?: EnfyraFindArgs): Promise<EnfyraQueryResult>;
  findOne(args?: EnfyraFindArgs): Promise<any>;
  findLocked(args?: EnfyraFindArgs): Promise<EnfyraQueryResult>;
  aggregate(args: EnfyraAggregateArgs): Promise<any>;
  exists(filter?: any): Promise<boolean>;
  create(args: EnfyraCreateArgs): Promise<EnfyraQueryResult>;
  createMany(args: EnfyraCreateArgs): Promise<EnfyraQueryResult>;
  update(args: EnfyraUpdateArgs): Promise<EnfyraQueryResult>;
  updateLocked(args: EnfyraUpdateArgs): Promise<EnfyraQueryResult>;
  updateMany(args: { filter?: any; data: any; fields?: string | string[]; [key: string]: any }): Promise<EnfyraQueryResult>;
  delete(args: EnfyraDeleteArgs): Promise<EnfyraDeleteResult>;
  deleteMany(args: { filter?: any; [key: string]: any }): Promise<EnfyraDeleteResult>;
};
type EnfyraRepos = {
  main: EnfyraRepository;
  secure: Record<string, EnfyraRepository>;
} & Record<string, EnfyraRepository>;
type EnfyraStorage = {
  $upload(options: Record<string, any>): Promise<any>;
  $update(fileId: string | number, options: Record<string, any>): Promise<any>;
  $delete(fileId: string | number): Promise<any>;
  $registerFile(options: Record<string, any>): Promise<any>;
  [key: string]: any;
};
type EnfyraTransaction = {
  run<T>(callback: () => Promise<T>): Promise<T>;
};
type EnfyraStreamChunkKind = 'chunk' | 'end' | 'error';
type EnfyraReadable = AsyncIterable<any>;
type EnfyraResponseStreamOptions = {
  statusCode?: number;
  mimetype?: string;
  filename?: string;
  headers?: Record<string, string | number | readonly string[] | undefined | null>;
  timeoutMs?: number;
  idleTimeoutMs?: number;
  observer?: (text: string, kind: EnfyraStreamChunkKind) => void | Promise<void>;
  transform?: (text: string, kind: EnfyraStreamChunkKind) => string | null | undefined | Promise<string | null | undefined>;
};
type EnfyraResponse = {
  json(value: unknown, options?: { statusCode?: number; headers?: EnfyraResponseStreamOptions['headers'] }): Promise<void>;
  bytes(value: any, options?: { statusCode?: number; mimetype?: string; filename?: string; headers?: EnfyraResponseStreamOptions['headers'] }): Promise<void>;
  stream(stream: EnfyraReadable, options?: EnfyraResponseStreamOptions): Promise<void>;
};
type EnfyraStreams = {
  preflight(
    stream: EnfyraReadable,
    options?: { timeoutMs?: number; idleTimeoutMs?: number; maxFirstChunkBytes?: number },
  ): Promise<{ stream: EnfyraReadable; firstChunk: any; cancel: (reason?: string) => Promise<void> }>;
  readBytes(
    stream: EnfyraReadable,
    options?: { timeoutMs?: number; idleTimeoutMs?: number; maxBytes?: number },
  ): Promise<any>;
  readText(
    stream: EnfyraReadable,
    options?: { timeoutMs?: number; idleTimeoutMs?: number; maxBytes?: number },
  ): Promise<string>;
  guard(
    stream: EnfyraReadable,
    options?: { timeoutMs?: number; idleTimeoutMs?: number; maxBytes?: number },
  ): EnfyraReadable;
  tap(
    stream: EnfyraReadable,
    options?: {
      timeoutMs?: number;
      idleTimeoutMs?: number;
      maxBytes?: number;
      onChunk?: (chunk: any, kind: EnfyraStreamChunkKind) => void | Promise<void>;
      observer?: (text: string, kind: EnfyraStreamChunkKind) => void | Promise<void>;
    },
  ): EnfyraReadable;
  cancel(stream: EnfyraReadable, reason?: string): Promise<void>;
};
type EnfyraThrow = {
  http(statusCode: number, message?: string): never;
  json(
    body: Record<string, unknown> & {
      success?: never;
      statusCode?: never;
      error?: Record<string, unknown> & { statusCode?: never };
    },
    options?: {
      statusCode?: number;
      headers?: EnfyraResponseStreamOptions['headers'];
    },
  ): never;
};
type EnfyraContext = {
  $body: any;
  $env: Record<string, string | undefined>;
  $data: any;
  $params: Record<string, any>;
  $query: Record<string, any>;
  $user: any;
  $req: any;
  $res: EnfyraResponse;
  $streams: EnfyraStreams;
  $share: Record<string, any>;
  $api: any;
  $uploadedFile: any;
  $uploadFile: Record<string, any | any[]>;
  $pkgs: Record<string, any>;
  $cache: Record<string, any>;
  $repos: EnfyraRepos;
  $helpers: Record<string, any> & {
    $fetch: (...args: any[]) => Promise<any>;
    run<T = any>(name: string, params?: any): Promise<T>;
    $jwt: Record<string, any>;
    jwt: Record<string, any>;
    $bcrypt: Record<string, any>;
    autoSlug: (...args: any[]) => string;
    $rateLimit: Record<string, any>;
    $sleep: (ms: number) => Promise<void>;
    $crypto: Record<string, any>;
    $pat: Record<string, any>;
    $delivery: Record<string, any>;
  };
  $storage: EnfyraStorage;
  $logs: (...args: any[]) => any;
  $socket: Record<string, any>;
  $trigger: (...args: any[]) => Promise<any>;
  $transaction: EnfyraTransaction;
  $flow: { $payload: any; $last: any; $meta: any; [key: string]: any };
  $throw: EnfyraThrow;
  $error: any;
  $statusCode: number;
  [key: string]: any;
};
declare const $ctx: EnfyraContext;
declare const console: {
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  info(...args: any[]): void;
  debug(...args: any[]): void;
  table(...args: any[]): void;
  dir(...args: any[]): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
  trace(...args: any[]): void;
  clear(): void;
  assert(condition?: boolean, ...data: any[]): void;
  count(label?: string): void;
  group(...data: any[]): void;
  groupEnd(): void;
};
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearTimeout(id?: number | any): void;
declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearInterval(id?: number | any): void;
declare function requestAnimationFrame(callback: (time: number) => void): number;
declare function cancelAnimationFrame(handle: number): void;
declare function getComputedStyle(elt: Element, pseudoElt?: string | null): CSSStyleDeclaration;
declare function matchMedia(query: string): MediaQueryList;
declare function fetch(input: string | URL | Request, init?: Record<string, any>): Promise<Response>;
declare function require(id: string): any;
declare const window: Window & Record<string, any>;
declare const document: Document;
declare const navigator: Navigator;
declare const location: Location;
declare const history: History;
declare const localStorage: Storage;
declare const sessionStorage: Storage;
declare const crypto: Crypto;
declare const performance: Performance;
declare const packages: Record<string, any>;

type VueRef<T = any> = { value: T; [key: string]: any };
type VueComputedRef<T = any> = { readonly value: T; [key: string]: any };
type VueWritableComputedRef<T = any, S = T> = { value: T; [key: string]: any };
type VueMaybeRef<T = any> = T | VueRef<T>;
type VueMaybeRefOrGetter<T = any> = T | VueRef<T> | (() => T);
type VueUnwrapRef<T> = T extends VueRef<infer V> ? V : T;
type VuePropType<T> = { new (...args: any[]): T & object } | { (): T } | Array<{ new (...args: any[]): any } | { (): any }>;
type EnfyraNotify = {
  current: VueComputedRef<any>;
  toasts: VueRef<any[]>;
  show(type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string): Promise<void>;
  success(title: string, description?: string): Promise<void>;
  error(title: string, description?: string): Promise<void>;
  warning(title: string, description?: string): Promise<void>;
  info(title: string, description?: string): Promise<void>;
  dismiss(): void;
  clear(): void;
};

declare function ref<T = any>(value?: T): any;
declare function reactive<T extends object = Record<string, any>>(value: T): T & Record<string, any>;
declare function computed<T = any>(getter: (() => T) | { get: () => T; set: (value: T) => void }): any;
declare function readonly<T = any>(target: T): Readonly<T>;
declare function shallowRef<T = any>(value?: T): any;
declare function shallowReactive<T extends object = Record<string, any>>(value: T): T & Record<string, any>;
declare function shallowReadonly<T = any>(target: T): Readonly<T>;
declare function triggerRef(ref: any): void;
declare function customRef<T = any>(factory: (track: () => void, trigger: () => void) => { get: () => T; set: (value: T) => void }): VueRef<T>;
declare function toRef<T = any>(source: any, key?: any, defaultValue?: any): VueRef<T>;
declare function toRefs<T extends object = Record<string, any>>(object: T): { [K in keyof T]: VueRef<T[K]> };
declare function toValue<T = any>(source: VueMaybeRefOrGetter<T>): T;
declare function toRaw<T = any>(observed: T): T;
declare function markRaw<T extends object = object>(value: T): T;
declare function isRef(r: any): r is VueRef<any>;
declare function isReactive(value: unknown): boolean;
declare function isReadonly(value: unknown): boolean;
declare function isProxy(value: unknown): boolean;
declare function unref<T = any>(ref: VueMaybeRef<T>): T;
declare function watch(...args: any[]): () => void;
declare function watchDeep(...args: any[]): () => void;
declare function watchEffect(effect: (onCleanup: (cleanupFn: () => void) => void) => void, options?: Record<string, any>): () => void;
declare function watchPostEffect(effect: (onCleanup: (cleanupFn: () => void) => void) => void, options?: Record<string, any>): () => void;
declare function watchSyncEffect(effect: (onCleanup: (cleanupFn: () => void) => void) => void, options?: Record<string, any>): () => void;
declare function effectScope(detached?: boolean): { run<T>(fn: () => T): T | undefined; stop(): void };
declare function getCurrentScope(): { run<T>(fn: () => T): T | undefined; stop(): void } | undefined;
declare function onScopeDispose(fn: () => void, failSilently?: boolean): void;
declare function onMounted(fn: () => any): void;
declare function onUpdated(fn: () => any): void;
declare function onUnmounted(fn: () => any): void;
declare function onBeforeMount(fn: () => any): void;
declare function onBeforeUpdate(fn: () => any): void;
declare function onBeforeUnmount(fn: () => any): void;
declare function onErrorCaptured(fn: (err: any, instance: any, info: string) => boolean | void): void;
declare function onRenderTracked(fn: (event: any) => void): void;
declare function onRenderTriggered(fn: (event: any) => void): void;
declare function onActivated(fn: () => any): void;
declare function onDeactivated(fn: () => any): void;
declare function onServerPrefetch(fn: () => Promise<any>): void;
declare function provide<T = any>(key: any, value: T): void;
declare function inject<T = any>(key: any, defaultValue?: T | (() => T), treatDefaultAsFactory?: boolean): T;
declare function hasInjectionContext(): boolean;
declare function nextTick<T = void>(fn?: () => T): Promise<Awaited<T>>;
declare function defineComponent(options: any): any;
declare function defineAsyncComponent(source: any): any;
declare function h(...args: any[]): any;
declare function createVNode(...args: any[]): any;
declare function cloneVNode(vnode: any, extraProps?: any, mergeRef?: boolean): any;
declare function mergeProps(...args: Record<string, any>[]): Record<string, any>;
declare function isVNode(value: any): boolean;
declare function resolveComponent(name: string): any;
declare function resolveDirective(name: string): any;
declare function withDirectives(vnode: any, directives: any[]): any;
declare function withModifiers(fn: Function, modifiers: string[]): any;
declare function useSlots(): Record<string, any>;
declare function useAttrs(): Record<string, any>;
declare function useModel<T = any>(props: any, name?: string, options?: any): VueRef<T>;
declare function useTemplateRef<T = any>(key: string): VueRef<T | null>;
declare function useId(): string;
declare function getCurrentInstance(): any;
declare function defineProps<T = Record<string, any>>(props?: any): T;
declare function defineEmits<T = (...args: any[]) => any>(emits?: any): T;
declare function defineExpose(exposed?: Record<string, any>): void;
declare function defineOptions(options: Record<string, any>): void;
declare function defineSlots<T = Record<string, any>>(): T;
declare function defineModel<T = any>(nameOrOptions?: any, options?: any): VueRef<T>;
declare function withDefaults<T, BKeys extends keyof T = keyof T>(props: T, defaults: { [K in BKeys]?: any }): T;
declare const Transition: any;
declare const TransitionGroup: any;
declare const KeepAlive: any;
declare const Teleport: any;
declare const Suspense: any;
declare const vueVersion: string;

declare function useState<T = any>(key?: string | (() => T), init?: () => T): VueRef<T>;
declare function useRoute(): Record<string, any>;
declare function useRouter(): Record<string, any>;
declare function useApi<T = any>(...args: any[]): {
  data: VueRef<T>;
  error: VueRef<any>;
  pending: VueRef<boolean>;
  status: VueRef<string>;
  execute: (...execArgs: any[]) => Promise<T>;
  refresh: (...refreshArgs: any[]) => Promise<T>;
  [key: string]: any;
};
declare function useNotify(): EnfyraNotify;
declare function useToast(...args: any[]): any;
declare function useSchema(...args: any[]): any;
declare function useScreen(...args: any[]): any;
declare function useGlobalState(...args: any[]): any;
declare function usePermissions(...args: any[]): any;
declare function useFilterQuery(...args: any[]): any;
declare function useDataTableColumns(...args: any[]): any;
declare function useAdminSocket(...args: any[]): any;
declare function useHeaderActionRegistry(...args: any[]): any;
declare function useSubHeaderActionRegistry(...args: any[]): any;
declare function useAccountPanelRegistry(...args: any[]): any;
declare function usePageHeaderRegistry(...args: any[]): any;
declare function useMenuRegistry(...args: any[]): any;
declare function useMenuNotificationRegistry(...args: any[]): any;
declare function useMenuApi(...args: any[]): any;
declare function useConfirm(...args: any[]): any;
declare function useAuth(...args: any[]): any;
declare function useMounted(...args: any[]): VueRef<boolean>;
declare function useDatabase(...args: any[]): any;
declare function useRoutes(...args: any[]): any;
declare function useHighlight(...args: any[]): any;
declare function useRuntimeConfig(...args: any[]): Record<string, any>;
declare function useFetch(...args: any[]): any;
declare function useAsyncData(...args: any[]): any;
declare function useLazyFetch(...args: any[]): any;
declare function useHead(...args: any[]): any;
declare function useSeoMeta(...args: any[]): any;
declare function useCookie<T = any>(...args: any[]): VueRef<T>;
declare function useNuxtApp(...args: any[]): Record<string, any>;
declare function useColorMode(...args: any[]): { value: string; preference: string; unknown: boolean; forced: boolean; [key: string]: any };
declare function navigateTo(...args: any[]): Promise<any>;
declare function getPackages(packageNames?: string[]): Promise<Record<string, any>>;

declare module 'vue' {
  export type Ref<T = any> = VueRef<T>;
  export type ShallowRef<T = any> = VueRef<T>;
  export type ComputedRef<T = any> = VueComputedRef<T>;
  export type WritableComputedRef<T = any, S = T> = VueWritableComputedRef<T, S>;
  export type MaybeRef<T = any> = VueMaybeRef<T>;
  export type MaybeRefOrGetter<T = any> = VueMaybeRefOrGetter<T>;
  export type UnwrapRef<T> = VueUnwrapRef<T>;
  export type Reactive<T> = T;
  export type PropType<T> = VuePropType<T>;
  export type Component<P = any> = any;
  export type ConcreteComponent<P = any> = any;
  export type FunctionalComponent<P = any> = any;
  export type VNode = any;
  export type VNodeChild = any;
  export type Slot<T = any> = (...args: T[]) => any;
  export type Slots = Record<string, Slot>;
  export type Directive<T = any, V = any> = any;
  export type DirectiveBinding<V = any> = { value: V; oldValue: V | null; arg?: string; modifiers: Record<string, boolean>; instance: any; dir: any };
  export type InjectionKey<T> = symbol;
  export type WatchStopHandle = () => void;
  export type WatchSource<T = any> = VueRef<T> | VueComputedRef<T> | (() => T);
  export type WatchCallback<V = any, OV = any> = (value: V, oldValue: OV, onCleanup: (cleanupFn: () => void) => void) => any;
  export type WatchOptions = Record<string, any>;
  export type CSSProperties = Record<string, any>;
  export type StyleValue = string | CSSProperties | Array<StyleValue> | false | null | undefined;

  export const ref: typeof globalThis.ref;
  export const reactive: typeof globalThis.reactive;
  export const computed: typeof globalThis.computed;
  export const readonly: typeof globalThis.readonly;
  export const shallowRef: typeof globalThis.shallowRef;
  export const shallowReactive: typeof globalThis.shallowReactive;
  export const shallowReadonly: typeof globalThis.shallowReadonly;
  export const triggerRef: typeof globalThis.triggerRef;
  export const customRef: typeof globalThis.customRef;
  export const toRef: typeof globalThis.toRef;
  export const toRefs: typeof globalThis.toRefs;
  export const toValue: typeof globalThis.toValue;
  export const toRaw: typeof globalThis.toRaw;
  export const markRaw: typeof globalThis.markRaw;
  export const isRef: typeof globalThis.isRef;
  export const isReactive: typeof globalThis.isReactive;
  export const isReadonly: typeof globalThis.isReadonly;
  export const isProxy: typeof globalThis.isProxy;
  export const unref: typeof globalThis.unref;
  export const watch: typeof globalThis.watch;
  export const watchDeep: typeof globalThis.watchDeep;
  export const watchEffect: typeof globalThis.watchEffect;
  export const watchPostEffect: typeof globalThis.watchPostEffect;
  export const watchSyncEffect: typeof globalThis.watchSyncEffect;
  export const effectScope: typeof globalThis.effectScope;
  export const getCurrentScope: typeof globalThis.getCurrentScope;
  export const onScopeDispose: typeof globalThis.onScopeDispose;
  export const onMounted: typeof globalThis.onMounted;
  export const onUpdated: typeof globalThis.onUpdated;
  export const onUnmounted: typeof globalThis.onUnmounted;
  export const onBeforeMount: typeof globalThis.onBeforeMount;
  export const onBeforeUpdate: typeof globalThis.onBeforeUpdate;
  export const onBeforeUnmount: typeof globalThis.onBeforeUnmount;
  export const onErrorCaptured: typeof globalThis.onErrorCaptured;
  export const onRenderTracked: typeof globalThis.onRenderTracked;
  export const onRenderTriggered: typeof globalThis.onRenderTriggered;
  export const onActivated: typeof globalThis.onActivated;
  export const onDeactivated: typeof globalThis.onDeactivated;
  export const onServerPrefetch: typeof globalThis.onServerPrefetch;
  export const provide: typeof globalThis.provide;
  export const inject: typeof globalThis.inject;
  export const hasInjectionContext: typeof globalThis.hasInjectionContext;
  export const nextTick: typeof globalThis.nextTick;
  export const defineComponent: typeof globalThis.defineComponent;
  export const defineAsyncComponent: typeof globalThis.defineAsyncComponent;
  export const h: typeof globalThis.h;
  export const createVNode: typeof globalThis.createVNode;
  export const cloneVNode: typeof globalThis.cloneVNode;
  export const mergeProps: typeof globalThis.mergeProps;
  export const isVNode: typeof globalThis.isVNode;
  export const resolveComponent: typeof globalThis.resolveComponent;
  export const resolveDirective: typeof globalThis.resolveDirective;
  export const withDirectives: typeof globalThis.withDirectives;
  export const withModifiers: typeof globalThis.withModifiers;
  export const useSlots: typeof globalThis.useSlots;
  export const useAttrs: typeof globalThis.useAttrs;
  export const useModel: typeof globalThis.useModel;
  export const useTemplateRef: typeof globalThis.useTemplateRef;
  export const useId: typeof globalThis.useId;
  export const getCurrentInstance: typeof globalThis.getCurrentInstance;
  export const defineProps: typeof globalThis.defineProps;
  export const defineEmits: typeof globalThis.defineEmits;
  export const defineExpose: typeof globalThis.defineExpose;
  export const defineOptions: typeof globalThis.defineOptions;
  export const defineSlots: typeof globalThis.defineSlots;
  export const defineModel: typeof globalThis.defineModel;
  export const withDefaults: typeof globalThis.withDefaults;
  export const Transition: any;
  export const TransitionGroup: any;
  export const KeepAlive: any;
  export const Teleport: any;
  export const Suspense: any;
  export const version: string;
}
`;

let typescriptModulePromise: Promise<TypeScriptModule> | null = null;

function findRegularExpressionRanges(source: string): SourceRange[] {
  const maskedSource = source.replace(
    /@[A-Z0-9_]+|[#%][A-Za-z_][A-Za-z0-9_]*/g,
    token => '_'.repeat(token.length),
  );
  const ranges: SourceRange[] = [];

  try {
    const scanner = tokenizer(maskedSource, { ecmaVersion: 2022 });
    for (
      let token = scanner.getToken();
      token.type.label !== 'eof';
      token = scanner.getToken()
    ) {
      if (token.type.label === 'regexp') {
        ranges.push({ start: token.start, end: token.end });
      }
    }
  } catch {
    return ranges;
  }

  return ranges;
}

function loadTypeScript() {
  typescriptModulePromise ??= import('typescript');
  return typescriptModulePromise;
}

export function transformEnfyraCode(
  source: string,
  throwAliasMode: ThrowAliasMode = 'http',
): TransformedCode {
  const output: string[] = [];
  const sourceMap: number[] = [];
  const len = source.length;
  const CODE = 0;
  const STRING_DOUBLE = 1;
  const STRING_SINGLE = 2;
  const TEMPLATE = 3;
  const COMMENT_LINE = 4;
  const COMMENT_BLOCK = 5;
  let state = CODE;
  let pos = 0;
  let templateExprDepth = 0;
  let braceDepth = 0;
  const regularExpressionRanges = findRegularExpressionRanges(source);
  let regularExpressionIndex = 0;

  const pushOriginal = (from: number, to: number) => {
    for (let index = from; index < to; index++) {
      output.push(source[index] || '');
      sourceMap.push(index);
    }
  };

  const pushReplacement = (replacement: string, originalFrom: number, originalTo: number) => {
    for (let index = 0; index < replacement.length; index++) {
      output.push(replacement[index] || '');
      sourceMap.push(Math.min(originalFrom + index, Math.max(originalFrom, originalTo - 1)));
    }
  };

  const isUpperMacroChar = (char: string) => /[A-Z0-9_]/.test(char);
  const isIdentifierStart = (char: string) => /[A-Za-z_]/.test(char);
  const isIdentifierChar = (char: string) => /[A-Za-z0-9_]/.test(char);

  while (pos < len) {
    while (
      regularExpressionIndex < regularExpressionRanges.length &&
      regularExpressionRanges[regularExpressionIndex]!.end <= pos
    ) {
      regularExpressionIndex++;
    }
    const regularExpression = regularExpressionRanges[regularExpressionIndex];
    if (
      state === CODE &&
      regularExpression &&
      regularExpression.start === pos
    ) {
      pushOriginal(regularExpression.start, regularExpression.end);
      pos = regularExpression.end;
      regularExpressionIndex++;
      continue;
    }

    const char = source[pos];
    const next = source[pos + 1];

    if (state === CODE) {
      if (char === '"') {
        pushOriginal(pos, pos + 1);
        state = STRING_DOUBLE;
        pos++;
      } else if (char === "'") {
        pushOriginal(pos, pos + 1);
        state = STRING_SINGLE;
        pos++;
      } else if (char === '`') {
        pushOriginal(pos, pos + 1);
        state = TEMPLATE;
        pos++;
      } else if (char === '/' && next === '/') {
        pushOriginal(pos, pos + 2);
        state = COMMENT_LINE;
        pos += 2;
      } else if (char === '/' && next === '*') {
        pushOriginal(pos, pos + 2);
        state = COMMENT_BLOCK;
        pos += 2;
      } else if (char === '@') {
        const start = pos;
        pos++;
        while (pos < len && isUpperMacroChar(source[pos] || '')) pos++;
        const token = source.slice(start, pos);
        const throwStatus = throwAliasStatus.get(token);
        let callStart = pos;
        while (callStart < len && /\s/.test(source[callStart] || '')) callStart++;
        if (throwStatus && source[callStart] === '(') {
          const target = throwAliasMode === 'validation'
            ? '$ctx.$throwAlias'
            : '$ctx.$throw.http';
          const replacement = `${target}(${throwStatus}${source[callStart + 1] === ')' ? '' : ', '}`;
          pushReplacement(replacement, start, callStart + 1);
          pos = callStart + 1;
        } else {
          const replacement = macroReplacements.get(token);
          if (replacement) {
            pushReplacement(replacement, start, pos);
          } else {
            pushOriginal(start, pos);
          }
        }
      } else if (char === '#' || char === '%') {
        const start = pos;
        const registry = char === '#' ? '$ctx.$repos' : '$ctx.$pkgs';
        pos++;
        if (pos < len && isIdentifierStart(source[pos] || '')) {
          pos++;
          while (pos < len && isIdentifierChar(source[pos] || '')) pos++;
          pushReplacement(`${registry}.${source.slice(start + 1, pos)}`, start, pos);
        } else {
          pushOriginal(start, pos);
        }
      } else if (char === '{') {
        if (templateExprDepth > 0) braceDepth++;
        pushOriginal(pos, pos + 1);
        pos++;
      } else if (char === '}' && templateExprDepth > 0) {
        if (braceDepth > 0) {
          braceDepth--;
        } else {
          templateExprDepth--;
          state = TEMPLATE;
        }
        pushOriginal(pos, pos + 1);
        pos++;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    } else if (state === STRING_DOUBLE) {
      if (char === '\\') {
        pushOriginal(pos, Math.min(pos + 2, len));
        pos += 2;
      } else if (char === '"') {
        pushOriginal(pos, pos + 1);
        state = CODE;
        pos++;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    } else if (state === STRING_SINGLE) {
      if (char === '\\') {
        pushOriginal(pos, Math.min(pos + 2, len));
        pos += 2;
      } else if (char === "'") {
        pushOriginal(pos, pos + 1);
        state = CODE;
        pos++;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    } else if (state === TEMPLATE) {
      if (char === '\\') {
        pushOriginal(pos, Math.min(pos + 2, len));
        pos += 2;
      } else if (char === '`') {
        pushOriginal(pos, pos + 1);
        state = CODE;
        pos++;
      } else if (char === '$' && next === '{') {
        pushOriginal(pos, pos + 2);
        state = CODE;
        templateExprDepth++;
        braceDepth = 0;
        pos += 2;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    } else if (state === COMMENT_LINE) {
      if (char === '\n') {
        pushOriginal(pos, pos + 1);
        state = CODE;
        pos++;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    } else if (state === COMMENT_BLOCK) {
      if (char === '*' && next === '/') {
        pushOriginal(pos, pos + 2);
        state = CODE;
        pos += 2;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    }
  }

  return { code: output.join(''), sourceMap };
}

function mapTypeScriptDiagnostic(
  ts: TypeScriptModule,
  diagnostic: import('typescript').Diagnostic,
  sourceMap: number[],
): Diagnostic | null {
  if (diagnostic.start === undefined || diagnostic.length === undefined) return null;
  const sourceStart = sourceMap[diagnostic.start];
  if (sourceStart === undefined || sourceStart < 0) return null;
  const virtualEnd = Math.max(diagnostic.start + diagnostic.length - 1, diagnostic.start);
  const sourceEnd = sourceMap[Math.min(virtualEnd, sourceMap.length - 1)];
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  return {
    from: sourceStart,
    to: sourceEnd !== undefined && sourceEnd >= sourceStart ? sourceEnd + 1 : sourceStart + 1,
    severity: diagnostic.category === ts.DiagnosticCategory.Warning ? 'warning' : 'error',
    message,
  };
}

async function validateThrowAliases(source: string): Promise<Diagnostic[]> {
  const ts = await loadTypeScript();
  const transformed = transformEnfyraCode(source, 'validation');
  const sourceFile = ts.createSourceFile(
    'enfyra-script.ts',
    transformed.code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics: Diagnostic[] = [];

  const visit = (node: import('typescript').Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === '$ctx'
      && node.expression.name.text === '$throwAlias'
      && node.arguments.length !== 2
    ) {
      const virtualStart = node.getStart(sourceFile);
      const virtualEnd = Math.max(node.end - 1, virtualStart);
      const sourceStart = transformed.sourceMap[virtualStart] ?? 0;
      const sourceEnd = transformed.sourceMap[
        Math.min(virtualEnd, transformed.sourceMap.length - 1)
      ];
      diagnostics.push({
        from: sourceStart,
        to: sourceEnd !== undefined && sourceEnd >= sourceStart
          ? sourceEnd + 1
          : sourceStart + 1,
        severity: 'error',
        message: '@THROW status aliases require exactly one message',
      });
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return diagnostics;
}

async function lintEnfyraJavaScriptSyntax(source: string): Promise<Diagnostic[]> {
  const aliasDiagnostics = await validateThrowAliases(source);
  if (aliasDiagnostics.length > 0) return aliasDiagnostics;
  const transformed = transformEnfyraCode(source);
  try {
    parse(transformed.code, {
      ecmaVersion: 2022,
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    });
    return [];
  } catch (error: any) {
    const position = typeof error?.pos === 'number' ? error.pos : 0;
    const sourceStart = transformed.sourceMap[Math.min(position, transformed.sourceMap.length - 1)] ?? 0;
    return [{
      from: sourceStart,
      to: sourceStart + 1,
      severity: 'error',
      message: error?.message || 'Syntax error',
    }];
  }
}

async function getEnfyraJavaScriptSyntaxError(
  source: string,
  prefix = '',
  suffix = '',
): Promise<string | null> {
  const transformed = transformEnfyraCode(source);
  try {
    parse(`${prefix}${transformed.code}${suffix}`, {
      ecmaVersion: 2022,
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    });
    return null;
  } catch (error: any) {
    return error?.message || 'Syntax error';
  }
}

export async function lintEnfyraTypeScript(source: string): Promise<Diagnostic[]> {
  return lintEnfyraScript(source, 'typescript');
}

export async function lintEnfyraScript(
  source: string,
  language: 'javascript' | 'typescript' = 'typescript',
): Promise<Diagnostic[]> {
  if (language === 'javascript') {
    return lintEnfyraJavaScriptSyntax(source);
  }

  const aliasDiagnostics = await validateThrowAliases(source);
  if (aliasDiagnostics.length > 0) return aliasDiagnostics;

  const ts = await loadTypeScript();
  const transformed = transformEnfyraCode(source);
  const fileName = 'enfyra-script.ts';
  const libName = 'enfyra-lib.d.ts';
  const prefix = `${libSource}\nasync function __enfyra_runtime__() {\n`;
  const suffix = '\n}\n';
  const virtualSource = `${prefix}${transformed.code}${suffix}`;
  const virtualMap = [
    ...Array.from({ length: prefix.length }, () => -1),
    ...transformed.sourceMap,
    ...Array.from({ length: suffix.length }, () => -1),
  ];

  const compilerOptions: import('typescript').CompilerOptions = {
    noEmit: true,
    noLib: true,
    noImplicitAny: false,
    useUnknownInCatchVariables: false,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };

  const sourceFiles = new Map<string, string>([[fileName, virtualSource]]);

  const host: import('typescript').CompilerHost = {
    fileExists: (name) => sourceFiles.has(name),
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => libName,
    getDirectories: () => [],
    getNewLine: () => '\n',
    getSourceFile: (name, languageVersion) => {
      const text = sourceFiles.get(name);
      return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, true);
    },
    readFile: (name) => sourceFiles.get(name),
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };

  const program = ts.createProgram([fileName], compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program, program.getSourceFile(fileName));

  return diagnostics
    .map((diagnostic) => mapTypeScriptDiagnostic(ts, diagnostic, virtualMap))
    .filter((diagnostic): diagnostic is Diagnostic => Boolean(diagnostic));
}

export async function validateEnfyraObjectReturnScript(
  source: string,
  language: 'javascript' | 'typescript' = 'typescript',
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = source.trim();
  if (!trimmed) return { ok: true };

  if (language === 'javascript') {
    const message = await getEnfyraJavaScriptSyntaxError(
      source,
      'async function __enfyra_runtime__() {\n',
      '\n}\n',
    );
    return message ? { ok: false, message } : { ok: true };
  }

  const ts = await loadTypeScript();
  const transformed = transformEnfyraCode(source);
  const fileName = 'enfyra-object-script.ts';
  const libName = 'enfyra-lib.d.ts';
  const prefix = `${libSource}
type __EnfyraPlainObject = { [key: string]: any } & { length?: never };
async function __enfyra_runtime__(): Promise<__EnfyraPlainObject> {
`;
  const suffix = `
}
`;
  const virtualSource = `${prefix}${transformed.code}${suffix}`;

  const compilerOptions: import('typescript').CompilerOptions = {
    noEmit: true,
    noLib: true,
    noImplicitAny: false,
    useUnknownInCatchVariables: false,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };

  const sourceFiles = new Map<string, string>([[fileName, virtualSource]]);

  const host: import('typescript').CompilerHost = {
    fileExists: (name) => sourceFiles.has(name),
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => libName,
    getDirectories: () => [],
    getNewLine: () => '\n',
    getSourceFile: (name, languageVersion) => {
      const text = sourceFiles.get(name);
      return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, true);
    },
    readFile: (name) => sourceFiles.get(name),
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };

  const program = ts.createProgram([fileName], compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program, program.getSourceFile(fileName));
  const error = diagnostics.find((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

  if (!error) return { ok: true };

  return {
    ok: false,
    message: ts.flattenDiagnosticMessageText(error.messageText, '\n'),
  };
}

export async function validateEnfyraRequiredReturnScript(
  source: string,
  language: 'javascript' | 'typescript' = 'typescript',
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = source.trim();
  if (!trimmed) {
    return { ok: false, message: 'Script must return a value.' };
  }

  const ts = await loadTypeScript();
  const transformed = transformEnfyraCode(source);
  const sourceFile = ts.createSourceFile(
    language === 'typescript' ? 'enfyra-return-source.ts' : 'enfyra-return-source.js',
    transformed.code,
    ts.ScriptTarget.ES2022,
    true,
    language === 'typescript' ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );
  const hasTopLevelValueReturn = (node: import('typescript').Node): boolean => {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    ) {
      return false;
    }

    if (ts.isReturnStatement(node)) {
      return Boolean(node.expression);
    }

    return node.getChildren(sourceFile).some(hasTopLevelValueReturn);
  };

  if (!sourceFile.statements.some(hasTopLevelValueReturn)) {
    return { ok: false, message: 'Script must return a value.' };
  }

  if (language === 'javascript') {
    const message = await getEnfyraJavaScriptSyntaxError(
      source,
      'async function __enfyra_runtime__() {\n',
      '\n}\n',
    );
    return message ? { ok: false, message } : { ok: true };
  }

  const fileName =
    'enfyra-return-script.ts';
  const libName = 'enfyra-lib.d.ts';
  const prefix = `${libSource}
type __EnfyraReturnValue = {} | null;
async function __enfyra_runtime__(): Promise<__EnfyraReturnValue> {
`;
  const suffix = `
}
`;
  const virtualSource = `${prefix}${transformed.code}${suffix}`;

  const compilerOptions: import('typescript').CompilerOptions = {
    noEmit: true,
    noLib: true,
    noImplicitAny: false,
    noImplicitReturns: true,
    useUnknownInCatchVariables: false,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };

  const sourceFiles = new Map<string, string>([[fileName, virtualSource]]);

  const host: import('typescript').CompilerHost = {
    fileExists: (name) => sourceFiles.has(name),
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => libName,
    getDirectories: () => [],
    getNewLine: () => '\n',
    getSourceFile: (name, languageVersion) => {
      const text = sourceFiles.get(name);
      return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, true);
    },
    readFile: (name) => sourceFiles.get(name),
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };

  const program = ts.createProgram([fileName], compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program, program.getSourceFile(fileName));
  const error = diagnostics.find((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

  if (!error) return { ok: true };

  return {
    ok: false,
    message: ts.flattenDiagnosticMessageText(error.messageText, '\n'),
  };
}

export async function validateEnfyraNoReturnScript(
  source: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = source.trim();
  if (!trimmed) return { ok: true };

  const ts = await loadTypeScript();
  const transformed = transformEnfyraCode(source);
  const sourceFile = ts.createSourceFile(
    'enfyra-no-return-script.ts',
    transformed.code,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );

  const hasReturn = (node: import('typescript').Node): boolean => {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    ) {
      return false;
    }

    if (ts.isReturnStatement(node)) {
      return true;
    }

    return node.getChildren(sourceFile).some(hasReturn);
  };

  if (!sourceFile.statements.some(hasReturn)) return { ok: true };

  return {
    ok: false,
    message: 'Post-hook scripts must update @DATA/$ctx.$data instead of returning a value.',
  };
}

interface VueScriptBlock {
  content: string;
  contentStart: number;
  language: 'javascript' | 'typescript';
  setup: boolean;
}

function parseVueScriptAttrs(attrs: string): Record<string, string | true> {
  const result: Record<string, string | true> = {};
  const attrRegex = /([A-Za-z_:][-A-Za-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrs)) !== null) {
    const name = match[1];
    if (!name) continue;
    result[name] = match[2] ?? match[3] ?? match[4] ?? true;
  }
  return result;
}

function extractVueScriptBlocks(source: string): VueScriptBlock[] {
  const blocks: VueScriptBlock[] = [];
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(source)) !== null) {
    const attrs = parseVueScriptAttrs(match[1] || '');
    const language = attrs.lang === 'ts' || attrs.lang === 'typescript'
      ? 'typescript'
      : 'javascript';
    const fullMatch = match[0] || '';
    const openingTagEnd = fullMatch.indexOf('>') + 1;
    blocks.push({
      content: match[2] || '',
      contentStart: match.index + openingTagEnd,
      language,
      setup: attrs.setup === true || attrs.setup === '',
    });
  }

  return blocks;
}

async function lintVueScriptBlock(block: VueScriptBlock, index: number): Promise<Diagnostic[]> {
  const ts = await loadTypeScript();
  const transformed = transformEnfyraCode(block.content);
  const fileName = `extension-script-${index}.${block.language === 'typescript' ? 'ts' : 'js'}`;
  const libName = 'enfyra-vue-extension-lib.d.ts';
  const suffix = block.setup ? '\nexport {}' : '';
  const virtualSource = `${transformed.code}${suffix}`;
  const virtualMap = [
    ...transformed.sourceMap,
    ...Array.from({ length: suffix.length }, () => -1),
  ];

  const compilerOptions: import('typescript').CompilerOptions = {
    allowJs: block.language === 'javascript',
    checkJs: block.language === 'javascript',
    noEmit: true,
    noLib: true,
    noImplicitAny: false,
    useUnknownInCatchVariables: false,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };

  const sourceFiles = new Map<string, string>([
    [fileName, virtualSource],
    [libName, libSource],
  ]);

  const host: import('typescript').CompilerHost = {
    fileExists: (name) => sourceFiles.has(name),
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => libName,
    getDirectories: () => [],
    getNewLine: () => '\n',
    getSourceFile: (name, languageVersion) => {
      const text = sourceFiles.get(name);
      return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, true);
    },
    readFile: (name) => sourceFiles.get(name),
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };

  const program = ts.createProgram([fileName, libName], compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program, program.getSourceFile(fileName));

  return diagnostics
    .map((diagnostic): Diagnostic | null => {
      if (diagnostic.start === undefined || diagnostic.length === undefined) return null;
      const sourceStart = virtualMap[diagnostic.start];
      if (sourceStart === undefined || sourceStart < 0) return null;
      const virtualEnd = Math.max(diagnostic.start + diagnostic.length - 1, diagnostic.start);
      const sourceEnd = virtualMap[Math.min(virtualEnd, virtualMap.length - 1)];
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      return {
        from: block.contentStart + sourceStart,
        to: block.contentStart + (sourceEnd !== undefined && sourceEnd >= sourceStart ? sourceEnd + 1 : sourceStart + 1),
        severity: diagnostic.category === ts.DiagnosticCategory.Warning ? 'warning' : 'error',
        message,
      };
    })
    .filter((diagnostic): diagnostic is Diagnostic => Boolean(diagnostic));
}

export async function lintVueSfcScripts(source: string): Promise<Diagnostic[]> {
  const blocks = extractVueScriptBlocks(source).filter(
    (block) => block.setup && block.language === 'typescript',
  );
  if (blocks.length === 0) return [];
  const results = await Promise.all(blocks.map((block, index) => lintVueScriptBlock(block, index)));
  return results.flat();
}
