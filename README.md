# RentMate Frontend

A React + Vite single-page application for browsing listings, managing profile/listings, and real-time messaging.

## Features

- User authentication (register/login/logout)
- Browse and filter listings
- Listing details with gallery + map view
- Create and manage listings
- Profile management with avatar upload
- Real-time chat (Socket.IO)
- Dark/light theme support
- Unread badge in navbar for conversations

## Tech Stack

- React 19
- Vite
- React Router
- Axios
- Socket.IO Client

## Prerequisites

- Node.js 18+
- npm 9+
- Running backend API (default: `http://localhost:4000`)

## Environment Variables

Create `client/.env`:

```env
VITE_API_BASE=http://localhost:4000
```

## Installation

```bash
cd client
npm install
```

## Run (Development)

```bash
npm run dev
```

App runs on `http://localhost:5173` by default.

## Build and Preview

```bash
npm run build
npm run preview
```

## Lint

```bash
npm run lint
```

## Project Structure

```text
src/
  api/            # Axios config
  components/     # Shared UI (Navbar, etc.)
  context/        # Theme context/provider
  pages/          # Route screens
  services/       # API and socket service wrappers
  styles/         # Global styles and theme variables
  utils/          # Media URL helpers
```

## Notes

- Browser notifications depend on browser permission settings.
- Real-time features require backend Socket.IO service to be running.
- Static uploaded media URLs are resolved through `VITE_API_BASE`.