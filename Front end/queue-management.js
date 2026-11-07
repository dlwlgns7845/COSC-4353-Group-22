
const express = require("express");

let getServices = () => [];
const router = express.Router();

// Queue storage
let queues = [];
let nextQueueId = 1;

// Queue entry storage
let queueEntries = [];
let nextEntryId = 1;

// Get all queues
router.get("/", (req, res) => {
    res.json(queues);
});


// Create a new queue for a service.
router.post("/", (req, res) => {

    const { serviceId } = req.body;

    // Check that a Service ID was provided.
    if (!Number.isInteger(Number(serviceId)) || Number(serviceId) <= 0) {
        return res.status(400).json({
            error: "A valid Service ID is required"
        });
    }

    // Find the associated service.
    const services = getServices();

    const service = services.find(
        item => item.id === Number(serviceId)
    );

    // Make sure the service exists.
    if (!service) {
        return res.status(404).json({
            error: "Service not found"
        });
    }

    // Create the new queue.
    const newQueue = {
        queueId: nextQueueId++,
        serviceId: service.id,
        status: "open",
        createdDate: new Date().toISOString()
    };

    // Store the queue.
    queues.push(newQueue);

    // Return the newly created queue.
    res.status(201).json(newQueue);
});

// Add a user to an existing queue.
router.post("/:id/entries", (req, res) => {

    // Get the Queue ID from the URL.
    const queueId = Number(req.params.id);

    // Get the User ID from the request body.
    const { userId } = req.body;

    // Find the queue.
    const selectedQueue = queues.find(
        item => item.queueId === queueId
    );

    // Make sure the queue exists.
    if (!selectedQueue) {
        return res.status(404).json({
            error: "Queue not found"
        });
    }

    // Make sure the queue is open.
    if (selectedQueue.status !== "open") {
        return res.status(400).json({
            error: "This queue is closed"
        });
    }

    // Validate the User ID.
    if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
        return res.status(400).json({
            error: "A valid User ID is required"
        });
    }

    // Calculate the next position.
    const position = queueEntries.filter(
        entry =>
            entry.queueId === queueId &&
            entry.status === "waiting"
    ).length + 1;

    // Create the QueueEntry.
    const newEntry = {
        entryId: nextEntryId++,
        queueId: queueId,
        userId: Number(userId),
        position: position,
        joinTime: new Date().toISOString(),
        status: "waiting"
    };

    // Store the entry.
    queueEntries.push(newEntry);

    // Return the new entry.
    res.status(201).json(newEntry);
});

// Get entries belonging to a specific queue.
router.get("/:id/entries", (req, res) => {

    const queueId = Number(req.params.id);

    const selectedQueue = queues.find(
        item => item.queueId === queueId
    );

    if (!selectedQueue) {
        return res.status(404).json({
            error: "Queue not found"
        });
    }

    const entries = queueEntries.filter(
        entry => entry.queueId === queueId
    );

    res.json(entries);
});

// Update a queue's status.
router.put("/:id/status", (req, res) => {

    const queueId = Number(req.params.id);
    const { status } = req.body;

    const selectedQueue = queues.find(
        item => item.queueId === queueId
    );

    if (!selectedQueue) {
        return res.status(404).json({
            error: "Queue not found"
        });
    }

    if (!["open", "closed"].includes(status)) {
        return res.status(400).json({
            error: "Status must be open or closed"
        });
    }

    selectedQueue.status = status;

    res.json({
        message: `Queue ${status} successfully`,
        queue: selectedQueue
    });
});

// Cancel a user's queue entry.
router.delete("/:queueId/entries/:entryId", (req, res) => {

    // Get IDs from the URL.
    const queueId = Number(req.params.queueId);
    const entryId = Number(req.params.entryId);

    // Find the queue entry.
    const entry = queueEntries.find(
        item =>
            item.entryId === entryId &&
            item.queueId === queueId
    );

    // Check whether the entry exists.
    if (!entry) {
        return res.status(404).json({
            error: "Queue entry not found"
        });
    }

    // Only waiting entries can be canceled.
    if (entry.status !== "waiting") {
        return res.status(400).json({
            error: "This entry cannot be canceled"
        });
    }

    // Change the status.
    entry.status = "canceled";

    // Move remaining users forward.
    queueEntries
        .filter(item =>
            item.queueId === queueId &&
            item.status === "waiting" &&
            item.position > entry.position
        )
        .forEach(item => {
            item.position--;
        });

    res.json({
        message: "Queue entry canceled successfully",
        entry: entry
    });
});

// Serve the next person in a queue.
router.post("/:id/serve", (req, res) => {

    // Get the Queue ID from the URL.
    const queueId = Number(req.params.id);

    // Find the queue.
    const selectedQueue = queues.find(
        item => item.queueId === queueId
    );

    if (!selectedQueue) {
        return res.status(404).json({
            error: "Queue not found"
        });
    }

    // Find everyone currently waiting in this queue.
    const waitingEntries = queueEntries
        .filter(entry =>
            entry.queueId === queueId &&
            entry.status === "waiting"
        )
        .sort((a, b) => a.position - b.position);

    // Check whether anyone is waiting.
    if (waitingEntries.length === 0) {
        return res.status(404).json({
            error: "Nobody is waiting in this queue"
        });
    }

    // Select the person at the front.
    const servedEntry = waitingEntries[0];

    // Change their status.
    servedEntry.status = "served";

    // Move everyone else forward.
    waitingEntries.slice(1).forEach(entry => {
        entry.position--;
    });

    // Return the result.
    res.json({
        message: "User served successfully",
        servedEntry: servedEntry,
        remainingEntries: waitingEntries.slice(1)
    });
});

// Remove queues and their entries when a service is deleted.
function removeQueueForService(serviceId) {

    // Find all queues belonging to this service.
    const serviceQueues = queues.filter(
        item => item.serviceId === Number(serviceId)
    );

    // Get their Queue IDs.
    const queueIds = serviceQueues.map(
        item => item.queueId
    );

    // Remove entries belonging to those queues.
    queueEntries = queueEntries.filter(
        entry => !queueIds.includes(entry.queueId)
    );

    // Remove the queues themselves.
    queues = queues.filter(
        item => item.serviceId !== Number(serviceId)
    );
}

// Give the router access to the current service list.
function createQueueRouter(getServicesFunction) {
    getServices = getServicesFunction;
    return router;
}

module.exports = {
    createQueueRouter,
    removeQueueForService
};
