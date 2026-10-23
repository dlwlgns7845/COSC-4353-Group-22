/* ===========================================================
   Tests for the History API routes.

   We build a small express app here and mount the router on it,
   so we can call the routes without starting the real server.
   =========================================================== */

const express = require("express");
const request = require("supertest");
const history = require("../history");

/* the little app used only by these tests */
const app = express();
app.use(express.json());
app.use("/api/history", history.router);

beforeEach(function () {
  history.clearAll();
});

describe("POST /api/history", function () {

  test("saves a valid record and answers 201", async function () {
    const response = await request(app)
      .post("/api/history")
      .send({
        userId: "u1",
        serviceName: "Financial Aid",
        waitMinutes: 15,
        outcome: "Served"
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(1);
    expect(response.body.serviceName).toBe("Financial Aid");
  });

  test("answers 400 and lists the problems when the body is bad", async function () {
    const response = await request(app)
      .post("/api/history")
      .send({ serviceName: "", outcome: "Nope" });

    expect(response.status).toBe(400);
    expect(response.body.problems.length).toBeGreaterThan(0);
  });

  test("answers 400 when the body is empty", async function () {
    const response = await request(app).post("/api/history").send({});

    expect(response.status).toBe(400);
  });
});

describe("GET /api/history/:userId", function () {

  test("returns the records of that user only", async function () {
    history.addRecord({ userId: "u1", serviceName: "A", outcome: "Served" });
    history.addRecord({ userId: "u2", serviceName: "B", outcome: "Served" });

    const response = await request(app).get("/api/history/u1");

    expect(response.status).toBe(200);
    expect(response.body.history.length).toBe(1);
    expect(response.body.history[0].serviceName).toBe("A");
  });

  test("returns an empty list for a user with no history", async function () {
    const response = await request(app).get("/api/history/nobody");

    expect(response.status).toBe(200);
    expect(response.body.history).toEqual([]);
  });

  test("the from and to dates filter the list", async function () {
    history.addRecord({ userId: "u1", serviceName: "Old", outcome: "Served", completedAt: "2026-10-01" });
    history.addRecord({ userId: "u1", serviceName: "New", outcome: "Served", completedAt: "2026-10-20" });

    const response = await request(app)
      .get("/api/history/u1")
      .query({ from: "2026-10-10", to: "2026-10-25" });

    expect(response.body.history.length).toBe(1);
    expect(response.body.history[0].serviceName).toBe("New");
  });
});
