<script lang="ts">
  import type { Component } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { Tween } from "svelte/motion";

  let {
    label,
    value,
    format,
    icon: Icon,
  }: {
    label: string;
    value: number;
    format: (n: number) => string;
    icon: Component<{ size?: number; strokeWidth?: number }>;
  } = $props();

  // Counts up from 0 on first show, then glides between values.
  const shown = new Tween(0, { duration: 900, easing: cubicOut });
  $effect(() => {
    shown.target = value;
  });
</script>

<div class="rounded-2xl border border-line bg-surface p-5 shadow-card">
  <div class="flex items-center gap-2 text-sm text-ink-2">
    <span class="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent">
      <Icon size={15} strokeWidth={2.2} />
    </span>
    {label}
  </div>
  <div class="mt-3 text-[28px] leading-none font-semibold tracking-tight">
    {format(Math.round(shown.current))}
  </div>
</div>
