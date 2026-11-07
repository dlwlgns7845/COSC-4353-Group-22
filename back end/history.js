/* ===========================================================
   QueueSmart - History Module (part 6)

   Keeps a record of every queue a user already finished.
   In Assignment 3 these records lived in an array in memory.
   For Assignment 4 they live in the QueueHistory table in
   MySQL, so they survive a server restart.

   This file exports:
     1. findProblems   -> plain validation, no database needed
     2. the data functions -> they run the SQL
     3. an express router  -> so server.js can serve the routes

   To turn the routes on, add these two lines to server.js:
       const history = require("./history");
       app.use("/api/history", history.router);
   =========================================================== */

const express = require("express");
const db = require("./database/db");

/* Normally we talk to the real MySQL pool. The unit tests call
   useDatabase() with a fake one so they can run without MySQL
   installed. */
let testDatabase = null;

function useDatabase(fake) {
  testDatabase = fake;
}

function connection() {
  if (testDatabase !== null) {
    return testDatabase;
  }
  return db.getPool();
}

/* ===========================================================
   THE RULES
   One record needs a user, a service name and an outcome.
   "outcome" says how it ended: the user was served, or left.

   The table enforces these too (NOT NULL, VARCHAR(100), ENUM),
   but we check here first so the user gets a clear message
   instead of a raw database error.
   =========================================================== */

const ALLOWED_OUTCOMES = ["Served", "Left queue"];

const MAX_SERVICE_NAME_LENGTH = 100;

/* Check one record before we save it.
   Returns an empty array when everything is fine,
   otherwise a list of messages to send back to the caller. */
function findProblems(record) {
  const problems = [];

  if (!record.userId) {
    problems.push("userId is required.");
  }

  if (!record.serviceName || record.serviceName.trim() === "") {
    problems.push("serviceName is required.");
  } else if (record.serviceName.length > MAX_SERVICE_NAME_LENGTH) {
    problems.push("serviceName cannot be longer than 100 characters.");
  }

  /* waitMinutes is optional, but if it is there it has to be a number */
  if (record.waitMinutes !== undefined) {
    if (typeof record.waitMinutes !== "number" || isNaN(record.waitMinutes)) {
      problems.push("waitMinutes must be a number.");
    } else if (record.waitMinutes < 0) {
      problems.push("waitMinutes cannot be negative.");
    }
  }

  if (!ALLOWED_OUTCOMES.includes(record.outcome)) {
    problems.push("outcome must be either Served or Left queue.");
  }

  return problems;
}

/* ===========================================================
   TURNING A TABLE ROW INTO THE SHAPE THE FRONT END EXPECTS

   The columns use under_scores and the screens use camelCase,
   so we rename them in one place instead of all over the app.
   =========================================================== */

function toRecord(row) {
  return {
    id: row.history_id,
    userId: row.email,
    serviceName: row.service_name,
    waitMinutes: row.wait_minutes,
    outcome: row.outcome,
    completedAt: row.completed_at
  };
}

/* ===========================================================
   THE ACTIONS
   =========================================================== */

/* Save one finished queue.
   Throws when the record is not valid, so the route can
   answer with 400 and the list of problems. */
async function addRecord(record) {
  const problems = findProblems(record);

  if (problems.length > 0) {
    const error = new Error("Invalid history record.");
    error.problems = problems;
    throw error;
  }

  const serviceName = record.serviceName.trim();
  const waitMinutes = record.waitMinutes === undefined ? 0 : record.waitMinutes;
  const completedAt = record.completedAt || new Date().toISOString().slice(0, 10);

  const [result] = await connection().execute(
    "INSERT INTO QueueHistory (email, service_name, wait_minutes, outcome, completed_at) VALUES (?, ?, ?, ?, ?)",
    [record.userId, serviceName, waitMinutes, record.outcome, completedAt]
  );

  return {
    id: result.insertId,
    userId: record.userId,
    serviceName: serviceName,
    waitMinutes: waitMinutes,
    outcome: record.outcome,
    completedAt: completedAt
  };
}

/* Every record that belongs to one user, newest first.
   DATE_FORMAT keeps the date a plain "2026-10-20" string
   instead of a JavaScript Date object. */
async function getRecordsForUser(userId) {
  const [rows] = await connection().execute(
    "SELECT history_id, email, service_name, wait_minutes, outcome," +
      " DATE_FORMAT(completed_at, '%Y-%m-%d') AS completed_at" +
      " FROM QueueHistory WHERE email = ?" +
      " ORDER BY completed_at DESC, history_id DESC",
    [userId]
  );

  return rows.map(toRecord);
}

/* The same list, but only between two dates.
   Both dates are optional, and they look like "2026-10-23".
   We build the WHERE part as we go so the database does the
   filtering instead of us loading every row first. */
async function getRecordsBetween(userId, fromDate, toDate) {
  let sql =
    "SELECT history_id, email, service_name, wait_minutes, outcome," +
    " DATE_FORMAT(completed_at, '%Y-%m-%d') AS completed_at" +
    " FROM QueueHistory WHERE email = ?";

  const values = [userId];

  if (fromDate) {
    sql = sql + " AND completed_at >= ?";
    values.push(fromDate);
  }

  if (toDate) {
    sql = sql + " AND completed_at <= ?";
    values.push(toDate);
  }

  sql = sql + " ORDER BY completed_at DESC, history_id DESC";

  const [rows] = await connection().execute(sql, values);

  return rows.map(toRecord);
}

/* ===========================================================
   THE ROUTES
   =========================================================== */

const router = express.Router();

/* GET /api/history/:userId
   Optional query: ?from=2026-10-01&to=2026-10-23 */
router.get("/:userId", async function (req, res) {
  try {
    const list = await getRecordsBetween(
      req.params.userId,
      req.query.from,
      req.query.to
    );

    return res.status(200).json({ history: list });
  } catch (error) {
    return res.status(500).json({ message: "Could not read the history." });
  }
});

/* POST /api/history
   Called when a user is served or leaves a queue. */
router.post("/", async function (req, res) {
  try {
    const saved = await addRecord(req.body);
    return res.status(201).json(saved);
  } catch (error) {
    /* our own validation error carries a problems list */
    if (error.problems) {
      return res.status(400).json({
        message: error.message,
        problems: error.problems
      });
    }

    /* the user does not exist yet, so the foreign key says no */
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        message: "That user is not registered.",
        problems: ["userId must belong to a registered user."]
      });
    }

    return res.status(500).json({ message: "Could not save the record." });
  }
});

module.exports = {
  router: router,
  addRecord: addRecord,
  findProblems: findProblems,
  getRecordsForUser: getRecordsForUser,
  getRecordsBetween: getRecordsBetween,
  useDatabase: useDatabase
};
