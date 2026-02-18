# Performance Assessment

Assessment date: February 2025. Areas for improvement and what’s already in good shape.

---

## High impact

### 1. CPD All Records – unbounded query

**File:** `src/pages/CpdAllRecords.tsx`  
**Issue:** The list fetches all CPD attendance records with no `.range()` or `.limit()`:

```ts
.from("cpd_attendance")
.select(`*`, ...)
.order("attendance_date", { ascending: false });
```

**Impact:** With thousands of records, load time and memory grow with data size.

**Recommendation:** Add server-side pagination (e.g. `.range(from, to)`) and optional infinite scroll or “Load more”, or a fixed page size (e.g. 100) with pagination controls. Consider selecting only columns needed for the list view instead of `*`.

---

### 2. Requests list – over-fetching columns

**File:** `src/hooks/useRequests.ts`  
**Issue:** The list query uses:

```ts
.select('*, request_number, request_types:request_type_id(name)', { count: 'exact' })
```

So every column from `tickets` is fetched for each row. The list UI only needs a subset (id, title, status, priority, created_at, user_id, assigned_to, request_number, request_types).

**Impact:** Larger payloads and more work for Supabase and the client, especially with many rows per page.

**Recommendation:** Replace `*` with an explicit list of columns needed for the list view (and any required FKs for joins). Use full `*` or a wider select only for the detail view (e.g. RequestDetail).

---

### 3. UnifiedRequestsList – no pagination

**File:** `src/components/requests/UnifiedRequestsList.tsx`  
**Issue:** This component loads all matching requests in one go (no `.range()`), then filters and sorts in the client. It uses local state + `useEffect` instead of React Query.

**Impact:** With many requests, first load is slow and memory usage is high. Also no shared cache with the rest of the app.

**Recommendation:** If this list is still used anywhere, switch to the same pattern as `RequestsList`: use `useRequests` (or an equivalent hook) with server-side pagination and React Query. If it’s unused, remove it to avoid confusion.

---

### 4. Company directory – full load per brand

**File:** `src/hooks/useDirectory.ts`  
**Issue:** For a given brand, the hook loads all categories, clinics, and contacts with `select('*')` and no limit. All three tables are loaded in full when the user selects a brand.

**Impact:** For brands with many clinics/contacts, initial load and memory can be high. Filtering is done client-side.

**Recommendation:** For very large directories, consider:
- Pagination or virtual scrolling for clinics/contacts (e.g. only load the first N, then “Load more” or virtualized list).
- Selecting only the columns needed for list/card view instead of `*`.
- Keeping the current approach for small/medium directories and optimizing when you see real scale.

---

## Medium impact

### 5. Virtualization only in SharePoint table

**File:** `src/components/documentation/VirtualizedTable.tsx` is the only place using `@tanstack/react-virtual`.

**Issue:** Other long lists (e.g. CPD All Records, Audit Log, RBAC tables, Notifications, some admin tables) render full arrays with `.map()`. With hundreds of rows, this can hurt scroll performance and increase DOM size.

**Recommendation:** For any list that can grow beyond ~50–100 rows, consider:
- Using `useVirtualizer` (or a similar pattern) so only visible rows are in the DOM, or
- Keeping server-side pagination and a fixed page size so the DOM stays small.

Prioritize lists that are known to have large datasets (e.g. CPD records, audit log).

---

### 6. Request detail – multiple round-trips

**File:** `src/pages/RequestDetail.tsx`  
**Issue:** The main request is loaded first, then six related entities (profiles, request_type, category, brand, location) are fetched in parallel with `Promise.all`. That’s 1 + 6 round-trips per detail view.

**Impact:** Detail view always has at least two network steps; latency adds up on slow connections.

**Recommendation:** If Supabase supports it, consider a single query or RPC that returns the ticket plus related lookups (e.g. via embedded selects or a database function) so the detail view can be loaded in one round-trip. Otherwise, the current parallel approach is acceptable; this is an optimization, not a bug.

---

### 7. Duplicate “upcoming reminders” queries

**Files:** `src/pages/Reminders.tsx` uses `['upcoming-reminders']`, `src/pages/NewReminder.tsx` uses `['upcoming-reminders-sidebar']`.

**Issue:** Different query keys for what is likely the same or very similar data, so both can be fetched when the user moves between Reminders and New Reminder.

**Recommendation:** Use a single query key (e.g. `['upcoming-reminders']`) and the same query function in both places so React Query caches and deduplicates. Pass a flag or param only if the sidebar needs a different shape or limit.

---

## Lower impact / already good

### 8. QueryClient defaults

**File:** `src/App.tsx`  
**Current:** `staleTime: 5 * 60 * 1000`, `gcTime: 10 * 60 * 1000`, `retry: 1`.

**Assessment:** Sensible defaults that reduce unnecessary refetches and retries. No change needed.

---

### 9. Route-level code splitting

**File:** `src/App.tsx`  
**Current:** High-traffic routes (Home, Requests, RequestDetail, EditRequest, Settings, Auth, etc.) are eagerly imported; many others are loaded with `lazy()`.

**Assessment:** Good balance for initial load and per-route bundles. Keep as is unless you add new heavy routes.

---

### 10. Vite build configuration

**File:** `vite.config.ts`  
**Current:** `manualChunks` split vendor code (React, UI, Supabase, TanStack, forms, icons, utils, remotion, charts, quill, documents, dnd). `chunkSizeWarningLimit: 1000` (kB).

**Assessment:** Chunking is in good shape. Consider monitoring chunk sizes (e.g. `vite build --mode production` and inspect `dist`) so no single chunk grows too large. Optional: add a smaller warning limit (e.g. 500) to catch regressions.

---

### 11. Global search – debounce

**File:** `src/components/GlobalSearch.tsx`  
**Current:** Search runs in a `useEffect` with a 300 ms `setTimeout` on `search` change.

**Assessment:** Debouncing is in place; avoid reducing the delay too much to prevent excessive API calls while typing.

---

### 12. Notifications – limit 100

**File:** `src/pages/Notifications.tsx`  
**Current:** Query uses `.limit(100)` and `refetchInterval: 60000`.

**Assessment:** Bounded and refreshed on an interval. Fine unless you need older notifications; then add pagination or “Load more”.

---

## Optional refinements

### 13. RBAC context re-renders

**File:** `src/contexts/RBACContext.tsx`  
**Idea:** If the context value (object with `hasPermission`, `userRoles`, etc.) is recreated every render, every consumer re-renders when the provider re-renders.

**Recommendation:** Memoize the context value with `useMemo` so the object reference only changes when permissions/roles actually change. Only do this if you see unnecessary re-renders in permission-heavy trees.

---

### 14. Heavy chunks (documents, Remotion)

**Current:** `vendor-documents` (docx, jspdf, xlsx, file-saver) and `vendor-remotion` are in separate chunks and loaded via lazy routes.

**Assessment:** They only load when the user hits routes that use them. No change needed unless you add more heavy libs; then keep them in their own chunks and behind lazy routes.

---

## Summary

| Priority | Area | Action |
|----------|------|--------|
| High | CPD All Records | Add pagination (and/or limit) and trim select list |
| High | useRequests list | Select only needed columns instead of `*` |
| High | UnifiedRequestsList | Add pagination + React Query, or remove if unused |
| High | useDirectory | Consider pagination/select for large brands |
| Medium | Long lists | Add virtualization or strict pagination where rows can be 100+ |
| Medium | RequestDetail | Consider one query/RPC for ticket + related data |
| Medium | Upcoming reminders | Unify query key and query for Reminders + NewReminder |
| Low | RBAC context | Memoize context value if re-renders are an issue |
| Low | Build | Monitor chunk sizes; optional lower chunk warning |

Implementing the high-impact items (especially CPD pagination and request list column selection) will give the largest benefit for data-heavy pages. The rest can be scheduled as you see real usage and metrics.
