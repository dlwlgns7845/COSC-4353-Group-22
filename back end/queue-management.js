const express = require("express");

const { addRecord } = require("./history");

// Import the shared MySQL connection pool.
const pool = require("./database/pool");

// Import the queue repository.
const {
    createQueueRepository
} = require("./database/queue-repository");

// Connect the repository to MySQL.
const queueRepository = createQueueRepository(pool);

// Create a function that builds our queue API router.
// getServicesFunction allows us to check whether a service exists.
function createQueueRouter(getServicesFunction) {

    // Create an Express router to organize our queue endpoints.
    const router = express.Router();

    // Get the current list of services from service-management.js.
    const getServices = getServicesFunction || (() => []);


    // Check whether an ID is a valid positive integer.
    // This prevents invalid IDs from reaching our database queries.
    function validId(value) {
        return /^[1-9]\d*$/.test(String(value)) &&
            Number.isSafeInteger(Number(value));
    }


    // =========================================================
    // GET ALL QUEUES
    // Endpoint: GET /api/queue
    // =========================================================

    router.get("/", async (req, res) => {

        try {
            // Retrieve all queues from the MySQL database.
            const queues = await queueRepository.listQueues();

            // Send the queues back to the frontend.
            res.json(queues);

        } catch (error) {

            console.error("Could not load queues:", error);

            res.status(500).json({
                error: "Could not load queues"
            });
        }
    });


    // =========================================================
    // CREATE A NEW QUEUE
    // Endpoint: POST /api/queue
    // =========================================================

    router.post("/", async (req, res) => {

        try {
            // Get the Service ID from the request body.
            const { serviceId } = req.body;

            // Make sure the Service ID is valid.
            if (!validId(serviceId)) {
                return res.status(400).json({
                    error: "A valid Service ID is required"
                });
            }

            // Retrieve the current services.
            const services = getServices();

            // Find the service associated with this ID.
            const service = services.find(
                item => item.id === Number(serviceId)
            );

            // A queue cannot be created for a nonexistent service.
            if (!service) {
                return res.status(404).json({
                    error: "Service not found"
                });
            }

            // Create the queue in MySQL.
            // MySQL automatically generates the Queue ID.
            const newQueue = await queueRepository.createQueue(
                service.id
            );

            // Return the newly created queue.
            res.status(201).json(newQueue);

        } catch (error) {

            console.error("Could not create queue:", error);

            res.status(500).json({
                error: "Could not create queue"
            });
        }
    });


    // =========================================================
    // ADD A USER TO A QUEUE
    // Endpoint: POST /api/queue/:id/entries
    // =========================================================

    router.post("/:id/entries", async (req, res) => {

        try {
            // Get the Queue ID from the URL.
            const queueId = Number(req.params.id);

            // Get the User ID and priority from the request body.
            const { userId, priority } = req.body;

            // Validate the Queue ID.
            if (!validId(req.params.id)) {
                return res.status(400).json({
                    error: "A valid Queue ID is required"
                });
            }

            // Validate the User ID.
            if (!validId(userId)) {
                return res.status(400).json({
                    error: "A valid User ID is required"
                });
            }

            // Check whether the queue exists in MySQL.
            const selectedQueue = await queueRepository.findQueue(
                queueId
            );

            if (!selectedQueue) {
                return res.status(404).json({
                    error: "Queue not found"
                });
            }

            // Users cannot join a closed queue.
            if (selectedQueue.status !== "open") {
                return res.status(400).json({
                    error: "This queue is closed"
                });
            }

            // Use medium priority if none was provided.
            const entryPriority = priority || "medium";

            // Make sure the priority is valid.
            if (!["low", "medium", "high"].includes(entryPriority)) {
                return res.status(400).json({
                    error: "Priority must be low, medium, or high"
                });
            }

            // Add the user to QueueEntry in MySQL.
            // The repository automatically calculates their position.
            const newEntry = await queueRepository.addEntry(
                queueId,
                Number(userId),
                entryPriority
            );

            // Return the newly created entry.
            res.status(201).json(newEntry);

        } catch (error) {

            console.error("Could not add queue entry:", error);

            res.status(500).json({
                error: "Could not add queue entry"
            });
        }
    });


    // =========================================================
    // GET ENTRIES FOR A SPECIFIC QUEUE
    // Endpoint: GET /api/queue/:id/entries
    // =========================================================

    router.get("/:id/entries", async (req, res) => {

        try {
            // Get the Queue ID from the URL.
            const queueId = Number(req.params.id);

            // Validate the Queue ID.
            if (!validId(req.params.id)) {
                return res.status(400).json({
                    error: "A valid Queue ID is required"
                });
            }

            // Check whether the queue exists.
            const selectedQueue = await queueRepository.findQueue(
                queueId
            );

            if (!selectedQueue) {
                return res.status(404).json({
                    error: "Queue not found"
                });
            }

            // Retrieve all entries belonging to this queue.
            // This includes waiting, served, and canceled entries.
            const entries = await queueRepository.listAllEntries(
                queueId
            );

            // Return the entries.
            res.json(entries);

        } catch (error) {

            console.error("Could not load entries:", error);

            res.status(500).json({
                error: "Could not load entries"
            });
        }
    });


    // =========================================================
    // CHANGE QUEUE STATUS
    // Endpoint: PUT /api/queue/:id/status
    // =========================================================

    router.put("/:id/status", async (req, res) => {

        try {
            // Get the Queue ID from the URL.
            const queueId = Number(req.params.id);

            // Get the requested status from the request body.
            const { status } = req.body;

            // Validate the Queue ID.
            if (!validId(req.params.id)) {
                return res.status(400).json({
                    error: "A valid Queue ID is required"
                });
            }

            // A queue can only be open or closed.
            if (!["open", "closed"].includes(status)) {
                return res.status(400).json({
                    error: "Status must be open or closed"
                });
            }

            // Update the queue status in MySQL.
            const updatedQueue = await queueRepository.setQueueStatus(
                queueId,
                status
            );

            // Check whether the queue existed.
            if (!updatedQueue) {
                return res.status(404).json({
                    error: "Queue not found"
                });
            }

            // Return the updated queue.
            res.json({
                message: `Queue ${status} successfully`,
                queue: updatedQueue
            });

        } catch (error) {

            console.error("Could not update queue:", error);

            res.status(500).json({
                error: "Could not update queue"
            });
        }
    });


    // =========================================================
    // CANCEL A QUEUE ENTRY
    // Endpoint: DELETE /api/queue/:queueId/entries/:entryId
    // =========================================================

    router.delete("/:queueId/entries/:entryId", async (req, res) => {

        try {
            // Get both IDs from the URL.
            const queueId = Number(req.params.queueId);
            const entryId = Number(req.params.entryId);

            // Validate both IDs.
            if (
                !validId(req.params.queueId) ||
                !validId(req.params.entryId)
            ) {
                return res.status(400).json({
                    error: "Valid Queue and Entry IDs are required"
                });
            }

            // Find the entry in MySQL.
            const entry = await queueRepository.findEntry(entryId);

            // Make sure the entry belongs to the requested queue.
            if (!entry || entry.queueId !== queueId) {
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

            // Change the entry status to canceled.
            // The repository also recalculates remaining positions.
            const canceledEntry = await queueRepository.setEntryStatus(
                entryId,
                "canceled"
            );

            const details = await queueRepository.getHistoryDetails(entryId);

                if (details) {
                await addRecord({
                userId: details.email,
                serviceName: details.serviceName,
                waitMinutes: details.waitMinutes,
                outcome: "Left queue"
    });
}

            // Return the canceled entry.
            res.json({
                message: "Queue entry canceled successfully",
                entry: canceledEntry
            });

        } catch (error) {

            console.error("Could not cancel entry:", error);

            res.status(500).json({
                error: "Could not cancel entry"
            });
        }
    });


    // =========================================================
    // SERVE THE NEXT PERSON IN A QUEUE
    // Endpoint: POST /api/queue/:id/serve
    // =========================================================

    router.post("/:id/serve", async (req, res) => {

        try {
            // Get the Queue ID from the URL.
            const queueId = Number(req.params.id);

            // Validate the Queue ID.
            if (!validId(req.params.id)) {
                return res.status(400).json({
                    error: "A valid Queue ID is required"
                });
            }

            // Check whether the queue exists.
            const selectedQueue = await queueRepository.findQueue(
                queueId
            );

            if (!selectedQueue) {
                return res.status(404).json({
                    error: "Queue not found"
                });
            }

            // Serve the person currently at position 1.
            // The repository automatically renumbers everyone else.
            const servedEntry = await queueRepository.serveNext(
                queueId
            );

            const details = await queueRepository.getHistoryDetails(
                servedEntry.entryId
            );

            if (details) {
                await addRecord({
                userId: details.email,
                serviceName: details.serviceName,
                waitMinutes: details.waitMinutes,
                outcome: "Served"
            });
}

            // If no one is waiting, return an error.
            if (!servedEntry) {
                return res.status(404).json({
                    error: "Nobody is waiting in this queue"
                });
            }

            // Get the remaining people who are still waiting.
            const remainingEntries = await queueRepository.listEntries(
                queueId
            );

            // Return the served user and remaining queue.
            res.json({
                message: "User served successfully",
                servedEntry: servedEntry,
                remainingEntries: remainingEntries
            });

        } catch (error) {

            console.error("Could not serve next user:", error);

            res.status(500).json({
                error: "Could not serve next user"
            });
        }
    });


    // Return the completed router to service-management.js.
    return router;
}


// Export the router factory so service-management.js can use it.
module.exports = {
    createQueueRouter
};
