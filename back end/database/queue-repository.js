/* ===========================================================
   QueueSmart - Queue and QueueEntry storage (part 4 and 5)

   All the SQL for the Queue and QueueEntry tables lives here, so
   queue-management.js can keep its rules and just ask this file
   to read and write instead of pushing into an array.

   To use it:
       const db = require("./database/db");
       const { createQueueRepository } = require("./database/queue-repository");
       const queues = createQueueRepository(db.getPool());

       const queue = await queues.createQueue(serviceId);
       const entry = await queues.addEntry(queue.queueId, userId, "high");

   Every method takes a connection that was given to the factory,
   so the tests can hand in a fake one and run without MySQL.
   =========================================================== */

/* The columns, renamed to the camelCase the routes and screens
   already use, so nothing above this file has to change. */
const QUEUE_COLUMNS =
  "queue_id AS queueId, service_id AS serviceId, status," +
  " DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS createdAt";

const ENTRY_COLUMNS =
  "entry_id AS entryId, queue_id AS queueId, user_id AS userId," +
  " position, priority," +
  " DATE_FORMAT(joined_at, '%Y-%m-%dT%H:%i:%s') AS joinTime, status";

function createQueueRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new TypeError("A MySQL connection pool is required");
  }

  /* ---------------------------------------------------------
     Numbering the line again.

     An entry with a high priority goes in front of people who
     joined earlier, so after anyone joins, leaves or is served
     the waiting entries of that queue get their positions set
     again, 1, 2, 3 and so on.

     FIELD() puts high first and low last. Entries with the same
     priority keep the order they arrived in.
     --------------------------------------------------------- */
  async function renumber(queueId) {
    await pool.execute(
      "UPDATE QueueEntry AS e" +
        " JOIN (" +
        "   SELECT entry_id, ROW_NUMBER() OVER (" +
        "     ORDER BY FIELD(priority, 'high', 'medium', 'low'), joined_at, entry_id" +
        "   ) AS place" +
        "   FROM QueueEntry WHERE queue_id = ? AND status = 'waiting'" +
        " ) AS ordered ON ordered.entry_id = e.entry_id" +
        " SET e.position = ordered.place",
      [queueId]
    );
  }

  return {
    /* ----------------------------------------------------- queues */

    async listQueues() {
      const [rows] = await pool.execute(
        "SELECT " + QUEUE_COLUMNS + " FROM Queue ORDER BY queue_id"
      );
      return rows;
    },

    async findQueue(queueId) {
      const [rows] = await pool.execute(
        "SELECT " + QUEUE_COLUMNS + " FROM Queue WHERE queue_id = ?",
        [queueId]
      );
      return rows[0] || null;
    },

    async findQueueForService(serviceId) {
      const [rows] = await pool.execute(
        "SELECT " + QUEUE_COLUMNS + " FROM Queue WHERE service_id = ?",
        [serviceId]
      );
      return rows[0] || null;
    },

    async createQueue(serviceId) {
      const [result] = await pool.execute(
        "INSERT INTO Queue (service_id, status) VALUES (?, 'open')",
        [serviceId]
      );
      return this.findQueue(result.insertId);
    },

    /* Open or close a queue. Returns null when there is no such queue. */
    async setQueueStatus(queueId, status) {
      const [result] = await pool.execute(
        "UPDATE Queue SET status = ? WHERE queue_id = ?",
        [status, queueId]
      );
      if (!result.affectedRows) {
        return null;
      }
      return this.findQueue(queueId);
    },

    async removeQueue(queueId) {
      const [result] = await pool.execute(
        "DELETE FROM Queue WHERE queue_id = ?",
        [queueId]
      );
      return result.affectedRows > 0;
    },

    /* ---------------------------------------------------- entries */

    /* The people still waiting, in the order they will be served. */
    async listEntries(queueId) {
      const [rows] = await pool.execute(
        "SELECT " + ENTRY_COLUMNS +
          " FROM QueueEntry WHERE queue_id = ? AND status = 'waiting'" +
          " ORDER BY position",
        [queueId]
      );
      return rows;
    },

    /* Everything in the queue, served and canceled included. */
    async listAllEntries(queueId) {
      const [rows] = await pool.execute(
        "SELECT " + ENTRY_COLUMNS +
          " FROM QueueEntry WHERE queue_id = ? ORDER BY entry_id",
        [queueId]
      );
      return rows;
    },

    async findEntry(entryId) {
      const [rows] = await pool.execute(
        "SELECT " + ENTRY_COLUMNS + " FROM QueueEntry WHERE entry_id = ?",
        [entryId]
      );
      return rows[0] || null;
    },

    // Get the information needed to create a history record.
async getHistoryDetails(entryId) {
  const [rows] = await pool.execute(
    `SELECT
       u.email AS email,
       s.name AS serviceName,
       GREATEST(0, TIMESTAMPDIFF(MINUTE, e.joined_at, NOW())) AS waitMinutes
     FROM QueueEntry e
     JOIN users u ON e.user_id = u.id
     JOIN Queue q ON e.queue_id = q.queue_id
     JOIN services s ON q.service_id = s.service_id
     WHERE e.entry_id = ?`,
    [entryId]
  );

  return rows[0] || null;
},

    /* Put someone in the line. The position is set by renumber(),
       so a high priority entry lands in front of the ones already
       waiting instead of at the end. */
    async addEntry(queueId, userId, priority) {
      const chosen = priority || "medium";

      const [result] = await pool.execute(
        "INSERT INTO QueueEntry (queue_id, user_id, position, priority, status)" +
          " VALUES (?, ?, 0, ?, 'waiting')",
        [queueId, userId, chosen]
      );

      await renumber(queueId);

      return this.findEntry(result.insertId);
    },

    /* Mark one entry served or canceled and close the gap it leaves. */
    async setEntryStatus(entryId, status) {
      const entry = await this.findEntry(entryId);
      if (!entry) {
        return null;
      }

      await pool.execute(
        "UPDATE QueueEntry SET status = ?, position = 0 WHERE entry_id = ?",
        [status, entryId]
      );

      await renumber(entry.queueId);

      return this.findEntry(entryId);
    },

    /* The person at the front, or null when nobody is waiting. */
    async peekNext(queueId) {
      const [rows] = await pool.execute(
        "SELECT " + ENTRY_COLUMNS +
          " FROM QueueEntry WHERE queue_id = ? AND status = 'waiting'" +
          " ORDER BY position LIMIT 1",
        [queueId]
      );
      return rows[0] || null;
    },

    /* Serve the person at the front and move everyone else up. */
    async serveNext(queueId) {
      const next = await this.peekNext(queueId);
      if (!next) {
        return null;
      }
      return this.setEntryStatus(next.entryId, "served");
    },

    async removeEntry(entryId) {
      const entry = await this.findEntry(entryId);
      if (!entry) {
        return null;
      }

      await pool.execute("DELETE FROM QueueEntry WHERE entry_id = ?", [entryId]);
      await renumber(entry.queueId);

      return entry;
    },

    /* How many people are still waiting, for the dashboard. */
    async countWaiting(queueId) {
      const [rows] = await pool.execute(
        "SELECT COUNT(*) AS waiting FROM QueueEntry" +
          " WHERE queue_id = ? AND status = 'waiting'",
        [queueId]
      );
      return rows[0].waiting;
    },

    /* Exposed so a route can renumber after its own change. */
    renumber: renumber
  };
}

module.exports = { createQueueRepository: createQueueRepository };
