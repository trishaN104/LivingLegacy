---
version: alpha
name: Kin
description: A family album printed in 1972 that someone pulled off a shelf today. Warm paper, sturdy serifs, hand-labeled tabs.

colors:
  primary: "#1F1B16"
  secondary: "#3D362E"
  tertiary: "#9C5862"
  accent: "#7B3F47"
  neutral: "#F5EFE5"
  surface: "#FAF3E2"
  surface-elevated: "#FFFAEC"
  divider: "#C8B7A0"
  ink-tertiary: "#56493A"
  on-primary: "#F5EFE5"
  on-tertiary: "#FFFAEC"
  record: "#9C5862"
  memorial-overlay: "#A89B8A"
  foliage-deep: "#3A4F2C"
  foliage-light: "#9DA98C"
  bark: "#9C8975"
  sage-plate: "#C8D0B7"
  blush-plate: "#F0DAD6"
  blush-deep: "#8B4A55"

typography:
  display-xl:
    fontFamily: Source Serif Pro
    fontSize: 3.5rem
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.01em
  display-l:
    fontFamily: Source Serif Pro
    fontSize: 2.5rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.005em
  display-m:
    fontFamily: Source Serif Pro
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.25
  topic:
    fontFamily: Source Serif Pro
    fontSize: 2rem
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: -0.005em
  transcript:
    fontFamily: Source Serif Pro
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.7
  pullquote:
    fontFamily: Source Serif Pro
    fontSize: 1.5rem
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: Source Serif Pro
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.55
  ui-md:
    fontFamily: Public Sans
    fontSize: 0.9375rem
    fontWeight: 500
    lineHeight: 1.4
  ui-sm:
    fontFamily: Public Sans
    fontSize: 0.8125rem
    fontWeight: 500
    lineHeight: 1.35
  metadata:
    fontFamily: Public Sans
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.06em
  ornamental-title:
    fontFamily: Source Serif Pro
    fontSize: 2.25rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.18em
  member-name-tree:
    fontFamily: Source Serif Pro
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.25
  member-dates:
    fontFamily: Source Serif Pro
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.04em

rounded:
  sm: 4px
  md: 8px
  lg: 16px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px

components:
  surface-page:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    padding: "{spacing.lg}"
  surface-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  profile-header:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.display-xl}"
    padding: "{spacing.xl}"
  memo-title:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.display-l}"
    padding: "{spacing.lg}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.md}"
    padding: "16px"
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.md}"
    padding: "16px"
  button-primary-pressed:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-primary}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.md}"
    padding: "16px"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.primary}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.md}"
    padding: "16px"
  button-secondary-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.md}"
    padding: "16px"
  button-ghost:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.tertiary}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.md}"
    padding: "14px"
  button-ghost-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.md}"
    padding: "14px"
  button-record:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.full}"
    padding: "20px"
  button-record-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.full}"
    padding: "20px"
  text-link:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.tertiary}"
    typography: "{typography.ui-sm}"
    padding: "0px"
  text-link-hover:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.accent}"
    typography: "{typography.ui-sm}"
    padding: "0px"
  transcript-block:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.transcript}"
    padding: "{spacing.md}"
  pullquote:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.pullquote}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  record-indicator:
    backgroundColor: "{colors.record}"
    rounded: "{rounded.full}"
    size: 14px
  topic-chip:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.secondary}"
    typography: "{typography.metadata}"
    rounded: "{rounded.full}"
    padding: "10px"
  topic-chip-selected:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.metadata}"
    rounded: "{rounded.full}"
    padding: "10px"
  category-tag:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.tertiary}"
    typography: "{typography.metadata}"
    rounded: "{rounded.sm}"
    padding: "6px"
  tree-node:
    backgroundColor: "{colors.sage-plate}"
    textColor: "{colors.foliage-deep}"
    typography: "{typography.member-name-tree}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  tree-node-ancestral:
    backgroundColor: "{colors.blush-plate}"
    textColor: "{colors.foliage-deep}"
    typography: "{typography.member-name-tree}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  tree-node-memorial:
    backgroundColor: "{colors.sage-plate}"
    textColor: "{colors.ink-tertiary}"
    typography: "{typography.member-name-tree}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  tree-portrait-oval:
    backgroundColor: "{colors.surface-elevated}"
    rounded: "{rounded.full}"
    height: 128px
    width: 96px
  tree-edge:
    backgroundColor: "{colors.foliage-deep}"
    height: 1.5px
  tree-branch:
    backgroundColor: "{colors.bark}"
    height: 4px
  tree-trunk:
    backgroundColor: "{colors.bark}"
    width: 80px
  tree-leaf-ornament:
    backgroundColor: "{colors.foliage-light}"
    size: 14px
  blossom-ornament:
    backgroundColor: "{colors.blush-plate}"
    size: 18px
  tree-page-title:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.foliage-deep}"
    typography: "{typography.ornamental-title}"
    padding: "{spacing.xl}"
  tree-page-subtitle:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.blush-deep}"
    typography: "{typography.metadata}"
    padding: "{spacing.sm}"
  page-tagline:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.blush-deep}"
    typography: "{typography.pullquote}"
    padding: "{spacing.lg}"
  member-dates:
    backgroundColor: "{colors.sage-plate}"
    textColor: "{colors.ink-tertiary}"
    typography: "{typography.member-dates}"
    padding: "{spacing.xs}"
  ornamental-divider:
    backgroundColor: "{colors.divider}"
    height: 1px
  corner-ornament:
    backgroundColor: "{colors.foliage-light}"
    size: 96px
  profile-portrait:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.full}"
    size: 128px
  profile-portrait-memorial:
    backgroundColor: "{colors.memorial-overlay}"
    rounded: "{rounded.full}"
    size: 128px
  voice-input-prompt:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.topic}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  listen-back-button:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.tertiary}"
    typography: "{typography.ui-md}"
    rounded: "{rounded.full}"
    padding: "16px"
  play-button-large:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 72px
---

## Overview

Kin is an archive that happens to be an app. The aesthetic commits to that order. Surfaces are warm paper, type is set in a sturdy serif, and the family tree is rendered as a literal hand-illustrated genealogy page — painted branches, sage leaves, blossoms in the corners, oval portraits framed and lined up by generation. Nothing in this system should feel "product-y." If a screen could plausibly be a page in an heirloom album someone's grandmother kept on the parlor shelf, it's in the right register.

The reference shelf: hand-painted family-tree posters, watercolor genealogy plates, Studio Ghibli interiors, the inside cover of a well-loved cookbook, StoryCorps booth interiors. Not Notion, not Linear, not WhatsApp, not any meditation app.

This is a system of two voices. **Source Serif Pro** carries everything that matters — names, questions, transcripts, pullquotes — at memoir-book proportions. **Public Sans** handles UI chrome and metadata, quietly. The serif speaks; the sans labels.

The system also holds two color registers with distinct roles, and they should not blur into each other:

- **The archival register** — sage, foliage, bark, blush. Used on the family tree, the genealogy ornaments, the member name plates, the page tagline, the corner blossoms. This is the voice of the album.
- **The interaction register** — deep ink and rose. Used on buttons, the record indicator, links, selected chips. This is the voice of "you can do something here."

A button is never sage. A name plate is never rose. The two registers tell the user where they are: in the archive, or in the act of contributing to it.

## Colors

The palette is warm and narrow. Each hue has one job:

- **{colors.neutral}** is the page itself — a warm cream. Every screen sits on this background. Pair it with a faint paper-grain overlay (~3% noise) so long-form content reads like print.
- **{colors.surface}** and **{colors.surface-elevated}** are the page-on-the-page — slightly warmer cream tones used for cards, transcript blocks, and pullquotes. They sit in front of {colors.neutral} without needing shadows.
- **{colors.primary}** is the deep ink. Near-black with a brown undertone — a fountain pen on aged paper, not the absolute black of UI labels. All body type, all primary buttons.
- **{colors.foliage-deep}** is the dark forest green that carries the **archival register**: tree-page titles, member names on the tree, dates, the leaves of the tree-edge lines. It is the color of the album's typography, never of buttons.
- **{colors.foliage-light}** is the sage of the painted leaves and corner ornaments — soft, watercolor-like, decorative only.
- **{colors.bark}** is the warm brown of the painted tree trunk and main branches. It's the spine of the family tree illustration.
- **{colors.sage-plate}** is the soft sage rectangle that holds living members' names and dates inside the tree. The default plate.
- **{colors.blush-plate}** is the dusty pink rectangle reserved for the topmost ancestral generation — the founders of the tree. It signals "this is where the family begins" without using any harder convention.
- **{colors.tertiary}** is the dusty rose that carries the **interaction register**: the record button, the selected topic chip, the category tag, the few text links. It is muted enough to feel like an album accent rather than an alert color.
- **{colors.accent}** is the deeper rose used only for hover/pressed states on {colors.tertiary} elements. It's never a first-tier color.
- **{colors.blush-deep}** is a deeper rose reserved for the ornamental tagline ("yet our roots remain as one") and the FAMILY TREE subtitle under the page title. It is decorative, not interactive.
- **{colors.divider}** is the soft hairline that separates the page title from the tree below it ({ornamental-divider}).
- **{colors.ink-tertiary}** carries metadata — dates on plates, durations, "recorded by," chapter labels. It must be readable but never compete with body text.
- **{colors.memorial-overlay}** is the desaturated tone applied to {profile-portrait-memorial}. Deceased family members are present in the tree at full presence, but on a memorial profile page their portrait reads as a gentle sepia wash rather than a full photograph.

There are no gradients except the optional paper-grain overlay and the watercolor wash of the painted tree.

## Typography

Source Serif Pro is committed across every register where a human is speaking — including the in-app questions Claude poses on the recorder's screen ({voice-input-prompt}, set in {typography.topic}). The sans is reserved for UI chrome.

- {typography.display-xl} is for **{profile-header}** — a person's full name on their own profile page, set large enough to feel like the title page of their chapter.
- {typography.display-l} is for **{memo-title}** — the topic of a single memo, displayed at the top of the Memo View like the title of an essay.
- {typography.display-m} is for section headings inside profile pages.
- {typography.member-name-tree} is for the member's name on a {tree-node} or {tree-node-ancestral} plate inside the family tree.
- {typography.member-dates} is for the birth/death year line beneath each name on a tree plate (e.g., "1942 – 2008", "1976 –").
- {typography.ornamental-title} is for **{tree-page-title}** — the all-caps surname at the top of the family-tree page. Heavily letter-spaced, set in {colors.foliage-deep}.
- {typography.topic} is for the question text Claude shows during recording, rendered in {voice-input-prompt}. The recorder reads it on screen; a neutral narrator voice speaks it aloud. The recipient's cloned voice never asks questions live during recording (see PLAN.md, post-Q1 decision).
- {typography.transcript} is the memoir-book setting: 1.125rem at 1.7 line-height, capped at 65ch line length. The full memo transcript renders in this style.
- {typography.pullquote} is the standalone-card serif italic for the 3–5 verbatim sentences Sonnet extracts after each memo.
- {typography.body} is for everything else that's prose but not transcript.
- {typography.ui-md}, {typography.ui-sm}, and {typography.metadata} are Public Sans, used only on buttons, chips, tags, and dates. The sans is quiet; the serif is loud.

Never use a system font. Never use Inter, Roboto, or "default UI sans." If Public Sans is unavailable, the fallback is the serif itself at smaller sizes — better visually inconsistent than visually generic.

## Layout

The system is generous with whitespace and patient with content density.

- Page padding is {spacing.lg} on mobile, {spacing.xl} on tablets and up. Breathing room around content is non-negotiable.
- Transcripts cap at 65 characters per line, regardless of viewport width. Wider transcripts feel like a chat log, not a book.
- The family tree page gets the full viewport — it's the spatial metaphor for the whole product. The tree is a **literal hand-illustrated genealogy page**, not a graph. A painted SVG backdrop carries the {tree-trunk} (warm brown, growing up the center), {tree-branch} elements splaying outward to each generation, watercolor sage leaves clustered along the branches, and corner ornaments of {blossom-ornament} (cherry-blossom pink) and {tree-leaf-ornament} (sage). Member portraits sit as oval frames ({tree-portrait-oval}) along the painted branches, with their {tree-node} or {tree-node-ancestral} name plate beneath each portrait. Generations are stacked top-down — ancestors at the top, descendants at the bottom — connected by short straight {tree-edge} segments overlaid on the painted branches to make parentage explicit. Position is layout-driven (top-down by generation), not force-directed.
- Stacks use {spacing.md} between related items, {spacing.xl} between sections, {spacing.2xl} between distinct screens-within-a-screen (e.g., transcript → audio player on a single Memo View).
- Profile portraits are circular ({profile-portrait}) at 128px on the profile page and 64px in lists. Inside the family tree, portraits are **oval** ({tree-portrait-oval}, 96×128) — this is the only place the system uses ovals, and it's deliberate: ovals belong to the genealogy-album register.

## Elevation & Depth

Almost flat by design. Shadows belong to digital products; this is paper.

- {surface-page} has no elevation.
- {surface-card}, {pullquote}, {voice-input-prompt} sit visually in front of {surface-page} via a slightly warmer fill ({colors.surface}) and a 1px {colors.divider} border at 40% opacity. No drop shadow.
- {button-primary} and {button-record} are the only elements that can carry a faint shadow on hover — a 0–4px translation in y, 8px blur, 8% {colors.primary} opacity. Use it sparingly.
- Modal/overlay surfaces use {surface-elevated} with a 12% {colors.primary} scrim behind them. Never glassmorphism. Never neumorphism.
- The paper-grain overlay (a tiled SVG noise pattern at 3% opacity in {colors.divider}) sits above {surface-page} on all screens. It's the closest thing to a shadow this system has.

## Shapes

Soft rounding throughout. Hard corners read as software.

- {rounded.sm} (4px) for {category-tag} and other small chips.
- {rounded.md} (8px) for buttons, inputs, and small surfaces.
- {rounded.lg} (16px) for {surface-card}, {pullquote}, and {voice-input-prompt}.
- {rounded.full} for portraits, the {record-indicator}, the breathing dot, the {topic-chip}, the {button-record} CTA, and the {play-button-large}.

There are no hard 90° corners anywhere a user touches.

## Components

Every component below pairs with a hover (and where applicable pressed) variant defined as a sibling token (e.g., {button-primary-hover}). Use the hover variant on `:hover`, the pressed on `:active`. Defaults below are the resting state.

- **{surface-page}** — the page background. Renders {colors.neutral} with a paper-grain overlay. Body text inherits {typography.body} from this surface.
- **{surface-card}** — anchored content blocks (memo cards in lists, "about them" sections). Slightly warmer than the page.
- **{profile-header}** — the title-page of a member's profile. {typography.display-xl}, generous {spacing.xl} padding, the portrait sits to its left.
- **{memo-title}** — the topic, displayed at the top of the Memo View in {typography.display-l}. The visual hook of a memo opening.
- **{voice-input-prompt}** — the centerpiece of the recording flow. Shows the current question in {typography.topic} on a {colors.surface} card, with a {record-indicator} in the corner. The recorder reads this and answers; a neutral narrator voice speaks the same text aloud (cloned voices are reserved for playback).
- **{button-primary}** — the dark-ink primary action. "Save," "Continue," "Wrap up." Used once per screen, ideally.
- **{button-secondary}** — the soft companion. "Back," "Cancel," "Skip for now."
- **{button-ghost}** — text-and-color only, on the page background. Used for tertiary actions ("Edit categories," "Add a member").
- **{button-record}** — the dusty-rose CTA, full-rounded. The only button that gets {colors.tertiary}. Used for "Start recording," "Record voice sample."
- **{listen-back-button}** — the calm "Want to hear it before sending?" affordance between audience selection and save. Soft surface-elevated background, rose text.
- **{play-button-large}** — the dominant audio control on the Memo View. Sits above the transcript, not below it. The demo's emotional payload depends on this being immediately findable.
- **{record-indicator}** — the breathing dot. {colors.record} on {colors.neutral}, animated at 1.4s in/out (no blink). Always present during recording, never red.
- **{topic-chip}** / **{topic-chip-selected}** — small pill chips for picking a recipient or topic. Selected state inverts to rose.
- **{category-tag}** — the auto-generated category labels (Recipes, Childhood, Stories about Nani). Small, uppercase-letter-spaced metadata.
- **{transcript-block}** — the memoir-book reading surface. {typography.transcript}, capped at 65ch.
- **{pullquote}** — large serif verbatim sentences on a {colors.surface} card.
- **{tree-page-title}** — the surname at the top of the family-tree page, all caps, generously letter-spaced, in {colors.foliage-deep}.
- **{tree-page-subtitle}** — the small letter-spaced "FAMILY TREE" caption beneath the title, in {colors.blush-deep}.
- **{ornamental-divider}** — a 1px {colors.divider} hairline between the subtitle and the tree, often centered with a small {tree-leaf-ornament} or {blossom-ornament} marker.
- **{tree-node}** — the default member plate inside the family tree. Soft sage rectangle with the member's name in {typography.member-name-tree} and dates in {typography.member-dates} below.
- **{tree-node-ancestral}** — the same plate in {colors.blush-plate} for the topmost ancestral generation only. Signals "the family begins here." Use for at most one generation.
- **{tree-node-memorial}** — sage plate with the member's name in {colors.ink-tertiary} (slightly faded). The dates are unchanged. Memorial members are present in the tree at full visual weight; the muted name is the only signal.
- **{tree-portrait-oval}** — the oval portrait frame that sits above each tree plate. 96×128 with {rounded.full} (capsule). The only oval surface in the system.
- **{tree-trunk}** — the warm-brown painted trunk that grows up through the center of the genealogy page. Rendered as a watercolor SVG, not a hard rectangle.
- **{tree-branch}** — the warm-brown painted branches splaying outward from the trunk to each generation. Always slightly irregular.
- **{tree-edge}** — short straight foliage-green segments overlaid on the painted branches to make parent→child relationships explicit. Without these, the painted tree alone wouldn't disambiguate which plate descends from which.
- **{tree-leaf-ornament}** — a small sage leaf used as an inline marker (under titles, between sections of the tree).
- **{blossom-ornament}** — a small dusty-pink blossom used in the corners of the tree page and as a heart accent above the {page-tagline}.
- **{corner-ornament}** — the larger leafy-blossom corner illustration in each corner of the family-tree page. Frames the page like an heirloom.
- **{page-tagline}** — the optional italic line set at the foot of the family-tree page in {colors.blush-deep} ({typography.pullquote}). Used sparingly — once per page if at all.
- **{member-dates}** — the small dates line ("1942 – 2008") rendered on a tree plate beneath the name.
- **{profile-portrait}** / **{profile-portrait-memorial}** — circular portrait crops on a member's profile page. The memorial variant adds a soft sepia overlay so deceased members read as gently faded rather than absent.
- **{text-link}** — inline links in body content. Rose, no underline at rest, underline on hover ({text-link-hover}).

## Do's and Don'ts

**Do.**

- Use {typography.transcript} for any prose longer than three sentences. Memoir-book proportions or nothing.
- Use {colors.tertiary} sparingly — record button, selected chip, category tag, link. If rose is on more than three elements per screen, you're using it wrong.
- Use {colors.foliage-deep}, {colors.sage-plate}, and {colors.blush-plate} **only inside the family-tree register** — the tree page, the genealogy ornaments, the corner illustrations. Never on a button, never on a card outside the tree page.
- Animate slowly. Crossfades, not slides. 250–400ms is the working range.
- Render the family tree as a hand-painted illustration — watercolor branches, irregular leaf clusters, a centered trunk that grows. Slight imperfection in the painted lines is the feature.
- Lead the Memo View with the {play-button-large}. Audio is the payload; transcript is the reference.

**Don't.**

- Don't use emojis. Anywhere.
- Don't use Inter, Roboto, system-ui, or any sans you didn't pick deliberately. Public Sans only for chrome.
- Don't blur the two color registers. The archival register (sage / foliage / bark / blush-plate) lives only on the family-tree page and its ornaments. The interaction register (ink / rose) lives on buttons, chips, and the recording flow. A sage button is wrong. A rose name plate is wrong.
- Don't render the family tree as a graph or org chart. It's a painted illustration; the connecting edges are a layer on top of the painting, not the primary visual.
- Don't use chat-bubble UI. Memos are pages, not bubbles.
- Don't use a red error toast. Errors are calm serif text on {surface-card} with a {button-secondary} retry.
- Don't put glassmorphism, neumorphism, or hard drop shadows on flat surfaces. The only shadow allowed is the optional hover lift on {button-primary} and {button-record}.
- Don't render Claude's narrator voice in a family member's cloned voice. Cloned voices are for memo questions only — never for app navigation.
- Don't blink the {record-indicator}. It breathes. Blinking is a notification dot; breathing is a presence.
- Don't use {colors.blush-plate} on more than one generation in the tree. It's reserved for the topmost ancestors as a structural cue, not a decorative rotation.
