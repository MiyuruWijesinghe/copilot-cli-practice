const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const PRIORITY_LEVELS = new Set(["low", "medium", "high"]);

function normalizeTask(task) {
  if (!task || typeof task !== "object") {
    return task;
  }

  return {
    ...task,
    priority: PRIORITY_LEVELS.has(task.priority) ? task.priority : "medium",
  };
}

function createTaskStore(filePath) {
  let pending = Promise.resolve();

  function runExclusive(operation) {
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  }

  async function readTasks() {
    try {
      const contents = await fs.readFile(filePath, "utf8");
      const tasks = JSON.parse(contents);
      if (!Array.isArray(tasks)) {
        throw new Error("Task data must be a JSON array");
      }
      return tasks.map(normalizeTask);
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async function writeTasks(tasks) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(tasks, null, 2)}\n`, "utf8");
  }

  return {
    list() {
      return runExclusive(readTasks);
    },

    get(id) {
      return runExclusive(async () => {
        const tasks = await readTasks();
        return normalizeTask(tasks.find((task) => task.id === id) || null);
      });
    },

    create(input) {
      return runExclusive(async () => {
        const tasks = await readTasks();
        const now = new Date().toISOString();
        const task = {
          id: randomUUID(),
          title: input.title,
          description: input.description,
          completed: input.completed,
          priority: input.priority,
          createdAt: now,
          updatedAt: now,
        };
        tasks.push(task);
        await writeTasks(tasks);
        return task;
      });
    },

    update(id, input) {
      return runExclusive(async () => {
        const tasks = await readTasks();
        const index = tasks.findIndex((task) => task.id === id);
        if (index === -1) {
          return null;
        }

        const updatedTask = {
          ...tasks[index],
          title: input.title,
          description: input.description,
          completed: input.completed,
          priority: input.priority,
          updatedAt: new Date().toISOString(),
        };
        tasks[index] = updatedTask;
        await writeTasks(tasks);
        return updatedTask;
      });
    },

    delete(id) {
      return runExclusive(async () => {
        const tasks = await readTasks();
        const index = tasks.findIndex((task) => task.id === id);
        if (index === -1) {
          return false;
        }

        tasks.splice(index, 1);
        await writeTasks(tasks);
        return true;
      });
    },
  };
}

module.exports = { createTaskStore };
