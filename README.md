# QueueSmart

COSC 4353 Group 22 — a smart queue management application.

## Setting it up

Everything runs from the repository root, not from inside the `back end` folder.

**1. Install the dependencies**

    npm install

**2. Create the database**

You need MySQL 8.0 or newer. Run the schema file once, and it creates the
`queuesmart` database and every table:

    mysql -u root -p < "back end/database/schema.sql"

**3. Point the app at your database**

Copy `.env.example` to `.env` and fill in your own MySQL user and password.
The `.env` file is ignored by git, so your password stays on your machine.

    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your password here
    DB_NAME=queuesmart

## Running it

    npm start            start the API server at http://localhost:3000
    npm test             run the unit tests
    npm run coverage     run the tests and write a coverage report

With the server running, open `Front end/login.html` in a browser to use the app.

The tests do not need MySQL. Each one hands the module a fake connection, so
`npm test` works straight after `npm install`, before any database is set up.

## Layout

    back end/            the API server and its modules
    back end/database/   the schema, the connection and the SQL queries
    back end/__tests__/  the unit tests
    Front end/           the screens, they call the API with fetch

## Back end modules

| File | What it does |
|---|---|
| `server.js` | Starts the app, handles registration and login, mounts the other modules |
| `service-management.js` | Create, update, list and delete services |
| `queue-management.js` | Join a queue, leave it, view it, serve the next user |
| `wait-time.js` | Works out the position and the estimated wait |
| `notifications.js` | Queue and status notifications |
| `history.js` | Past queue participation per user |
| `notification-store.js` | Saves notifications in the database |

## Database

| File | What it does |
|---|---|
| `database/schema.sql` | Creates the database and all the tables |
| `database/db.js` | The shared MySQL connection pool |
| `database/pool.js` | The pool used by the service module |
| `database/service-repository.js` | The SQL for the services table |
| `database/queue-repository.js` | The SQL for the Queue and QueueEntry tables |

The tables are `Users`, `UserProfile`, `services`, `Queue`, `QueueEntry`,
`Notification` and `QueueHistory`. Passwords are hashed with bcrypt before they
are stored, and the data stays in MySQL between restarts.
