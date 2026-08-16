# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A vanilla-JS static PWA for teaching Mandarin pinyin to young children (target: iPad / phone browsers). No build step, no bundler, no framework — 6 hand-written script files loaded in order from `index.html`. Deployed via GitHub Pages.

## Common Commands

```bash
# Local preview (project has no build step — serve the repo root directly)
python3 -m http.server 8080

# Open in Safari (recommended — Chrome for macOS has a zh-CN voice-binding bug)
open -a Safari http://localhost:8080

# Show TTS diagnostic badge on any device (default hidden)
open "http://localhost:8080/?debug=tts"
# or in DevTools console: PinyinTTS.showDebug()
```

No tests, no linter — quick syntax check for any modified JS:
```bash
node --check js/tts.js js/learn.js js/practice.js js/app.js js/checkin.js js/parents.js js/pinyin-data.js
```

Deploying is `git push origin main` — GitHub Pages serves from the repo root.

## Architecture

### Load order (defined in `index.html`, matters)
`pinyin-data.js` → `tts.js` → `app.js` → `learn.js` → `practice.js` → `checkin.js` → `parents.js`

Each file installs one global on `window`: `PINYIN_DATA`, `PinyinTTS`, `App`, `Learn`, `Practice`, `Checkin`, `Parents`. Files talk to each other only through those globals; there are no ES modules.

### View routing (in `index.html`, ~40 lines of inline script)
Bottom nav switches between four views by calling `Learn.render(main)` / `Practice.render(main)` / `Checkin.render(main)` / `Parents.render(main)`. Each `render()` writes its own `innerHTML` into the main container and binds handlers. Views are not diffed — every navigation rebuilds the DOM.

### State (`js/app.js`)
`App` is the single source of truth. State lives in `localStorage` under key `pinyin_tool_state_v1` and includes: `checkins`, `stars`, `trophies`, `stats.byType`, `mistakes`, `settings` (dailyGoal / parentPin), `progress.initials/finals`. Every mutation calls `save()` synchronously — no debouncing.

Views read via `App.state` (getter) and mutate via named methods (`recordAnswer`, `markLearned`, `unmarkLearned`, `setCheckin`, `verifyPin`, `resetForDemo`). Do not mutate `App.state` directly from view code.

### TTS layer (`js/tts.js`) — the hard part
This is the most subtle file in the repo. Web Speech API on mobile has many footguns; the code here works around them:

- **`sound` field format**: pinyin data uses `ba1`, `hua1`, `zhu1` etc. — un-toned pinyin + digit tone. iOS misreads tone-marked characters (`bā`), so we never feed those to TTS. When adding words to `PINYIN_DATA.WORDS`, follow this convention.
- **`spellCharacter(char, sound, rate)`**: the "teach a syllable" flow. Splits the syllable into initial + final via `splitSyllable`, looks up `INITIAL_HU` (initial → hu-du 呼读音 hanzi like `b → 玻`) and `FINAL_TONE_HAN` (final + tone → hanzi like `a1 → 啊`), reads them separated by `、` in a single utterance, pauses, then reads the full character. iOS drops audio when you queue many short utterances back-to-back — merging with `、` and using one utterance is the fix.
- **`pickZhVoice()`**: just finds the first voice whose `lang` starts with `zh-cn`. Safari/iOS auto-select Tingting (婷婷). Do not re-add elaborate blacklists — earlier commits tried that against Chrome-mac and it made things worse; the real fix is "use Safari".
- **Chrome-mac known issue**: even with `u.voice = 婷婷`, Chrome sometimes renders Cantonese. Not fixable in JS. `README.md` tells users to use Safari.
- **Debug badge**: hidden by default. Enable via URL `?debug=tts` (or `PinyinTTS.showDebug()`). It shows the picked voice, zh-CN and zh-HK counts, and a red warning if the device has no Mandarin voice installed — this is the most useful diagnostic when a user reports "wrong accent."

Public API used by the views: `speakPinyin(sound, type, example, rate)` (type = `"initial"` | `"final"` | `"whole"`), `spellWord(char, sound, rate)`, `speak(text, rate, onend)`, `showDebug()`, `hideDebug()`.

### Service worker (`js/sw.js`)
Cache-first with a hard-coded version number (currently `pinyin-tool-v8`). **When you change any static asset, bump the `CACHE` constant AND the `?v=N` querystrings in `index.html` in the same commit.** Otherwise clients keep serving stale JS from Cache Storage and the deploy looks like a no-op. `sw.js` also lives at `js/sw.js` but is registered from `index.html` as `sw.js` (root) — GitHub Pages resolves it via the fetch handler; both paths coexist in the repo.

### Practice flow (`js/practice.js`)
Four question types share the flow: `makeQuestion()` → renders options → user clicks an option (only sets `.selected`, doesn't judge) → user clicks the Submit button → `handleAnswer()` judges.

- On correct: highlight green, play the syllable spell-out, auto-advance after ~1.2s.
- On wrong: highlight red, mark the correct answer, play the correct syllable, and **turn the Submit button into "下一题 →"** — the user must click it to advance. This is intentional (kids need time to hear the correct reading).
- `listen` mode has a **🔁 重放** button beside the prompt that replays the syllable on demand.

### Learn view (`js/learn.js`)
Click any card → `PinyinTTS.speakPinyin(...)` + `App.markLearned(kind, pinyin)` + green border. A red **×** appears in the top-right of learned cards; clicking it calls `App.unmarkLearned` and removes the badge (does not trigger speech — the click handler on the card checks `e.target.closest('.card-unlearn')` and bails).

## Conventions that matter

- **Never mark cards learned without playing the sound first** — the speak call and `markLearned` happen together in the same click handler.
- **Preserve the `sound` digit-tone convention** in `pinyin-data.js`. Any code path that touches TTS assumes `[a-züv]+\d?` and would break on `bā`.
- **Parent PIN default** is `0426` (in `DEFAULT_STATE.settings.parentPin`); mentioned in README.
- **No frameworks, no npm** — do not introduce a build step or dependency without a very good reason. The whole point is that this deploys as static files with zero infrastructure.

## Known issues

- Chrome for macOS renders `zh-CN` voices as Cantonese in some sessions. Not fixable in code. Users are told to open in Safari.
- iOS/iPadOS device with only `zh-HK` voice installed will speak Cantonese. The debug badge (`?debug=tts`) surfaces this with a red warning and instructs users to download the Mandarin (Tingting) voice under Settings → Accessibility → Spoken Content → Voices.
