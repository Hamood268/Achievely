const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { getBanner, updateBanner, verifyAdminKey } = require("../Controllers/banner");

// Tighter limiter for anything that checks the admin key — this is an
// open-source repo, so the exact comparison logic is public. Keeping the
// attempt budget small (per IP) makes brute-forcing the key impractical
// without punishing normal site traffic on the public GET route.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    status: "Too Many Requests",
    message: "Too many attempts. Please wait before trying again.",
  },
});

router.get("/banner", getBanner);
router.get("/banner/verify", adminLimiter, verifyAdminKey);
router.post("/banner", adminLimiter, updateBanner);

module.exports = router;
