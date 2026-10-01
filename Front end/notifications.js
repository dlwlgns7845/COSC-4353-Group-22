const notifications = [
    {
        id: 1,
        type: "queue-update",
        title: "Queue Updated",
        message: "Your position changed from #5 to #3.",
        time: "2 minutes ago",
        read: false
    },

    {
        id: 2,
        type: "status-change",
        title: "Almost Ready",
        message: "You are next in the queue. Please be ready.",
        time: "5 minutes ago",
        read: false
    },

    {
        id: 3,
        type: "status-change",
        title: "Status Changed",
        message: "Your service has been completed.",
        time: "20 minutes ago",
        read: true
    },

    {
        id: 4,
        type: "queue-update",
        title: "Queue Joined",
        message: "You successfully joined the Financial Aid queue.",
        time: "30 minutes ago",
        read: true
    }
];


const notificationButton =
    document.getElementById("notificationButton");

const notificationPanel =
    document.getElementById("notificationPanel");

const notificationList =
    document.getElementById("notificationList");

const notificationBadge =
    document.getElementById("notificationBadge");

const markAllReadButton =
    document.getElementById("markAllRead");


function renderNotifications() {

    notificationList.innerHTML = "";

    notifications.forEach(notification => {

        const notificationElement =
            document.createElement("div");

        notificationElement.classList.add(
            "notification-item"
        );


        if (!notification.read) {
            notificationElement.classList.add("unread");
        }


        const typeText =
            notification.type === "queue-update"
                ? "Queue Update"
                : "Status Change";


        notificationElement.innerHTML = `
            <span class="notification-type ${notification.type}">
                ${typeText}
            </span>

            <div class="notification-title">
                ${notification.title}
            </div>

            <div class="notification-message">
                ${notification.message}
            </div>

            <div class="notification-time">
                ${notification.time}
            </div>
        `;


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
    });


    updateNotificationBadge();
}


function updateNotificationBadge() {

    const unreadCount =
        notifications.filter(
            notification => !notification.read
        ).length;


    notificationBadge.textContent =
        unreadCount;


    if (unreadCount === 0) {

        notificationBadge.style.display = "none";

        markAllReadButton.disabled = true;

        markAllReadButton.textContent =
            "All read";

    } else {

        notificationBadge.style.display = "flex";

        markAllReadButton.disabled = false;

        markAllReadButton.textContent =
            "Mark all as read";
    }
}


/* Open and close notification panel */

notificationButton.addEventListener(
    "click",
    function (event) {

        event.stopPropagation();

        notificationPanel.classList.toggle(
            "show"
        );

    }
);


/* Prevent clicks inside panel from closing it */

notificationPanel.addEventListener(
    "click",
    function (event) {

        event.stopPropagation();

    }
);


/* Mark all notifications as read */

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


/* Close when clicking elsewhere */

document.addEventListener(
    "click",
    function () {

        notificationPanel.classList.remove(
            "show"
        );

    }
);


/* Initial display */

renderNotifications();
