/* ===========================================================
   QueueSmart - Notification storage (part 6)

   Assignment 4 asks for a Notification table that tracks
   system activity: who it is for, the message, when it
   happened, and whether it was sent or already viewed.

   notifications.js builds the messages while the queue moves.
   This file is only about keeping them in MySQL, so the two
   jobs stay separate and each one is easy to test.

   To store a notification from anywhere:
       const store = require("./notification-store");
       await store.saveNotification({ userId: email, message: text });
   =========================================================== */

const db = require("./database/db");

/* Same idea as in history.js: the tests hand in a fake
   database so they can run without MySQL installed. */
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
   =========================================================== */

const ALLOWED_STATUSES = ["sent", "viewed"];

const MAX_MESSAGE_LENGTH = 255;

function findProblems(notification) {
  const problems = [];

  if (!notification.userId) {
    problems.push("userId is required.");
  }

  if (!notification.message || notification.message.trim() === "") {
    problems.push("message is required.");
  } else if (notification.message.length > MAX_MESSAGE_LENGTH) {
    problems.push("message cannot be longer than 255 characters.");
  }

  /* status is optional and defaults to "sent" */
  if (notification.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(notification.status)) {
      problems.push("status must be either sent or viewed.");
    }
  }

  return problems;
}

/* ===========================================================
   TURNING A TABLE ROW INTO THE SHAPE THE FRONT END EXPECTS
   =========================================================== */

function toNotification(row) {
  return {
    id: row.notification_id,
    userId: row.email,
    message: row.message,
    createdAt: row.created_at,
    status: row.status
  };
}

/* ===========================================================
   THE ACTIONS
   =========================================================== */

/* Save one notification. Throws when it is not valid. */
async function saveNotification(notification) {
  const problems = findProblems(notification);

  if (problems.length > 0) {
    const error = new Error("Invalid notification.");
    error.problems = problems;
    throw error;
  }

  const message = notification.message.trim();
  const status = notification.status || "sent";

  const [result] = await connection().execute(
    "INSERT INTO Notification (email, message, status) VALUES (?, ?, ?)",
    [notification.userId, message, status]
  );

  return {
    id: result.insertId,
    userId: notification.userId,
    message: message,
    status: status
  };
}

/* Every notification for one user, newest first. */
async function listForUser(userId) {
  const [rows] = await connection().execute(
    "SELECT notification_id, email, message, status," +
      " DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at" +
      " FROM Notification WHERE email = ?" +
      " ORDER BY created_at DESC, notification_id DESC",
    [userId]
  );

  return rows.map(toNotification);
}

/* Mark everything this user has as read.
   Returns how many rows changed. */
async function markAllViewed(userId) {
  const [result] = await connection().execute(
    "UPDATE Notification SET status = 'viewed' WHERE email = ? AND status = 'sent'",
    [userId]
  );

  return result.affectedRows;
}

/* How many the user has not opened yet, for the badge. */
async function countUnread(userId) {
  const [rows] = await connection().execute(
    "SELECT COUNT(*) AS unread FROM Notification WHERE email = ? AND status = 'sent'",
    [userId]
  );

  return rows[0].unread;
}

module.exports = {
  findProblems: findProblems,
  saveNotification: saveNotification,
  listForUser: listForUser,
  markAllViewed: markAllViewed,
  countUnread: countUnread,
  useDatabase: useDatabase
};
