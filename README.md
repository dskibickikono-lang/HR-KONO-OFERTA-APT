# HR KONO - System Ofertowy

A calculator and offer generation system designed for HR KONO, enabling quick creation of cost calculations and PDF offers for clients.

## Overview for Webmasters

This application is built as a Single Page Application (SPA) using React and Vite. It is designed to run entirely in the browser and does not require a backend server for its core calculation and offer generation functionality. The calculations generate a dynamic PDF using `html2pdf.js`.

### Tech Stack
*   **Framework:** React 19
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS (via CDN)
*   **PDF Generation:** `html2pdf.js` (via CDN)
*   **Icons:** Lucide React

### Integration Options

To integrate this calculator into your existing website, you have a few options:

#### Option 1: Iframe Embedding (Recommended)

The easiest way to integrate the application is to host it on a sub-domain or a specific path and embed it using an `iframe` on your main site.

1.  Build and deploy the application (see instructions below).
2.  Embed it on your webpage:

```html
<iframe
  src="https://calculator.yourdomain.com"
  width="100%"
  height="800px"
  style="border: none;"
  title="HR KONO Calculator">
</iframe>
```

#### Option 2: Direct Hosting

You can host the compiled static files directly on your web server (e.g., Apache, Nginx) or a static hosting provider (e.g., Vercel, Netlify, GitHub Pages).

## Build & Deployment Instructions

To generate the static files for production deployment:

1.  **Prerequisites:** Ensure you have Node.js installed (v18+ recommended).
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Build the application:**
    ```bash
    npm run build
    ```
4.  **Deployment:**
    *   The build process will generate a `dist/` directory.
    *   Copy the *contents* of the `dist/` directory to your web server's public folder.
    *   **Note:** If you are deploying to a subfolder (e.g., `yourdomain.com/calculator/`), you need to update the `base` property in `vite.config.ts` before building:
        ```typescript
        import { defineConfig } from 'vite'
        import react from '@vitejs/plugin-react'

        export default defineConfig({
          plugins: [react()],
          base: '/calculator/', // Add this line
        })
        ```

## Local Development

If you need to make changes to the source code:

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm run start
    ```
    *(Note: This uses vite dev server)*
3.  Open `http://localhost:5173` (or the port specified in the console) in your browser.

## CDN Dependencies

Note that the application relies on the following external CDNs defined in `index.html`. Ensure these are accessible from your users' networks:
*   Tailwind CSS (`cdn.tailwindcss.com`)
*   html2pdf.js (`cdnjs.cloudflare.com`)
*   ESM modules via `esm.sh`
