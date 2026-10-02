/* ===========================================================
   QueueSmart - mock data

   Assignment 2 is front-end only, so there is no database.
   We keep the data here and save it in the browser with
   localStorage, so the data stays when you move to another page.

   The four lists match the tables we designed in Assignment 1:
   services / queue entries / history / notifications
   =========================================================== */

/* The user who is "logged in". Normally this comes from the server. */
const CURRENT_USER = { name: "Jihoon Lee", email: "student@uh.edu" };

/* ---------- starting data (used on the very first visit) ---------- */

const DEFAULT_SERVICES = [
  { id: 1, name: "Financial Aid",     description: "Questions about grants, loans and scholarships.", duration: 15, priority: "high",   open: true },
  { id: 2, name: "Academic Advising", description: "Course planning and degree check.",               duration: 20, priority: "medium", open: true },
  { id: 3, name: "ID Card Services",  description: "New Cougar Card or replacement card.",            duration: 5,  priority: "low",    open: true },
  { id: 4, name: "Registration Help", description: "Help with adding or dropping classes.",           duration: 10, priority: "medium", open: false }
];

/* People currently waiting. The order inside one service is decided
   by arrival time, and services with higher priority are shown first. */
const DEFAULT_QUEUE = [
  { id: 101, serviceId: 1, userName: "Maria Lopez",  joinedAt: "09:15", status: "waiting" },
  { id: 102, serviceId: 1, userName: "David Kim",    joinedAt: "09:22", status: "waiting" },
  { id: 103, serviceId: 1, userName: "Jihoon Lee",   joinedAt: "09:30", status: "waiting" },
  { id: 104, serviceId: 2, userName: "Sara Ahmed",   joinedAt: "09:05", status: "almost-ready" },
  { id: 105, serviceId: 2, userName: "Tom Nguyen",   joinedAt: "09:40", status: "waiting" },
  { id: 106, serviceId: 3, userName: "Chris Walker", joinedAt: "09:50", status: "waiting" }
];

const DEFAULT_HISTORY = [
  { id: 201, date: "2026-09-28", serviceName: "ID Card Services",  waitMinutes: 8,  outcome: "Served" },
  { id: 202, date: "2026-09-21", serviceName: "Academic Advising", waitMinutes: 24, outcome: "Served" },
  { id: 203, date: "2026-09-14", serviceName: "Financial Aid",     waitMinutes: 31, outcome: "Left queue" },
  { id: 204, date: "2026-09-02", serviceName: "Registration Help", waitMinutes: 12, outcome: "Served" }
];

/* "type" is either "queue" (the line moved) or "status" (your state changed).
   "read" is false until the user opens the bell and marks it as read. */
const DEFAULT_NOTIFICATIONS = [
  { id: 301, type: "queue",  title: "Queue updated",   text: "You are number 3 in line for Financial Aid. About 30 minutes left.", time: "09:31", read: false },
  { id: 302, type: "status", title: "Almost ready",    text: "Sara Ahmed is next in line for Academic Advising.",                  time: "09:12", read: false },
  { id: 303, type: "queue",  title: "Queue is busy",   text: "Academic Advising queue is longer than usual today.",                time: "09:10", read: true  },
  { id: 304, type: "status", title: "Service closed",  text: "Registration Help is closed for today.",                             time: "08:55", read: true  }
];

/* ---------- save and load (localStorage) ---------- */

/* localStorage can only store text, so we turn the list into
   a JSON string when saving, and back into a list when loading. */

/* try / catch is used because some browsers block storage when the
   page is opened straight from a file. If that happens we simply
   fall back to the starting data instead of crashing the page. */

function save(key, value) {
  try {
    localStorage.setItem("queuesmart_" + key, JSON.stringify(value));
  } catch (e) {
    console.log("Storage is not available, changes will not be kept.");
  }
}

function load(key, defaultValue) {
  try {
    const saved = localStorage.getItem("queuesmart_" + key);
    if (saved === null) {
      return defaultValue;    // first visit, so use the starting data
    }
    return JSON.parse(saved);
  } catch (e) {
    return defaultValue;
  }
}

/* Short helpers so the pages are easier to read. */

function getServices()     { return load("services", DEFAULT_SERVICES); }
function setServices(list) { save("services", list); }

function getQueue()        { return load("queue", DEFAULT_QUEUE); }
function setQueue(list)    { save("queue", list); }

function getHistory()      { return load("history", DEFAULT_HISTORY); }
function setHistory(list)  { save("history", list); }

function getNotifications()     { return load("notifications", DEFAULT_NOTIFICATIONS); }
function setNotifications(list) { save("notifications", list); }

/* Add a new notification to the top of the list.
   "type" is "queue" or "status", and it starts as unread. */
function addNotification(text, type, title) {
  const list = getNotifications();
  const now = new Date();
  const time = String(now.getHours()).padStart(2, "0") + ":" +
               String(now.getMinutes()).padStart(2, "0");

  list.unshift({
    id: Date.now(),
    type: type || "queue",
    title: title || "Queue updated",
    text: text,
    time: time,
    read: false
  });

  setNotifications(list);
}

/* How many notifications the user has not opened yet. */
function countUnread() {
  return getNotifications().filter(function (n) { return !n.read; }).length;
}

/* Mark every notification as read. */
function markAllRead() {
  const list = getNotifications();
  list.forEach(function (n) { n.read = true; });
  setNotifications(list);
}

/* ---------- small shared helpers ---------- */

/* Find one service by its id. */
function findService(serviceId) {
  return getServices().find(function (s) { return s.id === serviceId; });
}

/* Everyone waiting for one service, ordered by arrival time. */
function getQueueForService(serviceId) {
  return getQueue()
    .filter(function (entry) { return entry.serviceId === serviceId; })
    .sort(function (a, b) { return a.joinedAt < b.joinedAt ? -1 : 1; });
}

/* Estimated wait = people in front x minutes one person takes. */
function estimateWait(serviceId, peopleInFront) {
  const service = findService(serviceId);
  if (!service) { return 0; }
  return peopleInFront * service.duration;
}

/* The queue entry of the logged in user, or undefined if not waiting. */
function getMyEntry() {
  return getQueue().find(function (entry) {
    return entry.userName === CURRENT_USER.name;
  });
}

/* Put everything back to the starting data (used by the Reset button). */
function resetDemoData() {
  try {
    localStorage.clear();
  } catch (e) {
    /* nothing to clear */
  }
  location.reload();
}
