/**
 * Svelte store for pipeline detail drawer state.
 * Tracks which pipeline drawer is open and which agent section is expanded.
 */

import { writable } from "svelte/store";

interface DrawerState {
  /** Whether the drawer is open */
  open: boolean;
  /** The issue number whose pipeline is being viewed */
  issueNumber: number | null;
  /** The agent name to auto-expand (e.g., when clicking a specific StageChip) */
  expandedAgent: string | null;
}

/**
 * Writable store for the pipeline detail drawer.
 */
export const drawerStore = writable<DrawerState>({
  open: false,
  issueNumber: null,
  expandedAgent: null,
});

/**
 * Opens the drawer for a specific issue, optionally auto-expanding an agent section.
 *
 * @param issueNumber - The issue number to show pipeline details for
 * @param expandedAgent - Optional agent name to auto-expand
 */
export function openDrawer(
  issueNumber: number,
  expandedAgent?: string,
): void {
  drawerStore.set({
    open: true,
    issueNumber,
    expandedAgent: expandedAgent ?? null,
  });
}

/**
 * Closes the drawer and resets state.
 */
export function closeDrawer(): void {
  drawerStore.set({
    open: false,
    issueNumber: null,
    expandedAgent: null,
  });
}
