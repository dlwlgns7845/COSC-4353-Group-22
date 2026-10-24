
const request = require("supertest");
const express = require("express");

describe("Wait-Time API", () => {
  let app;

  beforeEach(() => {
    jest.resetModules();

    const { createQueueRouter } = require("../queue-management");

    const services = [
      {
        id: 1,
        name: "Financial Aid",
        duration: 15,
        priority: "medium"
      }
    ];

    app = express();
    app.use(express.json());
    app.use("/api/queue", createQueueRouter(() => services));
  });

  test("calculates wait time for a customer", async () => {
    await request(app)
      .post("/api/queue")
      .send({ serviceId: 1, userName: "Alice" })
      .expect(201);

    const bob = await request(app)
      .post("/api/queue")
      .send({ serviceId: 1, userName: "Bob" })
      .expect(201);

    const response = await request(app)
      .get(`/api/queue/${bob.body.id}/wait-time`)
      .expect(200);

    expect(response.body).toMatchObject({
      position: 2,
      peopleAhead: 1,
      estimatedWaitMinutes: 15
    });
  });

  test("respects customer priority", async () => {
    const alice = await request(app)
      .post("/api/queue")
      .send({
        serviceId: 1,
        userName: "Alice",
        priority: "low"
      })
      .expect(201);

    await request(app)
      .post("/api/queue")
      .send({
        serviceId: 1,
        userName: "Bob",
        priority: "high"
      })
      .expect(201);

    const response = await request(app)
      .get(`/api/queue/${alice.body.id}/wait-time`)
      .expect(200);

    expect(response.body.position).toBe(2);
    expect(response.body.estimatedWaitMinutes).toBe(15);
  });

  test("rejects invalid queue entry IDs", async () => {
    await request(app)
      .get("/api/queue/abc/wait-time")
      .expect(400);
  });

  test("returns 404 for missing queue entries", async () => {
    await request(app)
      .get("/api/queue/999/wait-time")
      .expect(404);
  });
});
