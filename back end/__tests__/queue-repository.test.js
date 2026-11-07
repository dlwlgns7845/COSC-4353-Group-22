/* ===========================================================
   Unit tests for the Queue and QueueEntry storage.

   A fake connection stands in for MySQL, so these run right
   after npm install with no database server.
   =========================================================== */

const { createQueueRepository } = require("../database/queue-repository");
const fakeDatabase = require("../test-helpers/fake-database");

function queueRow(changes) {
  const base = {
    queueId: 1,
    serviceId: 3,
    status: "open",
    createdAt: "2026-11-06T10:00:00"
  };
  return Object.assign({}, base, changes);
}

function entryRow(changes) {
  const base = {
    entryId: 1,
    queueId: 1,
    userId: 7,
    position: 1,
    priority: "medium",
    joinTime: "2026-11-06T10:05:00",
    status: "waiting"
  };
  return Object.assign({}, base, changes);
}

let db;
let repo;

beforeEach(function () {
  db = fakeDatabase();
  repo = createQueueRepository(db);
});

/* ===========================================================
   SETUP
   =========================================================== */

describe("createQueueRepository", function () {

  test("refuses a connection it cannot use", function () {
    expect(function () {
      createQueueRepository(null);
    }).toThrow("A MySQL connection pool is required");

    expect(function () {
      createQueueRepository({});
    }).toThrow("A MySQL connection pool is required");
  });
});

/* ===========================================================
   QUEUES
   =========================================================== */

describe("queues", function () {

  test("listQueues reads every queue in order", async function () {
    db.willReturn([queueRow(), queueRow({ queueId: 2 })]);

    const list = await repo.listQueues();

    expect(list.length).toBe(2);
    expect(db.lastCall().sql).toContain("FROM Queue ORDER BY queue_id");
  });

  test("the columns are renamed to the names the routes use", async function () {
    db.willReturn([]);

    await repo.listQueues();

    expect(db.lastCall().sql).toContain("queue_id AS queueId");
    expect(db.lastCall().sql).toContain("service_id AS serviceId");
  });

  test("findQueue asks for one row by its id", async function () {
    db.willReturn([queueRow()]);

    const queue = await repo.findQueue(1);

    expect(queue.queueId).toBe(1);
    expect(db.lastCall().values).toEqual([1]);
  });

  test("findQueue gives back null when there is no such queue", async function () {
    db.willReturn([]);

    expect(await repo.findQueue(999)).toBe(null);
  });

  test("findQueueForService looks it up by the service", async function () {
    db.willReturn([queueRow()]);

    await repo.findQueueForService(3);

    expect(db.lastCall().sql).toContain("WHERE service_id = ?");
    expect(db.lastCall().values).toEqual([3]);
  });

  test("createQueue inserts an open queue and reads it back", async function () {
    db.willReturn({ insertId: 5 });
    db.willReturn([queueRow({ queueId: 5 })]);

    const created = await repo.createQueue(3);

    expect(created.queueId).toBe(5);
    expect(db.calls[0].sql).toContain("INSERT INTO Queue");
    expect(db.calls[0].sql).toContain("'open'");
    expect(db.calls[0].values).toEqual([3]);
  });

  test("the service id is passed separately, not glued into the SQL", async function () {
    db.willReturn({ insertId: 1 });
    db.willReturn([queueRow()]);

    await repo.createQueue(42);

    expect(db.calls[0].sql).toContain("?");
    expect(db.calls[0].sql).not.toContain("42");
  });

  test("setQueueStatus closes a queue and reads it back", async function () {
    db.willReturn({ affectedRows: 1 });
    db.willReturn([queueRow({ status: "closed" })]);

    const updated = await repo.setQueueStatus(1, "closed");

    expect(updated.status).toBe("closed");
    expect(db.calls[0].values).toEqual(["closed", 1]);
  });

  test("setQueueStatus gives back null when nothing was changed", async function () {
    db.willReturn({ affectedRows: 0 });

    expect(await repo.setQueueStatus(999, "closed")).toBe(null);
    /* it should not try to read a row that was never there */
    expect(db.calls.length).toBe(1);
  });

  test("removeQueue says whether a row was deleted", async function () {
    db.willReturn({ affectedRows: 1 });
    expect(await repo.removeQueue(1)).toBe(true);

    db.willReturn({ affectedRows: 0 });
    expect(await repo.removeQueue(999)).toBe(false);
  });
});

/* ===========================================================
   ENTRIES
   =========================================================== */

describe("entries", function () {

  test("listEntries only reads the ones still waiting", async function () {
    db.willReturn([entryRow()]);

    await repo.listEntries(1);

    expect(db.lastCall().sql).toContain("status = 'waiting'");
    expect(db.lastCall().sql).toContain("ORDER BY position");
    expect(db.lastCall().values).toEqual([1]);
  });

  test("listAllEntries keeps the served and canceled ones too", async function () {
    db.willReturn([entryRow(), entryRow({ entryId: 2, status: "served" })]);

    const all = await repo.listAllEntries(1);

    expect(all.length).toBe(2);
    expect(db.lastCall().sql).not.toContain("status = 'waiting'");
  });

  test("a row comes back in the shape the routes expect", async function () {
    db.willReturn([entryRow()]);

    const entry = await repo.findEntry(1);

    expect(entry).toEqual({
      entryId: 1,
      queueId: 1,
      userId: 7,
      position: 1,
      priority: "medium",
      joinTime: "2026-11-06T10:05:00",
      status: "waiting"
    });
  });

  test("findEntry gives back null when there is no such entry", async function () {
    db.willReturn([]);

    expect(await repo.findEntry(999)).toBe(null);
  });
});

/* ===========================================================
   JOINING AND THE POSITION NUMBERS
   =========================================================== */

describe("addEntry", function () {

  test("inserts the entry, then numbers the line, then reads it back", async function () {
    db.willReturn({ insertId: 9 });   /* the INSERT */
    db.willReturn({});                /* the renumber UPDATE */
    db.willReturn([entryRow({ entryId: 9 })]);

    const entry = await repo.addEntry(1, 7, "high");

    expect(entry.entryId).toBe(9);
    expect(db.calls.length).toBe(3);
    expect(db.calls[0].sql).toContain("INSERT INTO QueueEntry");
    expect(db.calls[1].sql).toContain("UPDATE QueueEntry");
    expect(db.calls[2].sql).toContain("WHERE entry_id = ?");
  });

  test("the queue, the user and the priority are all bound as values", async function () {
    db.willReturn({ insertId: 1 });
    db.willReturn({});
    db.willReturn([entryRow()]);

    await repo.addEntry(4, 11, "low");

    expect(db.calls[0].values).toEqual([4, 11, "low"]);
  });

  test("no priority means medium", async function () {
    db.willReturn({ insertId: 1 });
    db.willReturn({});
    db.willReturn([entryRow()]);

    await repo.addEntry(1, 7);

    expect(db.calls[0].values[2]).toBe("medium");
  });

  test("high priority is ordered ahead of medium and low", async function () {
    db.willReturn({ insertId: 1 });
    db.willReturn({});
    db.willReturn([entryRow()]);

    await repo.addEntry(1, 7, "high");

    /* the renumber statement decides who stands where */
    expect(db.calls[1].sql).toContain("FIELD(priority, 'high', 'medium', 'low')");
  });

  test("people with the same priority keep the order they arrived in", async function () {
    db.willReturn({ insertId: 1 });
    db.willReturn({});
    db.willReturn([entryRow()]);

    await repo.addEntry(1, 7, "medium");

    expect(db.calls[1].sql).toContain("joined_at");
  });

  test("only the waiting entries of that one queue are numbered", async function () {
    db.willReturn({ insertId: 1 });
    db.willReturn({});
    db.willReturn([entryRow()]);

    await repo.addEntry(3, 7, "medium");

    expect(db.calls[1].sql).toContain("WHERE queue_id = ? AND status = 'waiting'");
    expect(db.calls[1].values).toEqual([3]);
  });
});

/* ===========================================================
   LEAVING AND BEING SERVED
   =========================================================== */

describe("setEntryStatus", function () {

  test("marks the entry and numbers the rest of the line again", async function () {
    db.willReturn([entryRow()]);                       /* findEntry */
    db.willReturn({ affectedRows: 1 });                /* the UPDATE */
    db.willReturn({});                                 /* renumber */
    db.willReturn([entryRow({ status: "canceled" })]); /* read back */

    const updated = await repo.setEntryStatus(1, "canceled");

    expect(updated.status).toBe("canceled");
    expect(db.calls[1].values).toEqual(["canceled", 1]);
    expect(db.calls[2].sql).toContain("UPDATE QueueEntry");
  });

  test("an entry that left is taken out of the numbering", async function () {
    db.willReturn([entryRow()]);
    db.willReturn({ affectedRows: 1 });
    db.willReturn({});
    db.willReturn([entryRow({ status: "served", position: 0 })]);

    await repo.setEntryStatus(1, "served");

    expect(db.calls[1].sql).toContain("position = 0");
  });

  test("gives back null when there is no such entry", async function () {
    db.willReturn([]);

    expect(await repo.setEntryStatus(999, "served")).toBe(null);
    expect(db.calls.length).toBe(1);
  });
});

describe("serveNext", function () {

  test("serves whoever is at the front", async function () {
    db.willReturn([entryRow({ entryId: 4 })]);          /* peekNext */
    db.willReturn([entryRow({ entryId: 4 })]);          /* findEntry */
    db.willReturn({ affectedRows: 1 });                 /* the UPDATE */
    db.willReturn({});                                  /* renumber */
    db.willReturn([entryRow({ entryId: 4, status: "served" })]);

    const served = await repo.serveNext(1);

    expect(served.status).toBe("served");
    expect(db.calls[0].sql).toContain("ORDER BY position LIMIT 1");
  });

  test("gives back null when nobody is waiting", async function () {
    db.willReturn([]);

    expect(await repo.serveNext(1)).toBe(null);
    expect(db.calls.length).toBe(1);
  });
});

describe("peekNext", function () {

  test("reads only the first waiting entry", async function () {
    db.willReturn([entryRow()]);

    await repo.peekNext(1);

    expect(db.lastCall().sql).toContain("LIMIT 1");
    expect(db.lastCall().sql).toContain("status = 'waiting'");
  });

  test("gives back null for an empty queue", async function () {
    db.willReturn([]);

    expect(await repo.peekNext(1)).toBe(null);
  });
});

describe("removeEntry", function () {

  test("deletes the row and numbers the line again", async function () {
    db.willReturn([entryRow()]);        /* findEntry */
    db.willReturn({ affectedRows: 1 }); /* the DELETE */
    db.willReturn({});                  /* renumber */

    const removed = await repo.removeEntry(1);

    expect(removed.entryId).toBe(1);
    expect(db.calls[1].sql).toContain("DELETE FROM QueueEntry");
    expect(db.calls[2].sql).toContain("UPDATE QueueEntry");
  });

  test("gives back null when there is no such entry", async function () {
    db.willReturn([]);

    expect(await repo.removeEntry(999)).toBe(null);
    expect(db.calls.length).toBe(1);
  });
});

describe("countWaiting", function () {

  test("gives back the number the query found", async function () {
    db.willReturn([{ waiting: 4 }]);

    expect(await repo.countWaiting(1)).toBe(4);
    expect(db.lastCall().sql).toContain("COUNT(*)");
    expect(db.lastCall().sql).toContain("status = 'waiting'");
  });

  test("gives back 0 for an empty queue", async function () {
    db.willReturn([{ waiting: 0 }]);

    expect(await repo.countWaiting(1)).toBe(0);
  });
});
