# acme-api

A small HTTP service for the Acme order desk.

- `GET /health` returns `ok`
- `GET /orders/:id` returns one order as JSON

Run it with `node src/server.mjs`. It listens on port 8080.
