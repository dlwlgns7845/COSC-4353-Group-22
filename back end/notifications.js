
const { calculateWaitTime } = require("./wait-time");

function createNotificationCenter() {
    const notifications = [];
    const approachingNotified = new Set();
    let nextId = 1;

    function add(entry, type, title, text) {
        const notification = {
            id: nextId++,
            entryId: entry.id,
            userName: entry.userName,
            type,
            title,
            text,
            createdAt: new Date().toISOString(),
            read: false
        };

        notifications.push(notification);
        return { ...notification };
    }

    // Notify a customer after successfully joining a queue.
    function notifyJoined(entry, service) {
        return add(
            entry,
            "queue",
            "Queue joined",
            `You joined the queue for ${service.name}.`
        );
    }

    // Check whether a customer is approaching their turn.
    function checkApproaching(queue, service) {
        if (!Array.isArray(queue)) {
            throw new TypeError("Queue must be an array");
        }

        const waiting = queue.filter(entry =>
            entry.serviceId === service.id &&
            entry.status === "waiting"
        );

        for (const entry of waiting) {
            const result = calculateWaitTime(
                queue, service, entry.id
            );

            // Position 1 or 2 means the customer is almost ready.
            if (
                result &&
                result.position <= 2 &&
                !approachingNotified.has(entry.id)
            ) {
                approachingNotified.add(entry.id);

                add(
                    entry,
                    "status",
                    "Almost ready",
                    `Your turn for ${service.name} is approaching.`
                );
            }
        }
    }

    // Retrieve notifications for one queue entry.
    function listForEntry(entryId) {
        return notifications
            .filter(n => n.entryId === entryId)
            .map(n => ({ ...n }));
    }

    // Mark one customer's notifications as read.
    function markAllRead(entryId) {
        let updated = 0;

        for (const notification of notifications) {
            if (
                notification.entryId === entryId &&
                !notification.read
            ) {
                notification.read = true;
                updated++;
            }
        }

        return updated;
    }

    return {
        notifyJoined,
        checkApproaching,
        listForEntry,
        markAllRead
    };
}

module.exports = { createNotificationCenter };
