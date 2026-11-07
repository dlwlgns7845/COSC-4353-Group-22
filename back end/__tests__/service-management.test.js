const request = require('supertest');
const { createServiceApp } = require('../service-management');

function validService(changes = {}) {
  return { name: 'Financial Aid', description: 'Questions about grants and loans',
    duration: 15, priority: 'high', ...changes };
}

function mockRepository() {
  let rows = [];
  let nextId = 1;
  return {
    list: jest.fn(async () => rows.map(row => ({ ...row }))),
    create: jest.fn(async values => {
      const created = { id: nextId++, ...values };
      rows.push(created);
      return { ...created };
    }),
    update: jest.fn(async (id, values) => {
      const idx = rows.findIndex(row => row.id === id);
      if (idx === -1) return null;
      rows[idx] = { id, ...values };
      return { ...rows[idx] };
    }),
    remove: jest.fn(async id => {
      const idx = rows.findIndex(row => row.id === id);
      if (idx === -1) return null;
      return rows.splice(idx, 1)[0];
    })
  };
}

let app;
let repository;
beforeEach(async () => {
  repository = mockRepository();
  app = createServiceApp(repository, { attachQueue: false });
  await app.initialize();
});

test('GET lists stored services', async () => {
  const res = await request(app).get('/api/services');
  expect(res.status).toBe(200);
  expect(res.body).toEqual([]);
  expect(repository.list).toHaveBeenCalled();
});

test('POST creates a service with API-compatible field names', async () => {
  const res = await request(app).post('/api/services').send(validService());
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ id: 1, name: 'Financial Aid', duration: 15, priority: 'high' });
  expect(repository.create).toHaveBeenCalled();
  expect((await request(app).get('/api/services')).body).toHaveLength(1);
});

test.each([
  [{ name: '' }, /name is required/i],
  [{ name: 'x'.repeat(101) }, /100 characters/i],
  [{ description: '  ' }, /description is required/i],
  [{ description: 'x'.repeat(501) }, /500 characters/i],
  [{ duration: '' }, /duration is required/i],
  [{ duration: 0 }, /whole number/i],
  [{ duration: 241 }, /whole number/i],
  [{ duration: 1.5 }, /whole number/i],
  [{ duration: 'twenty' }, /whole number/i],
  [{ priority: 'urgent' }, /low, medium, or high/i],
])('POST rejects invalid data %j', async (changes, expected) => {
  const res = await request(app).post('/api/services').send(validService(changes));
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(expected);
  expect(repository.create).not.toHaveBeenCalled();
});

test('PUT updates stored service', async () => {
  const created = await request(app).post('/api/services').send(validService());
  const res = await request(app).put(`/api/services/${created.body.id}`).send(validService({ duration: 30 }));
  expect(res.status).toBe(200);
  expect(res.body.duration).toBe(30);
  expect((await request(app).get('/api/services')).body[0].duration).toBe(30);
});

test('PUT returns 404 for missing service and 400 for malformed ID', async () => {
  expect((await request(app).put('/api/services/999').send(validService())).status).toBe(404);
  expect((await request(app).put('/api/services/nope').send(validService())).status).toBe(400);
});

test('DELETE removes service', async () => {
  const created = await request(app).post('/api/services').send(validService());
  const res = await request(app).delete(`/api/services/${created.body.id}`);
  expect(res.status).toBe(200);
  expect(res.body.service.id).toBe(created.body.id);
  expect((await request(app).get('/api/services')).body).toEqual([]);
});

test('DELETE returns 404 if missing and 400 for invalid ID', async () => {
  expect((await request(app).delete('/api/services/999')).status).toBe(404);
  expect((await request(app).delete('/api/services/nope')).status).toBe(400);
});

test('API returns 500 when database is unavailable', async () => {
  repository.list.mockRejectedValueOnce(new Error('connection unavailable'));
  expect((await request(app).get('/api/services')).status).toBe(500);
});
