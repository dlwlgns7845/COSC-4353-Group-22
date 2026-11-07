const cors = require('cors');
const express = require('express');
const { createQueueRouter, removeQueueForService } = require('./queue-management');
const { createServiceRepository } = require('./database/service-repository');

function checkServiceInput(body) {
  const { name, description, duration, priority } = body || {};
  if (typeof name !== 'string' || !name.trim()) return 'Service name is required';
  if (name.trim().length > 100) return 'Service name cannot be longer than 100 characters';
  if (typeof description !== 'string' || !description.trim()) return 'Description is required';
  if (description.trim().length > 500) return 'Description cannot be longer than 500 characters';
  if (duration === undefined || duration === null || duration === '') return 'Expected duration is required';
  const minutes = Number(duration);
  if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 240 || typeof duration === 'boolean') {
    return 'Expected duration must be a whole number between 1 and 240';
  }
  if (!['low', 'medium', 'high'].includes(priority)) return 'Priority must be low, medium, or high';
  return null;
}

function serviceValues(body) {
  return {
    name: body.name.trim(),
    description: body.description.trim(),
    duration: Number(body.duration),
    priority: body.priority
  };
}

function parseServiceId(value) {
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function createServiceApp(repository, options = {}) {
  if (!repository) throw new TypeError('A service repository is required');
  const app = express();
  app.use(express.json());
  app.use(cors());
  let cache = [];

  // Existing queue-management.js needs a synchronous lookup for wait times.
  // Cache is hydrated before the server starts and refreshed on service changes.
  async function initialize() {
    cache = await repository.list();
    return cache;
  }

  if (options.attachQueue !== false) {
    app.use('/api/queue', createQueueRouter(() => cache));
  }

  app.get('/api/services', async (req, res) => {
    try {
      const services = await repository.list();
      cache = services;
      res.json(services);
    } catch (error) {
      console.error('Could not list services:', error);
      res.status(500).json({ error: 'Could not load services' });
    }
  });

  app.post('/api/services', async (req, res) => {
    const problem = checkServiceInput(req.body);
    if (problem) return res.status(400).json({ error: problem });
    try {
      const created = await repository.create(serviceValues(req.body));
      cache.push(created);
      res.status(201).json(created);
    } catch (error) {
      console.error('Could not create service:', error);
      res.status(500).json({ error: 'Could not create service' });
    }
  });

  app.put('/api/services/:id', async (req, res) => {
    const id = parseServiceId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Valid service ID is required' });
    const problem = checkServiceInput(req.body);
    if (problem) return res.status(400).json({ error: problem });
    try {
      const updated = await repository.update(id, serviceValues(req.body));
      if (!updated) return res.status(404).json({ error: 'Service not found' });
      cache = cache.map(item => item.id === id ? updated : item);
      res.json(updated);
    } catch (error) {
      console.error('Could not update service:', error);
      res.status(500).json({ error: 'Could not update service' });
    }
  });

  app.delete('/api/services/:id', async (req, res) => {
    const id = parseServiceId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Valid service ID is required' });
    try {
      const deleted = await repository.remove(id);
      if (!deleted) return res.status(404).json({ error: 'Service not found' });
      cache = cache.filter(item => item.id !== id);
      removeQueueForService(id);
      res.json({ message: 'Service deleted successfully', service: deleted });
    } catch (error) {
      console.error('Could not delete service:', error);
      if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
        return res.status(409).json({ error: 'This service is referenced by a queue and cannot be deleted' });
      }
      res.status(500).json({ error: 'Could not delete service' });
    }
  });

  app.initialize = initialize;
  return app;
}

// Default app for server.js. Instantiating pool does not open a DB connection
// until a request or initialize() is executed.
const pool = require('./database/pool');
const app = createServiceApp(createServiceRepository(pool));
app.createServiceApp = createServiceApp;
app.checkServiceInput = checkServiceInput;
module.exports = app;

if (require.main === module) {
  const PORT = Number(process.env.PORT || 3000);
  app.initialize().then(() => app.listen(PORT, () => {
    console.log(`Service API running at http://localhost:${PORT}`);
  })).catch(error => {
    console.error('Could not start Service API; check MySQL and .env:', error.message);
    process.exitCode = 1;
  });
}
