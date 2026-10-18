# Small-screen and accessibility test

Target: low-end Android phones, about 360 px wide, slow networks, users with limited digital literacy.

## Automated results (18 Oct 2026, Google Chrome)

- No horizontal scrolling on the facilitator details view (`overflow=0`).
- axe-core WCAG 2 A + AA: **0 violations** on the facilitator list, facilitator details and lessons screens.
- JS bundle: about 90 KB gzipped (React included). CSS is about 3 KB gzipped. No chart library.

## Manual checks

Use Chrome DevTools → Toggle device toolbar → *Galaxy S8+* or 360×740, then
repeat on a real phone if possible.

| # | Check | Expected | Status 18 Oct |
| --- | --- | --- | --- |
| G1 | Facilitator list at 360 px | One card per row, nothing cut off, no sideways scrolling | Pass |
| G2 | Overview numbers | 2×2 grid on phone, 4 in a row ≥ 600 px | Pass |
| G3 | Long names / IDs | Wrap, do not overflow | Pass (CSS `overflow-wrap`) |
| G4 | Every button | At least 44 px tall and clearly labelled ("View details", "Mark lesson as complete", "Sync now") | Pass |
| G5 | Text size | Base 17 px; zoom to 200 % still usable (Ctrl + +) | Pass: no sideways scroll at 320 px in English and Tamil (WCAG reflow, equals 200 % zoom on a 640 px screen) |
| G6 | Colour contrast | Text ≥ 4.5:1 (axe) in light mode | Pass in light **and** dark mode (axe, 0 violations) |
| G7 | Keyboard: Tab through header → nav → search → filter → cards → View details → Back | Visible orange focus ring; focus moves to the student name on open and back to the card on return | Pass (automated in Chrome: every control reachable, ring on every stop, focus returns to the card) |
| G8 | "Skip to main content" | First Tab shows the link; Enter jumps to content | Pass (first Tab shows it; Enter moves focus to main) |
| G9 | Status without colour | Every status has a symbol and text (✓ ○ ◐ ● !) | Pass |
| G10 | Screen reader (TalkBack): progress bar announces "1 of 2 modules completed (50%)" | Announced | Not tested — recommended |
| G11 | Tamil at 360 px | Longer Tamil words wrap; buttons stay readable | Pass (screenshot 06); text **not reviewed by a Tamil speaker** |
| G12 | Slow 3G (DevTools throttling) | "Loading students…" / "Loading lessons…" shown; no blank screen | Pass (Chrome, 2 s latency, 50 KB/s) |
| G13 | Landscape orientation | Layout still usable (manifest prefers portrait) | Pass (740×360, no sideways scroll) |
