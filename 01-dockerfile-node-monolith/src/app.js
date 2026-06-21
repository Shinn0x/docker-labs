'use strict';

const express = require('express');

/**
 * Builds the Express application.
 *
 * The app is a self-contained "monolith": HTTP layer, a tiny in-memory data
 * store, and the business logic all live in one process. That is exactly the
 * kind of app a single Dockerfile is meant to package.
 */
function createApp() {
  const app = express();
  app.use(express.json());

  // --- In-memory data store (resets on restart; fine for a demo) ----------
  /** @type {{id:number,title:string,done:boolean,createdAt:string}[]} */
  let tasks = [
    { id: 1, title: 'Learn multi-stage Docker builds', done: true, createdAt: new Date().toISOString() },
    { id: 2, title: 'Run this container as a non-root user', done: false, createdAt: new Date().toISOString() },
  ];
  let nextId = 3;

  // --- Health & metadata --------------------------------------------------
  // Used by Docker's HEALTHCHECK and by orchestrators (ECS, Kubernetes).
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/', (_req, res) => {
    res.json({
      service: 'task-manager-api',
      version: process.env.APP_VERSION || 'dev',
      endpoints: ['GET /health', 'GET /api/tasks', 'POST /api/tasks', 'PATCH /api/tasks/:id', 'DELETE /api/tasks/:id'],
    });
  });

  // --- CRUD ---------------------------------------------------------------
  app.get('/api/tasks', (_req, res) => {
    res.json(tasks);
  });

  app.post('/api/tasks', (req, res) => {
    const { title } = req.body || {};
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required and must be a string' });
    }
    const task = { id: nextId++, title, done: false, createdAt: new Date().toISOString() };
    tasks.push(task);
    res.status(201).json(task);
  });

  app.patch('/api/tasks/:id', (req, res) => {
    const id = Number(req.params.id);
    const task = tasks.find((t) => t.id === id);
    if (!task) return res.status(404).json({ error: 'task not found' });
    if (typeof req.body?.title === 'string') task.title = req.body.title;
    if (typeof req.body?.done === 'boolean') task.done = req.body.done;
    res.json(task);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const id = Number(req.params.id);
    const before = tasks.length;
    tasks = tasks.filter((t) => t.id !== id);
    if (tasks.length === before) return res.status(404).json({ error: 'task not found' });
    res.status(204).end();
  });

  return app;
}

module.exports = { createApp };
