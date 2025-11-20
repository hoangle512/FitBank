# Project Overview

This is a Next.js project bootstrapped with `create-next-app`. It functions as a fitness tracking application, likely named "FitBank," focusing on heart rate data.

**Key Technologies:**

*   **Framework:** Next.js (React)
*   **Database:** PostgreSQL (managed with Vercel Postgres)
*   **Styling:** Tailwind CSS
*   **UI Components:** Radix UI
*   **Form Management:** `react-hook-form`
*   **Schema Validation:** `zod`
*   **Analytics:** Vercel Analytics
*   **Icons:** `lucide-react`

The application includes API endpoints for heart rate data and a leaderboard, and it interacts with a PostgreSQL database to store user and heart rate information.

## Database Structure

The database consists of two tables: `users` and `heart_rate_data`.

**`users` table:**
*   `id`: `VARCHAR(255)` - Primary Key, unique identifier for the user.
*   `display_name`: `VARCHAR(255)` - The name displayed for the user.

**`heart_rate_data` table:**
*   `id`: `SERIAL` - Primary Key, auto-incrementing unique identifier for each heart rate entry.
*   `username`: `VARCHAR(255)` - The user's identifier.
*   `bpm`: `INT` - Beats Per Minute, the recorded heart rate value.
*   `timestamp`: `TIMESTAMPTZ` - The timestamp when the heart rate data was recorded.
*   `points`: `INT` - Points calculated from the heart rate.

## Building and Running

To get started with the project, follow these steps:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
    or
    ```bash
    yarn install
    ```
    or
    ```bash
    pnpm install
    ```
    or
    ```bash
    bun install
    ```

2.  **Set up Environment Variables:**
    Ensure you have a `.env.local` file with the `POSTGRES_URL` environment variable configured for your PostgreSQL database connection.

3.  **Run in Development Mode:**
    ```bash
    npm run dev
    ```
    This will start the development server. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

4.  **Build for Production:**
    ```bash
    npm run build
    ```

5.  **Start Production Server:**
    ```bash
    npm run start
    ```

## Development Conventions

*   **Code Linting:** ESLint is configured with Next.js recommended rules for React and TypeScript to maintain code quality.
*   **TypeScript:** The project is written in TypeScript, ensuring type safety and improved developer experience.
*   **Styling:** Tailwind CSS is used for efficient and consistent styling.
*   **Path Aliases:** Path aliases are configured (e.g., `@/*` for the root directory) to simplify imports.

## Project Structure Highlights

*   `app/`: Contains Next.js application routes, including API endpoints for `heart-rate` and `leaderboard`.
*   `components/`: Reusable React components, including UI components (e.g., `avatar`, `badge`, `card`, `table`).
*   `lib/`: Utility functions and database connection (`db.ts`, `scoring.ts`, `utils.ts`).
*   `scripts/`: Database-related scripts like `create-tables.ts` and `alter-tables.ts`.
