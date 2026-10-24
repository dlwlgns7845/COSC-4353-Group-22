const cors = require("cors");
const express = require("express");

const {
    createQueueRouter,
    removeQueueForService
} = require("./queue-management");

// Create the web application
const app = express();

// Backend port (Live Server can use 5500 separately)
const PORT = 3000;

// Allow Express to read JSON sent by the frontend
app.use(express.json());
app.use(cors());

// Store services in memory for now
let services = [
    {
        id: 1,
        name: "Academic Advising",
        description: "Meet with an academic advisor",
        duration: 20,
        priority: "medium"
    }
];

// Homepage route
app.get("/", (req, res) => {
    res.send("Queue Management Backend is running!");
});

// Existing example queue route
app.use("/api/queue", createQueueRouter(() => services));

// NEW: List all services
app.get("/api/services", (req, res) => {
    res.json(services);
});

//Add services
app.post("/api/services", (req, res) => {
    const { name, description, duration, priority } = req.body;

    const newService = {
        id: Date.now(),
        name,
        description,
        duration: Number(duration),
        priority
    };

    services.push(newService);

    res.status(201).json(newService);
});

//Edit
app.put("/api/services/:id", (req, res) => {
    const serviceId = Number(req.params.id);

    const service = services.find(s => s.id === serviceId);

    if (!service) {
        return res.status(404).json({
            error: "Service not found"
        });
    }

    const { name, description, duration, priority } = req.body;

    service.name = name;
    service.description = description;
    service.duration = Number(duration);
    service.priority = priority;

    res.json(service);
});


app.delete("/api/services/:id", (req, res) => {
    const serviceId = Number(req.params.id);

    const index = services.findIndex(function (service) {
        return service.id === serviceId;
    });

    if (index === -1) {
        return res.status(404).json({
            error: "Service not found"
        });
    }

    const deletedService = services.splice(index, 1)[0];
    removeQueueForService(serviceId);

    res.json({
        message: "Service deleted successfully",
        service: deletedService
    });
});

// Start the server only when this file is run directly.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

// Export the Express app for integration with the main server.
module.exports = app;