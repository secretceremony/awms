# AWMS (ALSSA Warehouse Management System)

Welcome to the **ALSSA Warehouse Management System (AWMS)** repository. This repository contains the unified frontend and backend infrastructure designed to run as a monorepo workspace.

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: NestJS (v11)
- **Database & ORM**: PostgreSQL + Prisma (v7)

---

## Project Structure

```text
awms/
├── backend/            # NestJS Backend Application
│   ├── prisma/         # Prisma Schema and Migrations
│   ├── src/            # NestJS Source Code
│   │   ├── prisma.service.ts # Connection Lifecycle Management
│   │   └── main.ts     # Entry point loading ConfigService & CORS
│   ├── .env            # Local backend env file (excluded from git)
│   └── tsconfig.json   # TypeScript settings (nodenext resolution)
├── frontend/           # React Frontend Application
│   ├── src/            # React Source Code
│   │   ├── App.tsx     # Premium UI panel showing connection status
│   │   └── index.css   # Main css reset
│   ├── .env.development# Local development configuration
│   └── .env.production # Production environment configuration
├── .env.example        # Root environment configuration template
├── package.json        # Root package defining workspaces & run commands
└── README.md           # This execution guide
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18+ recommended)
- **NPM** (v9+ recommended)
- **PostgreSQL** database running locally or accessible via network

### Installation

1. Clone or download the repository to your workspace.
2. In the root directory, run the bootstrap command to install all workspace dependencies (both frontend and backend):
   ```bash
   npm install
   ```

### Configuration

#### 1. Setup Environment Variables
- Copy the `.env.example` in the root folder and rename it to `.env` inside the `backend/` folder:
  ```bash
  cp .env.example backend/.env
  ```
- Edit `backend/.env` with your PostgreSQL database credentials:
  ```env
  DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>?schema=public"
  ```

#### 2. Generate Prisma Client
Once your `.env` database connection URL is specified, generate the Prisma Client using the Prisma CLI:
```bash
npx prisma generate --workspace=backend
```

---

## Running the Application

In the project root, you can use the workspace scripts to manage both services:

### Development Mode

Run both the React frontend and NestJS backend development servers concurrently:
```bash
npm run dev
```
- **Backend** runs on [http://localhost:3000](http://localhost:3000)
- **Frontend** runs on [http://localhost:5173](http://localhost:5173)

### Individual Execution
If you prefer running frontend or backend separately, use these workspace scripts:
- **Run Backend Only**: `npm run dev:backend`
- **Run Frontend Only**: `npm run dev:frontend`

### Production Build
Compile both projects for production release:
```bash
npm run build
```
- Built backend code goes into `backend/dist`
- Built frontend static files go into `frontend/dist`

### Code Quality & Formatting
Run workspace-wide linting checks:
```bash
npm run lint
```
