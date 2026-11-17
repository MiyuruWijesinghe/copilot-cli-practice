# Task Manager REST API

A small Node.js and Express API that stores tasks in `data/tasks.json`.

## Requirements

- Node.js 18 or newer
- npm

## Setup

```sh
npm install
npm start
```

The API listens on port `3000` by default. Set the `PORT` environment variable
to use another port.

## Endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/tasks` | Return all tasks |
| `GET` | `/tasks/:id` | Return one task |
| `POST` | `/tasks` | Create a task |
| `PUT` | `/tasks/:id` | Replace a task's editable fields |
| `DELETE` | `/tasks/:id` | Delete a task |

Create and update requests require a JSON object with a non-empty `title`.
`description` is an optional string, `completed` is an optional boolean
(defaulting to `false`), and `priority` is an optional string with one of
`low`, `medium`, or `high` (defaulting to `medium`). Tasks include an ID,
a priority, and creation/update timestamps. Missing tasks return `404`;
invalid input returns `400`.

Example:

```sh
curl -X POST http://localhost:3000/tasks \
  -H "content-type: application/json" \
  -d "{\"title\":\"Review pull request\",\"description\":\"Check the API\"}"
```

## Tests

```sh
npm test
```

Tests use a temporary JSON file so they do not alter the project's task data.
