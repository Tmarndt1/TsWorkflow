# Contributing to TsWorkflow

Bug reports, documentation improvements, examples, and focused code changes are welcome.

## Local setup

Use Node.js 24 and npm. Clone your fork, then run:

```sh
npm ci
npm run check
```

The repository includes an `.nvmrc` for tools that support Node version files. You can also install Node.js 24 directly.

## Useful commands

| Command | Checks |
| --- | --- |
| `npm test -- --runInBand` | Runtime tests. |
| `npm run test:coverage -- --runInBand` | Runtime tests and source coverage. |
| `npm run lint` | TypeScript checks, including examples and API type tests. |
| `npm run build` | CommonJS, ESM, and declaration bundles in `dist/`. |
| `npm run test:package` | Both module formats and strict consumer tests against generated declarations; build first. |
| `npm run check` | All of the above in sequence. |
| `npm pack --dry-run` | Inspect package contents; build first. |

## Tests and changes

- Add behavioral regression tests for bug fixes. Use fake timers for timing and cancellation cases.
- Await or return asynchronous assertions so failures reach Jest.
- Use `tests/types/Workflow.types.ts` and `tests/types/PublicApi.types.ts` for fluent API acceptance and rejection checks. `@ts-expect-error` assertions are verified by `npm run lint` and rechecked against built declarations by `npm run test:package`.
- Coverage includes every TypeScript source file and requires 100% statements, branches, functions, and lines. Meaningful assertions matter more than reaching a number.
- Keep documentation consistent with observable behavior. Record user-facing changes under `Unreleased` in `CHANGELOG.md`.
- Avoid unrelated formatting or dependency changes. Generated builds and coverage reports do not belong in pull requests.

## Pull requests

Describe the problem, the resulting behavior, and how you verified it. Link an issue when relevant. For larger API changes, open an issue first to discuss compatibility and scope.

The repository uses Changesets for release tooling. If a change needs a package release, add a release note with `npx changeset` and explain any compatibility impact. Maintainers decide versioning and publication; CI does not publish packages automatically.

## Reporting a bug

Use the bug report form with a minimal workflow, expected and actual behavior, package version, and runtime details. Keep discussions constructive and focused on helping others reproduce and understand the issue.
