# DevSecOps Utilities

A lightweight suite combining **SonarQube Excel Exporter** and **Subdomain MasterSheet** for security analysis and infrastructure reconnaissance.

## Features

- **SonarQube Exporter**: Connects to SonarQube/SonarCloud APIs, categorizes issues (Security, Reliability, Maintainability), and exports styled multi-tab `.xlsx` reports with direct issue links.
- **Subdomain MasterSheet**: Parses DNS zone files (BIND, Route53, GoDaddy, CSV), streams real-time DNS & HTTP(S) probes via Server-Sent Events (SSE), and exports `.xlsx`/`.csv` asset sheets.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js 20, Express, TypeScript, ExcelJS, Multer

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Terminal 1: Backend API (http://localhost:3000)
npm run dev:backend

# Terminal 2: Frontend Dev Server (http://localhost:5173)
npm run dev:frontend
```

### Production Run

```bash
npm run build
npm start
```
Access at **`http://localhost:3000`**.

## Docker

### Using Docker Compose
```bash
docker compose up -d --build
```

### Using Docker CLI
```bash
docker build -t devsecops-utilities .
docker run -d -p 3000:3000 --name devsecops-utilities devsecops-utilities
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port for the application |
| `NODE_ENV` | `production` | Node environment (`development` / `production`) |
