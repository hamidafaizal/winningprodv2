const AppConfig = {
    API: {
        BASE_URL: '/backend/api/',
        TIMEOUT: 30000,
        RETRY: 3,
        RETRY_DELAY: 1000
    },
    LIMITS: {
        MAX_CSV_SIZE: 10 * 1024 * 1024, // 10MB
        MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
        MAX_BATCH_SIZE: 100,
        MAX_SCREENSHOTS: 25
    },
    FEATURES: {
        ENABLE_KOMREG: true,
        ENABLE_DISTRIBUTION: true,
        ENABLE_LOGGING: true,
        ENABLE_DEBUG_UI: false
    },
    DEBUG: {
        ENABLED: false,
        VERBOSE: false
    }
};

export default AppConfig;