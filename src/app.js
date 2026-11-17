const path = require("node:path");
const express = require("express");
const { createTaskStore } = require("./taskStore");

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseTaskInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Request body must be a JSON object");
  }
  if (typeof body.title !== "string" || body.title.trim() === "") {
    throw new ApiError(400, "title is required and must be a non-empty string");
  }
  if (body.description !== undefined && typeof body.description !== "string") {
    throw new ApiError(400, "description must be a string");
  }
  if (body.completed !== undefined && typeof body.completed !== "boolean") {
    throw new ApiError(400, "completed must be a boolean");
  }
  if (body.priority !== undefined && !["low", "medium", "high"].includes(body.priority)) {
    throw new ApiError(400, "priority must be one of: low, medium, high");
  }

  return {
    title: body.title.trim(),
    description: body.description || "",
    completed: body.completed ?? false,
    priority: body.priority ?? "medium",
  };
}

function createApp(options = {}) {
  const tasksFile =
    options.tasksFile || path.join(__dirname, "..", "data", "tasks.json");
  const taskStore = options.taskStore || createTaskStore(tasksFile);
  const app = express();

  app.use(express.json());

  app.get("/tasks", async (req, res, next) => {
    try {
      res.json(await taskStore.list());
    } catch (error) {
      next(error);
    }
  });

  app.get("/tasks/:id", async (req, res, next) => {
    try {
      const task = await taskStore.get(req.params.id);
      if (!task) {
        throw new ApiError(404, "Task not found");
      }
      res.json(task);
    } catch (error) {
      next(error);
    }
  });

  app.post("/tasks", async (req, res, next) => {
    try {
      const task = await taskStore.create(parseTaskInput(req.body));
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  });

  app.put("/tasks/:id", async (req, res, next) => {
    try {
      const task = await taskStore.update(
        req.params.id,
        parseTaskInput(req.body),
      );
      if (!task) {
        throw new ApiError(404, "Task not found");
      }
      res.json(task);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/tasks/:id", async (req, res, next) => {
    try {
      const deleted = await taskStore.delete(req.params.id);
      if (!deleted) {
        throw new ApiError(404, "Task not found");
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res, next) => {
    next(new ApiError(404, "Route not found"));
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }
    const status = Number.isInteger(error.status)
      ? error.status
      : Number.isInteger(error.statusCode)
        ? error.statusCode
        : 500;
    if (status === 500) {
      console.error(error);
    }
    res.status(status).json({
      error: status === 500 ? "Internal server error" : error.message,
    });
  });

  return app;
}

module.exports = { createApp };
