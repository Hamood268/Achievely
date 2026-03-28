module.exports = {
    // RAWG Endpoints
    RAWG_MENU: {
        'Upcoming': 'https://api.rawg.io/api/games?ordering=-released&dates=2025-04-01,2026-12-31&page_size=20&exclude_additions=true'
    },

    RAWG_GAMES: {
        'GAMES': "https://api.rawg.io/api/games",
    },

    STEAM: {
        'ACHIEVEMENTS': "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2",
        'USER_ACHIEVEMENTS': "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/",
        'ACHIEVEMENT_PERCENTAGE': "http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/",
        'RECENTLY_PLAYED': "http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=XXXXXXXXXXXXXXXXX&steamid=76561197960434622&format=json"
    },

    HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },
}