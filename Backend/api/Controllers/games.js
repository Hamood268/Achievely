const { RAWG_GAMES, STEAM } = require("../../Utilities/constants");
const redis = require("../../Utilities/redis");
const {
  fetchAppId,
  resolveCover,
  steamHeroes,
} = require("../../Utilities/covers");

const trending = async (req, res) => {
  try {
    const cacheKey = `trending:games`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const params1 = new URLSearchParams({
      key: process.env.RAWG_KEY,
      ordering: "-metacritic",
      page_size: 30,
      exclude_additions: true,
      stores: 1,
    });
    const params2 = new URLSearchParams({
      key: process.env.RAWG_KEY,
      ordering: "-rating",
      page_size: 30,
      exclude_additions: true,
      stores: 1,
    });

    const [page1Res, page2Res] = await Promise.all([
      fetch(`${RAWG_GAMES.GAMES}?${params1}`),
      fetch(`${RAWG_GAMES.GAMES}?${params2}`),
    ]);

    const [page1Data, page2Data] = await Promise.all([
      page1Res.json(),
      page2Res.json(),
    ]);

    const combined = [...page1Data.results, ...page2Data.results];

    // Deduplicate by game id
    const seen = new Set();
    const unique = combined.filter((game) => {
      if (seen.has(game.id)) return false;
      seen.add(game.id);
      return true;
    });

    const result = {
      code: 200,
      status: "OK",
      count: unique.length,
      total_available: page1Data.count,
      games: await Promise.all(
        unique.map(async (game, i) => ({
          rawgId: game.id,
          name: game.name,
          slug: game.slug,
          cover: await resolveCover(null, game.name, game.background_image),
          screenshots: game.short_screenshots?.map((s) => s.image) ?? [],
        })),
      ),
    };

    await redis.set(cacheKey, result, { ex: 21600 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error while fetching trending games", error);

    return res.status(500).json({
      code: 500,
      status: "INTERNAL SERVER ERROR",
      message:
        "An Error happened while fetching trending games data. Please Try again later...",
    });
  }
};

const upcoming = async (req, res) => {
  try {
    const cacheKey = `upcoming:games`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0];

    const params = new URLSearchParams({
      key: process.env.RAWG_KEY,
      dates: `${formattedDate},2028-01-01`,
      page_size: 30,
      exclude_additions: true,
    });

    const games = await fetch(`${RAWG_GAMES.GAMES}?${params}`);
    const data = await games.json();

    const result = {
      code: 200,
      status: "OK",
      count: data.results.length,
      games: await Promise.all(
        data.results.map(async (game, i) => ({
          rawgId: game.id,
          name: game.name,
          slug: game.slug,
          cover: await resolveCover(null, game.name, game.background_image),
          screenshots: game.short_screenshots?.map((s) => s.image) ?? [],
        })),
      ),
    };

    await redis.set(cacheKey, result, { ex: 21600 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error fetching upcoming", error);

    return res.status(400).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching upcoming games data. Please Try again later...",
    });
  }
};

const recent_release = async (req, res) => {
  try {
    const cacheKey = `recent:games`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0];
    const params = new URLSearchParams({
      key: process.env.RAWG_KEY,
      ordering: "-released",
      dates: `2026-01-01,${formattedDate}`,
      page_size: 30,
      exclude_additions: true,
      stores: 1,
    });

    const recent = await fetch(`${RAWG_GAMES.GAMES}?${params}`);
    const data = await recent.json();

    const result = {
      code: 200,
      status: "OK",
      count: data.results.length,
      games: await Promise.all(
        data.results.map(async (game, i) => ({
          rawgId: game.id,
          name: game.name,
          slug: game.slug,
          cover: await resolveCover(null, game.name, game.background_image),
          screenshots: game.short_screenshots?.map((s) => s.image) ?? [],
        })),
      ),
    };

    await redis.set(cacheKey, result, { ex: 21600 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error fetching recent games", error);

    return res.status(400).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching recently released games data. Please Try again later...",
    });
  }
};

const gamesPage = async (req, res) => {
  try {
    const { gameId } = req.params;

    const cacheKey = `game:${gameId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const params = new URLSearchParams({
      key: process.env.RAWG_KEY,
    });

    if (!gameId) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "gameId is required. please enter gameId",
      });
    }

    const gameRes = await fetch(`${RAWG_GAMES.GAMES}/${gameId}?${params}`);
    let gamesData = await gameRes.json();

    if (!gamesData.id) {
      return res.status(404).json({
        code: 404,
        status: "Not Found",
        message: "Game not found.",
      });
    }

    const result = {
      code: 200,
      status: "OK",
      games: {
        rawgId: gamesData.id,
        name: gamesData.name,
        slug: gamesData.slug,
        description: gamesData.description_raw,
        playtime: gamesData.playtime,
        release_date: gamesData.released,
        latest_update: gamesData.updated,
        rating:
          gamesData.rating != null
            ? parseFloat(gamesData.rating.toFixed(1))
            : null,
        metacritic: gamesData.metacritic,
        cover: await resolveCover(
          null,
          gamesData.name,
          gamesData.background_image,
        ),
        banner: (await steamHeroes(gamesData.name)) || null,
        background_image: gamesData.background_image_additional || null,
        platforms: gamesData.platforms?.map((p) => p.platform.name) ?? [],
        stores: gamesData.stores?.map((p) => p.store.name) ?? [],
        developers: gamesData.developers?.map((d) => d.name) ?? [],
        publishers: gamesData.publishers?.map((d) => d.name) ?? [],
        genres: gamesData.genres?.map((g) => g.name) ?? [],
        tags:
          gamesData.tags
            ?.filter((t) => t.language === "eng")
            .map((t) => t.name) ?? [],
      },
    };

    await redis.set(cacheKey, result, { ex: 86400 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error while fetching game data", error);

    return res.status(400).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching game data. Please Try again later...",
    });
  }
};

const gameSearch = async (req, res) => {
  try {
    const { q } = req.query;

    const cacheKey = `search:${q}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    if (!q) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "A game name is required.",
      });
    }

    const params = new URLSearchParams({
      key: process.env.RAWG_KEY,
      search: q,
      page_size: 15,
    });

    const search = await fetch(`${RAWG_GAMES.GAMES}?${params}`);

    const data = await search.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "Not Found",
        message: "Couldn't find any games matching that name.",
      });
    }

    const result = {
      code: 200,
      status: "OK",
      count: data.results.length,
      games: await Promise.all(
        data.results.map(async (game, i) => ({
          rawgId: game.id,
          name: game.name,
          slug: game.slug,
          cover: await resolveCover(null, game.name, game.background_image),
          screenshots: game.short_screenshots?.map((s) => s.image) ?? [],
        })),
      ),
    };

    await redis.set(cacheKey, result, { ex: 86400 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error fetching steam achievements", error);

    return res.status(500).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching game data. Please Try again later...",
    });
  }
};

const steamAchievements = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { steamId } = req.query;

    const cacheKey = steamId
      ? `achievements:${gameId}:${steamId}`
      : `achievements:${gameId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const rawg_params = new URLSearchParams({
      key: process.env.RAWG_KEY,
    });
    const steam_params = new URLSearchParams({
      key: process.env.STEAM_KEY,
    });
    const steam_params_2 = new URLSearchParams({
      key: process.env.STEAM_KEY,
      language: "english",
    });

    // Getting steam appId via RAWG stores
    const storesRes = await fetch(
      `${RAWG_GAMES.GAMES}/${gameId}/stores?${rawg_params}`,
    );
    const stores = await storesRes.json();

    const steam_appId = stores.results.find((store) => store.store_id == 1);

    if (!steam_appId) {
      return res.status(200).json({
        code: 200,
        status: "OK",
        count: 0,
        steamAppId: null,
        message:
          "This game is not available on Steam. Achievement data unavailable.",
        achievements: [],
      });
    }

    const appId = steam_appId.url?.match(/\/app\/(\d+)/)?.[1] ?? null;

    if (!appId) {
      return res.status(200).json({
        code: 200,
        status: "OK",
        count: 0,
        steamAppId: null,
        message:
          "Could not resolve a Steam App ID for this game. Achievement data unavailable.",
        achievements: [],
      });
    }

    // Fetch schema and global percentages
    const [achievementsRes, percentsRes] = await Promise.all([
      fetch(`${STEAM.ACHIEVEMENTS_2}?${steam_params_2}&appid=${appId}`),
      fetch(`${STEAM.ACHIEVEMENT_PERCENTAGE}?gameid=${appId}`),
    ]);

    const [steamData, percentsData] = await Promise.all([
      achievementsRes.json(),
      percentsRes.json(),
    ]);

    if (!steamData) {
      return res.status(404).json({
        code: 404,
        status: "Not Found",
        message: "No achievement data found for this game on Steam.",
      });
    }

    if (!steamData.response.achievements) {
      return res.status(200).json({
        code: 200,
        status: "OK",
        count: 0,
        message: "This game has no achievements.",
        achievements: [],
      });
    }

    const achievements = steamData.response.achievements;

    // Build global percentage map
    const percentMap = {};
    percentsData.achievementpercentages.achievements.forEach((a) => {
      percentMap[a.name] = a.percent;
    });

    // Fetch player achievements only if steamId was provided
    const playerMap = {};
    const unlocktimeMap = {};

    if (steamId) {
      const playerRes = await fetch(
        `${STEAM.USER_ACHIEVEMENTS}?${steam_params}&steamid=${steamId}&appid=${appId}`,
      );
      const playerData = await playerRes.json();

      if (playerData.playerstats?.achievements) {
        playerData.playerstats.achievements.forEach((a) => {
          playerMap[a.apiname] = a.achieved === 1;
          unlocktimeMap[a.apiname] = a.unlocktime ?? null;
        });
      }
    }

    const result = {
      code: 200,
      status: "OK",
      count: achievements.length,
      hasPlayerData: !!steamId,
      achievements: achievements.map((achievement) => ({
        id: achievement.internal_name,
        name: achievement.localized_name,
        description:
          achievement.localized_desc ||
          "This is a hidden achievement. Description will reveal once unlocked.",
        isHidden: achievement.hidden,
        unlocked_at: steamId
          ? (unlocktimeMap[achievement.internal_name] ?? null)
          : null,
        icon: `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${appId}/${achievement.icon}`,
        iconIncomplete: `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${appId}/${achievement.icon_gray}`,
        completed: steamId
          ? (playerMap[achievement.internal_name] ?? false)
          : null,
        completionPercentage: percentMap[achievement.internal_name] ?? null,
      })),
    };

    await redis.set(cacheKey, result, { ex: 86400 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error while fetching steam achievements", error);

    return res.status(400).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching data. Please Try again later...",
    });
  }
};

module.exports = {
  gameSearch,
  gamesPage,
  trending,
  recent_release,
  upcoming,
  steamAchievements,
};
