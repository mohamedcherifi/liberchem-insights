# Liberchem Insights Dashboard

A React (Vite) dashboard over Liberchem's Phase 1 POC data: Stock Tracking and Cost Analysis, with date-range comparisons, multi-dimension filters, and drill-down tables. Charts use Recharts. Data is mock/synthetic and embedded at build time — no backend.

**Live:** deployed via GitHub Actions to GitHub Pages on every push to `main`.

## Develop

```
npm install
npm run dev
```

## Build

```
npm run build
```

This is the public deploy mirror of the dashboard developed in Liberchem's (private) Phase 1 project repo, which also holds the source POC data and the script that generates `src/data/dashboard_data.json`.
