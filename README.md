# 🏢 HR KONO - System Ofertowy

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

A comprehensive calculator and offer generation system designed for HR KONO. It enables quick creation of complex cost calculations and native PDF offers for clients, entirely within the browser.

---

## ✨ Features

- 🧮 **Advanced Cost Calculation:** Computes ZUS, PPK, margin models, and one-time/monthly costs accurately.
- 📄 **Native PDF Generation:** Relies on native `window.print()` and `@media print` CSS for robust, dependency-free PDF creation.
- 💸 **Precise Financial Formatting:** Displays monetary values correctly in Polish formatting (e.g., `1 234,56 zł`).
- 🎨 **Brand Aligned:** Uses HR KONO's official color palette (`#396542` and `#c0a068`).
- ⚡ **Zero Backend Required:** Operates strictly as a Single Page Application (SPA).

---

## 📈 System Architecture & Flow

```mermaid
graph TD;
    %% Styling
    classDef input fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef engine fill:#fef08a,stroke:#ca8a04,stroke-width:2px;
    classDef output fill:#dcfce7,stroke:#16a34a,stroke-width:2px;
    classDef internal fill:#fecdd3,stroke:#e11d48,stroke-width:2px;

    A[📋 User Form Inputs]:::input -->|Cost Types, Margin, Rates| B(⚙️ Calculation Engine hook):::engine;
    B --> C{Preview Generated Offer};
    C -->|Client Facing| D[📄 Generate PDF via window.print]:::output;
    C -->|Internal Team| E[🔐 Ops / Internal Calculation View]:::internal;
```

---

## 📊 Calculation Architecture & Maths

The core of the pricing model strictly adheres to HR-KONO conventions, where the margin is treated as a percentage of the final revenue, **not as a standard markup**.

### 🔢 Margin Formula
`Billed Amount = Cost / (1 - Margin Percentage)`

### 🧩 Financial Data Flow

```mermaid
graph TD;
    classDef gross fill:#dcfce7,stroke:#16a34a,stroke-width:2px;
    classDef tax fill:#fecaca,stroke:#dc2626,stroke-width:2px;
    classDef cost fill:#e2e8f0,stroke:#64748b,stroke-width:2px;
    classDef agency fill:#fef08a,stroke:#ca8a04,stroke-width:2px;
    classDef bill fill:#bfdbfe,stroke:#2563eb,stroke-width:2px;
    classDef refaktura fill:#c4b5fd,stroke:#7c3aed,stroke-width:2px;

    A[Gross Salary]:::gross --> E(Agency Cost);
    Z[ZUS Employer]:::tax --> E;
    P[PPK Employer]:::tax --> E;
    V[Vacation Reserve]:::tax --> E;
    I[Internal Costs 'w stawce']:::cost --> E;

    E:::agency -->|Applied Math: Cost / 1 - Margin| B(Base Monthly Billing):::bill;

    B --> T{Total Monthly Billing};

    R1[Refaktura 1:1]:::refaktura --> T;
    R2[Refaktura 'z marżą']:::refaktura -->|Applied Math: Refaktura / 1 - Margin| T;
```

---

## 🛠 Tech Stack

- **Framework:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (via CDN)
- **Icons:** Lucide React
- **Package Manager:** `pnpm` (strictly enforced)

---

## 🚀 Local Development

The project strictly uses **`pnpm`** for package management.

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start the development server:**
   ```bash
   pnpm dev
   ```

3. **Run tests (Vitest):**
   ```bash
   pnpm test
   ```

4. **Build the application:**
   ```bash
   pnpm build
   ```

---

## 🌍 Integration & Deployment

This application generates static files that can be hosted anywhere.

### Option 1: Iframe Embedding (Recommended)

Host the compiled output on a subdomain and embed it via an iframe:

```html
<iframe
  src="https://calculator.yourdomain.com"
  width="100%"
  height="800px"
  style="border: none;"
  title="HR KONO Calculator">
</iframe>
```

### Option 2: Direct Subfolder Deployment

If deploying to a subfolder (e.g., `yourdomain.com/calculator/`), update the `base` property in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/calculator/', // Add this line
})
```

---

## ⚠️ CDN Dependencies

The application relies on these external CDNs (defined in `index.html` via ESM imports and standard tags). Ensure they are accessible:

- Tailwind CSS (`cdn.tailwindcss.com`)
- ESM modules via `esm.sh` (React, Vite, Lucide-React, etc.)
