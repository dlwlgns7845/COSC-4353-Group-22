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

        let typeText;

        if (notification.type === "queue-update") {
            typeText = "Queue Update";
        } else {
            typeText = "Status Change";
        }

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
                notification.read = true;
                renderNotifications();
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
    } else {
        notificationBadge.style.display = "flex";
    }
}


notificationButton.addEventListener(
    "click",
    function () {
        notificationPanel.classList.toggle("show");
    }
);


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


document.addEventListener(
    "click",
    function (event) {

        if (
            !notificationPanel.contains(event.target)
            &&
            !notificationButton.contains(event.target)
        ) {
            notificationPanel.classList.remove("show");
        }
    }
);


renderNotifications();
