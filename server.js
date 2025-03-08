const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
const xlsx = require("xlsx");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000; // Use environment variable or fallback to 3000
const SECRET_KEY = "your_secret_key";

// MySQL connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "yourpassword",
    database: "expense_tracker"
});

db.connect(err => {
    if (err) throw err;
    console.log("MySQL connected...");
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Middleware to verify JWT
function authenticateToken(req, res, next) {
    const token = req.headers["authorization"];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// User Registration
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);

    db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], (err, result) => {
        if (err) return res.status(500).send("Error registering user.");
        res.status(201).send("User registered.");
    });
});

// User Login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err || results.length === 0) return res.status(400).send("Invalid username or password.");

        const user = results[0];
        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "1h" });
            res.json({ token });
        } else {
            res.status(400).send("Invalid username or password.");
        }
    });
});

// Add new transaction (protected route)
app.post("/add", authenticateToken, (req, res) => {
    const { date, category, type, amount, description } = req.body;
    const userId = req.user.id;

    // Ensure the date is in the correct format (YYYY-MM-DD)
    const formattedDate = new Date(date).toISOString().split('T')[0];

    db.query("INSERT INTO transactions (user_id, date, category, type, amount, description) VALUES (?, ?, ?, ?, ?, ?)", 
        [userId, formattedDate, category, type, amount, description], (err, result) => {
            if (err) return res.status(500).send("Error adding transaction.");
            res.sendStatus(200);
        });
});

// Get all transactions (protected route)
app.get("/expenses", authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.query("SELECT * FROM transactions WHERE user_id = ?", [userId], (err, results) => {
        if (err) return res.status(500).send("Error fetching transactions.");

        // Format the date for display
        const formattedResults = results.map(transaction => ({
            ...transaction,
            date: new Date(transaction.date).toLocaleDateString() // Format date as per locale
        }));

        res.json(formattedResults);
    });
});

// Delete a transaction (protected route)
app.delete("/delete/:id", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const transactionId = req.params.id;

    db.query("DELETE FROM transactions WHERE id = ? AND user_id = ?", [transactionId, userId], (err, result) => {
        if (err) return res.status(500).send("Error deleting transaction.");
        res.sendStatus(200);
    });
});

// Calculate balance (protected route)
app.get("/balance", authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.query("SELECT type, SUM(amount) as total FROM transactions WHERE user_id = ? GROUP BY type", [userId], (err, results) => {
        if (err) return res.status(500).send("Error calculating balance.");

        let totalIncome = 0;
        let totalExpenses = 0;

        results.forEach(row => {
            if (row.type === "Income") totalIncome += row.total;
            else if (row.type === "Expense") totalExpenses += row.total;
        });

        res.json({ totalIncome, totalExpenses, balance: totalIncome - totalExpenses });
    });
});

// Analytics (protected route)
app.get("/analytics", authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.query("SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'Expense' GROUP BY category ORDER BY total DESC LIMIT 3", [userId], (err, results) => {
        if (err) return res.status(500).send("Error fetching analytics.");
        res.json(results);
    });
});

// Download data as Excel (protected route)
app.get("/download", authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.query("SELECT * FROM transactions WHERE user_id = ?", [userId], (err, results) => {
        if (err) return res.status(500).send("Error fetching data.");

        // Format the date in Excel
        const formattedResults = results.map(transaction => ({
            ...transaction,
            date: new Date(transaction.date).toLocaleDateString() // Format date for Excel
        }));

        const ws = xlsx.utils.json_to_sheet(formattedResults);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Transactions");
        const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", "attachment; filename=transactions.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);
    });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
