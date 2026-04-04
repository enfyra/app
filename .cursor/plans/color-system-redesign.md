# Color System Redesign Plan

## Design Direction

**Utility & Function** (Linear/GitHub style) with **cool foundations** (slate) and **violet** as the single accent color. All neutral surfaces, borders, text, and shadows must reference CSS custom properties from `app/assets/css/theme.css` so light/dark mode is handled in one place. Glass classes should be removed in favor of solid surface tokens.

## Token Reference

### Surfaces
| Token | Light | Dark | Use for |
|---|---|---|---|
| `--surface-chrome` | `#e5e7eb` | `#09090b` | App shell behind inset card |
| `--surface-default` | `#ffffff` | `#18181b` | Cards, modals, drawers, main content |
| `--surface-muted` | `#f8fafc` | `#27272a` | Subtle bg within surfaces (code, stats) |
| `--surface-overlay` | `rgba(0,0,0,0.4)` | `rgba(0,0,0,0.6)` | Overlays/backdrops |

### Borders
| Token | Light | Dark |
|---|---|---|
| `--border-subtle` | `#f1f5f9` | `rgba(255,255,255,0.06)` |
| `--border-default` | `#e2e8f0` | `rgba(255,255,255,0.1)` |
| `--border-strong` | `#cbd5e1` | `rgba(255,255,255,0.16)` |
| `--border-accent` | `rgba(139,92,246,0.35)` | `rgba(139,92,246,0.4)` |

### Text
| Token | Light | Dark |
|---|---|---|
| `--text-primary` | `#0f172a` | `#fafafa` |
| `--text-secondary` | `#334155` | `#d4d4d8` |
| `--text-tertiary` | `#64748b` | `#a1a1aa` |
| `--text-quaternary` | `#94a3b8` | `#71717a` |
| `--text-disabled` | `#cbd5e1` | `#52525b` |

### Shadows
| Token | Use |
|---|---|
| `--shadow-xs` through `--shadow-2xl` | General elevation |
| `--shadow-primary` | Brand accent shadow |
| `--shadow-inset-card` | Inset main content area |

### Utility Classes
| Class | Effect |
|---|---|
| `.surface-card` | `background: var(--surface-default); border: 1px solid var(--border-default);` |
| `.surface-muted` | `background: var(--surface-muted);` |
| `.surface-card-hover` | surface-card + hover border/shadow effect |

### Brand Tokens
| Token | Value |
|---|---|
| `--brand-violet-deep` | `#6D28D9` |
| `--brand-violet-electric` | `#8B5CF6` |
| `--brand-violet-bright` | `#A78BFA` |

---

## File-by-File Changes

---

### app/pages/login.vue
- Line 3: `bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700` -- KEEP (decorative login hero panel, not a neutral surface)
- Line 5: `bg-white/10` -- KEEP (decorative floating orb on gradient background)
- Line 15: `bg-white/10` -- KEEP (decorative icon background on gradient)
- Line 53: `bg-gradient-to-br from-slate-200 via-gray-100 to-indigo-200 dark:from-gray-700 dark:via-gray-800 dark:to-indigo-950` -- replace with `bg-[var(--surface-chrome)]` (right panel background; gradient is unnecessary -- let token handle light/dark)
- Line 63: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (heading)
- Line 66: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (subtitle)
- Line 75: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (label)
- Line 95: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (label)
- Line 115: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (remember-me label)

---

### app/error.vue
- Line 3: `bg-white dark:bg-gray-900` -- replace with `bg-[var(--surface-default)]` (full-page error background)
- Line 15: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (error code heading)
- Line 26: `text-gray-400 dark:text-gray-600` -- replace with `text-[var(--text-quaternary)]` (404 icon)
- Line 33: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (error title)
- Line 38: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (error description)

---

### app/pages/me.vue
- Line 277: KEEP `bg-brand-500/10 dark:bg-brand-500/20` (intentional brand accent)
- Line 281: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (section heading)
- Line 284: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (section description)
- Line 309: KEEP `bg-emerald-500/10` (semantic success accent)
- Line 313: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (section heading)
- Line 316: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (section description)
- Line 360: KEEP `bg-amber-500/10` (semantic warning accent)
- Line 364: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (section heading)
- Line 367: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (section description)

---

### app/pages/data/[table]/index.vue
- Line 394: `text-gray-200` -- replace with `text-[var(--text-disabled)]` (faded placeholder text in empty state)
- Line 441: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (pagination description)
- Line 442: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (pagination numbers emphasis)
- Line 443: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (total count emphasis)

---

### app/pages/collections/index.vue
- Line 57: `text-gray-400 hover:text-gray-600 dark:hover:text-gray-300` -- replace with `text-[var(--text-quaternary)] hover:text-[var(--text-secondary)]` (close icon on search)
- Line 215: `border-gray-200/60 dark:border-white/5 bg-white dark:bg-zinc-900/40` -- replace with `surface-card` class (collection card)
- Line 239: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (card title)
- Line 242: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (card description)
- Line 248: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (stat label)
- Line 249: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (stat value)
- Line 254: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (stat label)
- Line 291: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (pagination description)
- Line 293: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (pagination emphasis)
- Line 298: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (total count)

---

### app/pages/collections/[table].vue
- Line 392: `text-gray-600 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (modal description)
- Line 400: `border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20` -- replace with `surface-card` class (modal section container)
- Line 403: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (table info text)
- Line 404: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (label)
- Line 408: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (sublabel)
- Line 425: `text-gray-900 dark:text-gray-100` -- replace with `text-[var(--text-primary)]` (heading)
- Line 426: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (subheading)
- Line 440: `border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20` -- replace with `surface-card` class (renamed columns section)
- Line 442: `text-gray-900 dark:text-gray-100` -- replace with `text-[var(--text-primary)]` (section title)
- Line 443: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (count)
- Line 447: `border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/40` -- replace with `bg-[var(--surface-muted)] border border-[var(--border-default)]` (code pill)
- Line 448: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (arrow icon)
- Line 449: `border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/40` -- replace with `bg-[var(--surface-muted)] border border-[var(--border-default)]` (code pill)
- Line 478: `border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20` -- replace with `surface-card` class (modified columns section)
- Line 480: `text-gray-900 dark:text-gray-100` -- replace with `text-[var(--text-primary)]` (section title)
- Line 481: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (count)
- Line 484: `border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/40 ... text-gray-900 dark:text-gray-100` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)] text-[var(--text-primary)]` (column badge)
- Line 490: `border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20` -- replace with `surface-card` class (uniques section)
- Line 492: `text-gray-900 dark:text-gray-100` -- replace with `text-[var(--text-primary)]` (section title)
- Line 493: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (count)
- Line 517: `border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20` -- replace with `surface-card` class (indexes section)
- Line 519: `text-gray-900 dark:text-gray-100` -- replace with `text-[var(--text-primary)]` (section title)
- Line 520: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (count)
- Line 562: `text-gray-900 dark:text-gray-100` -- replace with `text-[var(--text-primary)]` (confirm hash heading)
- Line 567: `border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/40` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)]` (hash code block)

---

### app/pages/packages/[id].vue
- Line 38: `bg-gray-800 text-green-400` -- KEEP (terminal/code block styling, intentionally dark)
- Line 46: `bg-gray-800 text-green-400` -- KEEP (terminal/code block styling)

---

### app/pages/packages/install.vue
- Line 7: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (label)
- Line 8: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (hint)
- Line 21: `border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/30 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50` -- replace with `surface-card-hover` class (option card inactive)
- Line 30: `bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 group-hover:text-gray-700 dark:group-hover:text-gray-300` -- replace with `bg-[var(--surface-muted)] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]` (icon bg inactive)
- Line 41: `text-gray-900 dark:text-white` and `text-gray-900 dark:text-gray-200` -- replace with `text-[var(--text-primary)]` (option label)
- Line 54: `text-gray-700 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 68: `border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/30 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50` -- replace with `surface-card-hover` class (option card inactive)
- Line 77: same as line 30 -- replace with `bg-[var(--surface-muted)] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]`
- Line 88: same as line 41 -- replace with `text-[var(--text-primary)]`
- Line 101: `text-gray-700 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 103: `text-gray-600 dark:text-gray-500` -- replace with `text-[var(--text-quaternary)]` (via import hint)
- Line 143: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (label)

---

### app/pages/storage/management/file/[id].vue
- Line 270-313: `bg-gray-100 dark:bg-gray-800` and `text-gray-600 dark:text-gray-300` -- the `bg-gray-100 dark:bg-gray-800` should be `bg-[var(--surface-muted)]`; the `text-gray-600 dark:text-gray-300` should be `text-[var(--text-secondary)]` (file type indicator backgrounds/text -- note: semantic colors like blue/purple/green are KEPT)
- Line 324: `bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-xl` -- replace with `surface-card` class + `shadow-[var(--shadow-xl)]` (file preview card)
- Line 359: `bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50` -- replace with `surface-card` class (metadata card)
- Line 385: `bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50` -- replace with `surface-card` class (additional info card)

---

### app/pages/storage/management/index.vue
- Line 260: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (count label)
- Line 279: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (count label)
- Line 309: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (form label)

---

### app/pages/storage/management/folder/[id].vue
- Line 277: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (count label)
- Line 296: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (count label)
- Line 326: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (form label)

---

### app/pages/storage/config/index.vue
- Line 84: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (status label)
- Line 137: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (pagination)
- Line 138: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (pagination emphasis)

---

### app/pages/settings/flows/[id].vue
- Line 37: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (heading)
- Line 59: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (heading)
- Line 67: `bg-gray-50 dark:bg-gray-800` -- replace with `bg-[var(--surface-muted)]` (step accordion header)
- Line 73: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (timestamp)
- Line 76: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (duration)
- Line 77: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (chevron icon)
- Line 86: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (empty state)
- Line 103: `bg-gray-200 dark:bg-gray-700` -- replace with `bg-[var(--surface-muted)]` (inline code bg)
- Line 108: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (unit suffix)
- Line 116: `bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800` -- replace with `bg-[var(--surface-muted)] border-[var(--border-default)]` (config panel)
- Line 134: `bg-gray-50 dark:bg-gray-800` -- replace with `bg-[var(--surface-muted)]` (parent info panel)
- Line 135: `text-gray-500` -- replace with `text-[var(--text-tertiary)]`
- Line 137: `text-gray-500` -- replace with `text-[var(--text-tertiary)]`
- Line 152: `border-gray-200 dark:border-gray-700` -- replace with `border-[var(--border-default)]` (section divider)
- Line 155: `bg-gray-200 dark:bg-gray-700` -- replace with `bg-[var(--surface-muted)]` (inline code bg)
- Line 158: `border-gray-200 dark:border-gray-700` -- replace with `border-[var(--border-default)]` (section divider)
- Line 166: `bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300` -- replace with `bg-[var(--surface-muted)] border border-[var(--border-default)] text-[var(--text-secondary)]` (code output)
- Line 168: `border-gray-200 dark:border-gray-700` -- replace with `border-[var(--border-default)]` (section divider)
- Lines 193, 197, 201, 205: `bg-gray-50 dark:bg-gray-800` -- replace with `bg-[var(--surface-muted)]` (execution detail cards)
- Lines 194, 198, 202, 206: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (labels)
- Line 230: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (steps label)
- Line 234: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (skipped step)
- Line 238: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (duration)
- Line 239: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (chevron icon)
- Line 241: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (skip reason)
- Line 242: `bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400` -- replace with `bg-[var(--surface-muted)] text-[var(--text-tertiary)]` (step context code)

---

### app/pages/settings/flows/index.vue
- Line 80: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (pagination description)
- Line 81: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (pagination emphasis)

---

### app/pages/settings/websockets/index.vue
- Line 93: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (pagination)
- Line 94: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (pagination emphasis)

---

### app/pages/settings/websockets/[id].vue
- Line 43: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (heading)

---

### app/pages/settings/users/index.vue
- Line 95: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (pagination)
- Line 96: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (pagination emphasis)

---

### app/pages/settings/roles/index.vue
- Line 193: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (pagination)
- Line 194: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (pagination emphasis)

---

### app/pages/settings/extensions/index.vue
- Line 90: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (pagination)
- Line 91: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (pagination emphasis)

---

### app/pages/settings/bootstrap/index.vue
- Line 192: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (pagination)
- Line 193: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (pagination emphasis)

---

### app/pages/settings/oauth/accounts/index.vue
- Line 73: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (pagination)
- Line 74: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (pagination emphasis)

---

### app/pages/settings/routings/index.vue
- Line 428: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (pagination)
- Line 429: `text-gray-700 dark:text-gray-200` -- replace with `text-[var(--text-secondary)]` (pagination emphasis)

---

### app/pages/settings/routings/[id].vue
- Line 8: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (heading)
- Line 17: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 18: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (table name)
- Line 21: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (additional info)

---

### app/pages/settings/admin/cache.vue
- Line 97: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 104: `border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-600` -- replace with `surface-card-hover` class (action card)
- Line 109: `bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400` -- replace with `bg-[var(--surface-muted)] text-[var(--text-tertiary)]` (icon bg)
- Line 115: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (action name)
- Line 118: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)

---

### app/pages/settings/admin/logs.vue
- Line 451: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (stat value)
- Line 454: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (stat label)
- Line 464: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (stat value)
- Line 467: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (stat label)
- Line 477: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (live label)
- Line 478: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (monitoring label)

---

### app/pages/settings/api-tester/index.vue
- Line 12: `text-gray-600 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (section label)
- Line 21: KEEP `bg-primary-100 dark:bg-primary-900/40` (semantic primary accent)
- Line 24: `text-gray-800 dark:text-gray-200` -- replace with `text-[var(--text-primary)]` (route path)
- Line 37: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (chevron icon)
- Line 38: `text-gray-600 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (section label)
- Line 40: `border-gray-300 border-t-primary-500` -- the `border-gray-300` should be `border-[var(--border-strong)]` (spinner border)
- Line 50: `bg-gray-100 dark:bg-gray-700` -- replace with `bg-[var(--surface-muted)]` (system route icon bg)
- Line 51: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (icon)
- Line 53: `text-gray-800 dark:text-gray-200` -- replace with `text-[var(--text-primary)]` (route path)

---

### app/pages/settings/general/index.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/layout/Header.vue
- Line 37: `!bg-white !border-2 !border-gray-400 !text-gray-800 hover:!bg-gray-100 hover:!border-gray-500 dark:!bg-gray-800 dark:!border-gray-600 dark:!text-gray-200 dark:hover:!bg-gray-700` -- replace with `!bg-[var(--surface-default)] !border-2 !border-[var(--border-strong)] !text-[var(--text-primary)] hover:!bg-[var(--surface-muted)] hover:!border-[var(--border-strong)]` (filter-active button style)

---

### app/components/layout/SubHeader.vue
- Line 3: `border-gray-200 dark:border-gray-800` -- replace with `border-[var(--border-default)]` (sub-header bottom border)
- Line 46: `!bg-white !border !border-gray-400 !text-gray-800 hover:!bg-gray-100 hover:!border-gray-500 dark:!bg-gray-800 dark:!border-gray-600 dark:!text-gray-200 dark:hover:!bg-gray-700` -- replace with `!bg-[var(--surface-default)] !border !border-[var(--border-strong)] !text-[var(--text-primary)] hover:!bg-[var(--surface-muted)]` (filter-active button)
- Line 89: same as line 46 -- same replacement

---

### app/components/sidebar/UnifiedSidebar.vue
- Line 166: `border-neutral-300 dark:border-neutral-700` -- replace with `border-[var(--border-default)]` (sidebar separator)

---

### app/components/common/PageHeader.vue
- Line 146: `!bg-white !border !border-gray-400 !text-gray-800 hover:!bg-gray-100 hover:!border-gray-500 dark:!bg-gray-800 dark:!border-gray-600 dark:!text-gray-200 dark:hover:!bg-gray-700` -- replace with `!bg-[var(--surface-default)] !border !border-[var(--border-strong)] !text-[var(--text-primary)] hover:!bg-[var(--surface-muted)]` (filter-active button)
- Line 183: same as line 146 -- same replacement
- Line 204: `border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]` -- replace with `surface-card` class (stat card)

---

### app/components/common/SettingsCard.vue
- Line 40: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (card title)
- Line 43: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 78: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (meta label)
- Line 81: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (meta value)
- Line 110: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (section value)
- Line 130: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (section label)

---

### app/components/common/ListItem.vue
- Line 4: `bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 ... hover:bg-gray-50 dark:hover:bg-white/5` -- replace with `surface-card-hover` class (list item card)
- Line 58: `border-gray-200 dark:border-gray-800` -- replace with `border-[var(--border-default)]` (footer separator)

---

### app/components/common/UploadModal.vue
- Line 26: `border-gray-300 dark:border-gray-600` -- replace with `border-[var(--border-strong)]` (drop zone border)
- Line 41: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (upload icon)
- Line 45: `text-gray-900 dark:text-gray-100` -- replace with `text-[var(--text-primary)]` (title)
- Line 49: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 92: `text-gray-900 dark:text-gray-100` -- replace with `text-[var(--text-primary)]` (file name)
- Line 97: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (file size)

---

### app/components/common/LazyImage.vue
- Line 13: `bg-gray-200 dark:bg-gray-700` -- replace with `bg-[var(--surface-muted)]` (placeholder background)
- Line 35: `bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500` -- replace with `bg-[var(--surface-muted)] text-[var(--text-quaternary)]` (fallback)

---

### app/components/common/BrandingHeader.vue
- Line 2: `border-gray-600` -- replace with `border-[var(--border-default)]` (branding header border)

---

### app/components/common/GlobalConfirm.vue
- Line 44: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (confirmation text)

---

### app/components/common/ErrorState.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/common/LoadingState.vue
- Line 55: `color="#7C3AED"` -- replace with `color="var(--brand-violet-electric)"` (loading spinner color)
- Line 103: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (loading title)
- Line 111: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (loading description)

---

### app/components/common/loading/Skeleton.vue
- Line 256: `['#3B82F6', '#7C3AED', '#F59E0B', '#14B8A6']` -- the `#7C3AED` should use `var(--brand-violet-electric)` if possible (skeleton color palette)
- Line 281: `bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800` -- replace with `surface-card` class (menu preview skeleton)
- Lines 285-298: all `bg-gray-200 dark:bg-gray-700` -- replace with `bg-[var(--surface-muted)]` (skeleton blocks within menu preview)

---

### app/components/common/loading/Progress.vue
- Line 48: `bg-gray-200 dark:bg-gray-700` -- replace with `bg-[var(--surface-muted)]` (linear progress track)
- Line 78: `'#7C3AED'` -- replace with `var(--brand-violet-electric)` (circular progress stroke color)

---

### app/components/common/loading/Bars.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/common/loading/Dots.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/common/loading/Spinner.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/data-table/DataTable.vue
- Line 218-229: `bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80` -- replace with `bg-[var(--surface-muted)] text-[var(--text-secondary)]` (method badge gray variant)
- Line 311: `border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-800/40` -- replace with `surface-card-hover` class (mobile card)
- Line 314: `border-gray-200 dark:border-gray-700/50` -- replace with `border-[var(--border-default)]` (card header divider)
- Line 317: `text-gray-500 dark:text-gray-500` -- replace with `text-[var(--text-tertiary)]` (ID label)
- Line 321: `text-gray-900 dark:text-gray-200` -- replace with `text-[var(--text-primary)]` (primary field value)
- Line 340: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (column label)
- Line 341: `text-gray-900 dark:text-gray-200` -- replace with `text-[var(--text-primary)]` (cell value)
- Line 354: `border-gray-200 dark:border-gray-700/50 text-gray-500 dark:text-gray-500` -- replace with `border-[var(--border-default)] text-[var(--text-tertiary)]` (card footer)
- Line 379: `border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900/30` -- replace with `surface-card` class (skeleton card)
- Line 381: `border-gray-200 dark:border-gray-700/50` -- replace with `border-[var(--border-default)]` (skeleton divider)
- Line 399: `bg-white dark:bg-white/[0.03]` -- replace with `bg-[var(--surface-default)]` (table container)
- Line 418: `hover:bg-gray-50 dark:hover:bg-white/5` -- replace with `hover:bg-[var(--surface-muted)]` (header hover)
- Line 439: `text-gray-500 ... dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (header cell text)
- Line 458: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (sort icon)
- Line 496: `hover:bg-gray-50 dark:hover:bg-white/5` -- replace with `hover:bg-[var(--surface-muted)]` (row hover)
- Line 518, 560: `text-gray-500 ... dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (cell text)
- Line 537: same as 496 pattern

---

### app/components/data-table/ColumnSelector.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/collection/SchemaViewer.vue
- Line 5: `from-gray-100/80 to-gray-200/40 dark:from-gray-900/50 dark:to-gray-800/10 ... border-gray-300/50 dark:border-gray-700/30` -- replace with `bg-[var(--surface-muted)] border border-[var(--border-default)]` (schema header)
- Lines 9, 28, 49, 78, 98: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (section headings)
- Lines 18, 39, 63, 87, 107: `bg-gray-900` (dark) / `bg-white ... border border-gray-200` (light) -- replace both branches with `surface-card` class (code block containers)
- Line 52: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]`
- Line 124: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]`

---

### app/components/extension/ExtensionPreviewModal.vue
- Line 56: `border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800` -- replace with `surface-card` class (extension card)

---

### app/components/filter/Builder.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/filter/Condition.vue
- Line 54: `border border-gray-200 dark:border-gray-700 ... bg-white dark:bg-gray-800/50` -- replace with `surface-card` class (condition card)
- Lines 60, 83, 105: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (field labels)

---

### app/components/filter/Drawer.vue
- Line 115: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (hint)
- Line 129: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (summary)
- Line 158: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (advanced text)

---

### app/components/filter/DrawerLazy.vue
- Line 15: `text-gray-600` -- replace with `text-[var(--text-tertiary)]` (loading text)

---

### app/components/filter/Group.vue
- Line 305: `bg-gray-100 dark:bg-gray-800` -- replace with `bg-[var(--surface-muted)]` (operator badge)
- Line 312: `border-gray-200 dark:border-gray-700` -- replace with `border-[var(--border-default)]` (nested group border)
- Line 332: `text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300` -- replace with `text-[var(--text-quaternary)] hover:text-[var(--text-secondary)]` (drag handle)
- Line 353: `border border-gray-200 dark:border-gray-700` -- replace with `border border-[var(--border-default)]` (condition wrapper)
- Line 361: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (operator label)
- Line 413: `border-gray-300 dark:border-gray-600` -- replace with `border-[var(--border-strong)]` (add button border)
- Line 418: `text-gray-400 dark:text-gray-500` -- replace with `text-[var(--text-quaternary)]` (drop target hint)

---

### app/components/filter/Preview.vue
- Line 70: `border-gray-200 dark:border-gray-700` -- replace with `border-[var(--border-default)]` (section divider)
- Line 74: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (section label)
- Line 109: `bg-gray-900 dark:bg-gray-950` -- KEEP or replace with `bg-[var(--prose-pre-bg)]` (JSON preview code block, intentionally dark)
- Line 115: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (empty hint)

---

### app/components/filter/SavedFilters.vue
- Line 143: `border-gray-200 dark:border-gray-800` -- replace with `border-[var(--border-default)]` (section divider)
- Line 146: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (heading)
- Line 173: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (section label)
- Line 186: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (filter name)
- Line 189: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 199: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (section label)
- Line 207: `border-gray-200 dark:border-gray-800 lg:hover:border-gray-300 dark:lg:hover:border-gray-700 lg:hover:bg-gray-50 dark:lg:hover:bg-white/5` -- replace with `surface-card-hover` class (saved filter item)
- Line 211: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (filter name)
- Line 214: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 250: `text-gray-400 dark:text-gray-500` -- replace with `text-[var(--text-quaternary)]` (empty icon)
- Line 252: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (empty text)
- Line 255: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (empty hint)
- Line 267: `text-gray-400 dark:text-gray-500` -- replace with `text-[var(--text-quaternary)]` (empty icon)
- Line 269: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (empty text)
- Line 293: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (form label)

---

### app/components/filter/ValueInput.vue
- Line 8: `text-gray-600` -- replace with `text-[var(--text-tertiary)]` (null label)
- Line 49: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (and label)

---

### app/components/filter/ArrayInput.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/filter/DatePicker.vue (if exists)
- Line 46: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (and label)

---

### app/components/file/FileManager.vue
- Line 304: `border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]` -- replace with `surface-card` class (folder section card)
- Line 305: `border-gray-200 dark:border-gray-800` -- replace with `border-[var(--border-default)]` (header border)
- Line 306: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (heading)
- Line 327: `border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]` -- replace with `surface-card` class (file section card)
- Line 328: `border-gray-200 dark:border-gray-800` -- replace with `border-[var(--border-default)]` (header border)
- Line 329: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (heading)

---

### app/components/file/FileView.vue
- Line 114: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (file name)
- Line 341: `text-gray-400 dark:text-gray-500` -- replace with `text-[var(--text-quaternary)]` (empty icon)
- Line 343: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (empty text)
- Line 346: `text-gray-400 dark:text-gray-500` -- replace with `text-[var(--text-quaternary)]` (empty description)

---

### app/components/file/grid/FileGridCard.vue
- Line 10: `border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]` -- replace with `surface-card` class (file card)
- Line 13: `hover:border-gray-300 dark:hover:border-gray-700` -- replace with `hover:border-[var(--border-strong)]` (hover border)
- Line 48: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (meta info)
- Line 69: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (more icon)
- Line 77: `bg-white dark:bg-gray-800` -- replace with `bg-[var(--surface-default)]` (checkbox background)
- Line 383: `bg-gray-50 dark:bg-gray-500/20` -- replace with `bg-[var(--surface-muted)]` (generic file type bg)

---

### app/components/file/grid/FileGridEditableName.vue
- Line 13: `bg-white dark:bg-gray-800 border border-gray-300 dark:border-primary ... text-gray-900 dark:text-white` -- replace with `bg-[var(--surface-default)] border border-[var(--border-strong)] text-[var(--text-primary)]` (editable input)
- Line 48: `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]` (display name)

---

### app/components/folder/grid/Card.vue
- Line 7: `border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]` -- replace with `surface-card` class (folder card)
- Line 10: `hover:border-gray-300 dark:hover:border-gray-700` -- replace with `hover:border-[var(--border-strong)]` (hover border)
- Line 35: `bg-white dark:bg-gray-800` -- replace with `bg-[var(--surface-default)]` (checkbox bg)

---

### app/components/folder/grid/Actions.vue
- Line 4: `border-gray-100 dark:border-gray-700` -- replace with `border-[var(--border-subtle)]` (action separator)
- Line 29: `border-gray-100 dark:border-gray-700` -- replace with `border-[var(--border-subtle)]` (action separator)

---

### app/components/folder/grid/EditableName.vue
- Line 13: `bg-white dark:bg-gray-800 border border-gray-300 dark:border-primary ... text-gray-900 dark:text-white` -- replace with `bg-[var(--surface-default)] border border-[var(--border-strong)] text-[var(--text-primary)]` (editable input)

---

### app/components/folder/grid/Preview.vue
- Line 14: `#7C3AED20` -- replace with `rgba(var(--brand-violet-deep), 0.125)` or define a `--brand-violet-glow` token (decorative radial gradient, can keep as brand)
- Line 23: `color: #7C3AED` -- replace with `color: var(--brand-violet-deep)` (icon color)

---

### app/components/folder/grid/IconSquare.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/folder/FolderDetailModal.vue
- Line 23, 28: `"#7C3AED"` -- replace with `var(--brand-violet-deep)` (icon color fallback)
- Line 75: `color: #7C3AED` -- replace with `color: var(--brand-violet-deep)` (inline style)
- Lines 91, 116, 137, 159: `bg-gray-900/50` -- replace with `bg-[var(--surface-muted)]` (info panels)
- Line 174: `text-gray-400 bg-gray-950` -- replace with `text-[var(--text-quaternary)] bg-[var(--surface-muted)]` (code block)

---

### app/components/folder/FolderGrid.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/folder/FolderView.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/CodeEditor.vue
- Line 315: `ring-gray-700` / `ring-gray-200` -- replace with `ring-[var(--border-default)]` (editor ring border)
- Line 333: `hover:bg-gray-300 dark:hover:bg-gray-600/50` -- replace with `hover:bg-[var(--surface-muted)]` (resize handle hover)
- Line 334: `bg-gray-300 dark:bg-gray-600/50` -- replace with `bg-[var(--surface-muted)]` (resize handle active)
- Line 338: `bg-gray-400 dark:bg-gray-500 group-hover:bg-gray-500 dark:group-hover:bg-gray-400` -- replace with `bg-[var(--text-quaternary)] group-hover:bg-[var(--text-tertiary)]` (resize indicator bar)

---

### app/components/form/CodeEditorLazy.vue
- Line 14: `bg-gray-50 dark:bg-gray-800 ... border-gray-200 dark:border-gray-700` -- replace with `bg-[var(--surface-muted)] border-[var(--border-default)]` (loading placeholder)
- Line 17: `text-gray-600 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (loading text)

---

### app/components/form/RichTextEditor.vue
- Line 637: `hover:bg-gray-200 dark:hover:bg-gray-700` -- replace with `hover:bg-[var(--surface-muted)]` (toolbar button hover)
- Line 638: `bg-gray-300 dark:bg-gray-600` -- replace with `bg-[var(--border-strong)]` (toolbar button active -- using border-strong as a bg tint)
- Line 932: `border border-gray-300 dark:border-gray-700 ... dark:bg-gray-900` -- replace with `border border-[var(--border-strong)] bg-[var(--surface-default)]` (editor wrapper)
- Line 934: `border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03]` -- replace with `border-[var(--border-subtle)] bg-[var(--surface-muted)]` (disabled state)
- Line 941: `bg-gray-50 dark:bg-gray-800/50` / `bg-transparent dark:bg-gray-900` -- replace with `bg-[var(--surface-muted)]` / `bg-[var(--surface-default)]` (editor content area)
- Line 946: `border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)]` (toolbar)
- Line 950: `bg-gray-200 dark:bg-gray-700` -- replace with `bg-[var(--border-default)]` (toolbar divider)
- Line 973: `bg-gray-200 dark:bg-gray-700` -- replace with `bg-[var(--border-default)]` (toolbar divider)
- Lines 1010-1011: `hover:bg-gray-600/50 dark:hover:bg-gray-500/50` and `bg-gray-600/50 dark:bg-gray-500/50` -- replace with `hover:bg-[var(--surface-muted)]` and `bg-[var(--surface-muted)]` (resize handle)
- Line 1015: `bg-gray-500 dark:bg-gray-400 group-hover:bg-gray-400 dark:group-hover:bg-gray-300` -- replace with `bg-[var(--text-quaternary)] group-hover:bg-[var(--text-tertiary)]` (resize indicator)
- Line 1025: `bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600` -- replace with `bg-[var(--surface-default)] border border-[var(--border-strong)]` (context menu)
- Line 1029: `text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700` -- replace with `text-[var(--text-tertiary)] border-[var(--border-default)]` (context menu header)
- Lines 1034-1099 (10 menu items): `hover:bg-gray-100 dark:hover:bg-gray-700` -- replace with `hover:bg-[var(--surface-muted)]` (context menu item hover)
- Lines 1053, 1075, 1104, 1254: `border-gray-200 dark:border-gray-700` -- replace with `border-[var(--border-default)]` (context menu dividers)
- Lines 1120, 1155: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (modal labels)
- Lines 1126, 1161: `border border-gray-300 dark:border-gray-600 ... bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100` -- replace with `border border-[var(--border-strong)] bg-[var(--surface-default)] text-[var(--text-primary)]` (modal inputs)
- Lines 1135, 1170: `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700` -- replace with `text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]` (cancel buttons)
- Lines 1192-1248 (7 table actions): `hover:bg-gray-100 dark:hover:bg-gray-800` -- replace with `hover:bg-[var(--surface-muted)]` (table action hover)
- Lines 1194-1222 (icons): `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (action icons)
- Lines 1195-1223 (labels): `text-gray-600 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (action labels)

---

### app/components/form/RichTextEditorLazy.vue
- Line 5: `bg-gray-50 dark:bg-gray-800 ... border-gray-200 dark:border-gray-700` -- replace with `bg-[var(--surface-muted)] border-[var(--border-default)]` (loading placeholder)

---

### app/components/form/FieldRenderer.vue
- Line 487: `bg-gray-100` -- replace with `bg-[var(--surface-muted)]` (separator/hr background)

---

### app/components/form/Editor.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/EditorLazy.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/Field.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/DateField.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/EnumPicker.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/MethodSelector.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/UuidField.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/ArraySelectDisplay.vue
- Line 19: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (empty state italic text)

---

### app/components/form/ArraySelectEditor.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/FieldLoadingSkeleton.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/permission/Field.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/permission/InlineEditor.vue
- Line 48: `bg-gray-800/50` -- replace with `bg-[var(--surface-muted)]` (action row background)

---

### app/components/form/permission/Editor.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/permission/Group.vue
- Line 16: `bg-gray-100` -- replace with `bg-[var(--surface-muted)]` (operator badge)

---

### app/components/form/permission/RoutePicker.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/permission/Selector.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/relation/Selector.vue
- Line 214: `border-gray-200 dark:border-gray-700/30 ... bg-white dark:bg-gray-800/50` -- replace with `surface-card` class (empty state card)
- Line 310: `border-gray-200 dark:border-gray-700/30 ... bg-white dark:bg-gray-800/50` -- replace with `surface-card` class (create card)
- Line 358: `border-gray-200 dark:border-gray-700/30 ... bg-white dark:bg-gray-800/50` -- replace with `surface-card` class (table card)

---

### app/components/form/relation/List.vue
- Line 292: `hover:bg-gray-200 dark:hover:bg-white/15` -- replace with `hover:bg-[var(--surface-muted)]` (list item hover)
- Line 293: `border-gray-200 dark:border-gray-700` -- replace with `border-[var(--border-default)]` (list item border)
- Line 325: `border-gray-200 dark:border-gray-700` -- replace with `border-[var(--border-default)]` (action column border)
- Line 349: `border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/20` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)]` (pagination bar)

---

### app/components/form/relation/InlineEditor.vue
- Line 106: `text-gray-600 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (edit icon)
- Line 116: `text-gray-600 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (delete icon)

---

### app/components/form/relation/CreateDrawer.vue
- Line 90: `bg-gray-800/50` -- replace with `bg-[var(--surface-muted)]` (form section bg)
- Line 102: `bg-gray-800/50` -- replace with `bg-[var(--surface-muted)]` (form section bg)

---

### app/components/form/relation/Actions.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/form/relation/Pagination.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/flow/FlowCanvas.vue
- Line 2: `border-gray-200 dark:border-gray-800 ... bg-gray-50 dark:bg-gray-900/50` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)]` (canvas container)

---

### app/components/flow/FlowStepNode.vue
- Line 11: `ring-white dark:ring-gray-900` -- replace with `ring-[var(--surface-default)]` (status badge ring)
- Line 14: `ring-white dark:ring-gray-900` -- replace with `ring-[var(--surface-default)]` (status badge ring)
- Line 17: `ring-white dark:ring-gray-900` -- replace with `ring-[var(--surface-default)]` (status badge ring)
- Line 20: `bg-gray-400 ... ring-white dark:ring-gray-900` -- replace `bg-gray-400` with `bg-[var(--text-quaternary)]`; ring with `ring-[var(--surface-default)]` (skipped status badge)
- Line 30: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (step name)
- Line 41: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 57: `text-gray-400` and `hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200` -- replace with `text-[var(--text-quaternary)]` and `hover:bg-[var(--surface-muted)] hover:text-[var(--text-secondary)]` (move up button)
- Line 60: same as 57 (move down button)
- Line 100: `border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800` -- replace with `border-dashed border-[var(--border-strong)] bg-[var(--surface-default)]` (add step card)
- Line 101: `border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/40` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)]` (disabled step)
- Line 102: `border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800` -- replace with `border-[var(--border-default)] bg-[var(--surface-default)]` (normal step)
- Line 110: `bg-gray-100 dark:bg-gray-700 ... text-gray-500 dark:text-gray-400` -- replace with `bg-[var(--surface-muted)] text-[var(--text-tertiary)]` (disabled icon bg)

---

### app/components/flow/StepConfigEditor.vue
- Lines 5, 13 (multiple): `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description text)
- Lines 5, 13, 103, 155 (multiple): `bg-gray-200 dark:bg-gray-700` -- replace with `bg-[var(--surface-muted)]` (inline code blocks)
- Lines 21, 26, 34, 47, 58, 72, 83, 100, 111, 114, 121: various `text-gray-400` / `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` or `text-[var(--text-quaternary)]` as appropriate

---

### app/components/flow/TablePicker.vue
- Line 15: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (icon)
- Line 19: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (icon)
- Line 24: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (loading/empty text)

---

### app/components/flow/TriggerConfigEditor.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/log/LogDetailViewer.vue
- Line 80: `bg-white dark:bg-gray-950` -- replace with `bg-[var(--surface-default)]` (full-screen log viewer bg)
- Line 83: `border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)]` (header bar)
- Line 97: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (filename)
- Line 98: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (file info)
- Line 196: `bg-gray-50 dark:bg-gray-950` -- replace with `bg-[var(--surface-muted)]` (log content area)
- Line 205: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (error message)
- Line 214: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (empty icon)
- Line 215: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (empty text)
- Line 231: `hover:bg-gray-200/50 dark:hover:bg-gray-800/50` -- replace with `hover:bg-[var(--surface-muted)]` (line hover)
- Line 233: `text-gray-400 dark:text-gray-600` -- replace with `text-[var(--text-disabled)]` (line numbers)
- Line 234: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (log line text)

---

### app/components/menu/MenuItemEditor.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/menu/MenuVisualEditor.vue
- Line 137: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (empty icon)
- Line 138: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (empty text)
- Line 198, 212: `rgba(139, 92, 246, 0.1)` in `<style>` -- these are brand accent styles. KEEP (drag-drop visual feedback).

---

### app/components/menu/MenuVisualEditorItem.vue
- Line 334: `text-gray-400 dark:text-gray-500` -- replace with `text-[var(--text-quaternary)]` (drag handle)
- Line 338: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (item label)
- Line 342: `text-gray-400 dark:text-gray-500` -- replace with `text-[var(--text-quaternary)]` (link icon)
- Line 394: `text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300` -- replace with `text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]` (action icons)
- Line 513: `text-gray-400 dark:text-gray-500` -- replace with `text-[var(--text-quaternary)]` (drag handle)
- Line 517: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (item label)
- Line 521: `text-gray-400 dark:text-gray-500` -- replace with `text-[var(--text-quaternary)]` (link icon)
- Line 641, 664, 666, 671, 676, 681: `rgba(139, 92, 246, *)` -- KEEP (brand violet accent for drag-drop indicators)

---

### app/components/npm/PackageSearch.vue
- Line 26: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (search icon)
- Line 30: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (result count)
- Line 81: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (meta info)
- Line 88: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (separator dot)
- Line 119: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (description)
- Line 124: `text-gray-500` -- replace with `text-[var(--text-tertiary)]` (stats)
- Line 147: `hover:bg-gray-700/50` -- KEEP or replace with `hover:bg-[var(--surface-muted)]` (npm result hover -- appears to be dark-only context)
- Line 155: `hover:bg-gray-700/50` -- same as 147

---

### app/components/permission/PermissionManager.vue
- Line 42: `bg-white dark:bg-gray-800/50 ... border-gray-200 dark:border-gray-700/50` -- replace with `surface-card` class (permission group card)
- Line 57: `text-gray-900 dark:text-gray-100` -- replace with `text-[var(--text-primary)]` (route name)
- Line 88: `bg-gray-500/20 text-gray-600 dark:text-gray-400` -- replace with `bg-[var(--surface-muted)] text-[var(--text-tertiary)]` (disabled method badge)
- Line 93: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (no methods hint)
- Line 102: `bg-gray-300 dark:bg-gray-600` -- replace with `bg-[var(--border-strong)]` (toggle off state)
- Line 120: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (chevron icon)
- Line 133: `text-gray-900 dark:text-gray-100` -- replace with `text-[var(--text-primary)]` (route name)
- Line 155: same as 88
- Line 166: same as 102
- Line 219: `bg-white dark:bg-gray-800/50 border-gray-200 dark:border-muted/50` -- replace with `surface-card` class (filter form card)
- Line 232: `border-gray-200 dark:border-muted/50 ... bg-white dark:bg-gray-800/50` -- replace with `surface-card` class (action footer card)

---

### app/components/route/FlowNode.vue
- Line 21: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (node label)
- Line 122: `border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/40` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)]` (disabled node)
- Line 137: `border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)]` (default node)
- Line 154: `bg-gray-100 dark:bg-gray-900/40 ... text-gray-600 dark:text-gray-400` -- replace with `bg-[var(--surface-muted)] text-[var(--text-tertiary)]` (default icon bg)

---

### app/components/route/HandlerManagement.vue
- Lines 6, 61: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (headings)
- Line 7: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 37: `border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700` -- replace with `surface-card-hover` class with `bg-[var(--surface-muted)]` (handler card)
- Line 91: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (code description)

---

### app/components/route/HooksManagement.vue
- Lines 6, 54: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (headings)
- Line 7: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 44: `border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700` -- replace with `surface-card-hover` class with `bg-[var(--surface-muted)]` (hook card)
- Line 115: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (code description)

---

### app/components/route/ExecutionFlowVisualization.vue
- Lines 6: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (heading)
- Line 7: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 52: `border-gray-200 dark:border-gray-800 ... bg-gray-50 dark:bg-gray-900/50` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)]` (canvas container)
- Line 76: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (empty state text)
- Line 195: `bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700` -- replace with `bg-[var(--surface-muted)] border border-[var(--border-default)]` (flow node class)
- Line 204: `text-gray-900 dark:text-white` -- replace with `text-[var(--text-primary)]` (node label)

---

### app/components/route/ApiTestModal.vue
- Line 33: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (URL preview)
- Lines 46, 52, 67, 71, 82: `text-gray-600 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (section headings)
- Line 80: `border-gray-200 dark:border-gray-700` -- replace with `border-[var(--border-default)]` (response divider)
- Lines 84, 85: `text-gray-400` -- replace with `text-[var(--text-quaternary)]` (meta info)
- Line 89: `bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300` -- replace with `bg-[var(--surface-muted)] border border-[var(--border-default)] text-[var(--text-secondary)]` (response body)

---

### app/components/route/EditHandlerDrawer.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/websocket/ConnectionHandlerTestModal.vue
- Line 11: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)
- Line 20, 44, 49, 54: `text-gray-600 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (labels)
- Line 22: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (hint)
- Line 27: `border-gray-200 dark:border-gray-800` -- replace with `border-[var(--border-default)]` (result divider)
- Lines 45, 50, 55: `border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/40` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)]` (code output)

---

### app/components/websocket/EventEditorDrawer.vue
- Line 308: `border-gray-200 dark:border-gray-800` -- replace with `border-[var(--border-default)]` (test panel divider)
- Line 309: `border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20` -- replace with `surface-card` class (test panel card)
- Line 313: `text-gray-900 dark:text-gray-100` -- replace with `text-[var(--text-primary)]` (panel title)
- Line 327: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (hint)
- Line 337: `text-gray-600 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (label)
- Line 344: `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (placeholder hint)
- Line 366, 371, 376: `text-gray-600 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (result labels)
- Lines 367, 372, 377: `border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/40` -- replace with `border-[var(--border-default)] bg-[var(--surface-muted)]` (code output)

---

### app/components/record-details/RegularField.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/record-details/RelationField.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/record-details/RelationItem.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/record-details/Viewer.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/table/Form.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/table/Columns.vue
- Line 433: `border-gray-200 dark:border-gray-700/30 ... bg-white dark:bg-gray-800/50` -- replace with `surface-card` class (empty state/create card)
- Line 469: `bg-white dark:bg-gray-800/50 ... border-gray-200 dark:border-gray-700/30` -- replace with `surface-card` class (column form card)
- Line 511: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (empty text)

---

### app/components/table/Relations.vue
- Line 219: `bg-white dark:bg-gray-800/50 ... border-gray-200 dark:border-gray-700/30` -- replace with `surface-card` class (empty state card)
- Line 260: `bg-white dark:bg-gray-800/50 ... border-gray-200 dark:border-gray-700/30` -- replace with `surface-card` class (relation form card)
- Line 303: `text-gray-700 dark:text-gray-300` -- replace with `text-[var(--text-secondary)]` (empty text)

---

### app/components/table/Constraints.vue
- No hardcoded neutral colors found (only semantic red for validation). CLEAN.

---

### app/components/common/AvatarInitials.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/dynamic/PageComponent.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/dynamic/WidgetComponent.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/PermissionGate.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/RouteLoading.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/sidebar/MenuItemRenderer.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/layout/HeaderActions.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/file/FileGrid.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/folder/FolderGrid.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/data-table/DataTableLazy.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/components/common/UploadModalLazy.vue
- No hardcoded neutral colors found. CLEAN.

---

### app/layouts/default.vue
- All styles already use CSS variables. CLEAN.

---

## CSS File Changes

---

### app/assets/css/main.css

**Glass classes to remove or replace (lines 122-296):**

The entire glass-* class system (`.glass`, `.glass-strong`, `.glass-subtle`, `.glass-card`, `.glass-card-hover`, `.glass-panel`, `.glass-sidebar`, `.glass-header`, `.glass-input`, `.glass-button`, `.glass-dropdown`, `.glass-modal`) should be deprecated. These contain hardcoded `rgba(...)` values and `rgba(139, 92, 246, ...)` brand colors. They are remnants of the glass morphism direction that conflicts with the Utility & Function design.

**Action items:**
- Lines 122-127: `.glass` -- references undefined `--glass-bg`, `--glass-border`, `--glass-backdrop` variables. Remove.
- Lines 129-134: `.glass-strong` -- references undefined `--glass-bg-strong` etc. Remove.
- Lines 136-141: `.glass-subtle` -- references undefined `--glass-bg-subtle` etc. Remove.
- Lines 143-162: `.glass-card` -- hardcoded `rgba(255,255,255,0.9)`, `rgba(139,92,246,0.12)`, `rgba(24,24,27,0.6)`. Replace usage with `surface-card` or `surface-card-hover`.
- Lines 164-176: `.glass-card-hover` -- references undefined glass vars. Remove.
- Lines 178-190: `.glass-panel` -- hardcoded rgba values. Replace usage with `surface-card`.
- Lines 192-204: `.glass-sidebar` -- hardcoded rgba values with `!important`. Remove.
- Lines 206-218: `.glass-header` -- hardcoded rgba values with `!important`. Remove.
- Lines 220-243: `.glass-input` -- hardcoded rgba values. Remove (inputs should use app.config.ts input config).
- Lines 245-268: `.glass-button` -- hardcoded rgba values. Remove.
- Lines 270-282: `.glass-dropdown` -- hardcoded rgba values. Remove.
- Lines 284-296: `.glass-modal` -- hardcoded rgba values. Remove.

**Menu item classes (lines 604-704):**
- Line 620: `#7c3aed` -- replace with `var(--brand-violet-deep)` (active menu item color)
- Line 621: `rgba(139, 92, 246, 0.08)` -- replace with `var(--border-accent)` or `rgba(var(--brand-violet-electric), 0.08)` (active glow)
- Line 625: `#a78bfa` -- replace with `var(--brand-violet-bright)` (dark mode active)
- Line 634: `rgba(139, 92, 246, 0.08)` -- replace with a token (hover bg)
- Line 636: `#7c3aed` -- replace with `var(--brand-violet-deep)` (hover text)
- Line 639: `rgba(139, 92, 246, 0.1)` -- replace with a token (dark hover bg)
- Line 640: `#a78bfa` -- replace with `var(--brand-violet-bright)` (dark hover text)
- Line 648: `#8b5cf6` -- replace with `var(--brand-violet-electric)` (active icon)
- Line 654: `#a78bfa` -- replace with `var(--brand-violet-bright)` (dark active icon)
- Lines 682-704: same pattern as above for `.menu-dropdown-item-*` variants

**Skeleton classes (lines 729-800):**
- Line 767: `#D1D5DB` -- replace with `var(--border-strong)` (skeleton icon light mode)
- Lines 775: `#D1D5DB`, `#E5E7EB` -- replace with `var(--border-strong)`, `var(--border-default)` (skeleton badge light gradient)
- Line 793: `#E5E7EB`, `#D1D5DB` -- replace with `var(--border-default)`, `var(--border-strong)` (skeleton inline light gradient)

---

### app/assets/css/scrollbars.css
- All styles use CSS variables. CLEAN.

---

### app/assets/css/codemirror.css

**Dark theme autocomplete (lines 46-88):**
- Line 47: `#252526` -- editor-specific VSCode dark. KEEP (code editor styling is intentionally standalone).
- Line 48: `#454545` -- KEEP.
- Line 54: `#d4d4d4` -- KEEP.
- Line 68: `#094771` -- KEEP.
- Line 73: `#2a2d2e` -- KEEP.
- Line 77: `#cccccc` -- KEEP.
- Line 86: `#858585` -- KEEP.

**Light theme autocomplete (lines 90-133):**
- Line 91: `#ffffff` -- KEEP.
- Line 93: uses `var(--border-neutral)`. GOOD.
- Line 98: `#1e1e1e` -- KEEP.
- Line 113: `#0969da` -- KEEP (GitHub-style selection highlight).
- Line 118: `#f6f8fa` -- KEEP (matches GitHub hover).
- Line 122, 131: `#6e7681` -- KEEP.

**Verdict:** CodeMirror CSS intentionally uses VSCode/GitHub color palette for code editing. These are NOT neutral surface colors. KEEP all as-is.

---

### app/assets/css/highlight.css
- All colors are syntax highlighting specific (VSCode dark theme). Not neutral surfaces.
- Line 5: `#1e1e1e` background -- KEEP (code block bg, matches `--prose-pre-bg`).
- All `hljs-*` colors -- KEEP (syntax token colors).

**Verdict:** KEEP all. This is a specialized code highlighting theme.

---

### app/assets/css/transitions.css
- Lines 81, 86: `rgba(139, 92, 246, 0)` -- These are transition start/end for brand glow animation. KEEP (brand accent animation).

**Verdict:** CLEAN. No neutral hardcoded colors.

---

### app/assets/css/vue-flow.css
- All styles use CSS variables (`--flow-node-bg`, `--flow-node-border`, `--accent-emerald`, etc.). CLEAN.

---

### app/assets/css/richtext-editor.css
- All styles use CSS variables (`--caret-color`, `--prose-*`, `--table-*`, etc.). CLEAN.
- Line 78: `#68cef8` for `ProseMirror-selectednode` outline -- KEEP (editor selection indicator, not a neutral color).
- Line 127: `rgba(200, 200, 255, 0.4)` for `.selectedCell:after` -- KEEP (table cell selection, semantic).

---

### app/assets/css/vue-json-pretty.css
- All colors are JSON syntax highlighting specific. KEEP as-is.

---

## Composable Changes

---

### app/composables/editor/useCodeMirrorTheme.ts

All hardcoded hex colors in this file are VSCode/GitHub-themed code editor colors. They are NOT neutral surface/border/text colors for the app UI. They are intentional editor theming.

- Line 37: `#09090b` -- matches `--surface-chrome` dark. Could use `var(--surface-chrome)` but editor theming is standalone. KEEP.
- Line 203: `#ffffff` -- matches `--surface-default` light. Same reasoning. KEEP.
- All other editor colors (`#e4e4e7`, `#0c0c0e`, `#858585`, `#2a2d2e`, `#264F78`, etc.) -- KEEP.

**Verdict:** No changes needed. Code editor theme is intentionally standalone.

---

### app/composables/header/useHeaderStyleRegistry.ts

- Line 29: `background: "rgba(198, 212, 255, 0.5)"` -- This is the default header background. It should reference a token. Replace with `"var(--surface-default)"` or remove the background entirely since the layout already sets `background: var(--surface-default)` on the header.

---

## app.config.ts Changes

This file contains the Nuxt UI component configuration. Many hardcoded gray values here:

### input slots (lines 170-183)
- `border-gray-300 dark:border-gray-700` -- replace with `border-[var(--border-strong)] dark:border-[var(--border-default)]` or a single `border-[var(--border-input)]`
- `dark:bg-gray-900` -- replace with `dark:bg-[var(--surface-default)]`
- `text-gray-800 dark:text-white/90` -- replace with `text-[var(--text-primary)]`
- `placeholder:text-gray-400 dark:placeholder:text-white/30` -- replace with `placeholder:text-[var(--text-quaternary)]`
- `disabled:border-gray-100 disabled:bg-gray-50 dark:disabled:border-gray-800 dark:disabled:bg-white/[0.03]` -- replace with `disabled:border-[var(--border-subtle)] disabled:bg-[var(--surface-muted)]`

### textarea slots (lines 188-203)
- Same pattern as input. Same replacements.

### select slots (lines 208-220)
- Same pattern as input. Same replacements.

### formField slots (lines 228-232)
- `text-gray-700 dark:text-gray-400` -- replace with `text-[var(--text-secondary)]` (label)
- `text-gray-500 dark:text-gray-400` -- replace with `text-[var(--text-tertiary)]` (description)

### card slots (line 236)
- `border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]` -- replace with `surface-card` class or `border-[var(--border-default)] bg-[var(--surface-default)]`

### drawer slots (lines 241-244)
- `bg-white dark:bg-gray-900` -- replace with `bg-[var(--surface-default)]`
- `border-gray-200 dark:border-gray-800` -- replace with `border-[var(--border-default)]`

### switch slots (lines 254)
- `bg-gray-300 dark:bg-gray-600` (unchecked state) -- replace with `bg-[var(--border-strong)]` (semantically: a muted toggle track)

### checkbox slots (line 268)
- `border-gray-300 dark:border-gray-600` -- replace with `border-[var(--border-strong)]`

### button compoundVariants - outline (line 61)
- `bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300` -- replace with `bg-[var(--surface-default)] text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--border-strong)] hover:bg-[var(--surface-muted)]`

### button compoundVariants - error outline (line 81)
- `bg-white ... dark:bg-gray-800` -- replace `bg-white` with `bg-[var(--surface-default)]` and `dark:bg-gray-800` with same token

---

## Summary Statistics

- **Total files to change:** 62
  - Vue components: 45
  - Vue pages: 15
  - CSS files: 1 (main.css)
  - Config files: 1 (app.config.ts)
  - Composables: 1 (useHeaderStyleRegistry.ts)
- **Total line changes:** ~450+
- **Files confirmed clean (no changes needed):** 40+
  - layouts/default.vue, scrollbars.css, codemirror.css, highlight.css, transitions.css, vue-flow.css, richtext-editor.css, vue-json-pretty.css, useCodeMirrorTheme.ts
  - Many small components: ErrorState, AvatarInitials, Field, Editor, DateField, EnumPicker, etc.
- **Glass classes to deprecate:** 12 classes (~175 lines in main.css)
- **Categories of changes:**
  - `bg-white` / `dark:bg-gray-*` surface patterns: ~60 occurrences -- migrate to `surface-card` or `bg-[var(--surface-default)]`
  - `bg-gray-50` / `bg-gray-100` muted patterns: ~40 occurrences -- migrate to `bg-[var(--surface-muted)]`
  - `border-gray-200` / `dark:border-gray-800` patterns: ~70 occurrences -- migrate to `border-[var(--border-default)]`
  - `text-gray-*` / `dark:text-gray-*` patterns: ~200 occurrences -- migrate to `text-[var(--text-*)]` tokens
  - Hardcoded `#7C3AED` / `rgba(139,92,246,...)` brand references: ~15 occurrences in CSS -- migrate to `var(--brand-violet-*)` tokens
