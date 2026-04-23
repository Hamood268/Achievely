module.exports = {
    
    // RAWG Endpoints
    RAWG_GAMES: {
        'GAMES': "https://api.rawg.io/api/games",
    },

    STEAM: {
        "PLAYER_DATA": "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/",
        'RECENTLY_PLAYED': "https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/",
        'OWNED_GAMES': "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
        'ACHIEVEMENTS': "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/",
        'ACHIEVEMENTS_2': "https://api.steampowered.com/IPlayerService/GetGameAchievements/v1/",
        'USER_ACHIEVEMENTS': "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/",
        'ACHIEVEMENT_PERCENTAGE': "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/",
        'APP_DETAILS': "https://store.steampowered.com/api/appdetails"
    },

    STEAMGRID: {
        'SEARCH': 'https://www.steamgriddb.com/api/v2/search/autocomplete/',
        'GRIDS': 'https://www.steamgriddb.com/api/v2/grids/game/',
        'HEROES': 'https://www.steamgriddb.com/api/v2/heroes/game/',
        'GRIDS_PLATFORM': 'https://www.steamgriddb.com/api/v2/grids/steam/',
        'HEROES_PLATOFRM': 'https://www.steamgriddb.com/api/v2/heroes/steam/'
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