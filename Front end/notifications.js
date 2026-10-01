/* =========================
   MOCK NOTIFICATION DATA
========================= */

const notifications = [

    {
        id: 1,

        type: "queue-update",

        title: "Queue Updated",

        message:
            "Your position changed from #5 to #3.",

        time: "2 minutes ago",

        read: false
    },


    {
        id: 2,

        type: "status-change",

        title: "Almost Ready",

        message:
            "You are next in the queue. Please be ready.",

        time: "5 minutes ago",

        read: false
    },


    {
        id: 3,

        type: "status-change",

        title: "Service Completed",

        message:
            "Your service has been completed successfully.",

        time: "20 minutes ago",

        read: true
    },


    {
        id: 4,

        type: "queue-update",

        title: "Queue Joined",

        message:
            "You successfully joined the Financial Aid queue.",

        time: "30 minutes ago",

        read: true
    }

];


/* =========================
   ELEMENT REFERENCES
========================= */

const notificationButton =
    document.getElementById(
        "notificationButton"
    );


const notificationPanel =
    document.getElementById(
        "notificationPanel"
    );


const notificationList =
    document.getElementById(
        "notificationList"
    );


const notificationBadge =
    document.getElementById(
        "notificationBadge"
    );


const markAllReadButton =
    document.getElementById(
        "markAllRead"
    );


const unreadText =
    document.getElementById(
        "unreadText"
    );


/* =========================
   RENDER NOTIFICATIONS
========================= */

function renderNotifications() {

    notificationList.innerHTML = "";


    if (notifications.length === 0) {

        notificationList.innerHTML = `

            <div class="empty-state">

                <h3>No notifications</h3>

                <p>
                    Queue updates and status changes
                    will appear here.
                </p>

            </div>

        `;


        updateNotificationBadge();

        return;
    }


    notifications.forEach(
        notification => {

            const notificationElement =
                document.createElement("div");


            notificationElement.classList.add(
                "notification-item"
            );


            if (!notification.read) {

                notificationElement.classList.add(
                    "unread"
                );

            }


            /* Determine notification style */

            const isQueueUpdate =
                notification.type ===
                "queue-update";


            const iconClass =
                isQueueUpdate
                    ? "queue"
                    : "status";


            const iconText =
                isQueueUpdate
                    ? "↕"
                    : "✓";


            const typeText =
                isQueueUpdate
                    ? "Queue Update"
                    : "Status Change";


            /* Create HTML */

            notificationElement.innerHTML = `

                <div
                    class="notification-icon ${iconClass}"
                >
                    ${iconText}
                </div>


                <div class="notification-content">

                    <span
                        class="notification-type ${notification.type}"
                    >
                        ${typeText}
                    </span>


                    <div class="notification-top">

                        <div class="notification-title">
                            ${notification.title}
                        </div>

                        ${
                            !notification.read
                                ? `
                                    <span
                                        class="unread-dot"
                                        aria-label="Unread notification"
                                    ></span>
                                  `
                                : ""
                        }

                    </div>


                    <div class="notification-message">
                        ${notification.message}
                    </div>


                    <span class="notification-time">
                        ${notification.time}
                    </span>

                </div>

            `;


            /* Mark individual notification as read */

            notificationElement.addEventListener(
                "click",
                function () {

                    if (!notification.read) {

                        notification.read = true;

                        renderNotifications();

                    }

                }
            );


            notificationList.appendChild(
                notificationElement
            );

        }
    );


    updateNotificationBadge();

}


/* =========================
   UPDATE BADGE & HEADER
========================= */

function updateNotificationBadge() {

    const unreadCount =
        notifications.filter(
            notification =>
                !notification.read
        ).length;


    notificationBadge.textContent =
        unreadCount;


    /* No unread notifications */

    if (unreadCount === 0) {

        notificationBadge.style.display =
            "none";


        unreadText.textContent =
            "You're all caught up";


        markAllReadButton.disabled =
            true;


        markAllReadButton.textContent =
            "All read";

    }

    /* At least one unread notification */

    else {

        notificationBadge.style.display =
            "flex";


        if (unreadCount === 1) {

            unreadText.textContent =
                "1 unread notification";

        } else {

            unreadText.textContent =
                `${unreadCount} unread notifications`;

        }


        markAllReadButton.disabled =
            false;


        markAllReadButton.textContent =
            "Mark all as read";

    }

}


/* =========================
   OPEN / CLOSE PANEL
========================= */

notificationButton.addEventListener(
    "click",
    function (event) {

        event.stopPropagation();


        const isOpen =
            notificationPanel.classList.toggle(
                "show"
            );


        notificationButton.setAttribute(
            "aria-expanded",
            isOpen
        );

    }
);


/* Keep panel open when clicking inside */

notificationPanel.addEventListener(
    "click",
    function (event) {

        event.stopPropagation();

    }
);


/* =========================
   MARK ALL AS READ
========================= */

markAllReadButton.addEventListener(
    "click",
    function () {

        notifications.forEach(
            notification => {

                notification.read = true;

            }
        );


        renderNotifications();

    }
);


/* =========================
   CLOSE WHEN CLICKING OUTSIDE
========================= */

document.addEventListener(
    "click",
    function () {

        notificationPanel.classList.remove(
            "show"
        );


        notificationButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }
);


/* =========================
   CLOSE WITH ESC KEY
========================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {

            notificationPanel.classList.remove(
                "show"
            );


            notificationButton.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }
);


/* =========================
   INITIALIZE
========================= */

renderNotifications();
