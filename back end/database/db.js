/* ===========================================================
   QueueSmart - Shared database connection (Assignment 4)

   Every module that needs MySQL asks for the pool here, so
   there is only one pool for the whole app:

       const db = require("./database/db");
       const [rows] = await db.getPool().execute("SELECT 1");

   The settings come from a .env file. Copy .env.example to
   .env and fill in your own MySQL user and password.
   =========================================================== */

/* quiet: true stops dotenv from printing a banner every time
   the tests load this file */
require("dotenv").config({ quiet: true });

const mysql = require("mysql2/promise");

/* We build the pool the first time somebody asks for it,
   not when this file is loaded. That way the unit tests,
   which hand in their own fake database, never open a real
   connection and can run without MySQL installed. */
let pool = null;

function getPool() {
  if (pool === null) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "queuesmart",
      waitForConnections: true,
      connectionLimit: 10
    });
  }

  return pool;
}

/* Closes the pool. Only used when the server shuts down. */
async function closePool() {
  if (pool !== null) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool: getPool,
  closePool: closePool
};
