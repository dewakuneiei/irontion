<script lang="ts">
  import type { Component, Snippet } from "svelte";

  let {
    icon: Icon,
    title,
    body,
    action,
  }: {
    icon: Component<{ size?: number; strokeWidth?: number }>;
    title: string;
    body?: string;
    action?: Snippet;
  } = $props();
</script>

<div class="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
  <span class="mb-4 grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
    <Icon size={22} strokeWidth={2} />
  </span>
  <h2 class="font-semibold">{title}</h2>
  {#if body}<p class="mt-1 max-w-[46ch] text-sm text-ink-2">{body}</p>{/if}
  {#if action}<div class="mt-5">{@render action()}</div>{/if}
</div>
