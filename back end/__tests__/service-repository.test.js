const { createServiceRepository } = require('../database/service-repository');

test('SELECT maps SQL columns to existing API fields', async () => {
  const execute = jest.fn(async () => [[{ id: 1, name: 'Advising', description: 'Help', duration: 20, priority: 'medium' }]]);
  const rows = await createServiceRepository({ execute }).list();
  expect(rows[0].duration).toBe(20);
  expect(execute.mock.calls[0][0]).toMatch(/expected_duration_minutes AS duration/);
});

test('INSERT uses parameter placeholders and returns created row', async () => {
  const service = { name: 'Advising', description: 'Degree planning', duration: 20, priority: 'medium' };
  const execute = jest.fn().mockResolvedValueOnce([{ insertId: 8 }])
    .mockResolvedValueOnce([[{ id: 8, ...service }]]);
  const created = await createServiceRepository({ execute }).create(service);
  expect(created.id).toBe(8);
  expect(execute.mock.calls[0][0]).toContain('VALUES (?, ?, ?, ?)');
  expect(execute.mock.calls[0][1]).toEqual(['Advising', 'Degree planning', 20, 'medium']);
});

test('UPDATE uses parameter placeholders and returns updated record', async () => {
  const service = { name: 'Financial Aid', description: 'Help', duration: 15, priority: 'high' };
  const execute = jest.fn().mockResolvedValueOnce([{ affectedRows: 1 }])
    .mockResolvedValueOnce([[{ id: 4, ...service }]]);
  const updated = await createServiceRepository({ execute }).update(4, service);
  expect(updated.id).toBe(4);
  expect(execute.mock.calls[0][1]).toEqual(['Financial Aid', 'Help', 15, 'high', 4]);
});

test('DELETE removes row with a parameterized ID', async () => {
  const execute = jest.fn().mockResolvedValueOnce([[{ id: 6, name: 'Old' }]])
    .mockResolvedValueOnce([{ affectedRows: 1 }]);
  const deleted = await createServiceRepository({ execute }).remove(6);
  expect(deleted.id).toBe(6);
  expect(execute.mock.calls[1]).toEqual(['DELETE FROM services WHERE service_id = ?', [6]]);
});
