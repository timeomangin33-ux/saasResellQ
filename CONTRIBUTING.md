# Contributing

Pre-commit checks are installed via the repo `postinstall` script which sets `.githooks` as the hooks directory.

Local checks

- Install dependencies:

```bash
npm ci
```

- Run the full CI checks locally:

```bash
npm run check:ci
```

Hook behavior

- On commit the hook:
  - Runs `node scripts/text_sweep.cjs` to safely replace known encoding/mojibake patterns. If files are modified they are automatically staged.
  - Runs `cspell` on the staged files. If unknown words are flagged, add safe words to `.cspell.json` or fix typos.
  - Runs `eslint --fix` on staged JS/TS files and restages any fixes. If ESLint still reports errors, fix them before committing.

If you need to bypass checks temporarily:

```bash
git commit --no-verify -m "WIP"
```

Notes

- The pre-commit hook only checks staged files to avoid blocking on third-party or large generated folders.
- The CI workflow runs full `build`, `lint`, and `cspell` on every PR to `main`.
