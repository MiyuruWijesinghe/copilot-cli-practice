# Copilot Instructions

- Use JavaScript for application code. This project uses CommonJS.
- Follow REST API conventions for routes, HTTP methods, status codes, and responses.
- Use `async`/`await` for asynchronous operations and return clear API errors.
- Write unit tests for new features and behavior changes.
- Do not add, remove, or update package dependencies without asking first.
- Explain important changes in the final response.

## Project structure

- `src/server.js` is the process entry point. It creates and starts the Express app; the port defaults to `3000` and can be set with `PORT`.
- `src/app.js` defines the Express app, task routes, request validation, and centralized error handling. `createApp` accepts an optional task file path or store so tests can use isolated storage.
- `src/taskStore.js` implements task CRUD against a JSON file. Its in-process promise queue serializes store operations; a missing file is treated as an empty task list.
- `data/tasks.json` contains the default task data.
- `tests/tasks.test.js` tests the API over HTTP using temporary JSON storage, so tests do not alter `data/tasks.json`.

## Commands

Requires Node.js 18 or newer.

- Start the API: `npm start`
- Run all tests: `npm test`
- Run the test file: `node --test tests/tasks.test.js`

There are no build or lint scripts configured in `package.json`.

## API conventions

The README documents the task endpoints and request fields. `src/app.js` validates create and replace payloads; keep validation and response behavior consistent across routes. `src/taskStore.js` owns persistence and returns missing records as `null` or `false`; the app translates those results into `404` responses. Unexpected errors are logged server-side and returned as a generic `500` response.
