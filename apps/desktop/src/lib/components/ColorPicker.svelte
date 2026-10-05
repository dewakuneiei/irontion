<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Pipette from "@lucide/svelte/icons/pipette";
  import { ACTIVITY_COLORS, readableInk } from "$lib/domain/color";
  import { t } from "$lib/i18n/index.svelte";

  let {
    value = $bindable(),
    inheritColor,
    inheritLabel,
    label,
  }: {
    /** `null` = inherit (only offered when `inheritColor` is set). */
    value: string | null;
    inheritColor?: string;
    inheritLabel?: string;
    label: string;
  } = $props();

  const isCustom = $derived(value !== null && !(ACTIVITY_COLORS as readonly string[]).includes(value));
</script>

{#snippet swatch(color: string, selected: boolean, onpick: () => void, title: string)}
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    aria-label={title}
    {title}
    onclick={onpick}
    class="grid size-7 place-items-center rounded-full transition-transform hover:scale-110 {selected
      ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface'
      : ''}"
    style:background={color}
  >
    {#if selected}<Check size={15} strokeWidth={3} color={readableInk(color)} />{/if}
  </button>
{/snippet}

<div role="radiogroup" aria-label={label} class="flex flex-wrap items-center gap-2.5">
  {#if inheritColor}
    <button
      type="button"
      role="radio"
      aria-checked={value === null}
      onclick={() => (value = null)}
      class="flex h-7 items-center gap-2 rounded-full border px-2.5 text-[13px] transition-colors {value === null
        ? 'border-ink text-ink'
        : 'border-line text-ink-2 hover:bg-surface-hover'}"
    >
      <span class="size-4 rounded-full" style:background={inheritColor}></span>
      {inheritLabel}
    </button>
  {/if}
  {#each ACTIVITY_COLORS as color (color)}
    {@render swatch(color, value === color, () => (value = color), color)}
  {/each}
  <label
    class="relative grid size-7 cursor-pointer place-items-center rounded-full border border-line text-ink-2 hover:bg-surface-hover {isCustom
      ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface'
      : ''}"
    style:background={isCustom ? value : undefined}
    title={t("activities.form.custom")}
  >
    <Pipette size={14} color={isCustom && value ? readableInk(value) : undefined} />
    <input
      type="color"
      class="absolute inset-0 cursor-pointer opacity-0"
      value={value ?? inheritColor ?? ACTIVITY_COLORS[0]}
      oninput={(e) => (value = e.currentTarget.value)}
      aria-label={t("activities.form.custom")}
    />
  </label>
</div>
