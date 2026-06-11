// @vitest-environment happy-dom

import { createApp, nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";

import {
  exposeExtensionGlobalsToVueApp,
  exposeVueGlobals,
  setupVueGlobals,
} from "~/composables/dynamic/runtime";

describe("dynamic extension runtime globals", () => {
  it("makes injected globals available to compiled template expressions", async () => {
    await setupVueGlobals();
    exposeVueGlobals(globalThis);

    const compiledCode = `
(function(e,n){typeof exports=="object"&&typeof module<"u"?module.exports=n(require("vue")):typeof define=="function"&&define.amd?define(["vue"],n):(e=typeof globalThis<"u"?globalThis:e||self,e.ScopeProbe=n(e.Vue))})(this,(function(e){"use strict";return{__name:"extension",setup(s){const o=ref(1);return(i,t)=>(e.openBlock(),e.createElementBlock("button",{onClick:t[0]||(t[0]=u=>i.navigateTo("/data"))},"Go "+e.toDisplayString(e.unref(o))+" "+e.toDisplayString(typeof i.ref),1))}}}));
`;

    new Function(compiledCode).call(globalThis);
    const component = (window as any).ScopeProbe;
    const navigateTo = vi.fn();
    const app = createApp(component);
    exposeExtensionGlobalsToVueApp(app, { navigateTo });

    const container = document.createElement("div");
    document.body.appendChild(container);
    app.mount(container);

    expect(container.textContent).toContain("Go 1 function");

    container.querySelector("button")?.dispatchEvent(new MouseEvent("click"));
    await nextTick();

    expect(navigateTo).toHaveBeenCalledWith("/data");

    app.unmount();
    container.remove();
  });
});
