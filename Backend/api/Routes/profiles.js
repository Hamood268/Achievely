const express = require("express");
const router = express.Router();

const {
    profiles,
    profile_lastplayed
} = require("../Controllers/profiles");

router.get('/users/:steamId/profile', profiles)
router.get('/users/:steamId/games', profile_lastplayed)

module.exports = router;