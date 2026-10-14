# DevSecOps Utilities Suite

Unified enterprise TypeScript & React suite combining:
1. **SonarQube Excel Exporter** — Connects to SonarQube / SonarCloud, categorizes issues across Security, Reliability, and Maintainability, and exports formatted multi-sheet `.xlsx` reports with clickable issue links and remediation guidance.
2. **Subdomain MasterSheet** — Parses BIND/GoDaddy/Route53/CSV zone files, streams concurrent DNS & HTTP/HTTPS host probes over Server-Sent Events (SSE), supports inline & batch IP descriptors, and exports styled `.xlsx` and `.csv` master sheets.

---

## Project Structure

```text
DevSecOps Utilities/
├── frontend/                   # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── components/
│       │   ├── common/         # Header, AlertBanner
│       │   ├── sonar/          # ConnectionForm, ProjectCard, MetricsOverview, IssueFilters, IssueTable, ExportModal
│       │   └── subdomain/      # SubdomainScanner, ImportDrawer, SubdomainFilterBar, SubdomainTable, BatchDescriptorModal
│       ├── services/
│       │   ├── sonar/          # sonarApi, sonarExcelExporter, sonarKnowledge
│       │   └── subdomain/      # subdomainApi
│       └── types/              # sonar.ts, subdomain.ts
│
├── backend/                    # Express + TypeScript API & Static Server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            # Express server entry point
│       ├── routes/             # sonar.routes.ts, subdomain.routes.ts
│       ├── services/           # dnsParser.ts, hostChecker.ts, subdomainExporter.ts
│       └── types/              # subdomain.types.ts
│
└── package.json                # Root workspace scripts
```

---

## Quick Start

### 1. Build Both Frontend & Backend
```bash
npm run build
```

### 2. Start Production Server (Port 3000)
```bash
npm start
```
Open **`http://localhost:3000`** in your browser.

### 3. Development Mode (Separate Frontend & Backend)
```bash
# Terminal 1: Start Backend API (http://localhost:3000)
npm run dev:backend

# Terminal 2: Start Vite Frontend Dev Server (http://localhost:5173)
npm run dev:frontend
```
