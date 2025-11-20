This document outlines the proper JSON structure for API endpoints in this project.

## General Guidelines

*   **Consistency:** Maintain consistent naming conventions (e.g., `camelCase` for keys).
*   **Clarity:** Ensure the JSON structure is clear and easy to understand.
*   **Validation:** All API endpoints should perform input validation using `zod` schemas.

## API Endpoints

### 1. Heart Rate Data Submission (`/api/heart-rate`)

**Method:** `POST`

**Description:** Submits new heart rate data for a user. This can be a single entry or an array of entries for bulk submission (e.g., 24 hours of data).

**Request Body JSON Structure (for multiple entries):**

```json
[
  {
    "username": "string",
    "bpm": "number",
    "timestamp": "string"
  },
  {
    "username": "string",
    "bpm": "number",
    "timestamp": "string"
  }
]
```

**Schema (Example - `lib/schemas.ts` or similar):**

```typescript
import { z } from 'zod';

export const HeartRateSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  bpm: z.number().int().positive({ message: "BPM must be a positive integer." }),
  timestamp: z.string().datetime({ message: "Invalid timestamp format. Expected ISO 8601." }),
});

export const HeartRateArraySchema = z.array(HeartRateSchema);
```

### 2. Leaderboard Data (`/api/leaderboard`)

**Method:** `GET`

**Description:** Retrieves leaderboard data.

**Query Parameters:**
(Currently, no specific query parameters are defined, but this section would be used if they were.)

**Response Body JSON Structure (Example):**

```json
[
  {
    "display_name": "string",
    "total_points": "number"
  },
  {
    "display_name": "string",
    "total_points": "number"
  }
]
```

**Note:** This file serves as a guideline. Always refer to the actual API endpoint implementations and their respective `zod` schemas for the most up-to-date and precise structure.