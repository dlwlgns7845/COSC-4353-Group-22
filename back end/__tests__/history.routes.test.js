/* ===========================================================
   Tests for the History API routes.

   We build a small express app here and mount the router on it,
   so we can call the routes without starting the real server.
   The router talks to a fake database, so no MySQL is needed.
   =========================================================== */

const express = require("express");
const request = require("supertest");
const history = require("../history");
const fakeDatabase = require("../test-helpers/fake-database");

/* the little app used only by these tests */
const app = express();
app.use(express.json());
app.use("/api/history", history.router);

let db;

beforeEach(function () {
  db = fakeDatabase();
  history.useDatabase(db);
});

describe("POST /api/history", function () {

  test("saves a valid record and answers 201", async function () {
    db.willReturn({ insertId: 4 });

    const response = await request(app)
      .post("/api/history")
      .send({
        userId: "u1@uh.edu",
        serviceName: "Financial Aid",
        waitMinutes: 15,
        outcome: "Served"
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(4);
    expect(response.body.serviceName).toBe("Financial Aid");
    expect(db.lastCall().sql).toContain("INSERT INTO QueueHistory");
  });

  test("answers 400 and lists the problems when the body is bad", async function () {
    const response = await request(app)
      .post("/api/history")
      .send({ serviceName: "", outcome: "Nope" });

    expect(response.status).toBe(400);
    expect(response.body.problems.length).toBeGreaterThan(0);
    /* a bad body never reaches the database */
    expect(db.calls.length).toBe(0);
  });

  test("answers 400 when the body is empty", async function () {
    const response = await request(app).post("/api/history").send({});

    expect(response.status).toBe(400);
  });

  test("answers 400 when the user is not registered", async function () {
    /* this is what MySQL throws when a foreign key has no match */
    db.execute = async function () {
      const error = new Error("foreign key fails");
      error.code = "ER_NO_REFERENCED_ROW_2";
      throw error;
    };

    const response = await request(app)
      .post("/api/history")
      .send({ userId: "ghost@uh.edu", serviceName: "Advising", outcome: "Served" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("That user is not registered.");
  });

  test("answers 500 when the database is down", async function () {
    db.execute = async function () {
      throw new Error("connection lost");
    };

    const response = await request(app)
      .post("/api/history")
      .send({ userId: "u1@uh.edu", serviceName: "Advising", outcome: "Served" });

    expect(response.status).toBe(500);
  });
});

describe("GET /api/history/:userId", function () {

  test("returns the records of that user only", async function () {
    db.willReturn([
      {
        history_id: 1,
        email: "u1@uh.edu",
        service_name: "A",
        wait_minutes: 5,
        outcome: "Served",
        completed_at: "2026-10-20"
      }
    ]);

    const response = await request(app).get("/api/history/u1@uh.edu");

    expect(response.status).toBe(200);
    expect(response.body.history.length).toBe(1);
    expect(response.body.history[0].serviceName).toBe("A");
    expect(db.lastCall().values).toEqual(["u1@uh.edu"]);
  });

  test("returns an empty list for a user with no history", async function () {
    db.willReturn([]);

    const response = await request(app).get("/api/history/nobody@uh.edu");

    expect(response.status).toBe(200);
    expect(response.body.history).toEqual([]);
  });

  test("the from and to dates are passed to the query", async function () {
    db.willReturn([]);

    await request(app)
      .get("/api/history/u1@uh.edu")
      .query({ from: "2026-10-10", to: "2026-10-25" });

    expect(db.lastCall().values).toEqual([
      "u1@uh.edu",
      "2026-10-10",
      "2026-10-25"
    ]);
  });

  test("answers 500 when the database is down", async function () {
    db.execute = async function () {
      throw new Error("connection lost");
    };

    const response = await request(app).get("/api/history/u1@uh.edu");

    expect(response.status).toBe(500);
  });
});
