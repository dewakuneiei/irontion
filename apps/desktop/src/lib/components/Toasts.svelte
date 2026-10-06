<script lang="ts">
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import Info from "@lucide/svelte/icons/info";
  import X from "@lucide/svelte/icons/x";
  import { flip } from "svelte/animate";
  import { fly } from "svelte/transition";
  import { t } from "$lib/i18n/index.svelte";
  import { notices } from "$lib/stores/notices.svelte";
</script>

<div class="pointer-events-none fixed right-3 bottom-20 z-50 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2 sm:right-5 sm:bottom-5" aria-live="polite">
  {#each notices.items as notice (notice.id)}
    <div
      class="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-card"
      role={notice.tone === "error" ? "alert" : "status"}
      in:fly={{ y: 12, duration: 220 }}
      out:fly={{ x: 24, duration: 180 }}
      animate:flip={{ duration: 200 }}
    >
      {#if notice.tone === "error"}
        <CircleAlert size={18} class="mt-px shrink-0 text-danger" />
      {:else}
        <Info size={18} class="mt-px shrink-0 text-accent" />
      {/if}
      <p class="flex-1">{notice.message}</p>
      {#if notice.action}
        {@const action = notice.action}
        <button
          type="button"
          class="-my-0.5 shrink-0 rounded-md px-2 py-0.5 font-medium text-accent hover:bg-surface-hover"
          onclick={() => {
            notices.dismiss(notice.id);
            void action.run();
          }}
        >
          {action.label}
        </button>
      {/if}
      <button
        type="button"
        class="text-muted hover:text-ink"
        aria-label={t("common.close")}
        onclick={() => notices.dismiss(notice.id)}
      >
        <X size={16} />
      </button>
    </div>
  {/each}
</div>
