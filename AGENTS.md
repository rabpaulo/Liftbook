# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Fonts applied

- Registered Inter fonts from `assets/fonts/static` using `expo-font` in [src/app/_layout.tsx](src/app/_layout.tsx#L1-L100).
- Updated the app font constants in [src/constants/theme.ts](src/constants/theme.ts#L1-L40) to use the `Inter` family for the primary sans font.
- Added `@font-face` rules to [src/global.css](src/global.css#L1-L40) so web builds use the same Inter fonts.

These changes load Inter across native platforms (via `useFonts`) and the web (via CSS). If you want additional weights or italics available by name on web/native, we can register more family keys or adjust the CSS mappings.
