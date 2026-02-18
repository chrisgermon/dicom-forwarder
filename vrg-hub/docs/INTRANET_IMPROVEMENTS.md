# Intranet Improvement Opportunities for a Single Company with Four Brands

This repository already includes robust primitives for brand-aware configuration, custom request workflows, and role-based access control. The following improvements build on those foundations to better serve a multi-brand organization.

## Unify Brand Identities Across the Experience
- Extend the existing brand records to store theme tokens (color palettes, typography, favicon) in addition to the logo metadata already managed in the Brands Manager. Surface those theme options through `CompanySettings` so divisions share consistent visuals without hard-coding brand assets. 【F:src/components/settings/BrandsManager.tsx†L1-L196】【F:src/components/CompanySettings.tsx†L1-L200】
- Expand the sidebar customization APIs so each brand can publish its own navigation presets. Persist the layout definitions alongside the current role-based menu overrides to let each division surface shortcuts that reflect its workflows. 【F:src/components/AppSidebar.tsx†L1-L200】

## Deliver Division-Specific Dashboards
- Introduce a dashboard module that composes the existing ticket queue, audit log, and request lists into brand-filtered snapshots. Start from the `TicketQueueManager` data shaping logic, add brand filters, and expose KPIs (SLA adherence, backlog size) tailored to each division's service mix. 【F:src/components/requests/admin/TicketQueueManager.tsx†L1-L200】
- Provide marketing, facilities, HR, and IT summaries by aggregating the request forms they own. The `DepartmentRequestTypeManager` already understands request ownership; leverage that metadata to drive dashboard widgets and email digests. 【F:src/components/requests/admin/DepartmentRequestTypeManager.tsx†L1-L200】

## Strengthen Cross-Brand Collaboration
- Enable shared knowledge bases by extending the canned responses and notification settings components with brand visibility scopes. Doing so lets one division contribute templates while keeping sensitive responses restricted to authorized teams. 【F:src/components/settings/CannedResponsesManager.tsx†L1-L200】【F:src/components/settings/NotificationSettingsManager.tsx†L1-L200】
- Build a unified people directory that blends the existing user and location managers. Combine the data retrieved in `UsersSection` and `LocationsManager` to generate brand-aware staffing maps and org charts. 【F:src/components/settings/UsersSection.tsx†L1-L200】【F:src/components/settings/LocationsManager.tsx†L1-L200】

## Automate Governance for Requests and Tickets
- Now that routing rules are optional, lean on the granular permissions introduced in `usePermissions` to expose automation policies. Offer guided setup wizards that configure escalation paths, SLA timers, and auto-assignments using the same Supabase tables consumed by the queue manager. 【F:src/hooks/usePermissions.tsx†L1-L200】【F:src/components/requests/admin/TicketQueueManager.tsx†L201-L253】
- Layer audit-friendly exports on top of the `TicketAuditLog` component so compliance teams can download CSV snapshots per brand, request type, or timeframe. 【F:src/components/requests/admin/TicketAuditLog.tsx†L1-L200】

## Simplify Administration for a Focused Tenant
- With only one tenant and four brands, streamline the settings landing page by grouping related controls (branding, locations, features) under brand-aware headings. The refactored tab layout in `Settings.tsx` demonstrates this approach and removes unused routing-rule configuration from the ticketing suite. 【F:src/pages/Settings.tsx†L1-L260】
- Add contextual help drawers to each settings card (for example, the form templates and menu editor) so administrators can preview the impact of changes without leaving the screen. The existing cards in `Settings.tsx` can render an additional `Dialog` trigger beside their primary actions. 【F:src/pages/Settings.tsx†L140-L230】

Implementing these enhancements will give every brand a consistent, purpose-built experience while keeping shared infrastructure maintainable.
