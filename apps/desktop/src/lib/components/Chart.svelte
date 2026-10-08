<script lang="ts">
  import { onMount } from "svelte";
  import { echarts, type ChartOption } from "$lib/charts/echarts";
  import { preferences } from "$lib/preferences.svelte";

  let {
    option,
    label,
    class: className = "",
  }: { option: ChartOption; label: string; class?: string } = $props();

  let el: HTMLDivElement;
  let chart: ReturnType<typeof echarts.init> | undefined;

  onMount(() => {
    chart = echarts.init(el, null, { renderer: "canvas" });
    const resize = new ResizeObserver(() => chart?.resize());
    resize.observe(el);
    return () => {
      resize.disconnect();
      chart?.dispose();
    };
  });

  // Runs after onMount, and again whenever the option changes (data, theme, language).
  // No chart animation when the user turned animations off or the OS asks for reduced motion.
  $effect(() => {
    chart?.setOption(preferences.motion ? option : { ...option, animation: false }, { notMerge: true });
  });
</script>

<div bind:this={el} class={className} role="img" aria-label={label}></div>
