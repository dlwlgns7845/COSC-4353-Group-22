
const express = require("express");

// Import the shared MySQL connection.
const pool = require("./database/pool");

// Import the service repository.
const {
    createServiceRepository
} = require("./database/service-repository");

// Import the queue router.
const {
    createQueueRouter
} = require("./queue-management");

// Create the Express application.
const app = express();

// Connect the service repository to MySQL.
const serviceRepository = createServiceRepository(pool);

// Cache services so the queue router can check service IDs.
let services = [];

// Load the latest services from MySQL.
async function refreshServices() {
    services = await serviceRepository.list();
    return services;
}

// Initialize the application before the server starts.
// server.js calls this function.
app.initialize = async function () {
    await refreshServices();
    console.log("Services loaded from MySQL.");
};

// Homepage.
app.get("/", (req, res) => {
    res.send("QueueSmart Backend is running!");
});

// Mount the queue API.
// The queue router uses the service cache to validate service IDs.
app.use("/api/queue", createQueueRouter(() => services));

// GET: Retrieve all services.
app.get("/api/services", async (req, res) => {
    try {
        const result = await refreshServices();
        res.json(result);
    } catch (error) {
        console.error("Could not load services:", error);
        res.status(500).json({ error: "Could not load services" });
    }
});

// POST: Create a service.
app.post("/api/services", async (req, res) => {
    try {
        const { name, description, duration, priority } = req.body;

        if (!name || !description ||
            !Number.isFinite(Number(duration)) ||
            Number(duration) <= 0 ||
            !["low", "medium", "high"].includes(priority)) {
            return res.status(400).json({
                error: "Provide a name, description, positive duration, and valid priority"
            });
        }

        const newService = await serviceRepository.create({
            name,
            description,
            duration: Number(duration),
            priority
        });

        await refreshServices();

        res.status(201).json(newService);
    } catch (error) {
        console.error("Could not create service:", error);
        res.status(500).json({ error: "Could not create service" });
    }
});

// PUT: Update an existing service.
app.put("/api/services/:id", async (req, res) => {
    try {
        const serviceId = Number(req.params.id);

        if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
            return res.status(400).json({
                error: "A valid Service ID is required"
            });
        }

        const { name, description, duration, priority } = req.body;

        if (!name || !description ||
            !Number.isFinite(Number(duration)) ||
            Number(duration) <= 0 ||
            !["low", "medium", "high"].includes(priority)) {
            return res.status(400).json({
                error: "Provide a name, description, positive duration, and valid priority"
            });
        }

        const updatedService = await serviceRepository.update(serviceId, {
            name,
            description,
            duration: Number(duration),
            priority
        });

        if (!updatedService) {
            return res.status(404).json({
                error: "Service not found"
            });
        }

        await refreshServices();

        res.json(updatedService);
    } catch (error) {
        console.error("Could not update service:", error);
        res.status(500).json({ error: "Could not update service" });
    }
});

// DELETE: Remove a service.
app.delete("/api/services/:id", async (req, res) => {
    try {
        const serviceId = Number(req.params.id);

        if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
            return res.status(400).json({
                error: "A valid Service ID is required"
            });
        }

        const deletedService = await serviceRepository.remove(serviceId);

        if (!deletedService) {
            return res.status(404).json({
                error: "Service not found"
            });
        }

        await refreshServices();

        res.json({
            message: "Service deleted successfully",
            service: deletedService
        });
    } catch (error) {
        console.error("Could not delete service:", error);
        res.status(500).json({ error: "Could not delete service" });
    }
});

// Export the Express application for server.js.
// Do NOT call app.listen() here.
module.exports = app;
