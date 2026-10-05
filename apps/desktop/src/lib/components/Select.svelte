<script lang="ts" generics="T extends string | number">
  import Check from "@lucide/svelte/icons/check";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { tick } from "svelte";
  import { fly } from "svelte/transition";

  interface Option {
    value: T;
    label: string;
    /** Smaller secondary text, shown after the label. */
    hint?: string;
  }

  let {
    value,
    options,
    label,
    onchange,
  }: { value: T; options: Option[]; label: string; onchange: (value: T) => void } = $props();

  const id = $props.id();
  let open = $state(false);
  let active = $state(0);
  let root: HTMLDivElement;
  let button: HTMLButtonElement;
  let list = $state<HTMLUListElement>();

  const selected = $derived(options.find((option) => option.value === value));

  async function show() {
    active = Math.max(0, options.findIndex((option) => option.value === value));
    open = true;
    await tick();
    list?.querySelector("[data-active=true]")?.scrollIntoView({ block: "nearest" });
  }

  function choose(option: Option) {
    onchange(option.value);
    open = false;
    button.focus();
  }

  async function move(to: number) {
    active = Math.max(0, Math.min(options.length - 1, to));
    await tick();
    list?.querySelector("[data-active=true]")?.scrollIntoView({ block: "nearest" });
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      open = false;
    } else if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      void show();
    } else if (open && event.key === "ArrowDown") {
      event.preventDefault();
      void move(active + 1);
    } else if (open && event.key === "ArrowUp") {
      event.preventDefault();
      void move(active - 1);
    } else if (open && event.key === "Home") {
      event.preventDefault();
      void move(0);
    } else if (open && event.key === "End") {
      event.preventDefault();
      void move(options.length - 1);
    } else if (open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      choose(options[active]);
    }
  }

  function onWindowPointer(event: PointerEvent) {
    if (open && !root.contains(event.target as Node)) open = false;
  }
</script>

<svelte:window onpointerdown={onWindowPointer} />

<div class="relative" bind:this={root} {onkeydown} role="presentation">
  <button
    type="button"
    bind:this={button}
    role="combobox"
    aria-label={label}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls="{id}-list"
    aria-activedescendant={open ? `${id}-${active}` : undefined}
    class="flex h-10 w-full items-center justify-between gap-3 rounded-lg border bg-surface px-3 text-left text-sm transition-colors hover:bg-surface-hover {open
      ? 'border-accent'
      : 'border-line'}"
    onclick={() => (open ? (open = false) : show())}
  >
    <span class="min-w-0 truncate">
      <span class="font-medium tabular-nums">{selected?.label}</span>
      {#if selected?.hint}<span class="ml-1.5 text-xs text-muted">{selected.hint}</span>{/if}
    </span>
    <ChevronDown size={16} class="shrink-0 text-muted transition-transform duration-200 {open ? 'rotate-180' : ''}" />
  </button>

  {#if open}
    <ul
      bind:this={list}
      id="{id}-list"
      role="listbox"
      aria-label={label}
      class="absolute top-full right-0 left-0 z-40 mt-1.5 max-h-[22rem] overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-2xl"
      transition:fly={{ y: -6, duration: 150 }}
    >
      {#each options as option, index (option.value)}
        <!-- Combobox pattern: options aren't focusable; the trigger handles keys via aria-activedescendant. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id="{id}-{index}"
          role="option"
          aria-selected={option.value === value}
          data-active={index === active}
          class="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm {index === active
            ? 'bg-surface-hover'
            : ''}"
          onpointermove={(event) => {
            // Only a real mouse move: scrolling under a resting pointer must not override the keyboard.
            if (event.movementX !== 0 || event.movementY !== 0) active = index;
          }}
          onclick={() => choose(option)}
        >
          <span class="min-w-0 truncate">
            <span class="tabular-nums {option.value === value ? 'font-semibold' : ''}">{option.label}</span>
            {#if option.hint}<span class="ml-1.5 text-xs text-muted">{option.hint}</span>{/if}
          </span>
          {#if option.value === value}<Check size={16} strokeWidth={2.5} class="shrink-0 text-accent" />{/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
