**context:** #bug #notes #drag

# B003: Dragging a note to the first place did nothing

Fixed in 0.3.0.

- **Symptom**: on the Notes board, holding a note and dropping it on the top-left card (position 1) left the order unchanged.
- **Cause**: the drop rule was "put it **before or after** the card under the pointer, by the pointer's upper or lower half" (`moveBefore(ids, id, target, after)`), with a hit-test that needed the pointer to be **inside** a card's box.
  - Dropped on the **lower half** of the first card, a note from the second place went "after" the first card: the same order, so nothing happened. From any other place it went to the second place, not the first.
  - Dropped **above or beside** the first card (the natural way to reach the top-left corner) the pointer was inside no card, so the card glided back.
  - The pure function, the stored positions and the sort were all correct (`position` 0 is not treated as unset; the grid deals cards in order, so top-left is index 0).
  - A second, latent problem: `reorder_notes` gave the notes it was sent positions `0..n`. A part of the board (a filtered list) would collide with the hidden notes' positions and scramble them. The UI disables dragging while filtering, so it was not seen.
- **Fix**: a drop **takes the place of the card nearest the pointer** (`moveTo`, `dropIndex` in `domain/notes.ts`): any part of a card, a gap, or a short way above or beside the board counts; far away or back on its own place cancels. `reorder_notes` now lets the notes it is given **trade the positions they already hold** (ties kept apart), so notes left out stay where they were.
- **How to check**: `pnpm test` (`describe("where a dropped note goes")`: lower half of the first card, above it, left of it, gaps, far away) and `cargo test reorder` (`reordering_some_notes_keeps_the_others_where_they_were`, `moving_a_note_to_the_first_place_persists_from_any_place`).
- **Lesson**: a drop target should be a place (an index), not "before/after by half"; and a store function that takes a *part* of a list must not rewrite positions as if it were the whole.
