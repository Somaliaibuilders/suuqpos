# SuuqPOS

**Free, offline point-of-sale for Somali shops.**

SuuqPOS turns any Android phone or tablet into a full POS system — no internet, no monthly fees, no card reader required. Built for the 85% of Somali businesses that run on mobile money (EVC Plus, Zaad, Sahal, eDahab) and cash.

---

## Download APK

> **[Download SuuqPOS v1.0 APK](https://github.com/Somaliaibuilders/suuqpos/releases)**
>
> Install directly on any Android device. No Play Store needed.

---

## Features

**Inventory Management**
- Add, edit, delete products with categories
- Track stock levels with low-stock alerts
- Bulk stock adjustments (in/out) with live preview
- Search and filter by category

**Point of Sale**
- Tap-to-add product grid (responsive: 2-5 columns based on screen)
- Cart with quantity controls
- 5 payment methods: Cash, EVC Plus, Zaad, Sahal, eDahab
- Cash change calculator with quick-amount buttons
- Stock validation before every sale

**Sales & Reports**
- Today / Week / Month summary (revenue, profit, total sales)
- Full sales history with receipt detail
- Share receipts via WhatsApp, Telegram, etc.

**Security**
- 4-digit PIN lock (SHA-256 hashed)
- All data stored locally on device (SQLite)
- No cloud, no tracking, no data leaves the phone

**Dark Mode**
- Light / Dark / System theme toggle
- Persisted preference

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 55 |
| Navigation | Expo Router |
| Database | expo-sqlite (WAL mode, foreign keys, indexed) |
| Language | TypeScript (strict) |
| Styling | React Native StyleSheet (dynamic theming) |

---

## Run Locally

```bash
# Clone
git clone https://github.com/Somaliaibuilders/suuqpos.git
cd suuqpos

# Install
npm install

# Start dev server
npx expo start

# Build APK locally (requires Android SDK)
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# APK output: android/app/build/outputs/apk/release/app-release.apk
```

**Requirements:**
- Node.js 18+
- Android SDK (for local APK builds)
- Java 17+ (for Gradle)

---

## Project Structure

```
src/
├── app/              # Expo Router entry
│   ├── _layout.tsx   # Root layout (providers)
│   └── index.tsx     # Auth gate
├── constants/
│   ├── theme.ts      # Light/Dark colors, spacing, breakpoints
│   └── strings.ts    # Somali UI strings
├── context/
│   ├── auth-context.tsx   # PIN auth state
│   ├── cart-context.tsx   # Shopping cart reducer
│   └── theme-context.tsx  # Dark/light mode
├── db/
│   ├── database.ts   # SQLite connection
│   ├── migrations.ts # Schema versions (v4)
│   ├── shop.ts       # Shop config + PIN hashing
│   ├── products.ts   # Product CRUD
│   ├── categories.ts # Category CRUD
│   └── sales.ts      # Transactions, reports
├── screens/
│   ├── register.tsx   # Onboarding (phone + PIN)
│   ├── login.tsx      # PIN unlock
│   ├── main.tsx       # Tab navigator
│   ├── inventory.tsx  # Stock management
│   ├── pos.tsx        # Point of sale
│   ├── sales.tsx      # Sales history
│   └── account.tsx    # Settings + theme toggle
└── types/
    └── index.ts       # TypeScript interfaces
```

---

## Database Schema

4 tables, 4 indices, WAL mode, foreign keys enforced:

- **shop** — key-value config (phone, PIN hash, shop name, theme)
- **categories** — product groupings (5 defaults: Cunto, Cabitaan, Guriga, Nadaafad, Kale)
- **products** — name, price, cost, stock, category (indexed on category + stock)
- **sales** + **sale_items** — transactional sales with profit tracking (indexed on created_at)

All writes wrapped in `withTransactionAsync` — no partial sales.

---

## Contributing

We welcome contributions. Here's how:

1. **Fork** the repo
2. **Create a branch** — `git checkout -b feature/your-feature`
3. **Make changes** — follow existing code style (TypeScript, Somali UI strings)
4. **Test** — run `npx tsc --noEmit` for type safety
5. **PR** — open a pull request with a clear description

### Areas we need help with

- CSV export of sales reports
- Receipt sharing as image (for WhatsApp)
- Change PIN flow
- Haptic feedback on key actions
- Tablet-optimized layouts (side rail, master-detail)
- Somali language improvements
- Better receipt templates

---

## Why SuuqPOS?

Somalia has 17M+ people, 75% under 30, and nearly universal mobile money adoption. But most shops track sales on paper or not at all. Commercial POS systems cost $30-100/month and require internet.

SuuqPOS is:
- **Free** — no subscription, no hidden fees
- **Offline** — works without internet, always
- **Somali-first** — UI in Somali, built for local payment methods
- **Mobile-first** — runs on the $80 phones shopkeepers already own

---

## License

MIT

---

**Built by [Somali AI Builders](https://github.com/Somaliaibuilders)** — Build with AI. Ship for Somalia.
