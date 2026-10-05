<script lang="ts">
  import type { Snippet } from "svelte";

  let { title, subtitle, actions }: { title: string; subtitle?: string; actions?: Snippet } = $props();
</script>

<header class="mb-7 flex flex-wrap items-end justify-between gap-4">
  <div class="min-w-0">
    <h1 class="text-3xl font-semibold tracking-tight">{title}</h1>
    {#if subtitle}<p class="mt-1 max-w-[60ch] text-ink-2">{subtitle}</p>{/if}
  </div>
  {#if actions}
    <div class="flex items-center gap-2">{@render actions()}</div>
  {/if}
</header>
