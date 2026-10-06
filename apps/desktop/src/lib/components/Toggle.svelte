<script lang="ts">
  let { checked, label, onchange }: { checked: boolean; label: string; onchange: (checked: boolean) => void } = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  title={label}
  onclick={() => onchange(!checked)}
  class="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 {checked ? 'bg-accent' : 'bg-surface ring-1 ring-line'}"
>
  <span
    class="absolute top-0.5 left-0.5 size-5 rounded-full transition-all duration-200 {checked
      ? 'translate-x-5 bg-accent-ink'
      : 'bg-muted'}"
  ></span>
</button>
