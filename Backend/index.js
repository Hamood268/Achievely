require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require('path')
const rateLimit = require('express-rate-limit')

const PORT = process.env.PORT;
const app = express();

const gameRoutes = require("./api/Routes/games");
const profileRoutes = require("./api/Routes/profiles");

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../Frontend')))

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/pages/index.html"));
});

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/pages/profile.html"));
});

app.get("/library", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/pages/library.html"));
});


app.get("/game", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/pages/game.html"));
});

app.get("/achievements", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/pages/achievements.html"));
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    status: 'Too Many Requests',
    message: 'You are sending too many requests. Please slow down and try again later.'
  }
})

app.use('/api/v1', limiter)
app.use("/api/v1", gameRoutes);
app.use("/api/v1", profileRoutes);

// Wrong endpoint handler
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    status: "Not Found",
    message:
      "This endpoint doesn't exist, Visit /api/docs for API documentation.",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    code: 500,
    status: "Internal Server Error",
    message: "Something went wrong",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
