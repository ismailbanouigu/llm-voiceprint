# Voiceprint

[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai/?ref=badge)

Voiceprint maps the recognizable “LLM voice” in a passage, explains the strongest style markers, and rewrites the text with a more specific human cadence. Built for [Pollinations Quest #19180](https://github.com/pollinations/pollinations/issues/19180).

**Live app:** [llm-voiceprint.jm716111.chatgpt.site](https://llm-voiceprint.jm716111.chatgpt.site/)

![Voiceprint interface](images/voiceprint.png)

## Features

- Six-part visual voice fingerprint with concrete excerpts.
- A contextual rewrite in plainspoken, personal, or editorial mode.
- A zero-Pollen local heuristic and loaded specimen for instant review.
- Bring Your Own Pollen via the official `polli-connect` component, capped at 1.5 Pollen for seven days.
- No saved prompts, keys, or rewrites.

Voiceprint critiques style. It does not claim to detect whether AI authored a text.

## Run and test

Serve `dist/` with any static server. The production origin must be registered on the Pollinations App Key.

```bash
npm test
npx serve dist
```

## License

MIT

