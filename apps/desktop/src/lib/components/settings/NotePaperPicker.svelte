<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import { fly } from "svelte/transition";
  import { t } from "$lib/i18n/index.svelte";
  import { NOTE_PAPERS, preferences } from "$lib/preferences.svelte";
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2" role="radiogroup" aria-label={t("settings.paper.title")}>
  {#each NOTE_PAPERS as paper (paper)}
    {@const selected = preferences.notePaper === paper}
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-paper={paper}
      onclick={() => preferences.setNotePaper(paper)}
      class="rounded-xl border-2 p-3 text-left transition-colors duration-200 {selected
        ? 'border-accent'
        : 'border-line hover:border-ink-2/30'}"
    >
      <!-- A small sample of the paper, drawn with the real paper styles for each choice. -->
      <div class="px-3 pt-3 pb-1">
        <div class="paper paper-sheet paper-ruled paper-tape" aria-hidden="true" data-sheet={paper}>
          <p class="text-[15px] leading-[var(--paper-line)]">&nbsp;<br />&nbsp;</p>
        </div>
      </div>
      <div class="mt-2.5 flex items-center justify-between px-0.5">
        <span class="text-sm font-medium">{t(`settings.paper.${paper}`)}</span>
        {#if selected}
          <span class="grid size-5 place-items-center rounded-full bg-accent text-accent-ink" in:fly={{ y: 4, duration: 180 }}>
            <Check size={13} strokeWidth={3} />
          </span>
        {/if}
      </div>
    </button>
  {/each}
</div>
