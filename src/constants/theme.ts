const lightPalette = {
  background: "#ECEEF1",
  surface: "#FFFFFF",
  surfaceElevated: "#E1E4E8",
  surfaceSoft: "#F3F4F6",
  cardBorder: "#C3C8CF",
  textPrimary: "#15171A",
  textSecondary: "#42474E",
  textMuted: "#666D76",
  textOnAccent: "#FFFFFF",
  accent: "#202328",
  accentSoft: "#D9DDE2",
  success: "#15803D",
  successSoft: "#DCFCE7",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  warning: "#202328",
  divider: "#C8CDD4",
  shadow: "#000000",
} as const;

const darkPalette = {
  background: "#101214",
  surface: "#1B1E22",
  surfaceElevated: "#2A2E34",
  surfaceSoft: "#22262B",
  cardBorder: "#3F454D",
  textPrimary: "#F4F5F6",
  textSecondary: "#C1C6CD",
  textMuted: "#9299A3",
  textOnAccent: "#15171A",
  accent: "#F1F3F5",
  accentSoft: "#343940",
  success: "#4ADE80",
  successSoft: "#102A1B",
  danger: "#F87171",
  dangerSoft: "#321515",
  warning: "#F1F3F5",
  divider: "#424850",
  shadow: "#000000",
} as const;

export const Colors = {
  light: {
    background: lightPalette.background,
    surfaceSoft: lightPalette.surfaceSoft,
    textSecondary: lightPalette.textSecondary,
    textMuted: lightPalette.textMuted,
    textOnAccent: lightPalette.textOnAccent,
    accent: lightPalette.accent,
    accentSoft: lightPalette.accentSoft,
    success: lightPalette.success,
    successSoft: lightPalette.successSoft,
    danger: lightPalette.danger,
    dangerSoft: lightPalette.dangerSoft,
    warning: lightPalette.warning,
    divider: lightPalette.divider,
    text: lightPalette.textPrimary,
    backgroundElement: lightPalette.surface,
    backgroundSelected: lightPalette.surfaceElevated,
    glassTokens: {
      background: lightPalette.surface,
      border: lightPalette.cardBorder,
      shadow: lightPalette.shadow,
    },
  },
  dark: {
    background: darkPalette.background,
    surfaceSoft: darkPalette.surfaceSoft,
    textSecondary: darkPalette.textSecondary,
    textMuted: darkPalette.textMuted,
    textOnAccent: darkPalette.textOnAccent,
    accent: darkPalette.accent,
    accentSoft: darkPalette.accentSoft,
    success: darkPalette.success,
    successSoft: darkPalette.successSoft,
    danger: darkPalette.danger,
    dangerSoft: darkPalette.dangerSoft,
    warning: darkPalette.warning,
    divider: darkPalette.divider,
    text: darkPalette.textPrimary,
    backgroundElement: darkPalette.surface,
    backgroundSelected: darkPalette.surfaceElevated,
    glassTokens: {
      background: darkPalette.surface,
      border: darkPalette.cardBorder,
      shadow: darkPalette.shadow,
    },
  },
} as const;

type StringThemeKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

export type ThemeColor = StringThemeKeys<typeof Colors.light> & StringThemeKeys<typeof Colors.dark>;

export const Fonts = { sans: "Inter" } as const;

export const Spacing = {
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
} as const;

export const Radius = {
  small: 10,
  medium: 16,
  large: 22,
  xlarge: 28,
  pill: 999,
} as const;

export const radius = {
  md: 16,
  lg: 22,
  xl: 28,
} as const;
export const MaxContentWidth = 860;
