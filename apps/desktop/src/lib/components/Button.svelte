<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  type Variant = "primary" | "secondary" | "ghost" | "danger";

  let {
    variant = "secondary",
    size = "md",
    children,
    class: className = "",
    ...rest
  }: HTMLButtonAttributes & { variant?: Variant; size?: "sm" | "md" | "icon"; children: Snippet } = $props();

  const variants: Record<Variant, string> = {
    primary: "bg-accent text-accent-ink hover:brightness-110",
    secondary: "border border-line bg-surface text-ink hover:bg-surface-hover",
    ghost: "text-ink-2 hover:bg-surface-hover hover:text-ink",
    danger: "bg-danger text-accent-ink hover:brightness-110",
  };
  const sizes = { sm: "h-8 px-2.5 text-[13px] gap-1.5", md: "h-9 px-3.5 text-sm gap-2", icon: "size-9" };
</script>

<button
  type="button"
  class="inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition disabled:pointer-events-none disabled:opacity-50 {variants[
    variant
  ]} {sizes[size]} {className}"
  {...rest}
>
  {@render children()}
</button>
