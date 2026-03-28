const express = require("express");
const router = express.Router();

const {
  gameSearch,
  gamesPage,
  trending,
  recent_release,
  steamAchievements,
} = require("../Controllers/games");

router.get('/search', gameSearch)
router.get('/trending', trending)
router.get('/recent-releases', recent_release)
router.get('/games/:rawgId/achievements', steamAchievements)
router.get('/games/:rawgId', gamesPage)

module.exports = router;