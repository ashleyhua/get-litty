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
  ssl: { rejectUnauthorized: false }
});

db.connect(err => {
  if (err) console.error("Database connection error:", err);
  else console.log("Connected to Google Cloud SQL");
});

// ENDPOINT #0: Recommended events (<= 10 miles, available) -- SURPIRSE ME
app.get("/events/recommendations", (req, res) => {
  const query = `
    SELECT 
      E.event_id,
      E.name AS event_name,
      E.date,
      V.venue_name,
      C.city_name,
      C.state,
      N.distance,
      A.price_per_night AS avg_airbnb, 
      (A.price_per_night + E.ticket_price) AS estimated_total_cost,
      E.ticket_price
    FROM Event E
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    JOIN Nearby N ON E.event_id = N.event_id
    JOIN AirbnbListing A ON N.listing_id = A.listing_id
    WHERE N.distance <= 10
      AND A.availability_365 > 0
    ORDER BY estimated_total_cost ASC
    LIMIT 50;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ENDPOINT #1: Cheapest Airbnb per event (≤1 mile)
app.get("/events/cheapest", (req, res) => {
  const query = `
    SELECT 
      E.event_id,
      E.name AS event_name,
      E.date,
      V.venue_name,
      C.city_name,
      C.state,
      1 AS distance,
      A.price_per_night AS avg_airbnb,
      MIN(N.total_cost) AS cheapest_total_cost,
      E.ticket_price
    FROM Event E
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    JOIN Nearby N ON E.event_id = N.event_id
    JOIN AirbnbListing A ON N.listing_id = A.listing_id
    WHERE N.distance <= 1
    GROUP BY 
      E.event_id, E.name, E.date, V.venue_name, 
      C.city_name, C.state, A.price_per_night, E.ticket_price
    ORDER BY cheapest_total_cost ASC
    LIMIT 25;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ENDPOINT #2: Cheapest concerts in Illinois
app.get("/events/illinois-cheapest", (req, res) => {
  const query = `
    SELECT 
      E.event_id,
      E.name AS event_name,
      E.date,
      V.venue_name,
      C.city_name,
      C.state,
      MIN(N.distance) AS distance,
      MIN(A.price_per_night) AS avg_airbnb,
      MIN(N.total_cost) AS cheapest_total_cost,
      E.ticket_price
    FROM Event E
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    JOIN Nearby N ON E.event_id = N.event_id
    JOIN AirbnbListing A ON N.listing_id = A.listing_id
    WHERE C.state = 'IL'
    GROUP BY 
      E.event_id, E.name, E.date, V.venue_name,
      C.city_name, C.state, E.ticket_price
    ORDER BY cheapest_total_cost ASC
    LIMIT 25;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ENDPOINT #3: Events with most available Airbnb listings (within 5 miles)
app.get("/events/most-availability", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
          E.event_id, 
          E.name AS event_name, 
          C.city_name, 
          C.state, 
          COUNT(A.listing_id) AS num_available_listings, 
          ROUND(AVG(A.price_per_night), 2) AS avg_price_per_night, 
          MIN(N.distance) AS closest_listing_distance
        FROM Event E
        JOIN Venue V ON E.venue_id = V.venue_id
        JOIN City C ON V.city_id = C.city_id
        JOIN Nearby N ON E.event_id = N.event_id
        JOIN AirbnbListing A ON N.listing_id = A.listing_id
        WHERE N.distance <= 5 
          AND A.availability_365 > 0
        GROUP BY 
          E.event_id, 
          E.name, 
          C.city_name, 
          C.state
        ORDER BY 
          num_available_listings DESC, 
          avg_price_per_night ASC
        LIMIT 15;`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching most availability events:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// ENDPOINT #4: Chicago concerts with below-avg lodging
app.get("/events/chicago-below-avg", (req, res) => {
  const query = `
    SELECT 
      E.event_id,
      E.name AS event_name,
      E.date,
      V.venue_name,
      C.city_name,
      C.state,
      MIN(N.distance) AS distance,
      MIN(A.price_per_night) AS avg_airbnb,
      MIN(A.price_per_night + E.ticket_price) AS estimated_total_cost,
      E.ticket_price
    FROM Event E
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    JOIN Nearby N ON E.event_id = N.event_id
    JOIN AirbnbListing A ON N.listing_id = A.listing_id
    WHERE C.city_name = 'Chicago'
      AND N.distance <= 1
      AND A.availability_365 > 0
    GROUP BY 
      E.event_id, E.name, E.date, V.venue_name,
      C.city_name, C.state, E.ticket_price
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
    ORDER BY estimated_total_cost ASC
    LIMIT 25;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ENDPOINT #5: Search events with filters (name, date range, maxDistance)
// Returns same fields as /events/recommendations but filtered by user inputs
app.get("/events/search", (req, res) => {
  const name = req.query.name;                 // optional partial event name
  const startDate = req.query.startDate;       // optional YYYY-MM-DD
  const endDate = req.query.endDate;           // optional YYYY-MM-DD
  const maxDistance = Number(req.query.maxDistance ?? 10); // default 10 miles

  // Base query (same selected fields as recommendations)
  let query = `
    SELECT 
      E.event_id,
      E.name AS event_name,
      E.date,
      V.venue_name,
      V.latitude AS venue_lat,    
       V.longitude AS venue_lng,
      C.city_name,
      C.state,
      N.distance,
      A.price_per_night AS avg_airbnb, 
      (A.price_per_night + E.ticket_price) AS estimated_total_cost,
      E.ticket_price
    FROM Event E
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    JOIN Nearby N ON E.event_id = N.event_id
    JOIN AirbnbListing A ON N.listing_id = A.listing_id
    WHERE A.availability_365 > 0
  `;

  // Params array for parameterized query
  const params = [];

  // Add optional filters
  if (name) {
    query += ` AND E.name LIKE CONCAT('%', ?, '%')`;
    params.push(name);
  }

  if (startDate) {
    query += ` AND E.date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND E.date <= ?`;
    params.push(endDate);
  }

  if (!Number.isNaN(maxDistance)) {
    query += ` AND N.distance <= ?`;
    params.push(maxDistance);
  }

  query += `
    ORDER BY estimated_total_cost ASC
    LIMIT 10;
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error in /events/search:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// GET /events/:eventId/top-listings (MAP)
app.get("/events/:eventId/top-listings", (req, res) => {
  const eventId = Number(req.params.eventId);
  if (!Number.isFinite(eventId)) return res.status(400).json({ error: "Invalid event id" });

  const query = `
    SELECT 
      N.listing_id,
      A.latitude,
      A.longitude,
      A.price_per_night,
      N.distance,
      N.total_cost
    FROM Nearby N
    JOIN AirbnbListing A ON N.listing_id = A.listing_id
    WHERE N.event_id = ?
      AND A.availability_365 > 0
    ORDER BY N.total_cost ASC
    LIMIT 5;
  `;

  db.query(query, [eventId], (err, results) => {
    if (err) {
      console.error("Error fetching top listings:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});



app.listen(5000, () => console.log("backend running on http://localhost:5000"));
