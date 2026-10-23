
const express = require("express");

let getServices = () => [];
const router = express.Router();

// Queue entries are stored in memory for now.
let queue = [];
let nextQueueId = 1;

// Get all queue entries, optionally filtered by service.
router.get("/", (req, res) => {
    const serviceId = req.query.serviceId;

    let results = queue;

    if (serviceId !== undefined) {
        results = queue.filter(entry =>
            entry.serviceId === Number(serviceId)
        );
    }

    // Higher priority first; arrival time breaks ties.
    const priorityRank = {
        high: 1,
        medium: 2,
        low: 3
    };

    results = [...results].sort((a, b) => {
        const priorityDifference =
            priorityRank[a.priority] - priorityRank[b.priority];

        if (priorityDifference !== 0) {
            return priorityDifference;
        }

        return new Date(a.joinedAt) - new Date(b.joinedAt);
    });

    res.json(results);
});

// Join a queue.
router.post("/", (req, res) => {
    const { serviceId, userName, priority } = req.body;

    const services = getServices();
    const service = services.find(
        item => item.id === Number(serviceId)
    );

    if (!service) {
        return res.status(404).json({
            error: "Service not found"
        });
    }

    if (!userName || !userName.trim()) {
        return res.status(400).json({
            error: "User name is required"
        });
    }

    const validPriorities = ["low", "medium", "high"];
    const chosenPriority = priority || "medium";

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

    res.status(201).json(newEntry);
});

// Leave a queue or remove an entry.
router.delete("/:id", (req, res) => {
    const entryId = Number(req.params.id);

    const index = queue.findIndex(
        entry => entry.id === entryId
    );

    if (index === -1) {
        return res.status(404).json({
            error: "Queue entry not found"
        });
    }

    const removedEntry = queue.splice(index, 1)[0];

    res.json({
        message: "Queue entry removed",
        entry: removedEntry
    });
});

// Serve the next person in a service's queue.
router.post("/serve", (req, res) => {
    const serviceId = Number(req.body.serviceId);

    if (!serviceId) {
        return res.status(400).json({
            error: "Service ID is required"
        });
    }

    const line = queue
        .filter(entry => entry.serviceId === serviceId)
        .sort((a, b) => {
            const priorityRank = {
                high: 1,
                medium: 2,
                low: 3
            };

            const difference =
                priorityRank[a.priority] - priorityRank[b.priority];

            if (difference !== 0) return difference;

            return new Date(a.joinedAt) - new Date(b.joinedAt);
        });

    if (line.length === 0) {
        return res.status(404).json({
            error: "Nobody is waiting for this service"
        });
    }

    const servedEntry = line[0];

    queue = queue.filter(
        entry => entry.id !== servedEntry.id
    );

    res.json({
        message: "User served successfully",
        entry: servedEntry
    });
});

// Remove all queue entries when a service is deleted.
function removeQueueForService(serviceId) {
    queue = queue.filter(
        entry => entry.serviceId !== Number(serviceId)
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
