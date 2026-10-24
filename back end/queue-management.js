
const express = require("express");
const { calculateWaitTime } = require("./wait-time");
const { createNotificationCenter } = require("./notifications");

const router = express.Router();
const notificationCenter = createNotificationCenter();

let getServices = () => [];

// Assignment 3: temporary in-memory queue (no database required).
let queue = [];
let nextQueueId = 1;

// Keep queue ordering consistent with wait-time estimation.
const priorityRank = {
    high: 1,
    medium: 2,
    low: 3
};

function orderedQueue(entries) {
    return [...entries].sort((a, b) => {
        const priorityDifference =
            priorityRank[a.priority] - priorityRank[b.priority];

        if (priorityDifference !== 0) {
            return priorityDifference;
        }

        const arrivalDifference =
            new Date(a.joinedAt) - new Date(b.joinedAt);

        return arrivalDifference || a.id - b.id;
    });
}

// Validate queue entry IDs.
function parseEntryId(value) {
    if (!/^[1-9]\d*$/.test(String(value))) {
        return null;
    }

    const id = Number(value);

    return Number.isSafeInteger(id) ? id : null;
}

// Recheck approaching-turn notifications for one service.
function notifyApproachingForService(serviceId) {
    const service = getServices().find(
        item => item.id === serviceId
    );

    if (service) {
        notificationCenter.checkApproaching(queue, service);
    }
}

// =====================================================
// GET ALL QUEUE ENTRIES
// =====================================================

router.get("/", (req, res) => {
    const serviceId = req.query.serviceId;

    const results = serviceId === undefined
        ? queue
        : queue.filter(
            entry => entry.serviceId === Number(serviceId)
        );

    return res.json(orderedQueue(results));
});

// =====================================================
// JOIN A QUEUE
// =====================================================

router.post("/", (req, res) => {
    const { serviceId, userName, priority } = req.body || {};

    const service = getServices().find(
        item => item.id === Number(serviceId)
    );

    if (!service) {
        return res.status(404).json({
            error: "Service not found"
        });
    }

    if (
        typeof userName !== "string" ||
        !userName.trim()
    ) {
        return res.status(400).json({
            error: "User name is required"
        });
    }

    const validPriorities = [
        "low",
        "medium",
        "high"
    ];

    const chosenPriority =
        priority === undefined ? "medium" : priority;

    if (!validPriorities.includes(chosenPriority)) {
        return res.status(400).json({
            error: "Priority must be low, medium, or high"
        });
    }

    const newEntry = {
        id: nextQueueId++,
        serviceId: service.id,
        userName: userName.trim(),
        joinedAt: new Date().toISOString(),
        status: "waiting",
        priority: chosenPriority
    };

    queue.push(newEntry);

    // Module 5: Notification when a user joins.
    notificationCenter.notifyJoined(newEntry, service);

    // Check whether anyone is close to being served.
    notifyApproachingForService(service.id);

    return res.status(201).json(newEntry);
});

// =====================================================
// MODULE 4: WAIT-TIME ESTIMATION
// =====================================================

router.get("/:id/wait-time", (req, res) => {
    const entryId = parseEntryId(req.params.id);

    if (entryId === null) {
        return res.status(400).json({
            error: "Valid queue entry ID is required"
        });
    }

    const entry = queue.find(
        item =>
            item.id === entryId &&
            item.status === "waiting"
    );

    if (!entry) {
        return res.status(404).json({
            error: "Waiting queue entry not found"
        });
    }

    const service = getServices().find(
        item => item.id === entry.serviceId
    );

    if (!service) {
        return res.status(404).json({
            error: "Service not found"
        });
    }

    try {
        const result = calculateWaitTime(
            queue,
            service,
            entryId
        );

        return res.json(result);
    } catch (error) {
        return res.status(422).json({
            error: "Unable to estimate wait time due to invalid service data"
        });
    }
});

// =====================================================
// MODULE 5: GET NOTIFICATIONS
// =====================================================

router.get("/:id/notifications", (req, res) => {
    const entryId = parseEntryId(req.params.id);

    if (entryId === null) {
        return res.status(400).json({
            error: "Valid queue entry ID is required"
        });
    }

    const notifications =
        notificationCenter.listForEntry(entryId);

    return res.json({
        notifications
    });
});

// =====================================================
// MODULE 5: MARK NOTIFICATIONS AS READ
// =====================================================

router.patch("/:id/notifications/read", (req, res) => {
    const entryId = parseEntryId(req.params.id);

    if (entryId === null) {
        return res.status(400).json({
            error: "Valid queue entry ID is required"
        });
    }

    const updated = notificationCenter.markAllRead(entryId);

    return res.json({
        message: "Notifications marked as read",
        updated
    });
});

// =====================================================
// LEAVE A QUEUE / REMOVE A QUEUE ENTRY
// =====================================================

router.delete("/:id", (req, res) => {
    const entryId = parseEntryId(req.params.id);

    if (entryId === null) {
        return res.status(400).json({
            error: "Valid queue entry ID is required"
        });
    }

    const index = queue.findIndex(
        entry => entry.id === entryId
    );

    if (index === -1) {
        return res.status(404).json({
            error: "Queue entry not found"
        });
    }

    const removedEntry = queue.splice(index, 1)[0];

    // Module 5: Check the updated queue after removal.
    notifyApproachingForService(removedEntry.serviceId);

    return res.json({
        message: "Queue entry removed",
        entry: removedEntry
    });
});

// =====================================================
// SERVE THE NEXT CUSTOMER
// =====================================================

router.post("/serve", (req, res) => {
    const serviceId = Number(req.body?.serviceId);

    if (
        !Number.isSafeInteger(serviceId) ||
        serviceId <= 0
    ) {
        return res.status(400).json({
            error: "Service ID is required"
        });
    }

    const line = orderedQueue(
        queue.filter(
            entry =>
                entry.serviceId === serviceId &&
                entry.status === "waiting"
        )
    );

    if (line.length === 0) {
        return res.status(404).json({
            error: "Nobody is waiting for this service"
        });
    }

    const servedEntry = line[0];

    queue = queue.filter(
        entry => entry.id !== servedEntry.id
    );

    // Module 5: Notify newly approaching customers.
    notifyApproachingForService(serviceId);

    return res.json({
        message: "User served successfully",
        entry: servedEntry
    });
});

// =====================================================
// REMOVE QUEUE ENTRIES WHEN A SERVICE IS DELETED
// =====================================================

function removeQueueForService(serviceId) {
    queue = queue.filter(
        entry => entry.serviceId !== Number(serviceId)
    );
}

// =====================================================
// CONNECT QUEUE ROUTER TO SERVICE MANAGEMENT
// =====================================================

function createQueueRouter(getServicesFunction) {
    getServices = getServicesFunction;
    return router;
}

module.exports = {
    createQueueRouter,
    removeQueueForService
};
