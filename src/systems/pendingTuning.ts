/**
 * PENDING TUNING. Numbers the systems need that `src/content/tuning.ts` does
 * not have yet. They live here, in one place, only until the creative
 * director moves them into `tuning.ts`; then this file is deleted and every
 * `PENDING_TUNING.x` becomes `TUNING.<section>.x`.
 *
 * Do not add balance numbers anywhere else. Units as in tuning.ts: pixels,
 * pixels per second, milliseconds, degrees.
 */

export const PENDING_TUNING = {
  /** Default audio settings before the player touches the sliders. */
  audioDefaults: { musicVolume: 0.7, effectsVolume: 0.8 },

  player: {
    /** Collision box at Andrew's feet (sprite is 16 x 24). */
    bodyWidth: 10,
    bodyHeight: 8,
    /** Invulnerability after taking a hit, so one swing cannot hit twice. */
    hurtInvulnerableMs: 500,
    /** Time The Stumble's dash takes to cover `dashDistance`. */
    stumbleDashMs: 220,
    /** Aim sway cycle at full `aimSwayDeg`. */
    swayPeriodMs: 1700,
    /** Movement drift cycle (Locked and above). */
    driftPeriodMs: 2300,
    /** Delay between falling and the save being restored. */
    deathRespawnDelayMs: 1200,
    /** Range of the Sober remark trigger: only after this long at Grand or above. */
    soberRemarkMinMsAbove: 20000,
  },

  combat: {
    /** Knockback is an initial speed; this is how fast it bleeds off, per second. */
    knockbackDecayPerSecond: 7,
    /** Speed of a `charge` attack once it is released. */
    chargeSpeed: 260,
    /** Gap between shots of a burst. */
    burstIntervalMs: 160,
    /** Radius used for hit tests against a character. */
    characterHitRadius: 6,
    /** Radius of a lobbed projectile's hit where it lands. */
    lobSplashRadius: 14,
    /** Peak height of a lobbed projectile's arc, for drawing. */
    lobPeakHeight: 24,
    /** Radius of a straight projectile. */
    projectileRadius: 3,
    /** An enemy starts its approach when Andrew is this close (fights wake everyone). */
    aggroRange: 400,
    /** A disguised enemy reveals itself when Andrew is this close. */
    disguiseRevealRange: 40,
    /** How long a `lad` backs off after landing a hit. */
    backOffMs: 700,
    /** Enemies keep this much space between each other. */
    separationRadius: 14,
    /** Sideways offset an agent aims for when flanking. */
    flankOffset: 40,
    /** Ranged enemies try to hold this fraction of their projectile range. */
    rangedPreferredFraction: 0.6,
    /** Pause between a fight's waves. */
    betweenWavesMs: 900,
    /** Re-plan a path to Andrew at this interval. */
    repathMs: 500,
    /** Stun applied by a bottle to an enemy it hits (none = 0). */
    bottleStunMs: 0,
  },

  stealth: {
    /** Guard turn speed, degrees per second. */
    turnDegPerSecond: 240,
    /** How long a guard looks around at the spot it investigates. */
    lookAroundMs: 1500,
    /**
     * Sneaking at Locked or above is audible at short range (DESIGN.md 7.3).
     * Noise radius = footstepNoiseRadius x (footstepNoiseMultiplier - 1) x this.
     */
    lockedSneakNoiseFactor: 1,
    /** Footstep noise is emitted at this interval while moving. */
    footstepIntervalMs: 350,
    /** Guard walking speed as a fraction of its moveSpeed. */
    patrolSpeedFraction: 0.7,
  },

  myko: {
    walkSpeed: 78,
    /** Called-in stroll speed. */
    strollSpeed: 60,
    /** Minimum gap between unprompted comments. */
    commentCooldownMs: 12000,
    /** Chance Myko comments on a drink. */
    drinkCommentChance: 0.35,
    /** Heat fraction at which he warns. */
    heatWarnFraction: 0.75,
    /** Chance of a tangent each time the idle timer fires instead of an idle line. */
    tangentChance: 0.5,
  },

  world: {
    /** Andrew reaches a checkpoint within this distance of it. */
    checkpointRadius: 16,
    /** Hold time walking into a pushable before it moves. */
    pushHoldMs: 180,
    /** Time a pushed keg or crate takes to slide one tile. */
    pushSlideMs: 160,
  },
} as const;
