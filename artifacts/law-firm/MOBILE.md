# Legal Connect Mobile — Midnight Dharma Theme

Premium Expo app for **Rishika Nagpal and Associates (RNA)**.

## Design system: Midnight Dharma

| Token | Value | Use |
|-------|--------|-----|
| Canvas | `#030303` | App background |
| Surface | `#0F0F0F` | Cards, tab bar |
| Gold | `#C5A059` | RNA brand, advocate accent |
| Ivory text | `#FAF7F0` | Headlines & body |
| Client accent | `#5B9BD5` | Trust / calm blue |
| Intern accent | `#B794F6` | Gamified purple |

**Typography:** Georgia (iOS) / serif for display & titles; system sans for UI labels.

**Layout:** iPhone 15 = single column + bottom tabs. iPad 10th gen = 2-col grids; width ≥900 = sidebar split.

## Structure

```
src/mobile/
├── theme/
│   ├── tokens.ts       # Colors, spacing, role themes
│   └── navigation.ts   # Tab/header + NavigationContainer theme
├── components/
│   ├── SafeScreen.tsx
│   ├── DharmaChakra.tsx
│   ├── RoleDashboardLayout.tsx
│   └── ui/             # AppText, SurfaceCard, DashboardHero, ActionTile…
└── screens/
    ├── GatewayScreen.tsx
    ├── ClientHomeScreenNative.tsx
    ├── AdvocateHomeScreenNative.tsx
    └── InternHomeScreenNative.tsx
```

## Run

```bash
cd artifacts/law-firm
npm install
npx expo start --ios
```

Test on **iPhone 15** and **iPad (10th generation)** simulators.

## Backend

Connect to `https://www.legal-connect.in/api` for auth and live data.
