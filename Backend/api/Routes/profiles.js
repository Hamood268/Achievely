const express = require("express");
const router = express.Router();

const {
    profiles,
    profile_lastplayed,
    profile_ownedgames
} = require("../Controllers/profiles");

router.get('/users/:steamId/profile', profiles)
router.get('/users/:steamId/games', profile_lastplayed)
router.get('/users/:steamId/games/owned', profile_ownedgames)

module.exports = router;