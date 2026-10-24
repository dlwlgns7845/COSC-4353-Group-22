
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Integrate service and queue APIs with the main server.
// This includes wait-time estimation and notifications.
const serviceApp = require("./service-management");
app.use(serviceApp);

const users = [];

//registration

app.post("/api/register", async (req, res) => {
    const { fullName, email, password } = req.body;

    const normalizedEmail = email.trim().toLowerCase();
    
    const existingUser = users.find(
        user => user.email === normalizedEmail
    );

    if (existingUser) {
        return res.status(409).json({
            message: "Email is already registered."
        });
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        id: users.length + 1,
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "user"
    };

    users.push(newUser);

    return res.status(201).json({
        message: "Registration successful."
    });
});

// Login


app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    
    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required."
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    
    const user = users.find(
        user => user.email === normalizedEmail
    );

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    
    const passwordMatches = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordMatches) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }


    return res.status(200).json({
        message: "Login successful.",
        role: user.role
    });
});

// Start Server

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
