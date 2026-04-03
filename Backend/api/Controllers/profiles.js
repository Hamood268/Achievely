const { STEAM } = require("../../Utilities/constants");
const redis = require("../../Utilities/redis");

const profiles = async (req, res) => {
  try {
    const { steamId } = req.params;

    const cacheKey = `profile:${steamId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);
console.log(`Cache miss: ${cacheKey}`)  // temporary

    if (!steamId) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "A steamId is required.",
      });
    }

    const params = new URLSearchParams({
      key: process.env.STEAM_KEY,
      steamids: steamId,
    });

    const profileRes = await fetch(`${STEAM.PLAYER_DATA}?${params}`);
    const data = await profileRes.json();

    const players = data.response?.players;

    if (!players || players.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "Not Found",
        message: "No profile found for this steamId.",
      });
    }

    const profile = players[0];

    const statusMap = {
      0: "Offline",
      1: "Online",
      2: "Busy",
      3: "Away",
    };

    const result = {
      code: 200,
      status: "OK",
      profile: {
        steamId: profile.steamid,
        username: profile.personaname,
        profileUrl: profile.profileurl,
        avatar: {
          small: profile.avatar,
          medium: profile.avatarmedium,
          full: profile.avatarfull,
          hash: profile.avatarhash,
        },
        status: statusMap[profile.personastate],
        created_at: profile.timecreated || null,
        last_logout: profile.lastlogoff || null,
      },
    };

    await redis.set(cacheKey, result, { ex: 1800 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error fetching steam achievements", error);

    return res.status(500).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching player profile data. Please Try again later...",
    });
  }
};

const profile_lastplayed = async (req, res) => {
  try {
    const { steamId } = req.params;

    const cacheKey = `lastplayed:${steamId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);
console.log(`Cache miss: ${cacheKey}`)  // temporary

    if (!steamId) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "A steamId is required. ",
      });
    }

    const params = new URLSearchParams({
      key: process.env.STEAM_KEY,
      steamid: steamId,
    });

    const recent_gamesRes = await fetch(`${STEAM.RECENTLY_PLAYED}?${params}`);
    const data = await recent_gamesRes.json();
    const recent_games = data.response;

    if (!recent_games.games || recent_games.total_count === 0) {
      return res.status(200).json({
        code: 200,
        status: "OK",
        count: 0,
        profile: { games: [] },
      });
    }

    const result = {
      code: 200,
      status: "OK",
      count: recent_games.total_count,
      profile: {
        games: recent_games.games.map((game) => ({
          gameId: game.appid,
          name: game.name,
          playtime: game.playtime_forever,
          playtime_2weeks: game.playtime_2weeks || 0,
        })),
      },
    };

    await redis.set(cacheKey, result, { ex: 1800 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error fetching steam achievements", error);

    return res.status(500).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching player last played data. Please Try again later...",
    });
  }
};

module.exports = {
  profiles,
  profile_lastplayed,
};
