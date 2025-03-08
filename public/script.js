let token = localStorage.getItem("token");

// Login function
async function login(username, password) {
    const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        const data = await response.json();
        token = data.token;
        localStorage.setItem("token", token); // Store token in localStorage
        window.location.href = "index.html"; // Redirect to dashboard
    } else {
        alert("Login failed.");
    }
}

// Register function
async function register(username, password) {
    const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        alert("Registration successful. Please login.");
        window.location.href = "login.html"; // Redirect to login page
    } else {
        alert("Registration failed.");
    }
}

// Logout function
function logout() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

// Add transaction
document.getElementById("expense-form")?.addEventListener("submit", async function(event) {
    event.preventDefault();

    const date = document.getElementById("date").value;
    const category = document.getElementById("category").value;
    const type = document.getElementById("type").value;
    const amount = document.getElementById("amount").value;
    const description = document.getElementById("description").value;

    if (!date || !category || !type || !amount) {
        alert("Please fill in all required fields.");
        return;
    }

    const response = await fetch("/add", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": token
        },
        body: JSON.stringify({ date, category, type, amount, description })
    });

    if (response.ok) {
        alert("Transaction added successfully!");
        window.location.href = "index.html"; // Redirect to dashboard
    }
});

// Load all transactions
async function loadAllTransactions() {
    const response = await fetch("/expenses", {
        headers: { "Authorization": token }
    });

    if (response.ok) {
        const transactions = await response.json();
        const list = document.getElementById("all-transactions-list");
        list.innerHTML = "";

        transactions.forEach((exp) => {
            const row = `<tr>
                <td>${new Date(exp.date).toLocaleDateString()}</td>
                <td>${exp.category || "N/A"}</td>
                <td>${exp.type || "N/A"}</td>
                <td>${exp.amount || "N/A"}</td>
                <td>${exp.description || "N/A"}</td>
            </tr>`;
            list.innerHTML += row;
        });
    }
}

// Load balance on dashboard
async function loadBalance() {
    const response = await fetch("/balance", {
        headers: { "Authorization": token }
    });

    if (response.ok) {
        const balanceData = await response.json();
        document.getElementById("total-income").textContent = balanceData.totalIncome;
        document.getElementById("total-expenses").textContent = balanceData.totalExpenses;
        document.getElementById("balance").textContent = balanceData.balance;
    }
}

// Load analytics on top3.html
async function loadAnalytics() {
    const response = await fetch("/analytics", {
        headers: { "Authorization": token }
    });

    if (response.ok) {
        const analyticsData = await response.json();
        const analyticsList = document.getElementById("analytics-list");
        analyticsList.innerHTML = "";

        analyticsData.forEach((item, index) => {
            const row = `<tr>
                <td>${index + 1}</td>
                <td>${item.category}</td>
                <td>${item.total}</td>
            </tr>`;
            analyticsList.innerHTML += row;
        });
    }
}

// Download data as Excel
document.getElementById("download-btn")?.addEventListener("click", async () => {
    const response = await fetch("/download", {
        headers: { "Authorization": token }
    });

    if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "transactions.xlsx";
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
});

// Event listeners for login and registration forms
document.getElementById("login-form")?.addEventListener("submit", async function(event) {
    event.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    await login(username, password);
});

document.getElementById("register-form")?.addEventListener("submit", async function(event) {
    event.preventDefault();
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;
    await register(username, password);
});

// Check if user is logged in
window.onload = function() {
    token = localStorage.getItem("token");
    if (!token && !window.location.href.includes("login.html") && !window.location.href.includes("register.html")) {
        window.location.href = "login.html"; // Redirect to login if not authenticated
    }

    if (window.location.href.includes("index.html")) {
        loadBalance(); // Load balance on dashboard
    } else if (window.location.href.includes("top3.html")) {
        loadAnalytics(); // Load analytics on top3.html
    } else if (window.location.href.includes("all-transactions.html")) {
        loadAllTransactions(); // Load all transactions on all-transactions.html
    }
};