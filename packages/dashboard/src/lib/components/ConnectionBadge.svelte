<script lang="ts">
  import { connectionState } from "../stores/connection.js";

  const labels = {
    connecting: "Connecting...",
    connected: "Connected",
    disconnected: "Disconnected",
  } as const;
</script>

<span class="connection-badge {$connectionState}">
  <span class="dot"></span>
  {labels[$connectionState]}
</span>

<style>
  .connection-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }

  .connected .dot {
    background: var(--color-completed);
    box-shadow: 0 0 4px var(--color-completed);
  }

  .connecting .dot {
    background: #eab308;
    box-shadow: 0 0 4px #eab308;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .disconnected .dot {
    background: var(--color-failed);
    box-shadow: 0 0 4px var(--color-failed);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
