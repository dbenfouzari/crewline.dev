<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import ConnectionBadge from "$lib/components/ConnectionBadge.svelte";
  import { startSSE, stopSSE } from "$lib/stores/connection.js";
  import "../app.css";

  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  onMount(() => {
    startSSE();
  });

  onDestroy(() => {
    stopSSE();
  });
</script>

<div class="layout">
  <header class="app-header">
    <div class="container header-content">
      <h1>Crewline Dashboard</h1>
      <ConnectionBadge />
    </div>
  </header>
  <main class="container">
    {@render children()}
  </main>
</div>

<style>
  .layout {
    min-height: 100vh;
  }

  .app-header {
    border-bottom: 1px solid var(--color-border);
    padding: 0.75rem 0;
    margin-bottom: 1.5rem;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h1 {
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  main {
    padding-bottom: 2rem;
  }
</style>
