/** Legal Connect · RNA — Midnight Dharma design system */
export const colors = {
  // Core canvas
  bg: "#030303",
  bgElevated: "#080808",
  surface: "#0F0F0F",
  surfaceRaised: "#161616",
  surfaceGlass: "rgba(15, 15, 15, 0.92)",

  // Brand gold
  gold: "#C5A059",
  goldBright: "#E4C17A",
  goldSoft: "#F5E6C8",
  goldMuted: "#7A5A24",
  goldLine: "rgba(197, 160, 89, 0.28)",
  goldGlow: "rgba(197, 160, 89, 0.12)",

  // Typography
  text: "#FAF7F0",
  textMuted: "#B8B0A6",
  textSubtle: "#6E6760",
  textInverse: "#0A0A0A",

  // Semantic
  success: "#6EE7A8",
  successBg: "rgba(110, 231, 168, 0.12)",
  danger: "#F87171",
  dangerBg: "rgba(248, 113, 113, 0.12)",
  info: "#93C5FD",
  infoBg: "rgba(147, 197, 253, 0.12)",

  // Role accents
  client: "#5B9BD5",
  clientBg: "rgba(91, 155, 213, 0.14)",
  advocate: "#C5A059",
  advocateBg: "rgba(197, 160, 89, 0.14)",
  intern: "#B794F6",
  internBg: "rgba(183, 148, 246, 0.14)",

  line: "rgba(255, 255, 255, 0.06)",
  lineGold: "rgba(197, 160, 89, 0.22)",
} as const;

export type RoleKey = "client" | "advocate" | "intern";

export const roleTheme: Record<
  RoleKey,
  { accent: string; accentBg: string; label: string; kicker: string }
> = {
  client: {
    accent: colors.client,
    accentBg: colors.clientBg,
    label: "Client Portal",
    kicker: "FOR PEOPLE",
  },
  advocate: {
    accent: colors.advocate,
    accentBg: colors.advocateBg,
    label: "Advocate Command",
    kicker: "FOR PROFESSIONALS",
  },
  intern: {
    accent: colors.intern,
    accentBg: colors.internBg,
    label: "Internverse",
    kicker: "LEARN & EARN",
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: 34,
  hero: 28,
  title: 22,
  subtitle: 17,
  body: 15,
  caption: 13,
  label: 11,
} as const;

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 4,
  },
} as const;

export const TABLET_MIN_WIDTH = 768;
