<script lang="ts">
  import type { Component, Snippet } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { fly } from "svelte/transition";

  /** One card of a settings section: an icon, a title, a line about it, and the controls. */
  let {
    icon: Icon,
    title,
    description,
    index = 0,
    tone = "normal",
    children,
  }: {
    icon: Component<{ size?: number }>;
    title: string;
    description?: string;
    /** Position in the section, for the staggered entrance. */
    index?: number;
    tone?: "normal" | "danger";
    children: Snippet;
  } = $props();
</script>

<section
  class="rounded-2xl border bg-surface p-6 shadow-card {tone === 'danger' ? 'border-danger/40' : 'border-line'}"
  in:fly={{ y: 14, duration: 420, delay: 40 + index * 70, easing: cubicOut }}
>
  <div class="mb-5 flex items-start gap-3">
    <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={18} /></span>
    <div class="min-w-0">
      <h2 class="font-semibold">{title}</h2>
      {#if description}<p class="text-sm text-muted">{description}</p>{/if}
    </div>
  </div>
  {@render children()}
</section>
