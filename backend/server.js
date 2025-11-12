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
  database: "getlitty",
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect(err => {
  if (err) {
    console.error("Database connection error:", err);
    return;
  }
  console.log("Connected to Google Cloud SQL");
});

/* --------------------------------------------------------
    ENDPOINT #1: Cheapest Airbnb per event (within 1 mile)
   -------------------------------------------------------- */
app.get("/events/cheapest", (req, res) => {
  const query = `
    SELECT e.event_id, e.name AS event_name, c.city_name, c.state,
        MIN(n.total_cost) AS cheapest_total_cost
    FROM Event e
    JOIN Venue v ON e.venue_id = v.venue_id
    JOIN Nearby n ON e.event_id = n.event_id
    JOIN AirbnbListing a ON n.listing_id = a.listing_id
    JOIN City c ON v.city_id = c.city_id
    WHERE n.distance <= 1
    GROUP BY e.event_id, e.name, c.city_name, c.state
    ORDER BY cheapest_total_cost ASC
    LIMIT 15;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* --------------------------------------------------------
    ENDPOINT #2: Cheapest concerts in Illinois
   -------------------------------------------------------- */
app.get("/events/illinois-cheapest", (req, res) => {
  const query = `
    SELECT E.name AS event_name, C.city_name, C.state, E.date,
        MIN(N.total_cost) AS cheapest_total_cost
    FROM Event E
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    JOIN Nearby N ON E.event_id = N.event_id
    WHERE C.state = 'Illinois' 
    GROUP BY E.event_id, C.city_name, C.state, E.date, E.name
    ORDER BY cheapest_total_cost ASC
    LIMIT 15;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* --------------------------------------------------------
    ENDPOINT #3: Recommended Airbnb for events (≤10 miles, available)
   -------------------------------------------------------- */
app.get("/events/recommendations", (req, res) => {
  const query = `
    SELECT E.event_id, E.name AS event_name, C.city_name, C.state,
      A.listing_id, A.price_per_night, N.distance,
      (A.price_per_night + E.ticket_price) AS estimated_total_cost
    FROM Event E
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    JOIN Nearby N ON E.event_id = N.event_id
    JOIN AirbnbListing A ON N.listing_id = A.listing_id
    WHERE N.distance <= 10 
      AND A.availability_365 > 0
    ORDER BY estimated_total_cost ASC
    LIMIT 15;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* --------------------------------------------------------
    ENDPOINT #4: Chicago concerts with below-avg lodging cost
   -------------------------------------------------------- */
app.get("/events/chicago-below-avg", (req, res) => {
  const query = `
    SELECT E.event_id, E.name AS event_name, C.city_name, C.state, E.date,
        MIN(A.price_per_night) AS cheapest_airbnb_price
    FROM Event E
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    JOIN Nearby N ON E.event_id = N.event_id
    JOIN AirbnbListing A ON N.listing_id = A.listing_id
    WHERE C.city_name = 'Chicago'
      AND N.distance <= 1
      AND A.availability_365 > 0
    GROUP BY E.event_id, E.name, C.city_name, C.state, E.date
    HAVING MIN(A.price_per_night) < (
        SELECT AVG(A2.price_per_night) 
        FROM AirbnbListing A2
        JOIN Nearby N2 ON A2.listing_id = N2.listing_id
        JOIN Event E2 ON N2.event_id = E2.event_id
        JOIN Venue V2 ON E2.venue_id = V2.venue_id
        JOIN City C2 ON V2.city_id = C2.city_id
        WHERE C2.city_name = 'Chicago'
          AND N2.distance <= 1
    )
    ORDER BY cheapest_airbnb_price ASC
    LIMIT 15;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Start server
app.listen(5000, () => console.log("Backend server running on http://localhost:5000"));


// | Route                           | What it returns                                |
// | ------------------------------- | ---------------------------------------------- |
// |   GET /events/cheapest          | Cheapest Airbnb per event (within 1 mile)      |
// |   GET /events/illinois-cheapest | Top cheapest concerts in Illinois              |
// |   GET /events/recommendations   | Recommended events + Airbnb with availability  |
// |   GET /events/chicago-below-avg | Chicago concerts with below-avg lodging prices |
