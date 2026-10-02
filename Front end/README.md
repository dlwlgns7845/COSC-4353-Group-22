# QueueSmart - Front End (Assignment 2)

COSC 4353 Group 22. Front end only, no backend. All data is mock data.

## How to run

Open `login.html` in a browser. No installation and no build step.

## Technology

Plain HTML, CSS and JavaScript.

Assignment 2 is front end only with mock data, so a framework would add a build
step without adding value. Every team member can open a file and edit it right
away, and the same pages can call a real API with `fetch` in Assignment 3.

## Screens

| File | Screen | Built by |
|---|---|---|
| `login.html` | Login | Alan (screen), Maahum (validation) |
| `register.html` | Registration | Alan (screen), Maahum (validation) |
| `dashboard.html` | User dashboard | Dakoda (layout), Jihoon (data) |
| `join_queue.html` | Join queue | Dakoda (layout), Jihoon (data) |
| `queue_status.html` | Queue status | Dakoda (layout), Jihoon (data) |
| `history.html` | History | Dakoda (layout), Jihoon (data) |
| `admin-dashboard.html` | Admin dashboard | Jihoon |
| `service-management.html` | Service management | Jihoon |
| `queue-management.html` | Queue management | Jihoon |

## Shared files

| File | What it does | Built by |
|---|---|---|
| `style.css` | Base styling shared by every screen | Jihoon |
| `user_style.css` | Card layout used by the four user screens | Dakoda |
| `data.js` | Mock data and the save / load helpers | Jihoon |
| `nav.js` | Navigation bar, notification bell, notification lists | Jihoon, bell design from Maahum |
| `validation.js` | Reusable form validation driven by HTML attributes | Maahum |
| `validation.css` | Styling for the validation messages | Maahum |

## Mock data

The data starts from the lists in `data.js` and is then kept in the browser with
`localStorage`, so a queue you join on one page is still there on the next page.
The "Reset demo data" button on the admin dashboard puts everything back.

## Notifications

The bell in the navigation bar shows an unread count and opens a panel with the
latest notifications. Each one is tagged as a queue update or a status change.
Joining a queue, leaving a queue, serving the next user, and opening or closing
a service all create a new notification.

## Validations

| Field | Rule |
|---|---|
| Email (login, register) | `type="email"`, required |
| Password (login, register) | required, at least 8 characters |
| Full name (register) | required, maximum 60 characters |
| Service name | required, maximum 100 characters, live counter |
| Description | required |
| Expected duration | required, number between 1 and 240 |
| Priority level | low / medium / high |
| Service (join queue) | must be selected |
| History date filter | `type="date"`, the from date must not be after the to date |

`validation.js` reads the HTML attributes of each field, so the same file is used
on the login, registration and service management forms without writing new rules
for each one. The history date filter keeps its own check because it compares two
fields against each other, which the attribute rules cannot express.
