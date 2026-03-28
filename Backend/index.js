require("dotenv").config();
const express = require("express");
const cors = require("cors");
const PORT = process.env.PORT;

const app = express();

const gameRoutes = require("./api/Routes/games");

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/v1", gameRoutes);

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
  console.log(`Server running on port ${PORT}`);
});
