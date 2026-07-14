# Debale Mobile — Complete (Phase 4 / Final)

React Native + Expo app for Debale — Ethiopia's housemate platform. This is the complete mobile app.

## What's New in Phase 4
- **Payment screen** — plan selection (Monthly/3-Month/6-Month) + 4 Ethiopian gateways, success screen
- **Agreement flow** — 4-step: Pay (50 ETB) → AI generates agreement (Groq) → Download/Share → Upload signed copy → Complete. Uses real device file sharing and document picker.
- **Messages** — conversation list (auto-built from accepted applications) + real-time-feel chat screen
- **Notifications** — full list with mark-as-read, type-specific icons
- **AI Assistant** — Groq-powered chat, quick question chips, bilingual-ready
- **Settings** — Account, Language (EN/Amharic), Password change, Notification toggles, Privacy info
- All screens fully wired: Home → AI Assistant & Notifications, Dashboards → Payment & Agreement & Applicant Management → Agreement, Messages reachable from bottom tab

## How to Run

```
cd debale-mobile
npm install --legacy-peer-deps
```

1. Open `src/services/api.js` → set `BASE` to your computer's LAN IP (not `localhost`)
2. The `.env` file already has your Groq key — no extra setup needed for AI chat
3. Make sure `debale-backend` is running
4. Start the app:
```
npx expo start
```
Scan the QR with Expo Go.

## Full Navigation Map
```
RootNavigator
 ├─ Splash → Onboarding → App (browse-first, guests included)
     ├─ Main (bottom tabs)
     │   ├─ Home → HomeStack (HomeFeed, ListingDetail, Notifications, AIAgent)
     │   ├─ Browse → BrowseStack (BrowseList, ListingDetail)
     │   ├─ Dashboard → DashboardStack (role-routed Home, ApplicantManagement, SeekerForm, ProviderForm, Payment, Agreement) — or Sign-in prompt for guests
     │   ├─ Messages → MessagesStack (ConversationList, Chat) — or Sign-in prompt for guests
     │   └─ Settings → SettingsScreen — or Sign-in prompt for guests
     ├─ Login / Register / SeekerForm / ProviderForm
     └─ Payment / Agreement / AIAgent / Notifications (global fallback access)
```

## Complete Feature List (All 4 Phases)
- Browse-first guest mode with gentle login modal (Airbnb-style)
- Full auth: Splash, Onboarding, Login, Register
- Browse rooms with search & filters, Listing detail with photo carousel
- Seeker & Provider multi-step profile/listing forms with real photo upload
- Role-based dashboards with pull-to-refresh
- Applicant management: shortlist, interview scheduling, accept (auto-rejects others + reveals phone), reject
- Subscription payments via 4 Ethiopian gateways
- Paid AI-generated housemate agreement with download/sign/upload flow
- Post-acceptance messaging
- Notifications center
- Groq-powered AI assistant
- Full settings: language, password, notification prefs, privacy

Made in Ethiopia 🇪🇹
