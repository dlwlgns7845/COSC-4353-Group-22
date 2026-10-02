/* ===========================================================
   QueueSmart - shared navigation bar and notifications

   Every page calls renderNav("page-name", "user" or "admin").
   The menu and the notification bell are written in one place,
   so when we change them we do not edit nine HTML files.
   =========================================================== */

function renderNav(activePage, role) {

  /* the menu links, different for user and for admin */
  const userLinks = [
    { page: "dashboard", label: "Dashboard",    href: "dashboard.html" },
    { page: "join",      label: "Join Queue",   href: "join_queue.html" },
    { page: "status",    label: "Queue Status", href: "queue_status.html" },
    { page: "history",   label: "History",      href: "history.html" }
  ];

  const adminLinks = [
    { page: "admin",    label: "Dashboard",          href: "admin-dashboard.html" },
    { page: "services", label: "Service Management", href: "service-management.html" },
    { page: "queues",   label: "Queue Management",   href: "queue-management.html" }
  ];

  const links = (role === "admin") ? adminLinks : userLinks;

  /* build the HTML text for the links */
  let linksHtml = "";
  links.forEach(function (link) {
    const activeClass = (link.page === activePage) ? "active" : "";
    linksHtml += '<a class="' + activeClass + '" href="' + link.href + '">' + link.label + '</a>';
  });

  /* a link to switch between the two roles, so the demo is easy to show */
  const switchLink = (role === "admin")
    ? '<a href="dashboard.html">User view</a>'
    : '<a href="admin-dashboard.html">Admin view</a>';

  document.getElementById("navbar").innerHTML =
    '<span class="logo">QueueSmart</span>' +
    linksHtml +
    '<span class="spacer"></span>' +
    buildBell() +
    switchLink +
    '<a href="login.html">Log out</a>';

  /* the bell only works after it exists on the page */
  connectBell();
}

/* ===========================================================
   THE NOTIFICATION BELL
   A button with a red count, and a panel that opens below it.
   =========================================================== */

function buildBell() {
  const unread = countUnread();
  const badge = (unread > 0)
    ? '<span class="bell-badge">' + unread + '</span>'
    : '';

  return '' +
    '<div class="bell-wrap">' +
      '<button class="bell-button" id="bellButton" aria-label="Notifications">' +
        '<svg viewBox="0 0 24 24" class="bell-icon" aria-hidden="true">' +
          '<path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>' +
          '<path d="M10 21h4"></path>' +
        '</svg>' +
        badge +
      '</button>' +
      '<div class="bell-panel" id="bellPanel" hidden></div>' +
    '</div>';
}

function connectBell() {
  const button = document.getElementById("bellButton");
  const panel = document.getElementById("bellPanel");

  drawBellPanel();

  /* open and close when the bell is clicked */
  button.addEventListener("click", function (event) {
    event.stopPropagation();
    panel.hidden = !panel.hidden;
  });

  /* close when the user clicks anywhere else on the page */
  document.addEventListener("click", function () {
    panel.hidden = true;
  });

  panel.addEventListener("click", function (event) {
    event.stopPropagation();
  });
}

function drawBellPanel() {
  const list = getNotifications();
  const unread = countUnread();

  let html =
    '<div class="bell-head">' +
      '<div>' +
        '<strong>Notifications</strong>' +
        '<div class="hint">' + unread + ' unread</div>' +
      '</div>' +
      '<button class="link-button" onclick="markAllReadAndRedraw()">Mark all as read</button>' +
    '</div>';

  if (list.length === 0) {
    html += '<p class="empty" style="padding:16px">No notifications yet.</p>';
  }

  list.slice(0, 8).forEach(function (n) {
    const unreadClass = n.read ? "" : " unread";
    const label = (n.type === "status") ? "Status change" : "Queue update";

    html += '<div class="bell-item' + unreadClass + '">' +
              '<span class="badge ' + n.type + '">' + label + '</span>' +
              '<div class="bell-title">' + (n.title || "Queue updated") + '</div>' +
              '<div class="bell-text">' + n.text + '</div>' +
              '<div class="time">' + n.time + '</div>' +
            '</div>';
  });

  document.getElementById("bellPanel").innerHTML = html;
}

function markAllReadAndRedraw() {
  markAllRead();
  drawBellPanel();

  /* the red count on the bell has to disappear too */
  const badge = document.querySelector(".bell-badge");
  if (badge) { badge.remove(); }
}

/* ===========================================================
   A plain notification list, used inside a page card.
   "limit" is optional, for example 3 on the dashboard.
   =========================================================== */

function renderNotifications(elementId, limit) {
  const list = getNotifications().slice(0, limit || 99);
  const box = document.getElementById(elementId);

  if (list.length === 0) {
    box.innerHTML = '<p class="empty">No notifications yet.</p>';
    return;
  }

  let html = "";
  list.forEach(function (n) {
    const label = (n.type === "status") ? "Status change" : "Queue update";
    html += '<div class="notification">' +
              '<span class="badge ' + n.type + '">' + label + '</span> ' +
              '<strong>' + (n.title || "Queue updated") + '</strong>' +
              '<div>' + n.text + '</div>' +
              '<div class="time">' + n.time + '</div>' +
            '</div>';
  });
  box.innerHTML = html;
}
