# FitBank - Competition Dashboard

## Project Overview

This is a Next.js application called "FitBank - Competition Dashboard" designed to track weekly fitness competitions and coin leaderboards. It leverages React 19, TypeScript, Tailwind CSS, and Radix UI for the frontend. The backend integrates with Supabase for server-side actions and uses a PostgreSQL database (via `@vercel/postgres`) to store and manage data. The application processes heart rate data, calculates scores based on BPM, and displays weekly standings.

Key functionalities include:
*   Processing incoming heart rate data (`bpm`, `timestamp`, `username`) via a Next.js API route.
*   Calculating points based on heart rate BPM values using defined scoring logic (e.g., 125-149 BPM = 1 point, 150-164 BPM = 2 points, 165+ BPM = 3 points).
*   Interpolating points for minute intervals between heart rate entries.
*   Storing heart rate data and calculated points in a PostgreSQL database.
*   Fetching and displaying weekly standings and leaderboards from the database.
*   Utilizing Vercel Analytics for tracking.

## Building and Running

The project uses `npm` as its package manager. You can use `yarn`, `pnpm`, or `bun` as well.

*   **Development Server:**
    ```bash
    npm run dev
    ```
    This will start the development server, usually accessible at [http://localhost:3000](http://localhost:3000).

*   **Build for Production:**
    ```bash
    npm run build
    ```
    This command compiles the application for production deployment.

*   **Start Production Server:**
    ```bash
    npm run start
    ```
    This command starts the Next.js production server.

*   **Linting:**
    ```bash
    npm run lint
    ```
    This command runs ESLint to check for code quality and style issues.

## Development Conventions

*   **Framework:** Next.js (utilizing the App Router for routing and server components).
*   **Language:** TypeScript.
*   **Styling:** Tailwind CSS, with `clsx` and `tailwind-merge` utilities for combining class names.
*   **Component Library:** Radix UI for accessible and customizable UI components.
*   **Database:** PostgreSQL, accessed through `@vercel/postgres` and Supabase RPCs for specific data operations (e.g., `get_weekly_standings`).
*   **Data Fetching/State Management:** Primarily relies on Next.js Server Components and Supabase for data fetching and management.
*   **Form Handling:** `react-hook-form` is used for managing forms, coupled with `zod` for schema validation.
*   **Analytics:** Integrated with Vercel Analytics.
*   **Fonts:** Uses `Geist` fonts from `next/font/google`.