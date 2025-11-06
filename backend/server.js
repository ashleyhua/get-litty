const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "34.72.102.101",
  user: "root",
  password: "",
  database: "getlitty"
});

db.connect(err => {
  if (err) {
    console.error("Database connection error:", err);
    return;
  }
  console.log("Connected to Google Cloud SQL");
});

// // Example API route
// app.get("/events", (req, res) => {
//   db.query("SELECT * FROM Event LIMIT 20;", (err, results) => {
//     if (err) {
//       res.status(500).json(err);
//       return;
//     }
//     res.json(results);
//   });
// });

// app.listen(5000, () => console.log("Backend server running on http://localhost:5000"));
