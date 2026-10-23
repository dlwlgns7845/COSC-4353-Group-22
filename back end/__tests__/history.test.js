/* ===========================================================
   Unit tests for the History module.

   Run them with:  npm test
   With coverage:  npm run coverage
   =========================================================== */

const history = require("../history");

/* a record that passes every rule, used as a starting point */
function validRecord(changes) {
  const base = {
    userId: "u1",
    serviceName: "Financial Aid",
    waitMinutes: 20,
    outcome: "Served",
    completedAt: "2026-10-20"
  };

  return Object.assign({}, base, changes);
}

/* start every test with an empty list */
beforeEach(function () {
  history.clearAll();
});

/* ===========================================================
   VALIDATION
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

  test("saves a valid record and gives it an id", function () {
    const saved = history.addRecord(validRecord());

    expect(saved.id).toBe(1);
    expect(saved.serviceName).toBe("Financial Aid");
    expect(history.getRecordsForUser("u1").length).toBe(1);
  });

  test("ids count up", function () {
    const first = history.addRecord(validRecord());
    const second = history.addRecord(validRecord());

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
  });

  test("extra spaces around the service name are removed", function () {
    const saved = history.addRecord(validRecord({ serviceName: "  ID Card  " }));
    expect(saved.serviceName).toBe("ID Card");
  });

  test("a missing waitMinutes becomes 0", function () {
    const record = validRecord();
    delete record.waitMinutes;

    expect(history.addRecord(record).waitMinutes).toBe(0);
  });

  test("a missing date becomes today", function () {
    const record = validRecord();
    delete record.completedAt;

    const today = new Date().toISOString().slice(0, 10);
    expect(history.addRecord(record).completedAt).toBe(today);
  });

  test("the newest record comes first", function () {
    history.addRecord(validRecord({ serviceName: "Older" }));
    history.addRecord(validRecord({ serviceName: "Newer" }));

    expect(history.getRecordsForUser("u1")[0].serviceName).toBe("Newer");
  });

  test("an invalid record is rejected and nothing is saved", function () {
    expect(function () {
      history.addRecord(validRecord({ outcome: "Nope" }));
    }).toThrow("Invalid history record.");

    expect(history.getRecordsForUser("u1").length).toBe(0);
  });

  test("the thrown error carries the list of problems", function () {
    try {
      history.addRecord({ serviceName: "" });
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

describe("reading the history", function () {

  test("each user only sees their own records", function () {
    history.addRecord(validRecord({ userId: "u1" }));
    history.addRecord(validRecord({ userId: "u2" }));

    expect(history.getRecordsForUser("u1").length).toBe(1);
    expect(history.getRecordsForUser("u2").length).toBe(1);
  });

  test("a user with no history gets an empty list", function () {
    expect(history.getRecordsForUser("nobody")).toEqual([]);
  });

  test("the date filter keeps only the records in range", function () {
    history.addRecord(validRecord({ completedAt: "2026-10-01" }));
    history.addRecord(validRecord({ completedAt: "2026-10-15" }));
    history.addRecord(validRecord({ completedAt: "2026-10-30" }));

    const inRange = history.getRecordsBetween("u1", "2026-10-10", "2026-10-20");

    expect(inRange.length).toBe(1);
    expect(inRange[0].completedAt).toBe("2026-10-15");
  });

  test("only a from date still works", function () {
    history.addRecord(validRecord({ completedAt: "2026-10-01" }));
    history.addRecord(validRecord({ completedAt: "2026-10-30" }));

    expect(history.getRecordsBetween("u1", "2026-10-10").length).toBe(1);
  });

  test("no dates returns everything", function () {
    history.addRecord(validRecord());
    history.addRecord(validRecord());

    expect(history.getRecordsBetween("u1").length).toBe(2);
  });
});
