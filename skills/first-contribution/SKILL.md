---
name: first-contribution
description: Guide someone who has never contributed to Escape Velocity from picking a small task to an open pull request. Use when a newcomer asks how to start, what they could do, or wants a "good first issue", and when you need a short list of open small tasks (proposed technologies, unchecked cards, missing translations).
---

# First contribution

## 1. Pick a path

`CONTRIBUTING.md`, "Pick your path": no git means an issue form; a source and a terminal means
editing the TOML and opening a pull request; another language means translating. Ask which one
fits before going on.

## 2. Pick a small task

```bash
python3 skills/first-contribution/scripts/good_first.py              # five of each
python3 skills/first-contribution/scripts/good_first.py --lang pt --limit 10
python3 skills/first-contribution/scripts/good_first.py --json
```

It prints three lists:

- **Proposed technologies** and what each still needs to become `scoping` (a headline metric with
  `current` and `target`, and `last_reviewed`). Continue with `define-technology`.
- **Evidence cards** not `machine-checked`. Continue with `review-evidence`.
- **Texts missing or stale** in the chosen language. Continue with `translate-page`.

Choose one item. One item is one pull request.

## 3. Make the change

Follow `CONTRIBUTING.md`, "With git: step by step":

1. Install Python 3.11+ and git.
2. Fork and clone the repository; create a branch.
3. Edit the TOML. Every number enters through a card in `evidence/` (decision 0006); if the
   newcomer already has the paper, use `add-evidence-from-doi`.
4. Generate and check:

   ```bash
   python3 tools/generate.py
   python3 tools/check.py
   ```

   Fix every error before going on.
5. Commit with a sign-off: `git commit -s -m "..."`. The sign-off is the person's own
   certification (Developer Certificate of Origin); an agent never signs off on their behalf.
6. Open the pull request and fill in the template, listing the values added or changed and their
   cards.
7. Answer the review.

## Do not

- Add a number without a card.
- Open one pull request with unrelated changes.
