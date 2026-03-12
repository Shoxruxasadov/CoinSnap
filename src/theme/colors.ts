/**
 * Rang tokenlari — Figma Color Tokens asosida.
 */

export const colorTokens = {
  light: {
    background: {
      brand: "#DFAC4C",
      brandLight: "#FBF6EB",
      brandLightElevated: "#F6EACB",
      bgBase: "#FAFAF9",
      bgBaseElevated: "#F5F5F4",
      bgAlt: "#FFFFFF",
      bgSegment: "#EEEDEC",
      bgWhite: "#FFFFFF",
      bgDark: "#0C0A09",
      bgInverse: "#1C1917",
    },
    surface: {
      surface: "#FAFAF9",
      surfaceElevated: "#F5F5F4",
      surfaceElevatedExtra: "#EEEDEC",
      onBgBase: "#FFFFFF",
      onBgAlt: "#F5F5F4",
      onSegment: "#FFFFFF",
    },
    border: {
      border1: "#FAFAF9",
      border2: "#F5F5F4",
      border3: "#EEEDEC",
      border4: "#D6D3D1",
      borderBrand: "#DFAC4C",
      borderBrandTint: "#D6D3D1",
    },
    text: {
      textBase: "#1C1917",
      textBaseTint: "#57534D",
      textAlt: "#79716B",
      textTertiary: "#A6A09B",
      textBrand: "#DFAC4C",
      textWhite: "#FFFFFF",
      textDark: "#292524",
      textInverse: "#FFFFFF",
    },
    state: {
      red: "#EF4444",
      redLight: "#FEF2F2",
      redDark: "#991B1B",

      green: "#56B188",
      greenLight: "#F1FBEB",
      greenDark: "#000000",

      orange: "#D97706",
      orangeLight: "#92400E",
      orangeDark: "#FFFBEB",
      orangeLightElevated: "#FEF6D7",
    },
  },
  dark: {
    background: {
      brand: "#DFAC4C",
      brandLight: "#39190F",
      brandLightElevated: "#633320",
      bgBase: "#FAFAF9",
      bgBaseElevated: "#0C0A09",
      bgAlt: "#0C0A09",
      bgSegment: "#EEEDEC",
      bgWhite: "#FFFFFF",
      bgDark: "#1C1917",
      bgInverse: "#FFFFFF",
    },
    surface: {
      surface: "#2C2926",
      surfaceElevated: "#2C2926",
      surfaceElevatedExtra: "#1C1917",
      onBgBase: "#1C1917",
      onBgAlt: "#1C1917",
      onSegment: "#FFFFFF",
    },
    border: {
      border1: "#1C1917",
      border2: "#211D1D",
      border3: "#2C2926",
      border4: "#413E39",
      borderBrand: "#DFAC4C",
      borderBrandTint: "#413E39",
    },
    text: {
      textBase: "#FAFAF9",
      textBaseTint: "#EEEDEC",
      textAlt: "#A6A09B",
      textTertiary: "#A6A09B",
      textBrand: "#DFAC4C",
      textWhite: "#FFFFFF",
      textDark: "#211D1D",
      textInverse: "#1C1917",
    },
    state: {
      red: "#EF4444",
      redLight: "#FEF2F2",
      redDark: "#991B1B",

      green: "#56B188",
      greenLight: "#F1FBEB",
      greenDark: "#000000",

      orange: "#D97706",
      orangeLight: "#92400E",
      orangeDark: "#FFFBEB",
      orangeLightElevated: "#FEF6D7",
    },
  },
} as const;

export type ColorTokens = typeof colorTokens.light;
