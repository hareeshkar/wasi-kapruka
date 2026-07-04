# Mobile Premium Rework — Design Spec

Date: 2026-07-04

## Goal

Rework the mobile experience (viewports < 640px, Tailwind's `sm` breakpoint) of the Wasi/Kapruka chat-commerce app into a premium, native-feeling mobile UI — without changing anything visible at `sm:` and above (tablet/desktop untouched).

## Background

An audit (Explore agent) of all components found the app has almost no real mobile treatment: most components use zero or one responsive breakpoint, several use fixed pixel widths that don't fit narrow phones, and the primary navigation (a floating icon-rail, `App.tsx:1465-1644`) permanently consumes ~96px of horizontal width via `marginLeft: sidebarWidth + 16` even when force-collapsed on mobile (`App.tsx:1450-1459`) — eating ~25-30% of a 375px-wide screen just for icon-only nav. `ConversationSidebar.tsx` is dead code (not imported anywhere) and is out of scope.

## Core technical principle

The codebase today treats **unprefixed Tailwind classes as the desktop/base style** — almost nothing is mobile-first. To add mobile styling without disturbing desktop:

- Wherever an existing unprefixed class defines desktop appearance, **hoist it behind `sm:`** (preserving its current 640px+ trigger, so desktop is pixel-identical).
- Add a **new unprefixed mobile-first base style** underneath for `< 640px`.
- Never touch existing `md:`/`lg:`/`sm:` values — those already represent the desktop/tablet experience and must not shift.

This is the mechanism used throughout every component change below.

## Breakpoint boundary consistency

Tailwind's `sm:` = `min-width: 640px`. Any JS-driven mobile/desktop branch (e.g. a shared `useIsMobile()` hook) must use `(max-width: 639.98px)`, not `(max-width: 640px)` — otherwise at exactly 640px the JS branch and the Tailwind breakpoint disagree (both shell variants could render at once). Centralize this in one hook rather than scattering `matchMedia` calls, so the shell (tab bar vs. rail) and any component-level JS checks stay in sync.

## Shell rework (App.tsx)

- **Mobile (`< 640px`)**: hide the floating icon-rail (`<aside>`) entirely; replace with a fixed **bottom tab bar** — New chat, Language toggle, Cart (with badge), Profile/Sign-in — height ~64px, `padding-bottom: env(safe-area-inset-bottom)`, subtle blur/elevation matching the existing glass-panel aesthetic (reuse `--color-violet` tokens). Main content area gets `margin-left: 0` and bottom padding equal to tab-bar height + safe area so content never sits behind it.
- **Desktop (`sm:` and up)**: rail and `marginLeft` logic unchanged.
- The existing `useEffect` that force-collapses the sidebar under 640px (`App.tsx:1450-1459`) becomes unnecessary for the collapse behavior once the rail is hidden outright on mobile — remove it, or repurpose the media-query check to drive which shell renders.
- Chat composer (in `ChatSection.tsx`) must dock above the new bottom tab bar on mobile, not underneath it.
- Sign-in panel, cart drawer, profile prompt keep their existing full-screen/bottom-sheet mobile presentations — they already invoke correctly; the tab bar just triggers them.
- **New Conversation FAB** (`App.tsx:1796-1819`, `fixed bottom-20 right-6`, ~48px button) — revised during implementation: rather than repositioning it above the tab bar, it's hidden entirely on mobile since it duplicates the tab bar's "New chat" icon. Unchanged on desktop (no tab bar there).

## Motion & polish (applies mobile-only)

Using the already-installed `motion` library and existing `--ease-spring`/`--ease-out-expo` tokens:
- Bottom tab bar: slide/fade in on mount, subtle press scale on tap (`active:scale-90`, consistent with existing button patterns in the codebase).
- Cart badge: existing pulse-style animation pattern (see `langPulse`) reused for consistency.
- No new animation vocabulary — reuse what's already defined in `index.css` to keep the app coherent.

## Per-component fixes (mobile-only, via the hoist-to-`sm:` principle)

- **CartDrawer.tsx**: increase phone input touch target (`py-1.5` → `py-2.5`) on mobile; loosen `max-h-48` cart-list clamp on mobile to use more of the viewport; tighten/adjust checkout form padding for sub-360px phones.
- **ProductCard.tsx**: standard card's fixed `width: 230` → `min(230px, 42vw)` pattern matching the existing compact-card convention (`min(175px, 42vw)`).
- **ProductComparisonCard.tsx**: revised during implementation — the horizontal snap-scroll carousel matches the app's existing chat-carousel pattern (same as the compact `ProductCard` strip) and is a legitimate mobile affordance, not a bug. Instead of a full vertical-stack rewrite, the fixed `w-[200px]` column becomes `min(200px, 78vw)` — a deliberate "peek" of the next card that signals scrollability, consistent across viewport widths.
- **CategoryExplorer.tsx**: current markup is `grid-cols-3 sm:grid-cols-4` (line 182) — the `sm:grid-cols-4` desktop value is untouched; only the mobile base changes from `grid-cols-3` to `grid-cols-2` (three columns is cramped below 640px). Result: `grid-cols-2 sm:grid-cols-4`. The `max-h-[320px]` scrollable clamp becomes a taller/dynamic max-height on mobile so more categories are visible without excess scrolling.
- **ProductDetailModal.tsx**: thumbnail strip fixed `48x48` → larger touch-friendly size on mobile (e.g. `64x64`) with horizontal scroll if more than fits.
- **SignInPanel.tsx**: name-fields `grid-cols-2` → mobile base `grid-cols-1`, hoisted to `sm:grid-cols-2` for desktop (unchanged there); bump `text-[11px]` labels to a more legible mobile size.
- **OrderConfirmationCard.tsx**: revised during implementation — the 3-button row's width is fine on mobile (short one-word labels: "Copy link", "WhatsApp", "Share"); the real problem was touch-target *height* (`py-1.5` ≈ 30px). Bumped to `py-1.5 max-sm:py-2.5` on all three action buttons; grid columns unchanged at all widths.
- **UserMenu.tsx**: also dead code (not imported anywhere — App.tsx's own rail handles profile/sign-out). Fixed defensively anyway (`max-w-[calc(100vw-2rem)]` on the dropdown) in case it's wired up later, but not load-bearing today.
- Hover-only interactions found in dead/unused files are out of scope; any genuinely-used hover-only affordance found during implementation gets a tap-visible equivalent on touch (`@media (hover: none)` or always-visible on mobile).

## Testing / verification

- Use the `run`/browser tooling to load the app at a mobile viewport (375×812 and 360×640) and at a desktop viewport, before and after, and screenshot both.
- Confirm pixel-for-pixel desktop appearance is unchanged (spot check the rail, product grids, cart drawer, sign-in panel at `sm:`+ width).
- Confirm no horizontal scroll/overflow on mobile at 320px width (smallest common phone).
- Confirm bottom tab bar doesn't overlap the chat composer or get overlapped by the OS home-indicator area.

## Addenda (found during implementation)

- **Double-scroll bug (mobile + desktop):** `ChatSection` renders a fixed `height: 100dvh` box with its own internal scroll region (the message list). `App.tsx` was wrapping it in ancestors with additional padding (`main`'s `pb-6 pt-4`, an inner `pt-2`, and — after the shell rework — `app-shell`'s mobile tab-bar-clearance padding). All of that extra height stacked *outside* the 100dvh box, pushing total document height past one viewport and creating a second, page-level scrollbar that fought the chat's own internal scroll on both platforms. Fixed by making those paddings conditional on `messages.length === 0` (they still apply to the landing/`EmptyStatePlaceholder` page, which scrolls normally) so the active chat view has zero extra height stacked around its fixed box.
- **Redundant bottom tab bar vs. composer:** on mobile, the tab bar and the chat text composer both anchor to the bottom of the screen and compete for space once the keyboard opens. The tab bar now collapses (slides down, fades out) whenever the composer is focused, via `onComposerFocusChange` threaded from `ChatSection`'s textarea up to `App.tsx`, and the composer's own reserved bottom padding shrinks to match — giving the keyboard/input the freed space. Expands again on blur.
- **Overlapping badges on ProductCard (compact variant):** the SALE badge and the price badge were both absolutely positioned at the same `top-2.5 right-2.5` spot, so a discounted item showed two labels stacked on top of each other — the literal "too much notable content" the user flagged. Fixed by stacking them vertically in a shared column instead of overlapping.

## Out of scope

- `ConversationSidebar.tsx` (dead code, not rendered).
- Any change to `md:`/`lg:`/desktop-triggered visual values.
- Backend/data logic — this is UI/layout only.
