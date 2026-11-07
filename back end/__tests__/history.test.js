/* ===========================================================
   Unit tests for the History module.

   The module now talks to MySQL, so each test gives it a fake
   database first. That keeps the tests fast and lets them run
   on a machine with no MySQL server.

   Run them with:  npm test
   With coverage:  npm run coverage
   =========================================================== */

const history = require("../history");
const fakeDatabase = require("../test-helpers/fake-database");

/* a record that passes every rule, used as a starting point */
function validRecord(changes) {
  const base = {
    userId: "u1@uh.edu",
    serviceName: "Financial Aid",
    waitMinutes: 20,
    outcome: "Served",
    completedAt: "2026-10-20"
  };

  return Object.assign({}, base, changes);
}

/* one table row as MySQL would hand it back */
function validRow(changes) {
  const base = {
    history_id: 1,
    email: "u1@uh.edu",
    service_name: "Financial Aid",
    wait_minutes: 20,
    outcome: "Served",
    completed_at: "2026-10-20"
  };

  return Object.assign({}, base, changes);
}

let db;

/* start every test with a clean fake database */
beforeEach(function () {
  db = fakeDatabase();
  history.useDatabase(db);
});

/* ===========================================================
   VALIDATION
   These run before any SQL, so they need no database at all.
   =========================================================== */

describe("validation", function () {

  test("a complete record has no problems", function () {
    expect(history.findProblems(validRecord())).toEqual([]);
  });

  test("userId is required", function () {
    const problems = history.findProblems(validRecord({ userId: "" }));
    expect(problems).toContain("userId is required.");
  });

  test("serviceName is required", function () {
    const problems = history.findProblems(validRecord({ serviceName: "   " }));
    expect(problems).toContain("serviceName is required.");
  });

  test("serviceName cannot be longer than 100 characters", function () {
    const longName = "a".repeat(101);
    const problems = history.findProblems(validRecord({ serviceName: longName }));
    expect(problems).toContain("serviceName cannot be longer than 100 characters.");
  });

  test("a name of exactly 100 characters is allowed", function () {
    const name = "a".repeat(100);
    expect(history.findProblems(validRecord({ serviceName: name }))).toEqual([]);
  });

  test("waitMinutes has to be a number", function () {
    const problems = history.findProblems(validRecord({ waitMinutes: "twenty" }));
    expect(problems).toContain("waitMinutes must be a number.");
  });

  test("waitMinutes cannot be negative", function () {
    const problems = history.findProblems(validRecord({ waitMinutes: -5 }));
    expect(problems).toContain("waitMinutes cannot be negative.");
  });

  test("waitMinutes may be left out", function () {
    const record = validRecord();
    delete record.waitMinutes;
    expect(history.findProblems(record)).toEqual([]);
  });

  test("outcome has to be Served or Left queue", function () {
    const problems = history.findProblems(validRecord({ outcome: "Cancelled" }));
    expect(problems).toContain("outcome must be either Served or Left queue.");
  });

  test("one bad record can report several problems at once", function () {
    const problems = history.findProblems({ serviceName: "", outcome: "???" });
    expect(problems.length).toBeGreaterThan(1);
  });
});

/* ===========================================================
   SAVING
   =========================================================== */

describe("addRecord", function () {

  test("saves a valid record and gives back the new id", async function () {
    db.willReturn({ insertId: 7 });

    const saved = await history.addRecord(validRecord());

    expect(saved.id).toBe(7);
    expect(saved.serviceName).toBe("Financial Aid");
  });

  test("the record is written with an INSERT", async function () {
    db.willReturn({ insertId: 1 });

    await history.addRecord(validRecord());

    expect(db.lastCall().sql).toContain("INSERT INTO QueueHistory");
  });

  test("the values go into the statement in the right order", async function () {
    db.willReturn({ insertId: 1 });

    await history.addRecord(validRecord());

    expect(db.lastCall().values).toEqual([
      "u1@uh.edu",
      "Financial Aid",
      20,
      "Served",
      "2026-10-20"
    ]);
  });

  test("the values are passed separately, not glued into the SQL", async function () {
    db.willReturn({ insertId: 1 });

    await history.addRecord(validRecord({ serviceName: "Tutoring" }));

    /* placeholders keep the statement safe from SQL injection */
    expect(db.lastCall().sql).toContain("?");
    expect(db.lastCall().sql).not.toContain("Tutoring");
  });

  test("extra spaces around the service name are removed", async function () {
    db.willReturn({ insertId: 1 });

    const saved = await history.addRecord(validRecord({ serviceName: "  ID Card  " }));

    expect(saved.serviceName).toBe("ID Card");
    expect(db.lastCall().values[1]).toBe("ID Card");
  });

  test("a missing waitMinutes becomes 0", async function () {
    db.willReturn({ insertId: 1 });

    const record = validRecord();
    delete record.waitMinutes;

    expect((await history.addRecord(record)).waitMinutes).toBe(0);
  });

  test("a missing date becomes today", async function () {
    db.willReturn({ insertId: 1 });

    const record = validRecord();
    delete record.completedAt;

    const today = new Date().toISOString().slice(0, 10);

    expect((await history.addRecord(record)).completedAt).toBe(today);
  });

  test("an invalid record is rejected and nothing is written", async function () {
    await expect(
      history.addRecord(validRecord({ outcome: "Nope" }))
    ).rejects.toThrow("Invalid history record.");

    expect(db.calls.length).toBe(0);
  });

  test("the thrown error carries the list of problems", async function () {
    try {
      await history.addRecord({ serviceName: "" });
      /* we should never get here, so fail on purpose if we do */
      throw new Error("addRecord should have thrown");
    } catch (error) {
      expect(error.problems.length).toBeGreaterThan(0);
    }
  });
});

/* ===========================================================
   READING
   =========================================================== */

describe("getRecordsForUser", function () {

  test("asks only for the rows of that user", async function () {
    db.willReturn([]);

    await history.getRecordsForUser("u1@uh.edu");

    expect(db.lastCall().sql).toContain("WHERE email = ?");
    expect(db.lastCall().values).toEqual(["u1@uh.edu"]);
  });

  test("a table row comes back in the shape the screens use", async function () {
    db.willReturn([validRow()]);

    const list = await history.getRecordsForUser("u1@uh.edu");

    expect(list[0]).toEqual({
      id: 1,
      userId: "u1@uh.edu",
      serviceName: "Financial Aid",
      waitMinutes: 20,
      outcome: "Served",
      completedAt: "2026-10-20"
    });
  });

  test("a user with no history gets an empty list", async function () {
    db.willReturn([]);

    expect(await history.getRecordsForUser("nobody@uh.edu")).toEqual([]);
  });

  test("the newest record is asked for first", async function () {
    db.willReturn([]);

    await history.getRecordsForUser("u1@uh.edu");

    expect(db.lastCall().sql).toContain("ORDER BY completed_at DESC");
  });

  test("every row is converted, not just the first one", async function () {
    db.willReturn([
      validRow({ history_id: 1 }),
      validRow({ history_id: 2 }),
      validRow({ history_id: 3 })
    ]);

    const list = await history.getRecordsForUser("u1@uh.edu");

    expect(list.length).toBe(3);
    expect(list[2].id).toBe(3);
  });
});

describe("getRecordsBetween", function () {

  test("both dates are added to the query", async function () {
    db.willReturn([]);

    await history.getRecordsBetween("u1@uh.edu", "2026-10-10", "2026-10-20");

    expect(db.lastCall().sql).toContain("completed_at >= ?");
    expect(db.lastCall().sql).toContain("completed_at <= ?");
    expect(db.lastCall().values).toEqual(["u1@uh.edu", "2026-10-10", "2026-10-20"]);
  });

  test("only a from date still works", async function () {
    db.willReturn([]);

    await history.getRecordsBetween("u1@uh.edu", "2026-10-10");

    expect(db.lastCall().sql).toContain("completed_at >= ?");
    expect(db.lastCall().sql).not.toContain("completed_at <= ?");
    expect(db.lastCall().values).toEqual(["u1@uh.edu", "2026-10-10"]);
  });

  test("only a to date still works", async function () {
    db.willReturn([]);

    await history.getRecordsBetween("u1@uh.edu", undefined, "2026-10-20");

    expect(db.lastCall().sql).not.toContain("completed_at >= ?");
    expect(db.lastCall().sql).toContain("completed_at <= ?");
    expect(db.lastCall().values).toEqual(["u1@uh.edu", "2026-10-20"]);
  });

  test("no dates asks for everything that user has", async function () {
    db.willReturn([]);

    await history.getRecordsBetween("u1@uh.edu");

    expect(db.lastCall().sql).not.toContain("completed_at >=");
    expect(db.lastCall().values).toEqual(["u1@uh.edu"]);
  });

  test("the rows come back in the shape the screens use", async function () {
    db.willReturn([validRow({ service_name: "Advising" })]);

    const list = await history.getRecordsBetween("u1@uh.edu");

    expect(list[0].serviceName).toBe("Advising");
  });
});
