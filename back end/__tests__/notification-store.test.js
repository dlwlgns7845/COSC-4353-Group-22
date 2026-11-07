/* ===========================================================
   Unit tests for the Notification storage module.

   Same idea as the history tests: a fake database stands in
   for MySQL, so these run right after "npm install".
   =========================================================== */

const store = require("../notification-store");
const fakeDatabase = require("../test-helpers/fake-database");

function validNotification(changes) {
  const base = {
    userId: "u1@uh.edu",
    message: "You are next in line."
  };

  return Object.assign({}, base, changes);
}

let db;

beforeEach(function () {
  db = fakeDatabase();
  store.useDatabase(db);
});

/* ===========================================================
   VALIDATION
   =========================================================== */

describe("validation", function () {

  test("a complete notification has no problems", function () {
    expect(store.findProblems(validNotification())).toEqual([]);
  });

  test("userId is required", function () {
    const problems = store.findProblems(validNotification({ userId: "" }));
    expect(problems).toContain("userId is required.");
  });

  test("message is required", function () {
    const problems = store.findProblems(validNotification({ message: "   " }));
    expect(problems).toContain("message is required.");
  });

  test("message cannot be longer than 255 characters", function () {
    const long = "a".repeat(256);
    const problems = store.findProblems(validNotification({ message: long }));
    expect(problems).toContain("message cannot be longer than 255 characters.");
  });

  test("a message of exactly 255 characters is allowed", function () {
    const message = "a".repeat(255);
    expect(store.findProblems(validNotification({ message: message }))).toEqual([]);
  });

  test("status may be left out", function () {
    expect(store.findProblems(validNotification())).toEqual([]);
  });

  test("status has to be sent or viewed", function () {
    const problems = store.findProblems(validNotification({ status: "later" }));
    expect(problems).toContain("status must be either sent or viewed.");
  });

  test("viewed is accepted as a status", function () {
    expect(store.findProblems(validNotification({ status: "viewed" }))).toEqual([]);
  });
});

/* ===========================================================
   SAVING
   =========================================================== */

describe("saveNotification", function () {

  test("saves one and gives back the new id", async function () {
    db.willReturn({ insertId: 12 });

    const saved = await store.saveNotification(validNotification());

    expect(saved.id).toBe(12);
    expect(db.lastCall().sql).toContain("INSERT INTO Notification");
  });

  test("a new notification starts as sent", async function () {
    db.willReturn({ insertId: 1 });

    const saved = await store.saveNotification(validNotification());

    expect(saved.status).toBe("sent");
    expect(db.lastCall().values[2]).toBe("sent");
  });

  test("extra spaces around the message are removed", async function () {
    db.willReturn({ insertId: 1 });

    const saved = await store.saveNotification(
      validNotification({ message: "  Your turn  " })
    );

    expect(saved.message).toBe("Your turn");
  });

  test("the values are passed separately, not glued into the SQL", async function () {
    db.willReturn({ insertId: 1 });

    await store.saveNotification(validNotification({ message: "Almost there" }));

    expect(db.lastCall().sql).toContain("?");
    expect(db.lastCall().sql).not.toContain("Almost there");
  });

  test("an invalid notification is rejected and nothing is written", async function () {
    await expect(
      store.saveNotification(validNotification({ message: "" }))
    ).rejects.toThrow("Invalid notification.");

    expect(db.calls.length).toBe(0);
  });
});

/* ===========================================================
   READING
   =========================================================== */

describe("listForUser", function () {

  test("asks only for the rows of that user, newest first", async function () {
    db.willReturn([]);

    await store.listForUser("u1@uh.edu");

    expect(db.lastCall().sql).toContain("WHERE email = ?");
    expect(db.lastCall().sql).toContain("ORDER BY created_at DESC");
    expect(db.lastCall().values).toEqual(["u1@uh.edu"]);
  });

  test("a table row comes back in the shape the screens use", async function () {
    db.willReturn([
      {
        notification_id: 3,
        email: "u1@uh.edu",
        message: "You are next in line.",
        status: "sent",
        created_at: "2026-11-06 14:00:00"
      }
    ]);

    const list = await store.listForUser("u1@uh.edu");

    expect(list[0]).toEqual({
      id: 3,
      userId: "u1@uh.edu",
      message: "You are next in line.",
      status: "sent",
      createdAt: "2026-11-06 14:00:00"
    });
  });

  test("a user with no notifications gets an empty list", async function () {
    db.willReturn([]);

    expect(await store.listForUser("nobody@uh.edu")).toEqual([]);
  });
});

/* ===========================================================
   MARKING AS READ
   =========================================================== */

describe("markAllViewed", function () {

  test("only touches the ones still marked sent", async function () {
    db.willReturn({ affectedRows: 2 });

    const changed = await store.markAllViewed("u1@uh.edu");

    expect(changed).toBe(2);
    expect(db.lastCall().sql).toContain("SET status = 'viewed'");
    expect(db.lastCall().sql).toContain("status = 'sent'");
  });

  test("returns 0 when there was nothing to mark", async function () {
    db.willReturn({ affectedRows: 0 });

    expect(await store.markAllViewed("u1@uh.edu")).toBe(0);
  });
});

describe("countUnread", function () {

  test("gives back the number the query found", async function () {
    db.willReturn([{ unread: 5 }]);

    expect(await store.countUnread("u1@uh.edu")).toBe(5);
    expect(db.lastCall().sql).toContain("COUNT(*)");
  });

  test("gives back 0 when the user has read everything", async function () {
    db.willReturn([{ unread: 0 }]);

    expect(await store.countUnread("u1@uh.edu")).toBe(0);
  });
});
