# QueueSmart

COSC 4353 Group 22 — a smart queue management application.

## Running it

Everything runs from the repository root, not from inside the `back end` folder.

    npm install          install the dependencies
    npm start            start the API server at http://localhost:3000
    npm test             run the unit tests
    npm run coverage     run the tests and print a coverage table

With the server running, open `Front end/login.html` in a browser to use the app.

## Layout

    back end/            the API server and its modules
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

There is no database in this assignment. The data lives in memory and resets
when the server restarts.
