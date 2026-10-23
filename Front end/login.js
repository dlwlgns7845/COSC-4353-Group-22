
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const adminLink = document.querySelector(
    'a[href="admin-dashboard.html"]'
);

let loginRole = "user";

adminLink.addEventListener("click", (event) => {
    event.preventDefault();

    loginRole = "admin";
    form.requestSubmit();
});


form.addEventListener("submit", async (event) => {
    event.preventDefault();

    
    const selectedRole = loginRole;
    loginRole = "user";

    if (!validateForm(form)) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        const response = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        

        if (!response.ok) {
            alert(data.message || "Invalid email or password");
            return;
        }
        
        if (data.role !== selectedRole) {
            alert("You selected the wrong login type.");
            return;
        }

        if (data.token) {
            localStorage.setItem("token", data.token);
        }

        if (data.role === "admin") {
            window.location.href = "admin-dashboard.html";
        } else if (data.role === "user") {
            window.location.href = "dashboard.html";
        } else {
            alert("Unknown user role.");
        }

    } catch (error) {
        console.error("Login error:", error);
        alert("Unable to connect to the server.");
    }
});

