# React Caching Fetch Challenge

This is small app with list of people. It has SSR and also caching fetch library.

## How to run

```bash
npm i
cp .env.example .env
npm start
```

Then open http://127.0.0.1:3000 in browser.

Routes:

- `/appWithoutSSRData` — data load on client. You should see only 1 network request.
- `/appWithSSRData` — data load on server first. In browser should be no request to people API.

## Scripts

- `npm start` — build and start server (it use `.env`)
- `npm run build` — build server and client
- `npm run typecheck` — check types
- `npm run lint` — run eslint
- `npm run format` — run prettier
- `npm test` — run tests

## What I did

- I keep esbuild like before.
- I add typecheck, eslint, prettier and some small tests.
- Cache logic is in `FetchCache` class. Hook only update React state.
- Same URL is fetch only one time. If request fail, next time it can try again.
- For SSR I save cache as JSON string and put it to browser. Also fix html inject from old code.
- Port and host is in `.env` file. Default is `127.0.0.1:3000`.
