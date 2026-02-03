---
name: ticket-triage
category: msp
version: 1.0.0
author: chris@crowdit.com.au
created: 2026-02-03
updated: 2026-02-03
tags: [tickets, halopsa, prioritization, support, workflow]
platforms: [claude, openclaw, n8n]
requires_tools: [halopsa_search_tickets, halopsa_get_ticket, halopsa_get_clients, halopsa_update_ticket]
---

# Ticket Triage and Prioritization

## Purpose

Systematically evaluate and prioritize support tickets based on impact, urgency, client importance, and SLA requirements. Ensures critical issues are addressed first while maintaining fair queue management.

## When to Use

Trigger this skill when:
- Starting a shift or workday review
- User asks "what tickets need attention" or similar
- Queue has multiple unassigned tickets
- Asked to prioritize or sort tickets
- Checking for urgent or critical issues

Do NOT use this skill when:
- User asks about a specific known ticket
- Working on a single ticket already
- Creating a new ticket (use ticket-creation skill)

## Prerequisites

Before using this skill, ensure:
- [ ] HaloPSA access is available
- [ ] Current user/agent context is known
- [ ] Client tier information is accessible

## Instructions

### Step 1: Gather Current Queue State

Fetch all open tickets requiring attention:

```python
# Get open tickets
halopsa_search_tickets(status="open", limit=50)

# Get in-progress tickets
halopsa_search_tickets(status="in_progress", limit=50)

# Get pending/waiting tickets
halopsa_search_tickets(status="pending", limit=30)
```

### Step 2: Apply Priority Matrix

Score each ticket using this matrix:

| Factor | Weight | Scoring |
|--------|--------|---------|
| **Priority Level** | 40% | Critical=10, High=7, Medium=4, Low=1 |
| **Client Tier** | 25% | Enterprise=10, Business=6, Standard=3 |
| **Age (hours)** | 20% | >72h=10, >48h=7, >24h=4, <24h=1 |
| **SLA Status** | 15% | Breached=10, <1h=8, <4h=5, OK=1 |

**Client Tier Reference:**
- **Enterprise**: Vision Radiology, Crystal Radiology, Matrix Medical
- **Business**: Quantum Medical, Focus Radiology, Light Radiology
- **Standard**: All others

### Step 3: Categorize and Group

Group tickets by:

1. **🔴 Immediate Action Required**
   - Score > 7.5
   - SLA breached or imminent
   - Client operations impacted

2. **🟠 High Priority**
   - Score 5.0 - 7.5
   - Needs attention within 4 hours
   - Significant but not blocking

3. **🟡 Normal Priority**
   - Score 2.5 - 5.0
   - Standard workflow
   - Can be scheduled

4. **🟢 Low Priority**
   - Score < 2.5
   - Non-urgent requests
   - Projects, improvements

### Step 4: Present Triage Summary

Format output as:

```markdown
## Ticket Triage Summary
**Time:** [Current time AEST]
**Total Open:** [count]

### 🔴 Immediate Action Required ([count])
| ID | Client | Summary | Age | SLA |
|----|--------|---------|-----|-----|
| #123 | Vision Radiology | Server down | 2h | ⚠️ 1h remaining |

### 🟠 High Priority ([count])
...

### 🟡 Normal Priority ([count])
...

### 🟢 Low Priority ([count])
...

### Recommendations
1. [First recommended action]
2. [Second recommended action]
```

## Examples

### Example 1: Morning Queue Review

**User Request:**
> "What tickets need attention this morning?"

**AI Response:**
> ## Ticket Triage Summary
> **Time:** 8:30 AM AEST
> **Total Open:** 12
>
> ### 🔴 Immediate Action Required (2)
> | ID | Client | Summary | Age | SLA |
> |----|--------|---------|-----|-----|
> | #4521 | Vision Radiology | PACS connection timeout at Malvern | 3h | ⚠️ 45min remaining |
> | #4519 | Crystal Radiology | Unable to send reports | 5h | ❌ Breached |
>
> ### 🟠 High Priority (3)
> | ID | Client | Summary | Age | SLA |
> |----|--------|---------|-----|-----|
> | #4518 | Matrix Medical | Slow workstation performance | 8h | OK |
> | #4515 | Vision Radiology | Request for new user access | 12h | OK |
> | #4512 | Quantum Medical | Printer offline | 18h | OK |
>
> ### Recommendations
> 1. **#4521** - Check PACS connectivity at Malvern immediately, likely network issue
> 2. **#4519** - Contact Crystal about report sending - may need RIS investigation
> 3. Schedule #4512 for after critical tickets resolved

### Example 2: Specific Client Focus

**User Request:**
> "What's the ticket situation for Vision Radiology?"

**AI Response:**
> ## Vision Radiology Ticket Summary
> **Active Tickets:** 4
>
> | Priority | ID | Summary | Status | Age |
> |----------|-----|---------|--------|-----|
> | 🔴 Critical | #4521 | PACS connection timeout at Malvern | Open | 3h |
> | 🟡 Medium | #4515 | New user access request - Dr Smith | Pending | 12h |
> | 🟡 Medium | #4508 | Workstation refresh quote | Open | 2d |
> | 🟢 Low | #4492 | Documentation update request | Pending | 5d |
>
> **Recommendation:** Focus on #4521 first - PACS connectivity affects operations.

## Tool Reference

| Tool | Purpose | Example Call |
|------|---------|--------------|
| `halopsa_search_tickets` | Find tickets by criteria | `halopsa_search_tickets(status="open", client_name="Vision")` |
| `halopsa_get_ticket` | Get full ticket details | `halopsa_get_ticket(ticket_id=4521)` |
| `halopsa_get_clients` | List clients for tier lookup | `halopsa_get_clients(search="Vision")` |
| `halopsa_update_ticket` | Update priority/status | `halopsa_update_ticket(ticket_id=4521, status="in_progress")` |

## Output Format

Always include:
- Timestamp in AEST
- Total ticket count
- Grouped by priority level
- SLA status indicators (✅ OK, ⚠️ Warning, ❌ Breached)
- Actionable recommendations

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| No tickets returned | Empty queue or filter too narrow | Confirm status filters, try broader search |
| Client not found | Typo or inactive client | Check halopsa_get_clients for correct name |
| Timeout | Large ticket volume | Add date filter to reduce scope |

## Related Skills

- `alert-response.md` - Handling monitoring alerts that may generate tickets
- `client-overview.md` - Getting full client context
- `sla-management.md` - Understanding SLA tiers and requirements

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-03 | Initial release |

## Notes

- Client tier information should be periodically updated as contracts change
- SLA times are based on HaloPSA configuration - verify accuracy
- For after-hours triage, adjust urgency for business-critical systems only
- Vision Radiology tickets often warrant higher priority due to contract size
