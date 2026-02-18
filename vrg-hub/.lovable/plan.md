

# MLO Dashboard and Performance Dashboard Improvements

## Overview
This plan implements five enhancements across the MLO Dashboard and MLO Performance Dashboard pages to improve visibility, actionability, and reporting capabilities.

---

## 1. Trend Indicators on MLO Dashboard Stat Cards

Add period-over-period comparison to the four stat cards (Total Visits, Target Progress, Assigned Worksites, Pending Follow-ups) on the MLO Dashboard.

**What changes:**
- Fetch previous period visits using the existing `useMloVisits` hook with the prior month/quarter date range
- Show the existing `TrendIndicator` component below each stat value comparing current vs previous period
- Example: "Total Visits: 42" with a green "+15%" badge underneath

**Files modified:**
- `src/pages/MloDashboard.tsx` - Add previous period data fetching and render `TrendIndicator` in each stat card

---

## 2. Overdue Follow-up Alerts

Add a prominent overdue follow-up section to the MLO Dashboard that highlights follow-ups past their scheduled date.

**What changes:**
- Create a new hook `useMloOverdueFollowUps` that queries visits where `follow_up_date < today` and `follow_up_completed = false`
- Add an alert banner at the top of the dashboard (red/amber) when overdue items exist, showing count and a "View" link
- In the existing "Upcoming Follow-ups" card, separate overdue items into a distinct group with red styling

**Files modified:**
- `src/hooks/useMloData.ts` - Add `useMloOverdueFollowUps` hook
- `src/pages/MloDashboard.tsx` - Add overdue alert banner and split follow-ups list

---

## 3. Worksite Comparison Table View

Add a toggle on the MLO Performance Dashboard to switch between the existing card grid view and a sortable table view for worksites.

**What changes:**
- Create a new `BigQueryWorksiteTable` component that renders worksites in a sortable table with columns: Worksite Name, Patients, Requests, Procedures, Growth %, and Assigned MLO
- Add a Grid/Table toggle button in the Performance Dashboard filter row
- Growth % is calculated using the existing previous-period data comparison
- Table columns are sortable by clicking headers

**Files created:**
- `src/components/mlo/BigQueryWorksiteTable.tsx`

**Files modified:**
- `src/pages/MloPerformanceDashboard.tsx` - Add view toggle state and conditionally render table or grid

---

## 4. Goal Pacing Indicator on Performance Gauge

Enhance the `MloPerformanceGauge` to show a projected end-of-period estimate based on the current daily run rate.

**What changes:**
- Accept new props: `periodStartDate`, `periodEndDate`
- Calculate days elapsed and days remaining in the period
- Compute daily run rate = actual / days elapsed
- Project end-of-period total = actual + (daily rate * days remaining)
- Display "Projected: X,XXX" and "On pace to hit XX% of target" below the progress bar
- Color-code projection (green if projected >= target, amber if projected >= 80%, red otherwise)

**Files modified:**
- `src/components/mlo/MloPerformanceGauge.tsx` - Add pacing calculation and display
- `src/pages/MloPerformanceDashboard.tsx` - Pass date range props to the gauge

---

## 5. Performance Report Export

Add an "Export Report" button to the MLO Performance Dashboard that generates a CSV summary.

**What changes:**
- Add a Download/Export button next to the Share button in the Performance Dashboard header
- On click, generate a CSV containing:
  - MLO name, date range
  - Summary row: total patients, requests, procedures, target, achievement %
  - Per-worksite rows: worksite name, patients, requests, procedures, growth %
  - Per-modality rows: modality name, target, actual, achievement %
- Use browser-native Blob download (no additional dependencies needed since `file-saver` is already installed)

**Files created:**
- `src/lib/mloExportUtils.ts` - CSV generation utility functions

**Files modified:**
- `src/pages/MloPerformanceDashboard.tsx` - Add Export button and wire up the download

---

## Technical Details

### Data Flow for Trend Indicators (Item 1)
```text
MloDashboard
  |-- useMloVisits(userId, currentPeriod) --> current stats
  |-- useMloVisits(userId, previousPeriod) --> previous stats
  |-- useMloPerformanceStats(userId, previousPeriod) --> previous performance
  |-- TrendIndicator(current, previous) --> renders in each card
```

### Overdue Follow-ups Query (Item 2)
```text
SELECT * FROM mlo_visits
WHERE user_id = $userId
  AND follow_up_completed = false
  AND follow_up_date < CURRENT_DATE
ORDER BY follow_up_date ASC
```

### Pacing Calculation (Item 4)
```text
daysElapsed = today - periodStart
daysTotal = periodEnd - periodStart
dailyRate = actual / daysElapsed
projected = actual + (dailyRate * (daysTotal - daysElapsed))
pacePercentage = (projected / target) * 100
```

### CSV Export Structure (Item 5)
```text
Row 1: MLO Performance Report
Row 2: MLO, Date Range, Generated
Row 3: (blank)
Row 4: SUMMARY
Row 5: Patients, Requests, Procedures, Target, Achievement%
Row 6: (blank)
Row 7: WORKSITES
Row 8: Name, Patients, Requests, Procedures, Growth%
...
Row N: MODALITY BREAKDOWN
Row N+1: Modality, Target, Actual, Achievement%
```

### No Database Changes Required
All improvements use existing data and hooks. No new tables, columns, or RLS policies are needed.

