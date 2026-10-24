
/* QueueSmart shared navigation and backend notifications. */

const NOTIFICATION_API = "http://localhost:3000/api";

let liveNotifications = [];
let notificationEntryId = null;
let notificationError = "";

function renderNav(activePage, role) {
    const userLinks = [
        { page: "dashboard", label: "Dashboard", href: "dashboard.html" },
        { page: "join", label: "Join Queue", href: "join_queue.html" },
        { page: "status", label: "Queue Status", href: "queue_status.html" },
        { page: "history", label: "History", href: "history.html" }
    ];

    const adminLinks = [
        { page: "admin", label: "Dashboard", href: "admin-dashboard.html" },
        { page: "services", label: "Service Management", href: "service-management.html" },
        { page: "queues", label: "Queue Management", href: "queue-management.html" }
    ];

    const links = role === "admin" ? adminLinks : userLinks;

    const linksHtml = links.map(link =>
        `<a class="${link.page === activePage ? "active" : ""}" href="${link.href}">${link.label}</a>`
    ).join("");

    const switchLink = role === "admin"
        ? '<a href="dashboard.html">User view</a>'
        : '<a href="admin-dashboard.html">Admin view</a>';

    document.getElementById("navbar").innerHTML =
        '<span class="logo">QueueSmart</span>' +
        linksHtml +
        '<span class="spacer"></span>' +
        buildBell() +
        switchLink +
        '<a href="login.html">Log out</a>';

    connectBell();
    refreshNotifications();

    // Check for updates every 10 seconds.
    setInterval(refreshNotifications, 10000);
}

// ==================================================
// EXISTING NOTIFICATION BELL
// ==================================================

function buildBell() {
    return '<div class="bell-wrap">' +
        '<button class="bell-button" id="bellButton" aria-label="Notifications" aria-expanded="false">' +
        '<svg viewBox="0 0 24 24" class="bell-icon" aria-hidden="true">' +
        '<path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>' +
        '<path d="M10 21h4"></path>' +
        '</svg>' +
        '</button>' +
        '<div class="bell-panel" id="bellPanel" hidden></div>' +
        '</div>';
}

function connectBell() {
    const button = document.getElementById("bellButton");
    const panel = document.getElementById("bellPanel");

    button.addEventListener("click", event => {
        event.stopPropagation();

        panel.hidden = !panel.hidden;

        button.setAttribute(
            "aria-expanded",
            String(!panel.hidden)
        );

        if (!panel.hidden) {
            refreshNotifications();
        }
    });

    document.addEventListener("click", () => {
        panel.hidden = true;
        button.setAttribute("aria-expanded", "false");
    });

    panel.addEventListener("click", event => {
        event.stopPropagation();
    });

    drawBellPanel();
}

// ==================================================
// FETCH REAL BACKEND NOTIFICATIONS
// ==================================================

async function refreshNotifications() {
    try {
        const response = await fetch(
            NOTIFICATION_API + "/queue"
        );

        if (!response.ok) {
            throw new Error("Could not load queue");
        }

        const entries = await response.json();

        // Assignment 2 uses CURRENT_USER as its demo identity.
        const userName = typeof CURRENT_USER === "undefined"
            ? null
            : CURRENT_USER.name;

        const savedId = Number(
            localStorage.getItem("queuesmart_activeEntryId")
        );

        const entry = entries.find(e =>
            e.id === savedId &&
            e.userName === userName &&
            e.status === "waiting"
        ) || entries.find(e =>
            e.userName === userName &&
            e.status === "waiting"
        );

        notificationEntryId = entry ? entry.id : null;

        if (entry) {
            localStorage.setItem(
                "queuesmart_activeEntryId",
                String(entry.id)
            );

            const result = await fetch(
                NOTIFICATION_API +
                `/queue/${entry.id}/notifications`
            );

            if (!result.ok) {
                throw new Error("Could not load notifications");
            }

            const data = await result.json();
            liveNotifications = data.notifications;
        } else {
            liveNotifications = [];
        }

        notificationError = "";

    } catch (error) {
        notificationError =
            "Unable to load notifications. Check the backend.";

        console.error(error);
    }

    updateBellBadge();
    drawBellPanel();
}

// ==================================================
// UNREAD NOTIFICATION COUNT
// ==================================================

function updateBellBadge() {
    const button = document.getElementById("bellButton");

    if (!button) return;

    button.querySelector(".bell-badge")?.remove();

    const unread = liveNotifications.filter(
        n => !n.read
    ).length;

    if (unread > 0) {
        const badge = document.createElement("span");

        badge.className = "bell-badge";
        badge.textContent = unread;

        button.appendChild(badge);
    }
}

// ==================================================
// DRAW THE EXISTING NOTIFICATION PANEL
// ==================================================

function drawBellPanel() {
    const panel = document.getElementById("bellPanel");

    if (!panel) return;

    panel.replaceChildren();

    const head = document.createElement("div");
    head.className = "bell-head";

    const heading = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = "Notifications";

    const hint = document.createElement("div");
    hint.className = "hint";

    const unread = liveNotifications.filter(
        n => !n.read
    ).length;

    hint.textContent = `${unread} unread`;

    heading.append(title, hint);

    const markButton = document.createElement("button");
    markButton.className = "link-button";
    markButton.textContent = "Mark all as read";

    markButton.disabled =
        !notificationEntryId || unread === 0;

    markButton.addEventListener(
        "click",
        markAllReadAndRedraw
    );

    head.append(heading, markButton);
    panel.appendChild(head);

    if (notificationError || liveNotifications.length === 0) {
        const empty = document.createElement("p");

        empty.className = "empty";
        empty.style.padding = "16px";

        empty.textContent = notificationError ||
            "No notifications yet.";

        panel.appendChild(empty);
        return;
    }

    liveNotifications
        .slice()
        .reverse()
        .slice(0, 8)
        .forEach(n => {
            const item = document.createElement("div");

            item.className = "bell-item" +
                (n.read ? "" : " unread");

            const badge = document.createElement("span");

            badge.className = "badge " +
                (n.type === "status" ? "status" : "queue");

            badge.textContent = n.type === "status"
                ? "Status change"
                : "Queue update";

            const itemTitle = document.createElement("div");

            itemTitle.className = "bell-title";
            itemTitle.textContent = n.title || "Queue updated";

            const content = document.createElement("div");

            content.className = "bell-text";
            content.textContent = n.text;

            const time = document.createElement("div");

            time.className = "time";
            time.textContent = new Date(
                n.createdAt
            ).toLocaleString();

            item.append(badge, itemTitle, content, time);
            panel.appendChild(item);
        });
}

// ==================================================
// MARK NOTIFICATIONS AS READ THROUGH BACKEND
// ==================================================

async function markAllReadAndRedraw() {
    if (!notificationEntryId) return;

    try {
        const response = await fetch(
            NOTIFICATION_API +
            `/queue/${notificationEntryId}/notifications/read`,
            { method: "PATCH" }
        );

        if (!response.ok) {
            throw new Error(
                "Could not mark notifications as read"
            );
        }

        await refreshNotifications();

    } catch (error) {
        notificationError = "Could not update notifications.";

        console.error(error);
        drawBellPanel();
    }
}

// Compatibility with existing pages that use this helper.
function renderNotifications(elementId, limit) {
    const box = document.getElementById(elementId);

    if (!box) return;

    box.replaceChildren();

    const items = liveNotifications
        .slice()
        .reverse()
        .slice(0, limit || 99);

    if (!items.length) {
        box.textContent = "No notifications yet.";
        return;
    }

    items.forEach(n => {
        const item = document.createElement("div");

        item.className = "notification";

        item.textContent =
            `${n.title}: ${n.text}`;

        box.appendChild(item);
    });
}
