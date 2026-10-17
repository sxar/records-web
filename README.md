# mern-records-frontend

Vite + React 18 + Tailwind frontend, adapted from MongoDB's official
[mern-stack-example](https://github.com/mongodb-developer/mern-stack-example)
(Apache-2.0). Part of a two-repo test rig (`mern-records-backend` /
`mern-records-frontend`) used to validate that a Vite/React toolchain
(including native esbuild/rollup binaries) builds and serves correctly on
an arm64 (Apple Silicon / VMware Fusion) self-hosted GitHub Actions runner.
Not a product — a validation harness.

## Local run

```bash
pnpm install --frozen-lockfile
pnpm run dev       # dev server on localhost:5173, proxies /record to localhost:5050
```

This project uses **pnpm** (see `packageManager` in `package.json`). Note pnpm
forwards script arguments directly — use `pnpm run dev --port 3000`, not npm's
`pnpm run dev -- --port 3000`, which silently drops the arguments.

Requires `mern-records-backend` running locally for the app to actually
load data (see that repo's README) — not required just to build/serve the
frontend on its own.

## License

Apache-2.0, inherited from the source project. See [LICENSE](LICENSE).
