

## Ticket Scanner PWA — Implementation Plan

### 1. Staff Authentication
- Simple email/password login page
- No user profiles needed (just Supabase Auth built-in)
- Protected scanner route — redirects to login if not authenticated
- Logout button on the scanner screen

### 2. QR Code Scanner
- Camera-based QR code scanner using a browser-compatible scanning library (e.g., `html5-qrcode`)
- Full-screen camera view with a scan region overlay
- Automatically reads the UUID from the scanned QR code

### 3. Attendee Lookup & Validation
After scanning a QR code UUID, query the `attendees` table in Supabase:

- **🔴 NOT PAID** — If `payment_status` ≠ `'Paid'`: full red screen showing "NOT PAID", attendee name, and ERP SKU
- **🟡 ALREADY SCANNED** — If `scanned_at` is not null: full yellow screen showing "ALREADY SCANNED", the scanned timestamp, attendee name, and ERP SKU
- **🟢 ACCESS GRANTED** — If `payment_status` = `'Paid'` and `scanned_at` is null: full green screen showing "ACCESS GRANTED", attendee name, and ERP SKU. Play a success sound. Update `scanned_at` to current timestamp in Supabase.

Each result screen will have a "Scan Next" button to return to the camera.

### 4. PWA Setup
- Install `vite-plugin-pwa` and configure service worker + manifest
- Add mobile-optimized meta tags and PWA icons
- App will be installable from the browser to the home screen
- Works offline for the UI shell (scanning requires network for Supabase lookup)

### 5. UI & UX
- Clean, minimal design optimized for mobile
- Large, bold status text for quick visual confirmation at a glance
- Smooth transitions between scanner and result screens
- Success sound effect on green/access-granted result

