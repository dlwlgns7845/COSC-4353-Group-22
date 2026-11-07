require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// shared MySQL connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// Integrate service and queue APIs with the main server.
// This includes wait-time estimation and notifications.
const serviceApp = require("./service-management");
app.use(serviceApp);

// Mount the history routes (module 6).
const history = require("./history");
app.use("/api/history", history.router);


//registration

app.post("/api/register", async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!email || !password || !fullName) {
        return res.status(400).json({
            message: "Email and password and full name are required."
        });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    const [existingUser] = await db.execute(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [normalizedEmail]
    );


    if (existingUser.length > 0) {
        return res.status(409).json({
            message: "Email is already registered."
        });
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
        "INSERT INTO users (email, password, role) VALUES ( ?, ?, ?)",
        [normalizedEmail, hashedPassword, "user"]
    );

    await db.execute(
        "INSERT INTO UserProfile (full_name, email) VALUES (?, ?)",
        [fullName,normalizedEmail]
    );

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

    
    const [users] = await db.execute(
        "SELECT id, email, password, role FROM users WHERE email = ? LIMIT 1",
        [normalizedEmail]
    );

    if (users.length === 0) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    const user = users[0];

    
    const passwordMatches = await bcrypt.compare(password, user.password);

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
