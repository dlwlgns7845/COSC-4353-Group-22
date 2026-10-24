
const express = require("express");
const request = require("supertest");

describe("Notification API Integration Tests", () => {
    let app;

    beforeEach(() => {
        jest.resetModules();

        const { createQueueRouter } = require("../queue-management");

        const services = [
            {
                id: 1,
                name: "Academic Advising",
                duration: 20,
                priority: "medium"
            },
            {
                id: 2,
                name: "Financial Aid",
                duration: 10,
                priority: "high"
            }
        ];

        app = express();
        app.use(express.json());
        app.use("/api/queue", createQueueRouter(() => services));
    });

    // Helper: Add a customer to a queue.
    async function join(name, serviceId = 1, priority = "medium") {
        const response = await request(app)
            .post("/api/queue")
            .send({
                serviceId,
                userName: name,
                priority
            })
            .expect(201);

        return response.body;
    }

    // Helper: Retrieve notifications for a queue entry.
    async function getNotifications(entryId) {
        const response = await request(app)
            .get(`/api/queue/${entryId}/notifications`)
            .expect(200);

        return response.body.notifications;
    }

    test("creates a notification when someone joins", async () => {
        const alice = await join("Alice");
        const notifications = await getNotifications(alice.id);

        expect(notifications.map(n => n.title)).toContain(
            "Queue joined"
        );
        expect(notifications.every(n => !n.read)).toBe(true);
    });

    test("notifies customers when their turn is approaching", async () => {
        const alice = await join("Alice");
        const bob = await join("Bob");

        const aliceNotifications = await getNotifications(alice.id);
        const bobNotifications = await getNotifications(bob.id);

        expect(aliceNotifications.map(n => n.title)).toContain(
            "Almost ready"
        );
        expect(bobNotifications.map(n => n.title)).toContain(
            "Almost ready"
        );
    });

    test("does not notify third customer too early", async () => {
        await join("Alice");
        await join("Bob");
        const charlie = await join("Charlie");

        const notifications = await getNotifications(charlie.id);

        expect(notifications).toHaveLength(1);
        expect(notifications[0].title).toBe("Queue joined");
    });

    test("notifies next customer after someone is served", async () => {
        await join("Alice");
        await join("Bob");
        const charlie = await join("Charlie");

        await request(app)
            .post("/api/queue/serve")
            .send({ serviceId: 1 })
            .expect(200);

        const notifications = await getNotifications(charlie.id);

        expect(notifications.map(n => n.title)).toContain(
            "Almost ready"
        );
    });

    test("updates notifications after someone leaves", async () => {
        const alice = await join("Alice");
        await join("Bob");
        const charlie = await join("Charlie");

        await request(app)
            .delete(`/api/queue/${alice.id}`)
            .expect(200);

        const notifications = await getNotifications(charlie.id);

        expect(notifications.map(n => n.title)).toContain(
            "Almost ready"
        );
    });

    test("prevents duplicate approaching notifications", async () => {
        const alice = await join("Alice");
        const bob = await join("Bob");

        await request(app)
            .delete(`/api/queue/${bob.id}`)
            .expect(200);

        const notifications = await getNotifications(alice.id);

        const approaching = notifications.filter(
            n => n.title === "Almost ready"
        );

        expect(approaching).toHaveLength(1);
    });

    test("marks notifications as read", async () => {
        const alice = await join("Alice");
        const bob = await join("Bob");

        const response = await request(app)
            .patch(`/api/queue/${alice.id}/notifications/read`)
            .expect(200);

        expect(response.body.updated).toBe(2);

        const aliceNotifications = await getNotifications(alice.id);
        const bobNotifications = await getNotifications(bob.id);

        expect(aliceNotifications.every(n => n.read)).toBe(true);
        expect(bobNotifications.every(n => !n.read)).toBe(true);
    });

    test("keeps notifications separate for different services", async () => {
        const alice = await join("Alice", 1);
        const bob = await join("Bob", 2);

        const aliceNotifications = await getNotifications(alice.id);
        const bobNotifications = await getNotifications(bob.id);

        expect(aliceNotifications).toHaveLength(2);
        expect(bobNotifications).toHaveLength(2);

        expect(aliceNotifications[0].text).toContain(
            "Academic Advising"
        );
        expect(bobNotifications[0].text).toContain(
            "Financial Aid"
        );
    });

    test("rejects invalid notification IDs", async () => {
        await request(app)
            .get("/api/queue/abc/notifications")
            .expect(400);

        await request(app)
            .patch("/api/queue/0/notifications/read")
            .expect(400);
    });
});
