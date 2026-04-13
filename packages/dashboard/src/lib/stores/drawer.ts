/**
 * Svelte store for managing the pipeline detail drawer state.
 * Tracks which issue's drawer is open and which agent section to auto-expand.
 */

import { writable } from "svelte/store";

export interface DrawerState {
  /** Whether the drawer is open */
  open: boolean;
  /** The issue number whose pipeline is displayed */
  issueNumber: number | null;
  /** Agent name to auto-expand (when clicking a specific stage chip) */
  expandedAgent: string | null;
}

const initialState: DrawerState = {
  open: false,
  issueNumber: null,
  expandedAgent: null,
};

export const drawerStore = writable<DrawerState>(initialState);

/**
 * Opens the pipeline detail drawer for a specific issue.
 *
 * @param issueNumber - The issue number to display
 * @param expandedAgent - Optional agent name to auto-expand
 */
export function openDrawer(
  issueNumber: number,
  expandedAgent: string | null = null,
): void {
  drawerStore.set({ open: true, issueNumber, expandedAgent });
}

/**
 * Closes the pipeline detail drawer.
 */
export function closeDrawer(): void {
  drawerStore.set(initialState);
}
