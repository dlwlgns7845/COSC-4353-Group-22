// SQL is parameterized. The aliases preserve the existing frontend/API contract.
const COLUMNS = `service_id AS id, name, description,
    expected_duration_minutes AS duration, priority_level AS priority`;

function createServiceRepository(pool) {
  if (!pool || typeof pool.execute !== 'function') {
    throw new TypeError('A MySQL-compatible connection pool is required');
  }

  return {
    async list() {
      const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM services ORDER BY service_id`);
      return rows;
    },

    async findById(id) {
      const [rows] = await pool.execute(
        `SELECT ${COLUMNS} FROM services WHERE service_id = ?`, [id]
      );
      return rows[0] || null;
    },

    async create(service) {
      const [result] = await pool.execute(
        `INSERT INTO services (name, description, expected_duration_minutes, priority_level)
         VALUES (?, ?, ?, ?)`,
        [service.name, service.description, service.duration, service.priority]
      );
      return this.findById(result.insertId);
    },

    async update(id, service) {
      const [result] = await pool.execute(
        `UPDATE services SET name = ?, description = ?, expected_duration_minutes = ?,
         priority_level = ? WHERE service_id = ?`,
        [service.name, service.description, service.duration, service.priority, id]
      );
      if (!result.affectedRows) return null;
      return this.findById(id);
    },

    async remove(id) {
      const existing = await this.findById(id);
      if (!existing) return null;
      const [result] = await pool.execute('DELETE FROM services WHERE service_id = ?', [id]);
      return result.affectedRows ? existing : null;
    }
  };
}

module.exports = { createServiceRepository };
