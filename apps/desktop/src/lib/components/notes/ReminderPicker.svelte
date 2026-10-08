<script lang="ts">
  import BellOff from "@lucide/svelte/icons/bell-off";
  import Button from "$lib/components/Button.svelte";
  import DatePicker from "$lib/components/DatePicker.svelte";
  import TimePicker from "$lib/components/TimePicker.svelte";
  import {
    REMINDER_PRESETS,
    fromLocal,
    localParts,
    presetTime,
    toUtc,
  } from "$lib/domain/reminders";
  import { todayISO } from "$lib/domain/time";
  import { formatTimestamp } from "$lib/format.svelte";
  import { t } from "$lib/i18n/index.svelte";

  /**
   * Choose when to be reminded (F008): a quick time, or a day and a time. Works on local time;
   * `onset` gets the UTC time the backend stores.
   */
  let {
    remindAt,
    onset,
    onclear,
  }: { remindAt: string | null; onset: (utc: string) => void; onclear: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const start = remindAt ? localParts(remindAt) : { date: todayISO(), time: "09:00" };
  let day = $state(start.date);
  let time = $state(start.time);

  const moment = $derived(fromLocal(day, time));
  const inPast = $derived(moment !== null && moment.getTime() <= Date.now());
  const canSet = $derived(moment !== null && !inPast);
</script>

<div class="flex flex-col gap-4" data-reminder-picker>
  {#if remindAt}
    <p class="text-sm font-medium" data-reminder-current>{t("reminders.at", { time: formatTimestamp(remindAt) })}</p>
  {/if}

  <div class="flex flex-wrap gap-1.5">
    {#each REMINDER_PRESETS as preset (preset)}
      {@const at = presetTime(preset, new Date())}
      <button
        type="button"
        data-preset={preset}
        onclick={() => onset(toUtc(at))}
        class="flex min-w-0 flex-col items-start rounded-lg border border-line px-3 py-1.5 text-left text-[13px] hover:bg-surface-hover"
      >
        <span class="font-medium">{t(`reminders.preset.${preset}`)}</span>
        <span class="text-xs text-muted tabular-nums">{formatTimestamp(toUtc(at))}</span>
      </button>
    {/each}
  </div>

  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <DatePicker value={day} label={t("reminders.day")} onchange={(iso) => (day = iso)} />
      <TimePicker value={time} label={t("reminders.time")} onchange={(next) => (time = next)} />
      <Button variant="primary" disabled={!canSet} onclick={() => moment && onset(toUtc(moment))} data-reminder-set>
        {t("reminders.set")}
      </Button>
    </div>
  </div>

  {#if remindAt}
    <div>
      <Button size="sm" variant="ghost" class="text-danger" onclick={onclear} data-reminder-clear>
        <BellOff size={14} />
        {t("reminders.remove")}
      </Button>
    </div>
  {/if}
</div>
