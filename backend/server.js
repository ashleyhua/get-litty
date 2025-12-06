// Setting up database connection
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
  ssl: { rejectUnauthorized: false },
  multipleStatements: true 
});

db.connect(err => {
  if (err) console.error("Database connection error:", err);
  else console.log("Connected to Google Cloud SQL");
});

// ENDPOINT #0: SURPRISE ME
app.get("/events/random", (req, res) => {
  const query = `
    SELECT 
      E.event_id,
      E.name AS event_name,
      E.date,
      V.venue_name,
      C.city_name,
      C.state
    FROM Event E
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    ORDER BY RAND()
    LIMIT 1;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ENDPOINT #1: Cheapest Airbnb per event within a mile (STORED PROCEDURE USED HERE)
app.get("/events/cheapest", (req, res) => {
  // executes the SQL procedure stored in the database
  db.query("CALL sp_event_airbnb_summary();", (err, results) => {
    if (err) return res.status(500).json(err);
    // results[0] contains tmp_cheapest_airbnb
    res.json(results[0]);
  });
});

// ENDPOINT #2: Cheapest concerts in Illinois
app.get("/events/illinois-cheapest", (req, res) => {
  const query = `
    SELECT 
      E.event_id,
      E.name AS event_name,
      C.city_name,
      C.state,
      E.date,
      MIN(N.total_cost) AS cheapest_total_cost,
      (SELECT N2.listing_id 
       FROM Nearby N2 
       WHERE N2.event_id = E.event_id
       ORDER BY N2.total_cost ASC 
       LIMIT 1) AS listing_id
    FROM Event E
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    JOIN Nearby N ON E.event_id = N.event_id
    WHERE C.state = 'Illinois'
    GROUP BY E.event_id, C.city_name, C.state, E.date, E.name
    ORDER BY cheapest_total_cost ASC
    LIMIT 10;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ENDPOINT #3: Events with most available Airbnb listings within 5 miles (STORED PROCEDURE USED HERE)
app.get("/events/most-availability", (req, res) => {
  db.query("CALL sp_event_airbnb_summary();", (err, results) => {
    if (err) return res.status(500).json(err);
    // results[1] contains tmp_most_available
    res.json(results[1]);
  });
});

// ENDPOINT #4: Chicago concerts with below-avg lodging
app.get("/events/chicago-below-avg", (req, res) => {
  const query = `
    SELECT 
      E.event_id,
      E.name AS event_name,
      C.city_name,
      C.state,
      E.date,
      MIN(A.price_per_night) AS cheapest_airbnb_price,
      (SELECT N2.listing_id 
       FROM Nearby N2 
       JOIN AirbnbListing A2 ON N2.listing_id = A2.listing_id
       WHERE N2.event_id = E.event_id 
         AND N2.distance <= 1 
         AND A2.availability_365 > 0
       ORDER BY A2.price_per_night ASC 
       LIMIT 1) AS listing_id
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
    LIMIT 10;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ENDPOINT #5: Search events with filters (name, date range, maxDistance)
app.get("/events/search", (req, res) => {
  const name = req.query.name;                 
  const startDate = req.query.startDate;       
  const endDate = req.query.endDate;           
  const maxDistance = Number(req.query.maxDistance ?? 10); 

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
      A.latitude AS airbnb_lat,
      A.longitude AS airbnb_lng,
      A.listing_id,
      (A.price_per_night + E.ticket_price) AS estimated_total_cost,
      E.ticket_price
    FROM Event E
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    JOIN Nearby N ON E.event_id = N.event_id
    JOIN AirbnbListing A ON N.listing_id = A.listing_id
    WHERE A.availability_365 > 0
  `;

  const params = [];

  if (name) { query += ` AND E.name LIKE CONCAT('%', ?, '%')`; params.push(name); }
  if (startDate) { query += ` AND E.date >= ?`; params.push(startDate); }
  if (endDate) { query += ` AND E.date <= ?`; params.push(endDate); }
  if (!Number.isNaN(maxDistance)) { query += ` AND N.distance <= ?`; params.push(maxDistance); }

  query += `
    ORDER BY estimated_total_cost ASC, N.distance ASC
    LIMIT 10;
  `;

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// MAP Endpoint 1: GET top listings
app.get("/events/:eventId/top-listings", (req, res) => {
  const eventId = Number(req.params.eventId);
  const maxDistance = Number(req.query.maxDistance ?? 200);
  
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
      AND N.distance <= ?
    ORDER BY N.total_cost ASC
    LIMIT 5;
  `;

  db.query(query, [eventId, maxDistance], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});


// WantsToAttend Endpoint 1: Add event to user's want-to-attend list (TRIGGER USED HERE)
app.post("/user/events", (req, res) => {
  const { userId, eventId } = req.body;

  if (!userId || !eventId) {
    return res.status(400).json({ error: "userId and eventId are required" });
  }

  const query = `INSERT INTO WantsToAttend (user_id, event_id) VALUES (?, ?)`;
  db.query(query, [userId, eventId], (err, result) => {
    if (err) {
      if (err.sqlMessage && err.sqlMessage.includes('already have an event')) {
        return res.status(409).json({ error: "You already have an event scheduled on this date" });
      }
      console.error("Error adding event:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ message: "Event added successfully", eventId });
  });
});

// WantsToAttend Endpoint 2: Get all events user wants to attend
app.get("/user/:userId/events", (req, res) => {
  const userId = req.params.userId;
  
  const query = `
    SELECT 
      E.event_id,
      E.name AS event_name,
      E.date,
      V.venue_name,
      C.city_name,
      C.state,
      E.ticket_price,
      W.Housing_Confirmed
    FROM WantsToAttend W
    JOIN Event E ON W.event_id = E.event_id
    JOIN Venue V ON E.venue_id = V.venue_id
    JOIN City C ON V.city_id = C.city_id
    WHERE W.user_id = ?
    ORDER BY E.date ASC;
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching user events:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// WantsToAttend Endpoint 3: Remove event from user's want-to-attend list
app.delete("/user/events", (req, res) => {
  const { userId, eventId } = req.body;
  
  if (!userId || !eventId) {
    return res.status(400).json({ error: "userId and eventId are required" });
  }

  const query = `DELETE FROM WantsToAttend WHERE user_id = ? AND event_id = ?`;
  
  db.query(query, [userId, eventId], (err, result) => {
    if (err) {
      console.error("Error removing event:", err);
      return res.status(500).json({ error: "Database error" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Event not found in your list" });
    }
    
    res.json({ message: "Event removed successfully", eventId });
  });
});

// WantsToAttend Endpoint 4: Update housing confirmation status
app.put("/user/events/housing", (req, res) => {
  const { userId, eventId, housingConfirmed } = req.body;
  
  if (!userId || !eventId || !housingConfirmed) {
    return res.status(400).json({ error: "userId, eventId, and housingConfirmed are required" });
  }

  if (housingConfirmed !== 'Y' && housingConfirmed !== 'N') {
    return res.status(400).json({ error: "housingConfirmed must be 'Y' or 'N'" });
  }

  const query = `
    UPDATE WantsToAttend 
    SET Housing_Confirmed = ? 
    WHERE user_id = ? AND event_id = ?
  `;
  
  db.query(query, [housingConfirmed, userId, eventId], (err, result) => {
    if (err) {
      console.error("Error updating housing status:", err);
      return res.status(500).json({ error: "Database error" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Event not found in your list" });
    }
    
    const status = housingConfirmed === 'Y' ? 'confirmed' : 'not confirmed';
    res.json({ 
      message: `Housing status updated to ${status}`,
      eventId,
      housingConfirmed 
    });
  });
});

// WantsToAttend Endpoint 5: Add 5 upcoming events from a city (TRANSACTION USED HERE)
app.post("/user/events/bulk-add-city", (req, res) => {
  const { userId, cityName } = req.body;

  if (!userId || !cityName) {
    return res.status(400).json({ error: "userId and cityName are required" });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error("Transaction start error:", err);
      return res.status(500).json({ error: "Transaction error" });
    }

    // Advanced Query #1: Find soonest 5 events in the city
    const findEventsQuery = `
      SELECT E.event_id, E.name, E.date
      FROM Event E
      JOIN Venue V ON E.venue_id = V.venue_id
      JOIN City C ON V.city_id = C.city_id
      WHERE C.city_name = ?
        AND E.date >= CURDATE()
      ORDER BY E.date ASC
      LIMIT 5
    `;

    db.query(findEventsQuery, [cityName], (err, events) => {
      if (err) {
        console.error("Find events error:", err);
        return db.rollback(() => res.status(500).json({ error: "Query error" }));
      }

      if (events.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ error: "No upcoming events found in that city" });
        });
      }

      // Advanced Query #2: Get all dates user already has events on AND existing event IDs
      const existingDataQuery = `
        SELECT 
          E.event_id,
          E.date, 
          COUNT(*) as event_count
        FROM WantsToAttend W
        JOIN Event E ON W.event_id = E.event_id
        WHERE W.user_id = ?
        GROUP BY E.event_id, E.date
      `;

      db.query(existingDataQuery, [userId], (err, existingData) => {
        if (err) {
          console.error("Existing data error:", err);
          return db.rollback(() => res.status(500).json({ error: "Conflict check failed" }));
        }

        const conflictDates = new Set(
          existingData.map(d => new Date(d.date).toISOString().split('T')[0])
        );
        const existingEventIds = new Set(
          existingData.map(d => d.event_id)
        );

        const eventsToAdd = [];
        const skippedEvents = [];

        events.forEach(e => {
          const eventDate = new Date(e.date).toISOString().split('T')[0];
          
          if (existingEventIds.has(e.event_id)) {
            skippedEvents.push({
              name: e.name,
              date: eventDate,
              reason: "Already in your list"
            });
          } else if (conflictDates.has(eventDate)) {
            skippedEvents.push({
              name: e.name,
              date: eventDate,
              reason: "Date conflict"
            });
          } else {
            eventsToAdd.push(e);
          }
        });

        if (eventsToAdd.length === 0) {
          return db.rollback(() => {
            res.status(409).json({ 
              error: "All 5 soonest events are either already in your list or conflict with your existing schedule",
              skippedEvents: skippedEvents
            });
          });
        }

        const values = eventsToAdd.map(e => `(${userId}, ${e.event_id})`).join(',');
        const insertQuery = `INSERT IGNORE INTO WantsToAttend (user_id, event_id) VALUES ${values}`;

        db.query(insertQuery, (err, result) => {
          if (err) {
            console.error("Insert error:", err);
            return db.rollback(() => res.status(500).json({ error: "Insert failed", details: err.message }));
          }

          db.commit(commitErr => {
            if (commitErr) {
              console.error("Commit error:", commitErr);
              return db.rollback(() => res.status(500).json({ error: "Commit error" }));
            }

            res.json({ 
              message: "Events added successfully",
              addedCount: eventsToAdd.length,
              skippedCount: skippedEvents.length,
              addedEvents: eventsToAdd.map(e => ({
                event_id: e.event_id,
                name: e.name,
                date: new Date(e.date).toISOString().split('T')[0]
              })),
              skippedEvents: skippedEvents
            });
          });
        });
      });
    });
  });
});

app.listen(5000, () => console.log("backend running on http://localhost:5000"));