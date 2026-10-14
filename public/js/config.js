window.APP_CONFIG = {
  // ═══ TURN Server (از Metered) ═══
  TURN_HOST: 'standard.relay.metered.ca',    // ← Domain از Metered
  TURN_PORT: 80,                              // ← Port از Metered
  TURNS_PORT: 443,                            // ← TLS Port
  TURN_USER: 'USERNAME_خودت',                 // ← Username از Metered
  TURN_PASS: 'PASSWORD_خودت',                 // ← Password از Metered

  // ═══ STUN ═══
  STUN_URL: 'stun:stun.l.google.com:19302',

  // ═══ تنظیمات دوربین ═══
  VIDEO_WIDTH: 1280,
  VIDEO_HEIGHT: 720,
  VIDEO_FPS: 30,

  // ═══ تنظیمات صدا ═══
  AUDIO_ECHO_CANCELLATION: true,
  AUDIO_NOISE_SUPPRESSION: true,
  AUDIO_AUTO_GAIN: true
};