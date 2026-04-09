const express = require("express");
const router = express.Router();

const {
  gameSearch,
  gamesPage,
  trending,
  upcoming,
  recent_release,
  steamAchievements,
} = require("../Controllers/games");

router.get('/search', gameSearch)
router.get('/trending', trending)
router.get('/recent-releases', recent_release)
router.get('/upcoming', upcoming)
router.get('/games/:gameId/achievements', steamAchievements)
router.get('/games/:gameId', gamesPage)

module.exports = router;