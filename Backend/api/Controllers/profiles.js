const { STEAM } = require("../../Utilities/constants");
const redis = require("../../Utilities/redis");
const { resolveCover } = require("../../Utilities/covers");
const { mapWithConcurrency } = require("../../Utilities/concurrency");

const COVER_RESOLUTION_CONCURRENCY = 8;
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 50;

const profiles = async (req, res) => {
  try {
    const { steamId } = req.params;

    if (!steamId) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "A steamId is required.",
      });
    }

    const cacheKey = `profile:${steamId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);

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
    console.log("Error fetching profile data", error);

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

    if (!steamId) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "A steamId is required. ",
      });
    }

    const cacheKey = `lastplayed:${steamId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);

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

    const games = await mapWithConcurrency(
      recent_games.games,
      COVER_RESOLUTION_CONCURRENCY,
      async (game) => {
        // Achievements and cover are independent - fetch them together
        const [achieveData, cover] = await Promise.all([
          fetch(
            `${STEAM.USER_ACHIEVEMENTS}?key=${process.env.STEAM_KEY}&steamid=${steamId}&appid=${game.appid}`,
          ).then((r) => r.json()),
          resolveCover(String(game.appid), game.name, null),
        ]);

        const achievements = achieveData.playerstats?.achievements ?? [];
        const total = achievements.length;
        const completed = achievements.filter(
          (a) => a.achieved === 1,
        ).length;
        const percentage =
          total > 0 ? Math.round((completed / total) * 100) : null;

        return {
          gameId: game.appid,
          name: game.name,
          cover,
          playtime: game.playtime_forever,
          playtime_2weeks: game.playtime_2weeks || 0,
          achievements: {
            completed,
            total,
            percentage,
          },
        };
      },
    );

    const result = {
      code: 200,
      status: "OK",
      count: recent_games.total_count,
      profile: { games },
    };

    await redis.set(cacheKey, result, { ex: 1800 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error fetching player lastplayed", error);

    return res.status(500).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching player last played data. Please Try again later...",
    });
  }
};

const profile_ownedgames = async (req, res) => {
  try {
    const { steamId } = req.params;

    if (!steamId) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "A steamId is required. ",
      });
    }

    let page = parseInt(req.query.page, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;

    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_PAGE_SIZE;
    limit = Math.min(limit, MAX_PAGE_SIZE);


    const cacheKey = `ownedGames:raw:${steamId}`;
    let sortedGames = await redis.get(cacheKey);

    if (!sortedGames) {
      const params = new URLSearchParams({
        key: process.env.STEAM_KEY,
        steamid: steamId,
        include_appinfo: 1,
        include_played_free_games: 1,
      });

      const owned_gamesRes = await fetch(`${STEAM.OWNED_GAMES}?${params}`);
      const data = await owned_gamesRes.json();
      const owned_games = data.response;

      if (!owned_games.games || owned_games.game_count === 0) {
        return res.status(200).json({
          code: 200,
          status: "OK",
          count: 0,
          totalPlaytimeMinutes: 0,
          page,
          limit,
          totalPages: 0,
          profile: { games: [] },
        });
      }

      sortedGames = [...owned_games.games].sort(
        (a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0),
      );

      await redis.set(cacheKey, sortedGames, { ex: 1800 });
    }

    const totalCount = sortedGames.length;
    // Summed across the FULL library (sortedGames), not just the current
    // page - this is what the profile page's "Total Playtime" stat needs.
    const totalPlaytimeMinutes = sortedGames.reduce(
      (sum, g) => sum + (g.playtime_forever || 0),
      0,
    );
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startIndex = (page - 1) * limit;
    const pageGames = sortedGames.slice(startIndex, startIndex + limit);

    const games = await mapWithConcurrency(
      pageGames,
      COVER_RESOLUTION_CONCURRENCY,
      async (game) => ({
        gameId: game.appid,
        name: game.name,
        cover: await resolveCover(String(game.appid), game.name, null),
        playtime: game.playtime_forever,
        playtime_2weeks: game.playtime_2weeks || 0,
        last_played: game.rtime_last_played || null,
      }),
    );

    const result = {
      code: 200,
      status: "OK",
      count: totalCount,
      totalPlaytimeMinutes,
      page,
      limit,
      totalPages,
      profile: { games },
    };

    return res.status(200).json(result);
  } catch (error) {
    console.log("Error fetching player owned games", error);

    return res.status(500).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching player owned games data. Please Try again later...",
    });
  }
};

module.exports = {
  profiles,
  profile_lastplayed,
  profile_ownedgames,
};