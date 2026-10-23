import type { Component } from "vue";
import type { ApiError } from "../../app/types/api";
import type { AccountPanelItem, HeaderAction } from "../../app/types/ui";
import type { LoginResponse } from "../../app/types/auth";
import type { useAuthFetch } from "../../app/composables/shared/useSessionExpiry";

type Assert<T extends true> = T;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type AuthFetchOptions = NonNullable<Parameters<typeof useAuthFetch>[1]>;

export type ApiErrorDataIsUnknown = Assert<IsUnknown<ApiError["data"]>>;
export type ApiErrorResponseIsUnknown = Assert<IsUnknown<ApiError["response"]>>;
export type AuthFetchTextResponseIsString = Assert<Equal<ReturnType<typeof useAuthFetch<unknown, "text">>, Promise<string>>>;
export type HeaderComponentRejectsNumbers = Assert<number extends HeaderAction["component"] ? false : true>;
export type HeaderComponentAcceptsVue = Assert<Component extends HeaderAction["component"] ? true : false>;
export type AccountComponentRejectsNumbers = Assert<number extends AccountPanelItem["component"] ? false : true>;
export type AccountPropsRemainUnknown = Assert<IsAny<NonNullable<AccountPanelItem["props"]>[string]> extends false ? true : false>;
export type AuthFetchRejectsStringTimeout = Assert<{ timeout: string } extends AuthFetchOptions ? false : true>;
export type AuthFetchRejectsBooleanSignal = Assert<{ signal: boolean } extends AuthFetchOptions ? false : true>;
export type LoginRedirectRejectsNumbers = Assert<number extends LoginResponse["redirect"] ? false : true>;
