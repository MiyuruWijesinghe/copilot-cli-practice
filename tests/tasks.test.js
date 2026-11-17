const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../src/app");

let server;
let baseUrl;
let temporaryDirectory;
let tasksFile;

before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "task-api-"));
  tasksFile = path.join(temporaryDirectory, "tasks.json");
  server = createApp({ tasksFile }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

async function request(route, options) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const body =
    response.status === 204 ? null : await response.json();
  return { response, body };
}

test("supports creating, listing, retrieving, updating, and deleting tasks", async () => {
  const created = await request("/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "  Write tests  ",
      description: "API tests",
      priority: "high",
    }),
  });

  assert.equal(created.response.status, 201);
  assert.equal(created.body.title, "Write tests");
  assert.equal(created.body.description, "API tests");
  assert.equal(created.body.completed, false);
  assert.equal(created.body.priority, "high");
  assert.ok(created.body.id);

  const listed = await request("/tasks");
  assert.equal(listed.response.status, 200);
  assert.deepEqual(listed.body.map((task) => task.id), [created.body.id]);

  const retrieved = await request(`/tasks/${created.body.id}`);
  assert.equal(retrieved.body.title, "Write tests");
  assert.equal(retrieved.body.priority, "high");

  const updated = await request(`/tasks/${created.body.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Tests complete",
      description: "",
      completed: true,
      priority: "low",
    }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.title, "Tests complete");
  assert.equal(updated.body.completed, true);
  assert.equal(updated.body.priority, "low");

  const storedTasks = JSON.parse(await fs.readFile(tasksFile, "utf8"));
  assert.equal(storedTasks[0].title, "Tests complete");
  assert.equal(storedTasks[0].priority, "low");

  const deleted = await request(`/tasks/${created.body.id}`, {
    method: "DELETE",
  });
  assert.equal(deleted.response.status, 204);
  assert.deepEqual((await request("/tasks")).body, []);
});

test("defaults priority to medium and rejects invalid values", async () => {
  const created = await request("/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Default priority" }),
  });

  assert.equal(created.response.status, 201);
  assert.equal(created.body.priority, "medium");

  const invalid = await request("/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Bad priority", priority: "urgent" }),
  });

  assert.equal(invalid.response.status, 400);
  assert.match(invalid.body.error, /priority must be one of/);

  const storedTasks = JSON.parse(await fs.readFile(tasksFile, "utf8"));
  assert.equal(storedTasks[storedTasks.length - 1].priority, "medium");
});

test("validates task input and returns not found for unknown tasks", async () => {
  const malformed = await request("/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{invalid json",
  });
  assert.equal(malformed.response.status, 400);

  const invalid = await request("/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: " " }),
  });
  assert.equal(invalid.response.status, 400);
  assert.match(invalid.body.error, /title is required/);

  const missing = await request("/tasks/unknown");
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.error, "Task not found");
});
