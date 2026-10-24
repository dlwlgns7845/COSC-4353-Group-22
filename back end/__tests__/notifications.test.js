
const {
    createNotificationCenter
} = require("../notifications");

const service = {
    id: 1,
    name: "Academic Advising",
    duration: 20
};

function makeEntry(id) {
    return {
        id,
        serviceId: 1,
        userName: `Customer ${id}`,
        priority: "medium",
        status: "waiting",
        joinedAt: new Date(2026, 9, 23, 10, id).toISOString()
    };
}

describe("Notification Module", () => {
    let center;

    beforeEach(() => {
        center = createNotificationCenter();
    });

    test("notifies customers when they join", () => {
        center.notifyJoined(makeEntry(1), service);

        const notifications = center.listForEntry(1);

        expect(notifications).toHaveLength(1);
        expect(notifications[0].title).toBe("Queue joined");
        expect(notifications[0].read).toBe(false);
    });

    test("notifies the first two waiting customers", () => {
        const queue = [makeEntry(1), makeEntry(2), makeEntry(3)];

        center.checkApproaching(queue, service);

        expect(center.listForEntry(1)).toHaveLength(1);
        expect(center.listForEntry(2)).toHaveLength(1);
        expect(center.listForEntry(3)).toHaveLength(0);
    });

    test("notifies a customer when their turn approaches", () => {
        const queue = [makeEntry(1), makeEntry(2), makeEntry(3)];

        center.checkApproaching(queue, service);

        // Customer 1 is served and leaves the queue.
        center.checkApproaching([makeEntry(2), makeEntry(3)], service);

        expect(center.listForEntry(3)).toHaveLength(1);
    });

    test("does not send duplicate approaching notifications", () => {
        const queue = [makeEntry(1), makeEntry(2)];

        center.checkApproaching(queue, service);
        center.checkApproaching(queue, service);

        expect(center.listForEntry(1)).toHaveLength(1);
        expect(center.listForEntry(2)).toHaveLength(1);
    });

    test("marks only the selected customer's notifications as read", () => {
        center.notifyJoined(makeEntry(1), service);
        center.notifyJoined(makeEntry(2), service);

        expect(center.markAllRead(1)).toBe(1);
        expect(center.listForEntry(1)[0].read).toBe(true);
        expect(center.listForEntry(2)[0].read).toBe(false);
    });
});
