---
name: study-volume-monitoring
category: radiology
version: 1.0.0
author: chris@crowdit.com.au
created: 2026-02-03
updated: 2026-02-03
tags: [radiology, bigquery, pacs, ris, karisma, monitoring, analytics]
platforms: [claude, openclaw, n8n]
requires_tools: [bigquery_query, bigquery_list_tables, bigquery_describe_table]
---

# Radiology Study Volume Monitoring

## Purpose

Monitor imaging study volumes across Vision Radiology sites using BigQuery data. Identify anomalies, track trends, and alert on potential issues like equipment failures or workflow problems.

## When to Use

Trigger this skill when:
- Daily/weekly operations review
- User asks about study volumes or counts
- Checking for site performance issues
- Identifying equipment downtime
- Comparing modality volumes
- Keywords: studies, scans, volumes, PACS, RIS, Karisma

## Instructions

### Step 1: Query Current Study Volumes

```sql
-- Daily study volumes by site and modality (yesterday)
SELECT 
  WorkSiteName,
  Modality,
  COUNT(*) as StudyCount
FROM `vision-radiology.karisma_warehouse.vw_Study_Types`
WHERE DATE(StudyDate) = DATE_SUB(CURRENT_DATE('Australia/Melbourne'), INTERVAL 1 DAY)
GROUP BY WorkSiteName, Modality
ORDER BY WorkSiteName, StudyCount DESC
```

### Step 2: Compare to Historical Averages

```sql
-- 7-day average for comparison
SELECT 
  WorkSiteName,
  Modality,
  ROUND(AVG(daily_count), 1) as AvgDaily,
  ROUND(STDDEV(daily_count), 1) as StdDev
FROM (
  SELECT 
    WorkSiteName,
    Modality,
    DATE(StudyDate) as study_date,
    COUNT(*) as daily_count
  FROM `vision-radiology.karisma_warehouse.vw_Study_Types`
  WHERE StudyDate >= DATE_SUB(CURRENT_DATE('Australia/Melbourne'), INTERVAL 14 DAY)
    AND StudyDate < DATE_SUB(CURRENT_DATE('Australia/Melbourne'), INTERVAL 1 DAY)
  GROUP BY WorkSiteName, Modality, DATE(StudyDate)
)
GROUP BY WorkSiteName, Modality
```

### Step 3: Identify Anomalies

Flag sites where:
- **Volume Drop >20%**: Potential equipment or workflow issue
- **Volume Drop >50%**: Critical - likely outage
- **Zero Studies**: Site may be offline
- **Volume Spike >50%**: Unusual, verify data integrity

### Step 4: Present Volume Report

```markdown
## Vision Radiology Study Volume Report
**Date:** [Yesterday's Date]
**Generated:** [Current Time AEST]

### Summary
| Metric | Value |
|--------|-------|
| Total Sites | 41 |
| Total Studies | X,XXX |
| vs 7-day Avg | +/-X% |

### 🔴 Critical Alerts (>50% Variance)
| Site | Modality | Yesterday | 7-day Avg | Variance |
|------|----------|-----------|-----------|----------|
| Malvern | CT | 0 | 45 | -100% ⚠️ |

### ✅ Normal Operations
XX sites operating within normal range.
```

## Key Tables/Views

| View | Description |
|------|-------------|
| `vw_Study_Types` | Studies by modality, site, date |
| `vw_PACS_Studies_Extended` | PACS data with worksite info |
| `vw_Daily_Modality_Volume` | Pre-aggregated daily volumes |
| `vw_CT_Volume_By_Site` | CT-specific daily volumes |

## Tool Reference

| Tool | Purpose |
|------|---------|
| `bigquery_query` | Run SQL queries |
| `bigquery_describe_table` | Get table schema |
| `bigquery_list_tables` | List available tables |

## Notes

- BigQuery data syncs from Karisma RIS nightly at 2 AM AEST
- Weekends have naturally lower volumes (40-50% of weekday)
- Cross-reference with PACS table using: `PACS.AccessionNumber = Request_Record.InternalIdentifier`
