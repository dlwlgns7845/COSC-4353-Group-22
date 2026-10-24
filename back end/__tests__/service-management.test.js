/* ===========================================================
   Tests for the Service Management API.

   The module exports the express app, so supertest can call
   the routes without starting a real server.
   =========================================================== */

const request = require("supertest");
const app = require("../service-management");

/* a body that passes every rule, used as a starting point */
function validService(changes) {
    const base = {
        name: "Financial Aid",
        description: "Questions about grants and loans.",
        duration: 15,
        priority: "high"
    };

    return Object.assign({}, base, changes);
}

describe("GET /api/services", function () {

    test("returns the list of services", async function () {
        const response = await request(app).get("/api/services");

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});

describe("POST /api/services validation", function () {

    test("creates a service when the body is valid", async function () {
        const response = await request(app)
            .post("/api/services")
            .send(validService());

        expect(response.status).toBe(201);
        expect(response.body.name).toBe("Financial Aid");
        expect(response.body.duration).toBe(15);
    });

    test("rejects a missing name", async function () {
        const response = await request(app)
            .post("/api/services")
            .send(validService({ name: "" }));

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/name is required/i);
    });

    test("rejects a name longer than 100 characters", async function () {
        const response = await request(app)
            .post("/api/services")
            .send(validService({ name: "a".repeat(101) }));

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/100 characters/i);
    });

    test("rejects a missing description", async function () {
        const response = await request(app)
            .post("/api/services")
            .send(validService({ description: "   " }));

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/description is required/i);
    });

    test("rejects a missing duration", async function () {
        const response = await request(app)
            .post("/api/services")
            .send(validService({ duration: "" }));

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/duration is required/i);
    });

    test("rejects a duration that is not a number", async function () {
        const response = await request(app)
            .post("/api/services")
            .send(validService({ duration: "twenty" }));

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/between 1 and 240/i);
    });

    test("rejects a duration outside the allowed range", async function () {
        const response = await request(app)
            .post("/api/services")
            .send(validService({ duration: 500 }));

        expect(response.status).toBe(400);
    });

    test("rejects an unknown priority", async function () {
        const response = await request(app)
            .post("/api/services")
            .send(validService({ priority: "urgent" }));

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/low, medium, or high/i);
    });

    test("rejects an empty body", async function () {
        const response = await request(app).post("/api/services").send({});

        expect(response.status).toBe(400);
    });
});

describe("PUT /api/services/:id", function () {

    test("updates a service when the body is valid", async function () {
        const created = await request(app)
            .post("/api/services")
            .send(validService({ name: "Before Update" }));

        const response = await request(app)
            .put("/api/services/" + created.body.id)
            .send(validService({ name: "After Update", duration: 30 }));

        expect(response.status).toBe(200);
        expect(response.body.name).toBe("After Update");
        expect(response.body.duration).toBe(30);
    });

    test("rejects an invalid body", async function () {
        const created = await request(app)
            .post("/api/services")
            .send(validService());

        const response = await request(app)
            .put("/api/services/" + created.body.id)
            .send(validService({ name: "" }));

        expect(response.status).toBe(400);
    });

    test("answers 404 for a service that does not exist", async function () {
        const response = await request(app)
            .put("/api/services/999999")
            .send(validService());

        expect(response.status).toBe(404);
    });
});

describe("DELETE /api/services/:id", function () {

    test("deletes a service", async function () {
        const created = await request(app)
            .post("/api/services")
            .send(validService({ name: "To Delete" }));

        const response = await request(app)
            .delete("/api/services/" + created.body.id);

        expect(response.status).toBe(200);
        expect(response.body.service.name).toBe("To Delete");
    });

    test("answers 404 for a service that does not exist", async function () {
        const response = await request(app).delete("/api/services/999999");

        expect(response.status).toBe(404);
    });
});
