import "clsx";
import { s as ssr_context, a as attr_class, b as stringify, c as store_get, e as escape_html, u as unsubscribe_stores } from "../../chunks/renderer.js";
import { w as writable } from "../../chunks/index.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
const connectionState = writable("disconnected");
function ConnectionBadge($$renderer) {
  var $$store_subs;
  const labels = {
    connecting: "Connecting...",
    connected: "Connected",
    disconnected: "Disconnected"
  };
  $$renderer.push(`<span${attr_class(`connection-badge ${stringify(store_get($$store_subs ??= {}, "$connectionState", connectionState))}`, "svelte-1dys3v3")}><span class="dot svelte-1dys3v3"></span> ${escape_html(labels[store_get($$store_subs ??= {}, "$connectionState", connectionState)])}</span>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    onDestroy(() => {
    });
    $$renderer2.push(`<div class="layout svelte-12qhfyh"><header class="app-header svelte-12qhfyh"><div class="container header-content svelte-12qhfyh"><h1 class="svelte-12qhfyh">Crewline Dashboard</h1> `);
    ConnectionBadge($$renderer2);
    $$renderer2.push(`<!----></div></header> <main class="container svelte-12qhfyh">`);
    children($$renderer2);
    $$renderer2.push(`<!----></main></div>`);
  });
}
export {
  _layout as default
};
