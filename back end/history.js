/* ===========================================================
   QueueSmart - History Module (Assignment 3, part 6)

   Keeps a record of every queue a user already finished.
   There is no database in this assignment, so the records
   live in a plain array in memory. They disappear when the
   server restarts, which is fine for A3.

   This file exports two things:
     1. plain functions  -> easy to unit test, no server needed
     2. an express router -> so server.js can serve the routes

   To turn the routes on, add these two lines to server.js:
       const history = require("./history");
       app.use("/api/history", history.router);
   =========================================================== */

const express = require("express");

/* every finished queue, newest first */
const records = [];

/* each new record gets the next number: 1, 2, 3 ... */
let nextId = 1;

/* ===========================================================
   THE RULES
   One record needs a user, a service name and an outcome.
   "outcome" says how it ended: the user was served, or left.
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
   THE ACTIONS
   =========================================================== */

/* Save one finished queue.
   Throws when the record is not valid, so the route can
   answer with 400 and the list of problems. */
function addRecord(record) {
  const problems = findProblems(record);

  if (problems.length > 0) {
    const error = new Error("Invalid history record.");
    error.problems = problems;
    throw error;
  }

  const saved = {
    id: nextId,
    userId: record.userId,
    serviceName: record.serviceName.trim(),
    waitMinutes: record.waitMinutes === undefined ? 0 : record.waitMinutes,
    outcome: record.outcome,
    completedAt: record.completedAt || new Date().toISOString().slice(0, 10)
  };

  nextId = nextId + 1;

  /* newest first, so the history screen shows recent ones on top */
  records.unshift(saved);

  return saved;
}

/* Every record that belongs to one user. */
function getRecordsForUser(userId) {
  return records.filter(function (record) {
    return record.userId === userId;
  });
}

/* The same list, but only between two dates.
   Both dates are optional, and they look like "2026-10-23". */
function getRecordsBetween(userId, fromDate, toDate) {
  return getRecordsForUser(userId).filter(function (record) {
    if (fromDate && record.completedAt < fromDate) {
      return false;
    }
    if (toDate && record.completedAt > toDate) {
      return false;
    }
    return true;
  });
}

/* Used by the tests so each test starts from an empty list. */
function clearAll() {
  records.length = 0;
  nextId = 1;
}

/* ===========================================================
   THE ROUTES
   =========================================================== */

const router = express.Router();

/* GET /api/history/:userId
   Optional query: ?from=2026-10-01&to=2026-10-23 */
router.get("/:userId", function (req, res) {
  const userId = req.params.userId;
  const list = getRecordsBetween(userId, req.query.from, req.query.to);

  return res.status(200).json({ history: list });
});

/* POST /api/history
   Called when a user is served or leaves a queue. */
router.post("/", function (req, res) {
  try {
    const saved = addRecord(req.body);
    return res.status(201).json(saved);
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      problems: error.problems || []
    });
  }
});

module.exports = {
  router: router,
  addRecord: addRecord,
  findProblems: findProblems,
  getRecordsForUser: getRecordsForUser,
  getRecordsBetween: getRecordsBetween,
  clearAll: clearAll
};
