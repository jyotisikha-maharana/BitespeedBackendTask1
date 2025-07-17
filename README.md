# Bitespeed Identity Reconciliation Backend

This project implements an identity reconciliation backend service using Node.js, Express, TypeScript, and Prisma (with SQLite). It is designed to deduplicate and link user identities based on email and phone number, following the requirements of the Bitespeed assignment.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Database Schema](#database-schema)
- [Setup & Installation](#setup--installation)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
  - [POST /identify](#post-identify)
- [Testing the API](#testing-the-api)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)
- [Notes](#notes)

---

## Project Overview
This backend service provides a single endpoint to reconcile user identities. When a user submits an email and/or phone number, the service:
- Checks if the identity already exists (by email or phone number)
- Links related identities together (primary/secondary)
- Returns a unified view of the user's contact information

---

## Database Schema
The service uses a single table, `Contact`, to store all user identities. The schema is managed by Prisma ORM and defined as:

| Field           | Type      | Description                                      |
|-----------------|-----------|--------------------------------------------------|
| id              | Int       | Primary key, auto-increment                      |
| phoneNumber     | String?   | User's phone number (optional)                   |
| email           | String?   | User's email address (optional)                  |
| linkedId        | Int?      | Points to the primary contact if secondary       |
| linkPrecedence  | String    | 'primary' or 'secondary'                         |
| createdAt       | DateTime  | Timestamp when created                           |
| updatedAt       | DateTime  | Timestamp when last updated                      |
| deletedAt       | DateTime? | Timestamp if deleted (not used in logic)         |

---

## Setup & Installation

1. **Clone the repository** (if not already):
   ```bash
   git clone <repo-url>
   cd Jyoti
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run database migrations:**
   This sets up the SQLite database and creates the `Contact` table.
   ```bash
   npx prisma migrate dev --name init
   ```

---

## Running the Server

- **Development mode (with auto-reload):**
  ```bash
  npm run dev
  ```
- **Production mode:**
  ```bash
  npm start
  ```
- The server will start on `http://localhost:3000` by default (or the port set in the `PORT` environment variable).

---

## API Endpoints

### POST `/identify`
**Purpose:**
Reconcile a user's identity based on email and/or phone number. Returns the primary contact and all linked (secondary) contacts.

**Request Body:**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```
- At least one of `email` or `phoneNumber` is required.

**Response:**
```json
{
  "contact": {
    "primaryContatctId": number,
    "emails": ["string"],
    "phoneNumbers": ["string"],
    "secondaryContactIds": [number]
  }
}
```
- `primaryContatctId`: The main contact's ID (oldest or first created)
- `emails`: All unique emails linked to this user
- `phoneNumbers`: All unique phone numbers linked to this user
- `secondaryContactIds`: IDs of all secondary (linked) contacts

**Example Request:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{ "email": "alice@example.com", "phoneNumber": "1234567890" }'
```

**Example Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["alice@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}
```

---

## Testing the API

You can test the endpoint using tools like [Postman](https://www.postman.com/), [Insomnia](https://insomnia.rest/), or `curl`:

- **With only email:**
  ```bash
  curl -X POST http://localhost:3000/identify -H "Content-Type: application/json" -d '{ "email": "bob@example.com" }'
  ```
- **With only phone number:**
  ```bash
  curl -X POST http://localhost:3000/identify -H "Content-Type: application/json" -d '{ "phoneNumber": "9876543210" }'
  ```
- **With both:**
  ```bash
  curl -X POST http://localhost:3000/identify -H "Content-Type: application/json" -d '{ "email": "bob@example.com", "phoneNumber": "9876543210" }'
  ```

---

## Deployment

- You can deploy this app to any Node.js hosting platform (e.g., [Render.com](https://render.com/), [Vercel](https://vercel.com/), [Heroku](https://heroku.com/)).
- Make sure to run migrations and set up the environment as described above.
- Update this README with your deployed endpoint URL if needed.

---

## Tech Stack
- Node.js + Express (API server)
- TypeScript (type safety)
- Prisma ORM (database access)
- SQLite (local development database)

---

## Notes
- The logic ensures that all contacts with matching email or phone number are linked, and merges multiple primaries if found.
- The code is strict-typed and uses modern TypeScript best practices.
- For any questions or issues, please refer to the code or open an issue.

---

Assignment by Bitespeed 