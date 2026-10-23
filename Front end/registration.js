
const form = document.getElementById("registrationForm");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateForm(form)) {
        return;
    }

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        const response = await fetch("http://localhost:3000/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fullName,
                email,
                password,
                role
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Registration failed");
            return;
        }

        alert("Registration successful! Please log in.");
        window.location.href = "login.html";

    } catch (error) {
        console.error("Registration error:", error);
        alert("Unable to connect to the server.");
    }
});
