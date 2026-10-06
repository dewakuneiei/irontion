<script lang="ts">
  import { goto } from "$app/navigation";
  import NotePaper from "$lib/components/notes/NotePaper.svelte";
  import { todayISO } from "$lib/domain/time";
</script>

<!-- A note written on the Notes page belongs to today; only the Calendar puts one on another day. -->
<div class="mx-auto max-w-2xl pt-2">
  <NotePaper note={null} date={todayISO()} place="notes" onback={() => goto("/notes")} />
</div>
