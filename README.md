# Webster Graphic Editor

Webster is a student full-stack graphic editor built for the Webster Track Full Stack challenge.  
The current MVP proves a real end-to-end flow:

- create and edit a canvas-based design
- manage multiple frames and layers
- export PNG and ZIP project files
- save projects to PostgreSQL through a NestJS API
- register, log in, and access only your own saved projects
- reopen saved projects and continue editing
- autosave saved projects after editing with debounced backend sync
- create read-only public share links for saved projects

## Features

- Fabric.js canvas editor
- Text, shapes, image upload, gradients, rounded corners
- Multi-frame projects
- Layer selection with visibility toggle and simple reorder controls
- Sidebar-driven tool panels for templates, uploads, elements, text, photos, styles, and help
- Undo/redo
- ZIP import/export for full editor projects
- PNG export for the active frame
- NestJS backend with Swagger docs
- PostgreSQL project persistence
- PostgreSQL template persistence
- JWT authentication with protected project routes
- Debounced autosave for authenticated saved projects
- Public read-only share links for persisted projects
- Docker setup for client, server, and database

## Tech Stack

- Frontend: React, TypeScript, Vite, Fabric.js
- Backend: NestJS, TypeScript, TypeORM, JWT, class-validator
- Database: PostgreSQL
- DevOps: Docker Compose, GitHub Actions

## Architecture Overview

### Client

- Main editor UI currently lives in [client/src/App.tsx](client/src/App.tsx)
- The editor stores project state primarily as:

```ts
{
  frames: DesignFrame[]
}
```

- Each frame contains metadata such as size/background plus Fabric canvas JSON
- The frontend can persist this structure to the backend and also package it into ZIP exports

### Server

- NestJS app with auth + project CRUD endpoints
- Users authenticate with email/password
- JWT access tokens protect project routes
- Projects are stored in PostgreSQL as:
  - `id`
  - `name`
  - `description`
  - `data` as `jsonb`
  - `isPublic`
  - `shareSlug`
  - `createdAt`
  - `updatedAt`
  - `ownerId`

### Persistence Flow

1. The editor serializes the current frame/canvas state
2. The user logs in and receives a JWT access token
3. The frontend sends the full project payload to `/api/projects` with the `Authorization` header
4. NestJS validates the request DTO and resolves the authenticated user
5. TypeORM saves the project into PostgreSQL under that user
6. The saved project can later be loaded back into the editor by the same user
7. Owners can optionally enable a public read-only share link for a saved project

## Project Structure

```text
.
|-- client
|-- server
|-- docker-compose.yml
|-- deploy.sh
|-- .env.example
`-- README.md
```

## Environment Variables

Root `.env.example` contains Docker/backend settings:

- `CLIENT_PORT`
- `SERVER_PORT`
- `POSTGRES_PORT`
- `PORT`
- `DB_SYNCHRONIZE`
- `POSTGRES_HOST`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_SSL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

Client `.env.example` contains:

- `VITE_API_URL`

For normal local development with Vite proxy, `VITE_API_URL` can stay empty.

## Run Locally with Docker

```bash
docker compose up --build
```

Services after startup:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3000/api`
- Swagger docs: `http://localhost:3000/api/docs`
- PostgreSQL: `localhost:5432`

Notes:

- The frontend container talks to the backend through Nginx `/api` proxying
- The backend container talks to PostgreSQL through `POSTGRES_HOST=db`
- Docker Compose already wires the services together

## Run Locally without Full Docker

### 1. Start PostgreSQL only

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 2. Start backend

```bash
cd server
npm install
npm run start:dev
```

### 3. Start frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

In local Vite development, requests to `/api` are proxied to `http://localhost:3000`.

## API Overview

Current important endpoints:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/share`
- `DELETE /api/projects/:id/share`
- `GET /api/projects/shared/:slug`
- `GET /api/projects/:id/export/:format` (auth, formats: `json`, `png`, `pdf`)
- `GET /api/templates`
- `GET /api/templates/:id`
- `POST /api/templates` (auth)
- `PUT /api/templates/:id` (auth)
- `DELETE /api/templates/:id` (auth)

Swagger UI:

- `http://localhost:3000/api/docs`

## Development Utilities

Create or refresh the local demo login:

```bash
cd server
npm run seed:demo-user
```

Credentials:

- `email: demo@webster.local`
- `password: Demo123!`

The script is development-only. It hashes the password with the same bcrypt flow used by normal registration and marks the account as email-verified so it can log in immediately.

## How to Verify Persistence

Manual MVP flow to test before demo:

1. Register a new user
2. Log in
3. Create or edit a design
4. Save the project to backend
5. Reload the page
6. Log back in if needed
7. Open the saved project from the project list
8. Confirm the design is restored
9. Continue editing and save changes

Also test:

- save as new project
- wait 3 seconds after an edit on an already saved project and confirm autosave status changes from unsaved to saved
- as a guest, confirm the editor shows that autosave is unavailable
- generate a public share link for a saved project and open `/shared/:slug` in another browser/session
- confirm the shared page loads in read-only mode and cannot be saved back
- disable the share link and confirm the old `/shared/:slug` URL shows a friendly error
- delete saved project
- verify another user cannot access someone else's project
- click each sidebar button and confirm the corresponding panel opens
- export PNG
- export/import ZIP
- invalid ZIP import message

## Screenshots

Add screenshots before submission:

- `[ ]` editor home / canvas screen
- `[ ]` saved projects flow
- `[ ]` login / register flow
- `[ ]` Swagger API docs
- `[ ]` Dockerized running app

## Docker Notes

- `db` uses PostgreSQL 16 Alpine
- `server` waits for database health before starting
- `client` serves the Vite build through Nginx
- `/api` requests from the frontend container are proxied to the NestJS container

## Current MVP Limitations

- Templates are still lightweight starter formats rather than rich prebuilt designs
- No advanced image editing like crop/filters/masking
- The editor is still concentrated in one large React component
- Templates are persisted in PostgreSQL (seeded with starter templates on first run)
- Schema management currently uses TypeORM `synchronize`

## CI/CD

The repository includes GitHub Actions plus a self-hosted deployment flow.  
That infrastructure is optional for local development and does not affect the MVP editor flow.
