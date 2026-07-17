# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.16.3 create --template minimal --no-types --install npm landing-page
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Example API

The project includes an in-memory example API. Start the app with `npm run dev` and call:

- `GET /apis/status` — simple existing status response
- `GET /apis/health` — health check
- `GET /apis/products` — list products; optionally filter with `?category=subscription`
- `POST /apis/products` — create a product with `{ "name": "Basic Plan", "price": 5, "category": "subscription" }`
- `GET /apis/products/:id` — retrieve one product
- `PATCH /apis/products/:id` — update one or more product fields
- `DELETE /apis/products/:id` — delete a product

The product data is held in server memory and resets whenever the server restarts. It is intended for API practice, not persistent storage.
