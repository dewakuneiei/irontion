<script lang="ts">
  import Clock from "@lucide/svelte/icons/clock";
  import Keyboard from "@lucide/svelte/icons/keyboard";
  import {
    dialValue,
    from12,
    hourFromDial,
    joinClock,
    parseClock,
    to12,
    type DialMode,
  } from "$lib/domain/clockDial";
  import { dayPeriods } from "$lib/domain/datetime";
  import { i18n, t } from "$lib/i18n/index.svelte";
  import { preferences } from "$lib/preferences.svelte";
  import Button from "./Button.svelte";
  import ClockDial from "./ClockDial.svelte";
  import Modal from "./Modal.svelte";

  /**
   * Choose a time of day: a button showing it ("09:00 AM") that opens a clock. The hour is chosen
   * first, then the minutes (as on a phone); the keyboard button types the time instead.
   * `value` and `onchange` use `HH:MM`, 24-hour; the clock follows the user's 12 or 24-hour setting.
   */
  let { value, onchange, label }: { value: string; onchange: (time: string) => void; label: string } = $props();

  const pad = (n: number) => String(n).padStart(2, "0");

  let open = $state(false);
  let trigger = $state<HTMLButtonElement>();
  let wasOpen = false;
  let hour = $state(0);
  let minute = $state(0);
  let mode = $state<DialMode>("hour");
  let typing = $state(false);
  let hourText = $state("");
  let minuteText = $state("");

  const format = $derived(preferences.timeFormat);
  const periods = $derived(dayPeriods(i18n.locale));
  const shownHour = $derived(format === "12h" ? to12(hour).hour12 : hour);

  /** The typed fields hold a real time. */
  const typedHour = $derived(/^\d{1,2}$/.test(hourText) ? Number(hourText) : NaN);
  const typedMinute = $derived(/^\d{1,2}$/.test(minuteText) ? Number(minuteText) : NaN);
  const hourOk = $derived(format === "12h" ? typedHour >= 1 && typedHour <= 12 : typedHour >= 0 && typedHour <= 23);
  const minuteOk = $derived(typedMinute >= 0 && typedMinute <= 59);
  const valid = $derived(!typing || (hourOk && minuteOk));

  // The dialog leaves the page when it closes, so hand focus back to the button that opened it.
  $effect(() => {
    if (open) wasOpen = true;
    else if (wasOpen) {
      wasOpen = false;
      trigger?.focus();
    }
  });

  /** "09:00 AM" or "09:00": the stored time as the user's clock shows it. */
  function display(time: string): string {
    const parts = parseClock(time) ?? { hour: 0, minute: 0 };
    if (format === "24h") return joinClock(parts.hour, parts.minute);
    const { hour12, pm } = to12(parts.hour);
    return `${pad(hour12)}:${pad(parts.minute)} ${pm ? periods.pm : periods.am}`;
  }

  function show() {
    const parts = parseClock(value) ?? { hour: 9, minute: 0 };
    hour = parts.hour;
    minute = parts.minute;
    mode = "hour";
    typing = false;
    open = true;
  }

  function pick(picked: number, done: boolean) {
    if (mode === "minute") {
      minute = picked;
      return;
    }
    hour = hourFromDial(format, picked, hour);
    if (done) mode = "minute";
  }

  function setPeriod(pm: boolean) {
    hour = from12(to12(hour).hour12, pm);
  }

  function toggleTyping() {
    typing = !typing;
    if (typing) {
      hourText = pad(shownHour);
      minuteText = pad(minute);
    }
  }

  /** Typed text counts as soon as it is a real time, so switching back to the clock shows it. */
  function typed() {
    if (hourOk) hour = format === "12h" ? from12(typedHour, to12(hour).pm) : typedHour;
    if (minuteOk) minute = typedMinute;
  }

  function confirm() {
    open = false;
    onchange(joinClock(hour, minute));
  }

  const segment = (active: boolean) =>
    `h-20 w-24 shrink-0 rounded-lg text-[56px] leading-none tabular-nums transition-colors max-[22rem]:w-20 max-[22rem]:text-5xl ${
      active ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink hover:bg-surface-hover"
    }`;
  const field = (ok: boolean) =>
    `h-20 w-24 min-w-0 rounded-lg border-2 bg-surface-2 text-center text-[56px] leading-none tabular-nums outline-none max-[22rem]:w-20 max-[22rem]:text-5xl ${
      ok ? "border-transparent focus:border-accent" : "border-danger"
    }`;
</script>

<button
  bind:this={trigger}
  type="button"
  aria-haspopup="dialog"
  aria-label={label}
  title={label}
  data-time-picker
  class="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
  onclick={show}
>
  <Clock size={16} class="text-accent" aria-hidden="true" />
  <span class="tabular-nums">{display(value)}</span>
</button>

{#if open}
  <Modal bind:open title={t("timePicker.title")} width="sm" {footer}>
    <div class="flex items-stretch justify-center gap-2" data-time-header>
      {#if typing}
        <input
          bind:value={hourText}
          oninput={typed}
          inputmode="numeric"
          maxlength="2"
          aria-label={t("timePicker.hour")}
          aria-invalid={!hourOk}
          data-time-hour-input
          class={field(hourOk)}
        />
      {:else}
        <button type="button" aria-pressed={mode === "hour"} aria-label={t("timePicker.hour")} data-time-hour class={segment(mode === "hour")} onclick={() => (mode = "hour")}>
          {pad(shownHour)}
        </button>
      {/if}
      <span class="grid w-3 place-items-center text-[56px] leading-none max-[22rem]:text-5xl" aria-hidden="true">:</span>
      {#if typing}
        <input
          bind:value={minuteText}
          oninput={typed}
          inputmode="numeric"
          maxlength="2"
          aria-label={t("timePicker.minute")}
          aria-invalid={!minuteOk}
          data-time-minute-input
          class={field(minuteOk)}
        />
      {:else}
        <button type="button" aria-pressed={mode === "minute"} aria-label={t("timePicker.minute")} data-time-minute class={segment(mode === "minute")} onclick={() => (mode = "minute")}>
          {pad(minute)}
        </button>
      {/if}
      {#if format === "12h"}
        <div class="ml-1 flex w-14 flex-col overflow-hidden rounded-lg border border-line" role="group" aria-label={t("timePicker.period")}>
          {#each [false, true] as pm (pm)}
            <button
              type="button"
              aria-pressed={to12(hour).pm === pm}
              data-time-period={pm ? "pm" : "am"}
              class="min-h-0 flex-1 px-1 text-base font-medium transition-colors {to12(hour).pm === pm ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-hover'} {pm ? 'border-t border-line' : ''}"
              onclick={() => setPeriod(pm)}
            >
              {pm ? periods.pm : periods.am}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    {#if !typing}
      <div class="mt-6 flex justify-center">
        <ClockDial
          {mode}
          {format}
          value={dialValue(mode, format, hour, minute)}
          label={t(mode === "hour" ? "timePicker.dialHour" : "timePicker.dialMinute")}
          onpick={pick}
        />
      </div>
    {/if}
  </Modal>
{/if}

{#snippet footer()}
  <Button
    variant="ghost"
    size="icon"
    class="mr-auto"
    aria-label={typing ? t("timePicker.useClock") : t("timePicker.useKeyboard")}
    title={typing ? t("timePicker.useClock") : t("timePicker.useKeyboard")}
    onclick={toggleTyping}
    data-time-toggle
  >
    {#if typing}<Clock size={18} />{:else}<Keyboard size={18} />{/if}
  </Button>
  <Button variant="ghost" onclick={() => (open = false)}>{t("common.cancel")}</Button>
  <Button variant="primary" disabled={!valid} onclick={confirm} data-time-ok>{t("common.ok")}</Button>
{/snippet}
