const { RAWG_GAMES, STEAM } = require("../../Utilities/constants");
const redis = require("../../Utilities/redis");
const {
  fetchAppId,
  resolveCover,
  steamHeroes,
} = require("../../Utilities/covers");
const { mapWithConcurrency } = require("../../Utilities/concurrency");


const COVER_RESOLUTION_CONCURRENCY = 8;
const DLC_FETCH_CONCURRENCY = 6;
const MIN_SEARCH_QUERY_LENGTH = 2;

const PRICE_CACHE_TTL = 1800; // 30 minutes

const CALENDAR_MAX_MONTHS_AHEAD = 12;


async function fetchAllRawgResults(baseParams, maxPages = 3) {
  let page = 1;
  let allResults = [];
  let truncated = false;

  while (page <= maxPages) {
    const pageParams = new URLSearchParams(baseParams);
    pageParams.set("page", String(page));

    const res = await fetch(`${RAWG_GAMES.GAMES}?${pageParams}`);
    const data = await res.json();

    if (!data.results || data.results.length === 0) break;
    allResults = allResults.concat(data.results);

    if (!data.next) break;

    if (page === maxPages) {
      truncated = true;
    }
    page += 1;
  }

  return { results: allResults, truncated };
}


async function resolveGameCover(game) {
  const appId = await fetchAppId(game.id);
  const validAppId = typeof appId === "string" ? appId : null;
  return resolveCover(validAppId, game.name, game.background_image);
}

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

      total_available: (page1Data.count ?? 0) + (page2Data.count ?? 0),
      games: await mapWithConcurrency(
        unique,
        COVER_RESOLUTION_CONCURRENCY,
        async (game) => ({
          rawgId: game.id,
          name: game.name,
          slug: game.slug,
          cover: await resolveGameCover(game),
        }),
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
    const { month, year } = req.query;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // ── Legacy mode (no month/year given)
    if (!month && !year) {
      const cacheKey = `upcoming:games`;

      const cached = await redis.get(cacheKey);
      if (cached) return res.status(200).json(cached);

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split("T")[0];
      const endDate = `${currentYear}-12-31`;

      const params = new URLSearchParams({
        key: process.env.RAWG_KEY,
        dates: `${startDate},${endDate}`,
        page_size: 30,
        exclude_additions: true,
      });

      const games = await fetch(`${RAWG_GAMES.GAMES}?${params}`);
      const data = await games.json();

      const result = {
        code: 200,
        status: "OK",
        count: data.results.length,
        games: await mapWithConcurrency(
          data.results,
          COVER_RESOLUTION_CONCURRENCY,
          async (game) => ({
            rawgId: game.id,
            name: game.name,
            slug: game.slug,
            released: game.released,
            cover: await resolveGameCover(game),
          }),
        ),
      };

      await redis.set(cacheKey, result, { ex: 21600 });
      return res.status(200).json(result);
    }

    // ── Calendar mode: a specific month/year is requested ──
    const targetMonth = parseInt(month, 10);
    const targetYear = parseInt(year, 10);

    if (
      !Number.isInteger(targetMonth) ||
      !Number.isInteger(targetYear) ||
      targetMonth < 1 ||
      targetMonth > 12
    ) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "A valid month (1-12) and year are required.",
      });
    }

    // Don't allow browsing months before the current one
    if (
      targetYear < currentYear ||
      (targetYear === currentYear && targetMonth < currentMonth)
    ) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "Cannot fetch upcoming games for a past month.",
      });
    }

    // Don't allow browsing too far ahead. A rolling window from *today*
    // (rather than a fixed calendar year)
    const maxDate = new Date(
      Date.UTC(currentYear, currentMonth - 1 + CALENDAR_MAX_MONTHS_AHEAD, 1),
    );
    const requestedDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));

    if (requestedDate > maxDate) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: `Cannot fetch upcoming games more than ${CALENDAR_MAX_MONTHS_AHEAD} months ahead.`,
      });
    }

    const cacheKey = `upcoming:calendar:${targetYear}-${targetMonth}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(targetYear, targetMonth, 0));

    // Always fetch the full month
    const startDate = monthStart.toISOString().split("T")[0];
    const endDate = monthEnd.toISOString().split("T")[0];

    const params = new URLSearchParams({
      key: process.env.RAWG_KEY,
      dates: `${startDate},${endDate}`,
      page_size: 40,
      ordering: "released",
    });

    // Up to 3 pages (120 games) — plenty for even a stacked release month,
    // `truncated` tells the frontend if a month actually had more.
    const { results, truncated } = await fetchAllRawgResults(params, 3);

    const result = {
      code: 200,
      status: "OK",
      month: targetMonth,
      year: targetYear,
      count: results.length,
      truncated,
      games: await mapWithConcurrency(
        results,
        COVER_RESOLUTION_CONCURRENCY,
        async (game) => ({
          rawgId: game.id,
          name: game.name,
          slug: game.slug,
          released: game.released,
          platforms:
            game.parent_platforms?.map((p) => p.platform.name) ?? [],
          cover: await resolveGameCover(game),
        }),
      ),
    };

    await redis.set(cacheKey, result, { ex: 21600 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error fetching upcoming", error);

    return res.status(500).json({
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

    const startDate = `${currentDate.getFullYear()}-01-01`;

    const params = new URLSearchParams({
      key: process.env.RAWG_KEY,
      ordering: "-released",
      dates: `${startDate},${formattedDate}`,
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
      games: await mapWithConcurrency(
        data.results,
        COVER_RESOLUTION_CONCURRENCY,
        async (game) => ({
          rawgId: game.id,
          name: game.name,
          slug: game.slug,
          cover: await resolveGameCover(game),
        }),
      ),
    };

    await redis.set(cacheKey, result, { ex: 21600 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error fetching recent games", error);

    return res.status(500).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching recently released games data. Please Try again later...",
    });
  }
};

// Builds the price field from raw Steam store data. Defensive against
// missing/malformed sub-package data:

function buildPrice(steamStore) {
  if (!steamStore) return null;
  if (steamStore.is_free) return "Free";

  if (steamStore.price_overview) {
    const po = steamStore.price_overview;
    const subs = steamStore.package_groups?.[0]?.subs ?? [];

    const editions = subs
      .filter((pkg) => pkg && typeof pkg.option_text === "string")
      .map((pkg) => ({
        name: pkg.option_text.replace(/<[^>]*>/g, "").trim(),
        price:
          typeof pkg.price_in_cents_with_discount === "number"
            ? (pkg.price_in_cents_with_discount / 100).toFixed(2)
            : null,
      }));

    return {
      current: po.final_formatted,
      original: po.initial_formatted,
      discount: po.discount_percent,
      onSale: po.discount_percent > 0,
      editions,
    };
  }

  if (steamStore.release_date?.coming_soon) return "Coming Soon";

  return null;
}

// Resolves price with its own short-TTL cache, independent of the main
// game-page cache. Only used on the game-page cache-HIT path, where we
// don't already have steamStore in memory - on a cache MISS, the caller
// already has steamStore from the full fetch and calls buildPrice directly.
async function getGamePrice(gameId, appId) {
  const priceCacheKey = `price:${gameId}`;
  const cachedPrice = await redis.get(priceCacheKey);
  if (cachedPrice !== null && cachedPrice !== undefined) return cachedPrice;

  let steamStore = null;
  if (appId) {
    try {
      const storeRes = await fetch(
        `${STEAM.APP_DETAILS}?appids=${appId}&cc=us`,
      );
      const storeData = await storeRes.json();
      steamStore = storeData[appId]?.data ?? null;
    } catch (error) {
      console.log("Steam Storefront price fetch failed:", error.message);
    }
  }

  const price = buildPrice(steamStore);
  await redis.set(priceCacheKey, price, { ex: PRICE_CACHE_TTL });
  return price;
}

const gamesPage = async (req, res) => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "gameId is required. please enter gameId",
      });
    }

    const cacheKey = `game:${gameId}`;

    const cached = await redis.get(cacheKey);
    if (cached) {

      const price = await getGamePrice(gameId, cached.games?.steamId ?? null);
      return res.status(200).json({
        ...cached,
        games: { ...cached.games, price },
      });
    }

    const params = new URLSearchParams({
      key: process.env.RAWG_KEY,
    });

    const gameRes = await fetch(`${RAWG_GAMES.GAMES}/${gameId}?${params}`);
    let gamesData = await gameRes.json();

    if (!gamesData.id) {
      return res.status(404).json({
        code: 404,
        status: "Not Found",
        message: "Game not found.",
      });
    }

    const appId = await fetchAppId(gameId);
    const isValidAppId = typeof appId === "string" ? appId : null;

    let steamStore = null;
    let steamDLCs = null;
    if (isValidAppId) {
      try {
        const storeRes = await fetch(
          `${STEAM.APP_DETAILS}?appids=${appId}&cc=us`,
        );
        const storeData = await storeRes.json();
        steamStore = storeData[isValidAppId]?.data ?? null;
      } catch (error) {
        console.log("Steam Storefront fetch failed:", error.message);
      }
    }

    if (isValidAppId && steamStore?.dlc?.length) {
      // Fetch all DLC entries in parallel (bounded) instead of one at a time
      const dlcResults = await mapWithConcurrency(
        steamStore.dlc,
        DLC_FETCH_CONCURRENCY,
        async (id) => {
          try {
            const DLCRes = await fetch(
              `${STEAM.APP_DETAILS}?appids=${id}&cc=us`,
            );
            const dlcJson = await DLCRes.json();
            const data = dlcJson[id]?.data ?? null;
            if (!data) return null;

            return {
              name: data.name,
              description: data.short_description,
              image: data.header_image,
              price: data?.price_overview
                ? {
                    current: data.price_overview.final_formatted,
                    original: data.price_overview.initial_formatted,
                    discount: data.price_overview.discount_percent,
                    onSale: data.price_overview.discount_percent > 0,
                  }
                : [],
            };
          } catch (error) {
            console.log(
              `Steam Storefront DLC fetch failed for ${id}:`,
              error.message,
            );
            return null;
          }
        },
      );

      steamDLCs = dlcResults.filter(Boolean);
    } else if (isValidAppId) {
      steamDLCs = [];
    }

    const price = buildPrice(steamStore);
    await redis.set(`price:${gameId}`, price, { ex: PRICE_CACHE_TTL });

    const result = {
      code: 200,
      status: "OK",
      games: {
        rawgId: gamesData.id,
        steamId: isValidAppId || null,
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
        metacritic: steamStore?.metacritic?.score || gamesData.metacritic,
        cover: await resolveCover(
          isValidAppId,
          gamesData.name,
          gamesData.background_image,
        ),
        banner: (await steamHeroes(appId, gamesData.name)) || null,
        background_image: gamesData.background_image_additional || null,
        screenshots:
          steamStore?.screenshots?.map((s) => s.path_full) ??
          gamesData.screenshots?.map((s) => s.image) ??
          [],
        price,
        DLC: steamDLCs,
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

    // Fixed: this previously returned status 400 with a body claiming
    // code 500 - the HTTP status now actually matches the error.
    return res.status(500).json({
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

    if (!q || !q.trim()) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "A game name is required.",
      });
    }

    // Normalize to become case insensitive 
    const normalizedQuery = q.trim().toLowerCase();


    if (normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
      return res.status(200).json({
        code: 200,
        status: "OK",
        count: 0,
        games: [],
        message: `Type at least ${MIN_SEARCH_QUERY_LENGTH} characters to search.`,
      });
    }

    const cacheKey = `search:${normalizedQuery}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const params = new URLSearchParams({
      key: process.env.RAWG_KEY,
      search: normalizedQuery,
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
  games: await mapWithConcurrency(
    data.results,
    COVER_RESOLUTION_CONCURRENCY,
    async (game) => ({
      rawgId: game.id,
      name: game.name,
      slug: game.slug,
      cover: await resolveGameCover(game),
    }),
  ),
};

    await redis.set(cacheKey, result, { ex: 86400 });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error while searching games", error);

    return res.status(500).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching game data. Please Try again later...",
    });
  }
};

// Shared logic for both achievement endpoints
async function buildAchievementsPayload(appId, steamId) {
  const steam_params = new URLSearchParams({
    key: process.env.STEAM_KEY,
  });
  const steam_params_2 = new URLSearchParams({
    key: process.env.STEAM_KEY,
    language: "english",
  });

  const [achievementsRes, percentsRes] = await Promise.all([
    fetch(`${STEAM.ACHIEVEMENTS_2}?${steam_params_2}&appid=${appId}`),
    fetch(`${STEAM.ACHIEVEMENT_PERCENTAGE}?gameid=${appId}`),
  ]);

  const [steamData, percentsData] = await Promise.all([
    achievementsRes.json(),
    percentsRes.json(),
  ]);

  if (!steamData) {
    return {
      status: 404,
      body: {
        code: 404,
        status: "Not Found",
        message: "No achievement data found for this game on Steam.",
      },
    };
  }

  if (!steamData.response.achievements) {
    return {
      status: 200,
      body: {
        code: 200,
        status: "OK",
        count: 0,
        message: "This game has no achievements.",
        achievements: [],
      },
    };
  }

  const achievements = steamData.response.achievements;

  const percentMap = {};
  percentsData.achievementpercentages.achievements.forEach((a) => {
    percentMap[a.name] = a.percent;
  });

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

  return {
    status: 200,
    body: {
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
    },
  };
}

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

    const { status, body } = await buildAchievementsPayload(appId, steamId);

    if (status === 200) {
      await redis.set(cacheKey, body, { ex: 86400 });
    }
    return res.status(status).json(body);
  } catch (error) {
    console.log("Error while fetching steam achievements", error);

    return res.status(500).json({
      code: 500,
      status: "Internal Server Error",
      message:
        "An Error happened while fetching data. Please Try again later...",
    });
  }
};

const achievementsByAppId = async (req, res) => {
  try {
    const { appId } = req.params;
    const { steamId } = req.query;

    const cacheKey = steamId
      ? `achievements:${appId}:${steamId}`
      : `achievements:${appId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const { status, body } = await buildAchievementsPayload(appId, steamId);

    if (status === 200) {
      await redis.set(cacheKey, body, { ex: 86400 });
    }
    return res.status(status).json(body);
  } catch (error) {
    console.log("Error while fetching steam achievements", error);

    return res.status(500).json({
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
  achievementsByAppId,
};