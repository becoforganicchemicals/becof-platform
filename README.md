# 🌱 Becof Platform

**Becof Platform** is the official digital infrastructure for **Becof Organic Chemicals Limited**.

It is a multi-role agricultural commerce and impact platform that powers:

* Product management
* Structured agricultural distribution
* Farmer & distributor engagement
* Expert consultations
* Role-based administration
* Careers & recruitment
* Impact reporting
* Secure authentication & permissions

This is not just an e-commerce site.
It is the operational backbone of Becof’s digital ecosystem.

---

# 🚀 Tech Stack

### Frontend

* React + TypeScript
* Vite
* TailwindCSS
* shadcn/ui component system
* Context API for state management

### Backend / Database

* Supabase (PostgreSQL)
* Supabase Auth
* Row Level Security (RLS)
* Supabase Storage (for images & PDFs)

### Tooling

* Vitest (testing)
* ESLint
* PostCSS
* Bun / npm
* TypeScript

---

# 🏗 Architecture Overview

The platform is structured around:

## 1️⃣ Role-Based Access Control (RBAC)

Roles:

* `super_admin`
* `admin`
* `expert`
* `distributor`
* `farmer`

Granular permission system (dynamic, not hardcoded):

Examples:

* `product.create`
* `product.view`
* `product.update`
* `product.delete`
* `category.create`
* `order.update`
* `user.delete`

Permissions are assigned per admin and enforced server-side.

Super Admin has full override authority.

---

## 2️⃣ Product Taxonomy

Strict hierarchy:

```
Category
  └── Subcategory (optional)
        └── Product
```

Rules:

* Category must exist before product creation.
* Subcategory must belong to a Category.
* Product must belong to:

  * Category (required)
  * Subcategory (optional)

---

## 3️⃣ Modular Dashboard System

Each role sees a different dashboard.

### Super Admin

* Analytics overview
* Users management
* Permission control
* Audit logs
* Orders overview

### Admin

* Products
* Orders
* Categories
* Subcategories
* Users (if permitted)

### Expert

* Consultations
* Assigned farmers
* Profile management

### Distributor

* Orders
* Inventory
* Profile

### Farmer

* Products
* Orders
* Consultation booking
* Profile

---

# 📁 Project Structure

```
├── bun.lockb
├── components.json
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.js
├── public
├── README.md
├── src
│   ├── App.css
│   ├── App.tsx
│   ├── assets
│   ├── components
│   │   ├── home
│   │   │   ├── FeaturedProducts.tsx
│   │   │   ├── FinalCTA.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   ├── ImpactSnapshot.tsx
│   │   │   ├── PlatformHighlights.tsx
│   │   │   ├── TestimonialsSection.tsx
│   │   │   └── WhatWeDo.tsx
│   │   ├── layout
│   │   │   ├── Footer.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── Navbar.tsx
│   │   ├── NavLink.tsx
│   │   └── ui
│   ├── contexts
│   │   ├── AuthContext.tsx
│   │   └── CartContext.tsx
│   ├── hooks
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   └── usePermissions.ts
│   ├── index.css
│   ├── integrations
│   │   └── supabase
│   │       ├── client.ts
│   │       └── types.ts
│   ├── lib
│   │   └── utils.ts
│   ├── main.tsx
│   ├── pages
│   │   ├── About.tsx
│   │   ├── admin
│   │   │   ├── AdminActivityLogs.tsx
│   │   │   ├── AdminAnalytics.tsx
│   │   │   ├── AdminCareers.tsx
│   │   │   ├── AdminCategories.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminNotifications.tsx
│   │   │   ├── AdminOrders.tsx
│   │   │   ├── AdminPermissions.tsx
│   │   │   ├── AdminProducts.tsx
│   │   │   └── AdminUsers.tsx
│   │   ├── Careers.tsx
│   │   ├── Cart.tsx
│   │   ├── Checkout.tsx
│   │   ├── Contact.tsx
│   │   ├── Impact.tsx
│   │   ├── Index.tsx
│   │   ├── Learn.tsx
│   │   ├── NotFound.tsx
│   │   ├── Partners.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── Products.tsx
│   │   ├── Profile.tsx
│   │   ├── SignIn.tsx
│   │   └── Wishlist.tsx
│   ├── test
│   └── vite-env.d.ts
├── supabase
│   ├── config.toml
│   └── migrations
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

---

# 🔐 Authentication & Security

* All `/admin/*` routes are middleware protected.
* Only authenticated users can access dashboards.
* Suspended users cannot log in.
* Permission checks are enforced backend-side.
* File uploads validated (PDF for manuals & CVs).
* Rich text inputs sanitized.

---

# 📦 File Upload System

### Product Images

* Stored in Supabase Storage
* Linked via URL

### Product Usage Manuals

* PDF upload supported
* Secure downloadable link

### Career Applications

* CV upload (PDF only)
* Stored securely
* Visible in Admin panel

---

# 🧪 Development Setup

## 1️⃣ Clone Repository

```bash
git clone https://github.com/becoforganicchemicals/becof-platform.git
cd becof-platform
```

## 2️⃣ Install Dependencies

Using npm:

```bash
npm install
```

Or using bun:

```bash
bun install
```

## 3️⃣ Configure Environment Variables

Create a `.env` file in the root directory:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Never commit `.env` to version control.

---

## 4️⃣ Run Development Server

```bash
npm run dev
```

App runs at:

```
http://localhost:5173
```

---

# 🗄 Supabase

Supabase handles:

* Authentication
* Database
* Storage
* Row-Level Security
* Migrations

Migrations are located in:

```
supabase/migrations/
```

To apply migrations locally:

```bash
supabase db reset
```

---

# 📊 Audit Logging

System tracks:

* Product creation
* Product deletion
* Permission changes
* Order updates
* User suspension

Audit logs are visible to Super Admin only.

---

# 🧩 Key Features

* Dynamic RBAC
* Category/Subcategory management
* Product management with media uploads
* Orders system
* Cart & Checkout
* Careers module
* Impact metrics
* Testimonials
* Structured admin dashboards
* Back-to-Website navigation from admin
* Profile self-management

---

# 🌍 Public Routes

* `/`
* `/products`
* `/product/:id`
* `/about`
* `/impact`
* `/partners`
* `/careers`
* `/contact`
* `/learn`
* `/signin`

---

# 🛠 Admin Routes

Protected under:

```
/admin/*
```

Examples:

* `/admin/dashboard`
* `/admin/products`
* `/admin/categories`
* `/admin/subcategories`
* `/admin/orders`
* `/admin/users`
* `/admin/permissions`
* `/admin/activity-logs`
* `/admin/careers`

---

# 🧪 Testing

Run tests:

```bash
npm run test
```

Using Vitest.

---

# 📦 Build for Production

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

# 🚀 Deployment

The platform can be deployed to:

* Vercel
* Netlify
* Cloudflare Pages
* Custom VPS

Environment variables must be configured in hosting provider.

---

# 🧠 Design Philosophy

This platform is designed to:

* Scale without refactoring
* Enforce strict permission boundaries
* Maintain structured data hierarchy
* Support agricultural commerce growth
* Enable multi-stakeholder ecosystem participation

It is intentionally built as infrastructure, not just a storefront.

---

# 🧑‍💻 Contribution Guidelines

1. Create a feature branch:

   ```
   git checkout -b feature/feature-name
   ```

2. Commit changes clearly:

   ```
   git commit -m "Add feature: permission toggling"
   ```

3. Open Pull Request to `main`

All changes affecting:

* RBAC
* Database schema
* Permissions
* Authentication

Must be reviewed before merge.

---

# 🔒 Security Notes

* Do not expose service keys.
* Never disable RLS in production.
* Always validate permission server-side.
* Never trust client-side checks.

---

# 📄 License

Proprietary – © Becof Organic Chemicals Limited

All rights reserved.

---

# 👥 Maintainers

Becof Organic Chemicals Limited
Internal Development Team



