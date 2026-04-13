import { describe, it, expect, beforeEach } from "bun:test";
import { get } from "svelte/store";
import { drawerStore, openDrawer, closeDrawer } from "./drawer.js";

describe("drawerStore", () => {
  beforeEach(() => {
    closeDrawer();
  });

  it("starts with closed state", () => {
    const state = get(drawerStore);
    expect(state.open).toBe(false);
    expect(state.issueNumber).toBeNull();
    expect(state.expandedAgent).toBeNull();
  });

  it("opens the drawer for an issue", () => {
    openDrawer(42);
    const state = get(drawerStore);
    expect(state.open).toBe(true);
    expect(state.issueNumber).toBe(42);
    expect(state.expandedAgent).toBeNull();
  });

  it("opens the drawer with an expanded agent", () => {
    openDrawer(42, "architect");
    const state = get(drawerStore);
    expect(state.open).toBe(true);
    expect(state.issueNumber).toBe(42);
    expect(state.expandedAgent).toBe("architect");
  });

  it("closes the drawer and resets state", () => {
    openDrawer(42, "architect");
    closeDrawer();
    const state = get(drawerStore);
    expect(state.open).toBe(false);
    expect(state.issueNumber).toBeNull();
    expect(state.expandedAgent).toBeNull();
  });

  it("replaces state when opening a different issue", () => {
    openDrawer(42, "architect");
    openDrawer(99);
    const state = get(drawerStore);
    expect(state.issueNumber).toBe(99);
    expect(state.expandedAgent).toBeNull();
  });

  it("replaces expanded agent when re-opening same issue with different agent", () => {
    openDrawer(42, "architect");
    openDrawer(42, "dev");
    const state = get(drawerStore);
    expect(state.issueNumber).toBe(42);
    expect(state.expandedAgent).toBe("dev");
  });
});
