"""
Jira Cloud Integration Tools for Crowd IT MCP Server

This module provides comprehensive Jira project and issue management capabilities
using the Jira Cloud REST API v3.

Capabilities:
- Search issues using JQL (Jira Query Language)
- Get, create, update, and transition issues
- Add comments and worklogs
- List projects, boards, and sprints
- Manage issue assignments and priorities

Authentication: Uses Basic Auth with API token (email:api_token base64-encoded).

Environment Variables:
    JIRA_DOMAIN: Atlassian domain (e.g., optiqhr.atlassian.net)
    JIRA_EMAIL: Email address for the Jira account
    JIRA_API_TOKEN: API token generated from Atlassian account settings
"""

import os
import json
import logging
import base64
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


# =============================================================================
# Configuration and Authentication
# =============================================================================

class JiraConfig:
    """Jira Cloud configuration using Basic Auth with API token."""

    def __init__(self):
        self.domain = os.getenv("JIRA_DOMAIN", "")  # e.g., optiqhr.atlassian.net
        self.email = os.getenv("JIRA_EMAIL", "")
        self._api_token: Optional[str] = None
        self.base_url = f"https://{self.domain}/rest/api/3" if self.domain else ""

    @property
    def api_token(self) -> str:
        if self._api_token:
            return self._api_token

        # Try Secret Manager first
        try:
            from app.core.config import get_secret_sync
            secret = get_secret_sync("JIRA_API_TOKEN")
            if secret:
                self._api_token = secret
                return secret
        except Exception:
            pass

        self._api_token = os.getenv("JIRA_API_TOKEN", "")
        return self._api_token

    @property
    def is_configured(self) -> bool:
        return all([self.domain, self.email, self.api_token])

    def _get_auth_header(self) -> str:
        """Build Basic Auth header value from email and API token."""
        credentials = f"{self.email}:{self.api_token}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"

    async def jira_request(self, method: str, endpoint: str,
                           params: dict = None, json_body: dict = None) -> Any:
        """Make a Jira REST API request."""
        import httpx

        url = f"{self.base_url}{endpoint}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=method,
                url=url,
                headers={
                    "Authorization": self._get_auth_header(),
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                params=params,
                json=json_body
            )
            response.raise_for_status()

            if response.status_code == 204:
                return {"status": "success"}
            return response.json()


# =============================================================================
# Helper Functions
# =============================================================================

def format_issue_summary(issue: dict, include_description: bool = False) -> dict:
    """Format a Jira issue into a clean summary for AI processing."""
    fields = issue.get("fields", {})

    result = {
        "key": issue.get("key", ""),
        "id": issue.get("id", ""),
        "summary": fields.get("summary", ""),
        "status": _safe_name(fields.get("status")),
        "priority": _safe_name(fields.get("priority")),
        "issue_type": _safe_name(fields.get("issuetype")),
        "assignee": _safe_display_name(fields.get("assignee")),
        "reporter": _safe_display_name(fields.get("reporter")),
        "project": _safe_name(fields.get("project")),
        "created": fields.get("created", ""),
        "updated": fields.get("updated", ""),
        "labels": fields.get("labels", []),
        "resolution": _safe_name(fields.get("resolution")),
    }

    # Due date
    due_date = fields.get("duedate")
    if due_date:
        result["due_date"] = due_date

    # Components
    components = fields.get("components", [])
    if components:
        result["components"] = [c.get("name", "") for c in components]

    # Fix versions
    fix_versions = fields.get("fixVersions", [])
    if fix_versions:
        result["fix_versions"] = [v.get("name", "") for v in fix_versions]

    # Sprint info (if available in customfields or standard fields)
    sprint = fields.get("sprint")
    if sprint:
        result["sprint"] = sprint.get("name", "") if isinstance(sprint, dict) else str(sprint)

    if include_description:
        description = fields.get("description")
        if description:
            # Jira v3 uses ADF (Atlassian Document Format) for description
            result["description"] = _adf_to_text(description)
        else:
            result["description"] = ""

    return result


def _safe_name(obj: Any) -> str:
    """Safely extract name from a Jira field object."""
    if obj is None:
        return ""
    if isinstance(obj, dict):
        return obj.get("name", "")
    return str(obj)


def _safe_display_name(obj: Any) -> str:
    """Safely extract displayName from a Jira user object."""
    if obj is None:
        return "Unassigned"
    if isinstance(obj, dict):
        return obj.get("displayName", obj.get("emailAddress", ""))
    return str(obj)


def _adf_to_text(adf: Any) -> str:
    """Convert Atlassian Document Format (ADF) to plain text."""
    if isinstance(adf, str):
        return adf
    if not isinstance(adf, dict):
        return str(adf)

    parts = []
    for node in adf.get("content", []):
        node_type = node.get("type", "")
        if node_type == "paragraph":
            text_parts = []
            for inline in node.get("content", []):
                if inline.get("type") == "text":
                    text_parts.append(inline.get("text", ""))
                elif inline.get("type") == "mention":
                    text_parts.append(f"@{inline.get('attrs', {}).get('text', '')}")
                elif inline.get("type") == "hardBreak":
                    text_parts.append("\n")
            parts.append("".join(text_parts))
        elif node_type == "heading":
            text_parts = []
            for inline in node.get("content", []):
                if inline.get("type") == "text":
                    text_parts.append(inline.get("text", ""))
            level = node.get("attrs", {}).get("level", 1)
            parts.append(f"{'#' * level} {''.join(text_parts)}")
        elif node_type == "bulletList":
            for item in node.get("content", []):
                if item.get("type") == "listItem":
                    item_text = _adf_to_text(item)
                    parts.append(f"  - {item_text}")
        elif node_type == "orderedList":
            for i, item in enumerate(node.get("content", []), 1):
                if item.get("type") == "listItem":
                    item_text = _adf_to_text(item)
                    parts.append(f"  {i}. {item_text}")
        elif node_type == "codeBlock":
            text_parts = []
            for inline in node.get("content", []):
                if inline.get("type") == "text":
                    text_parts.append(inline.get("text", ""))
            lang = node.get("attrs", {}).get("language", "")
            parts.append(f"```{lang}\n{''.join(text_parts)}\n```")
        elif node_type == "blockquote":
            inner = _adf_to_text(node)
            parts.append(f"> {inner}")
        elif node_type == "table":
            for row in node.get("content", []):
                cells = []
                for cell in row.get("content", []):
                    cells.append(_adf_to_text(cell))
                parts.append(" | ".join(cells))
        elif node_type in ("listItem", "tableCell", "tableHeader"):
            # Recurse into container nodes
            parts.append(_adf_to_text(node))
        else:
            # Fallback: recurse
            inner = _adf_to_text(node)
            if inner:
                parts.append(inner)

    return "\n".join(parts)


def _text_to_adf(text: str) -> dict:
    """Convert plain text to Atlassian Document Format (ADF)."""
    paragraphs = text.split("\n\n") if "\n\n" in text else [text]
    content = []
    for para in paragraphs:
        if para.strip():
            content.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": para.strip()}]
            })
    return {
        "version": 1,
        "type": "doc",
        "content": content
    }


def format_comment(comment: dict) -> dict:
    """Format a Jira comment for display."""
    return {
        "id": comment.get("id", ""),
        "author": _safe_display_name(comment.get("author")),
        "body": _adf_to_text(comment.get("body", {})),
        "created": comment.get("created", ""),
        "updated": comment.get("updated", ""),
    }


# =============================================================================
# Tool Registration
# =============================================================================

def register_jira_tools(mcp, jira_config: 'JiraConfig'):
    """Register all Jira tools with the MCP server."""

    # =========================================================================
    # PROJECT LISTING
    # =========================================================================

    @mcp.tool(
        name="jira_list_projects",
        annotations={
            "title": "List Jira Projects",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_list_projects(
        max_results: int = 50,
        start_at: int = 0
    ) -> str:
        """List all accessible Jira projects.

        Args:
            max_results: Maximum number of projects to return (default 50)
            start_at: Index of the first project to return for pagination

        Returns a list of projects with key, name, lead, and type.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            data = await jira_config.jira_request(
                "GET", "/project/search",
                params={"maxResults": max_results, "startAt": start_at}
            )

            projects = []
            for p in data.get("values", []):
                projects.append({
                    "key": p.get("key", ""),
                    "name": p.get("name", ""),
                    "lead": _safe_display_name(p.get("lead")),
                    "project_type": p.get("projectTypeKey", ""),
                    "style": p.get("style", ""),
                })

            return json.dumps({
                "total": data.get("total", len(projects)),
                "projects": projects
            }, indent=2)

        except Exception as e:
            return f"Error listing Jira projects: {str(e)}"

    # =========================================================================
    # ISSUE SEARCH (JQL)
    # =========================================================================

    @mcp.tool(
        name="jira_search_issues",
        annotations={
            "title": "Search Jira Issues (JQL)",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_search_issues(
        jql: str,
        max_results: int = 25,
        start_at: int = 0,
        fields: str = ""
    ) -> str:
        """Search Jira issues using JQL (Jira Query Language).

        Args:
            jql: JQL query string (e.g., 'project = HR AND status = "To Do"', 'assignee = currentUser() ORDER BY priority DESC')
            max_results: Maximum number of issues to return (default 25, max 100)
            start_at: Index of the first issue to return for pagination
            fields: Comma-separated list of fields to return (empty = default fields)

        Common JQL examples:
        - 'project = HR' - All issues in HR project
        - 'status = "In Progress"' - All in-progress issues
        - 'assignee = currentUser()' - Issues assigned to the authenticated user
        - 'priority = High AND status != Done' - High priority open issues
        - 'created >= -7d' - Issues created in the last 7 days
        - 'labels = bug ORDER BY priority DESC' - Bug-labelled issues sorted by priority

        Returns a list of issue summaries.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            params = {
                "jql": jql,
                "maxResults": min(max_results, 100),
                "startAt": start_at,
            }
            if fields:
                params["fields"] = fields

            data = await jira_config.jira_request("GET", "/search", params=params)

            issues = []
            for issue in data.get("issues", []):
                issues.append(format_issue_summary(issue))

            return json.dumps({
                "total": data.get("total", 0),
                "start_at": data.get("startAt", 0),
                "max_results": data.get("maxResults", max_results),
                "issues": issues
            }, indent=2)

        except Exception as e:
            return f"Error searching Jira issues: {str(e)}"

    # =========================================================================
    # GET SINGLE ISSUE
    # =========================================================================

    @mcp.tool(
        name="jira_get_issue",
        annotations={
            "title": "Get Jira Issue Details",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_get_issue(
        issue_key: str,
        include_comments: bool = True
    ) -> str:
        """Get detailed information about a specific Jira issue.

        Args:
            issue_key: The issue key (e.g., 'HR-123', 'PROJ-456')
            include_comments: Whether to include comments (default True)

        Returns full issue details including description, comments, and metadata.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            params = {}
            if include_comments:
                params["expand"] = "renderedFields"

            data = await jira_config.jira_request(
                "GET", f"/issue/{issue_key}", params=params
            )

            result = format_issue_summary(data, include_description=True)

            # Add comments if requested
            if include_comments:
                comments_data = data.get("fields", {}).get("comment", {})
                comments = comments_data.get("comments", [])
                result["comments"] = [format_comment(c) for c in comments]
                result["comment_count"] = comments_data.get("total", len(comments))

            # Add subtasks
            subtasks = data.get("fields", {}).get("subtasks", [])
            if subtasks:
                result["subtasks"] = [
                    {
                        "key": st.get("key", ""),
                        "summary": st.get("fields", {}).get("summary", ""),
                        "status": _safe_name(st.get("fields", {}).get("status")),
                        "issue_type": _safe_name(st.get("fields", {}).get("issuetype")),
                    }
                    for st in subtasks
                ]

            # Add links
            links = data.get("fields", {}).get("issuelinks", [])
            if links:
                result["links"] = []
                for link in links:
                    link_info = {"type": link.get("type", {}).get("name", "")}
                    if "outwardIssue" in link:
                        link_info["direction"] = "outward"
                        link_info["description"] = link.get("type", {}).get("outward", "")
                        link_info["issue_key"] = link["outwardIssue"].get("key", "")
                        link_info["summary"] = link["outwardIssue"].get("fields", {}).get("summary", "")
                    elif "inwardIssue" in link:
                        link_info["direction"] = "inward"
                        link_info["description"] = link.get("type", {}).get("inward", "")
                        link_info["issue_key"] = link["inwardIssue"].get("key", "")
                        link_info["summary"] = link["inwardIssue"].get("fields", {}).get("summary", "")
                    result["links"].append(link_info)

            # Web URL for easy access
            result["url"] = f"https://{jira_config.domain}/browse/{issue_key}"

            return json.dumps(result, indent=2)

        except Exception as e:
            return f"Error getting Jira issue {issue_key}: {str(e)}"

    # =========================================================================
    # CREATE ISSUE
    # =========================================================================

    @mcp.tool(
        name="jira_create_issue",
        annotations={
            "title": "Create Jira Issue",
            "readOnlyHint": False,
            "destructiveHint": False,
            "idempotentHint": False,
            "openWorldHint": True
        }
    )
    async def jira_create_issue(
        project_key: str,
        summary: str,
        issue_type: str = "Task",
        description: str = "",
        priority: str = "",
        assignee_account_id: str = "",
        labels: str = "",
        due_date: str = "",
        parent_key: str = ""
    ) -> str:
        """Create a new Jira issue.

        Args:
            project_key: Project key (e.g., 'HR', 'PROJ')
            summary: Issue title/summary
            issue_type: Issue type - 'Task', 'Bug', 'Story', 'Epic', 'Sub-task' (default 'Task')
            description: Issue description (plain text, will be converted to ADF)
            priority: Priority name - 'Highest', 'High', 'Medium', 'Low', 'Lowest' (empty = project default)
            assignee_account_id: Atlassian account ID of assignee (use jira_find_users to look up)
            labels: Comma-separated labels (e.g., 'bug,urgent')
            due_date: Due date in YYYY-MM-DD format
            parent_key: Parent issue key for sub-tasks (e.g., 'HR-100')

        Returns the created issue key and URL.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            fields = {
                "project": {"key": project_key},
                "summary": summary,
                "issuetype": {"name": issue_type},
            }

            if description:
                fields["description"] = _text_to_adf(description)

            if priority:
                fields["priority"] = {"name": priority}

            if assignee_account_id:
                fields["assignee"] = {"accountId": assignee_account_id}

            if labels:
                fields["labels"] = [l.strip() for l in labels.split(",")]

            if due_date:
                fields["duedate"] = due_date

            if parent_key:
                fields["parent"] = {"key": parent_key}

            data = await jira_config.jira_request(
                "POST", "/issue",
                json_body={"fields": fields}
            )

            issue_key = data.get("key", "")
            return json.dumps({
                "key": issue_key,
                "id": data.get("id", ""),
                "url": f"https://{jira_config.domain}/browse/{issue_key}",
                "message": f"Issue {issue_key} created successfully"
            }, indent=2)

        except Exception as e:
            return f"Error creating Jira issue: {str(e)}"

    # =========================================================================
    # UPDATE ISSUE
    # =========================================================================

    @mcp.tool(
        name="jira_update_issue",
        annotations={
            "title": "Update Jira Issue",
            "readOnlyHint": False,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_update_issue(
        issue_key: str,
        summary: str = "",
        description: str = "",
        priority: str = "",
        assignee_account_id: str = "",
        labels: str = "",
        due_date: str = ""
    ) -> str:
        """Update an existing Jira issue's fields.

        Args:
            issue_key: The issue key (e.g., 'HR-123')
            summary: New summary/title (empty = no change)
            description: New description in plain text (empty = no change)
            priority: New priority name (empty = no change)
            assignee_account_id: New assignee account ID (empty = no change)
            labels: New comma-separated labels - replaces existing (empty = no change)
            due_date: New due date in YYYY-MM-DD format (empty = no change)

        Returns success confirmation.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            fields = {}

            if summary:
                fields["summary"] = summary
            if description:
                fields["description"] = _text_to_adf(description)
            if priority:
                fields["priority"] = {"name": priority}
            if assignee_account_id:
                fields["assignee"] = {"accountId": assignee_account_id}
            if labels:
                fields["labels"] = [l.strip() for l in labels.split(",")]
            if due_date:
                fields["duedate"] = due_date

            if not fields:
                return "Error: No fields specified to update."

            await jira_config.jira_request(
                "PUT", f"/issue/{issue_key}",
                json_body={"fields": fields}
            )

            return json.dumps({
                "key": issue_key,
                "url": f"https://{jira_config.domain}/browse/{issue_key}",
                "message": f"Issue {issue_key} updated successfully",
                "fields_updated": list(fields.keys())
            }, indent=2)

        except Exception as e:
            return f"Error updating Jira issue {issue_key}: {str(e)}"

    # =========================================================================
    # TRANSITION ISSUE (change status)
    # =========================================================================

    @mcp.tool(
        name="jira_get_transitions",
        annotations={
            "title": "Get Issue Transitions",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_get_transitions(
        issue_key: str
    ) -> str:
        """Get available status transitions for a Jira issue.

        Args:
            issue_key: The issue key (e.g., 'HR-123')

        Returns a list of available transitions (status changes) for the issue.
        Use the transition ID with jira_transition_issue to change the issue's status.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            data = await jira_config.jira_request(
                "GET", f"/issue/{issue_key}/transitions"
            )

            transitions = []
            for t in data.get("transitions", []):
                transitions.append({
                    "id": t.get("id", ""),
                    "name": t.get("name", ""),
                    "to_status": _safe_name(t.get("to")),
                })

            return json.dumps({
                "issue_key": issue_key,
                "transitions": transitions
            }, indent=2)

        except Exception as e:
            return f"Error getting transitions for {issue_key}: {str(e)}"

    @mcp.tool(
        name="jira_transition_issue",
        annotations={
            "title": "Transition Jira Issue",
            "readOnlyHint": False,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_transition_issue(
        issue_key: str,
        transition_id: str,
        comment: str = ""
    ) -> str:
        """Transition a Jira issue to a new status.

        Args:
            issue_key: The issue key (e.g., 'HR-123')
            transition_id: The transition ID (get from jira_get_transitions)
            comment: Optional comment to add with the transition

        Use jira_get_transitions first to see available transitions and their IDs.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            body = {
                "transition": {"id": transition_id}
            }

            if comment:
                body["update"] = {
                    "comment": [{
                        "add": {
                            "body": _text_to_adf(comment)
                        }
                    }]
                }

            await jira_config.jira_request(
                "POST", f"/issue/{issue_key}/transitions",
                json_body=body
            )

            return json.dumps({
                "key": issue_key,
                "url": f"https://{jira_config.domain}/browse/{issue_key}",
                "message": f"Issue {issue_key} transitioned successfully"
            }, indent=2)

        except Exception as e:
            return f"Error transitioning issue {issue_key}: {str(e)}"

    # =========================================================================
    # COMMENTS
    # =========================================================================

    @mcp.tool(
        name="jira_add_comment",
        annotations={
            "title": "Add Comment to Jira Issue",
            "readOnlyHint": False,
            "destructiveHint": False,
            "idempotentHint": False,
            "openWorldHint": True
        }
    )
    async def jira_add_comment(
        issue_key: str,
        body: str
    ) -> str:
        """Add a comment to a Jira issue.

        Args:
            issue_key: The issue key (e.g., 'HR-123')
            body: Comment text (plain text, will be converted to ADF)

        Returns the created comment details.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            data = await jira_config.jira_request(
                "POST", f"/issue/{issue_key}/comment",
                json_body={"body": _text_to_adf(body)}
            )

            return json.dumps({
                "id": data.get("id", ""),
                "author": _safe_display_name(data.get("author")),
                "created": data.get("created", ""),
                "message": f"Comment added to {issue_key}"
            }, indent=2)

        except Exception as e:
            return f"Error adding comment to {issue_key}: {str(e)}"

    @mcp.tool(
        name="jira_get_comments",
        annotations={
            "title": "Get Jira Issue Comments",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_get_comments(
        issue_key: str,
        max_results: int = 25,
        start_at: int = 0,
        order_by: str = "-created"
    ) -> str:
        """Get comments on a Jira issue.

        Args:
            issue_key: The issue key (e.g., 'HR-123')
            max_results: Maximum number of comments to return (default 25)
            start_at: Index of the first comment for pagination
            order_by: Sort order - '-created' (newest first) or 'created' (oldest first)

        Returns a list of comments with author, body, and timestamps.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            data = await jira_config.jira_request(
                "GET", f"/issue/{issue_key}/comment",
                params={
                    "maxResults": max_results,
                    "startAt": start_at,
                    "orderBy": order_by
                }
            )

            comments = [format_comment(c) for c in data.get("comments", [])]

            return json.dumps({
                "issue_key": issue_key,
                "total": data.get("total", 0),
                "comments": comments
            }, indent=2)

        except Exception as e:
            return f"Error getting comments for {issue_key}: {str(e)}"

    # =========================================================================
    # USER SEARCH
    # =========================================================================

    @mcp.tool(
        name="jira_find_users",
        annotations={
            "title": "Find Jira Users",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_find_users(
        query: str,
        max_results: int = 10
    ) -> str:
        """Search for Jira users by name or email.

        Args:
            query: Search string (matches display name and email)
            max_results: Maximum number of users to return (default 10)

        Returns user details including accountId (needed for assignment).
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            data = await jira_config.jira_request(
                "GET", "/user/search",
                params={"query": query, "maxResults": max_results}
            )

            users = []
            for user in data if isinstance(data, list) else []:
                users.append({
                    "account_id": user.get("accountId", ""),
                    "display_name": user.get("displayName", ""),
                    "email": user.get("emailAddress", ""),
                    "active": user.get("active", False),
                    "account_type": user.get("accountType", ""),
                })

            return json.dumps({"users": users}, indent=2)

        except Exception as e:
            return f"Error searching Jira users: {str(e)}"

    # =========================================================================
    # ASSIGN ISSUE
    # =========================================================================

    @mcp.tool(
        name="jira_assign_issue",
        annotations={
            "title": "Assign Jira Issue",
            "readOnlyHint": False,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_assign_issue(
        issue_key: str,
        account_id: str
    ) -> str:
        """Assign a Jira issue to a user.

        Args:
            issue_key: The issue key (e.g., 'HR-123')
            account_id: The assignee's Atlassian account ID (use jira_find_users to look up)

        To unassign, pass account_id as '-1' or use jira_update_issue.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            body = {"accountId": account_id}
            if account_id == "-1":
                body = {"accountId": None}

            await jira_config.jira_request(
                "PUT", f"/issue/{issue_key}/assignee",
                json_body=body
            )

            return json.dumps({
                "key": issue_key,
                "message": f"Issue {issue_key} assigned successfully"
            }, indent=2)

        except Exception as e:
            return f"Error assigning issue {issue_key}: {str(e)}"

    # =========================================================================
    # ADD WORKLOG
    # =========================================================================

    @mcp.tool(
        name="jira_add_worklog",
        annotations={
            "title": "Add Worklog to Jira Issue",
            "readOnlyHint": False,
            "destructiveHint": False,
            "idempotentHint": False,
            "openWorldHint": True
        }
    )
    async def jira_add_worklog(
        issue_key: str,
        time_spent: str,
        comment: str = "",
        started: str = ""
    ) -> str:
        """Add a worklog entry to a Jira issue.

        Args:
            issue_key: The issue key (e.g., 'HR-123')
            time_spent: Time spent in Jira format (e.g., '2h 30m', '1d', '45m')
            comment: Optional worklog comment
            started: When the work started in ISO format (default = now)

        Returns the created worklog details.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            body = {
                "timeSpent": time_spent,
            }

            if comment:
                body["comment"] = _text_to_adf(comment)

            if started:
                body["started"] = started
            else:
                body["started"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000+0000")

            data = await jira_config.jira_request(
                "POST", f"/issue/{issue_key}/worklog",
                json_body=body
            )

            return json.dumps({
                "id": data.get("id", ""),
                "issue_key": issue_key,
                "time_spent": data.get("timeSpent", time_spent),
                "author": _safe_display_name(data.get("author")),
                "message": f"Worklog added to {issue_key}"
            }, indent=2)

        except Exception as e:
            return f"Error adding worklog to {issue_key}: {str(e)}"

    # =========================================================================
    # LIST ISSUE TYPES
    # =========================================================================

    @mcp.tool(
        name="jira_get_issue_types",
        annotations={
            "title": "Get Jira Issue Types",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_get_issue_types(
        project_key: str = ""
    ) -> str:
        """Get available issue types, optionally filtered by project.

        Args:
            project_key: Project key to filter issue types (empty = all types)

        Returns a list of issue types with their names and descriptions.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            if project_key:
                # Get project-specific issue types via createmeta
                data = await jira_config.jira_request(
                    "GET", f"/issue/createmeta/{project_key}/issuetypes"
                )
                issue_types = []
                for it in data.get("values", data.get("issueTypes", [])):
                    issue_types.append({
                        "id": it.get("id", ""),
                        "name": it.get("name", ""),
                        "description": it.get("description", ""),
                        "subtask": it.get("subtask", False),
                    })
            else:
                data = await jira_config.jira_request("GET", "/issuetype")
                issue_types = []
                for it in (data if isinstance(data, list) else []):
                    issue_types.append({
                        "id": it.get("id", ""),
                        "name": it.get("name", ""),
                        "description": it.get("description", ""),
                        "subtask": it.get("subtask", False),
                    })

            return json.dumps({"issue_types": issue_types}, indent=2)

        except Exception as e:
            return f"Error getting issue types: {str(e)}"

    # =========================================================================
    # GET PRIORITIES
    # =========================================================================

    @mcp.tool(
        name="jira_get_priorities",
        annotations={
            "title": "Get Jira Priorities",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_get_priorities() -> str:
        """Get all available priority levels in Jira.

        Returns a list of priorities with their names and descriptions.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            data = await jira_config.jira_request("GET", "/priority")

            priorities = []
            for p in (data if isinstance(data, list) else []):
                priorities.append({
                    "id": p.get("id", ""),
                    "name": p.get("name", ""),
                    "description": p.get("description", ""),
                })

            return json.dumps({"priorities": priorities}, indent=2)

        except Exception as e:
            return f"Error getting priorities: {str(e)}"

    # =========================================================================
    # GET STATUSES
    # =========================================================================

    @mcp.tool(
        name="jira_get_statuses",
        annotations={
            "title": "Get Jira Statuses",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_get_statuses(
        project_key: str = ""
    ) -> str:
        """Get available statuses, optionally filtered by project.

        Args:
            project_key: Project key to filter statuses (empty = all statuses)

        Returns a list of statuses with their names and categories.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            if project_key:
                data = await jira_config.jira_request(
                    "GET", f"/project/{project_key}/statuses"
                )
                statuses = []
                for issue_type_statuses in (data if isinstance(data, list) else []):
                    issue_type = issue_type_statuses.get("name", "")
                    for s in issue_type_statuses.get("statuses", []):
                        statuses.append({
                            "id": s.get("id", ""),
                            "name": s.get("name", ""),
                            "category": _safe_name(s.get("statusCategory")),
                            "issue_type": issue_type,
                        })
            else:
                data = await jira_config.jira_request("GET", "/status")
                statuses = []
                for s in (data if isinstance(data, list) else []):
                    statuses.append({
                        "id": s.get("id", ""),
                        "name": s.get("name", ""),
                        "category": _safe_name(s.get("statusCategory")),
                    })

            return json.dumps({"statuses": statuses}, indent=2)

        except Exception as e:
            return f"Error getting statuses: {str(e)}"

    # =========================================================================
    # BOARDS (Agile)
    # =========================================================================

    @mcp.tool(
        name="jira_list_boards",
        annotations={
            "title": "List Jira Boards",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_list_boards(
        project_key: str = "",
        board_type: str = "",
        max_results: int = 50
    ) -> str:
        """List Jira agile boards (Scrum/Kanban).

        Args:
            project_key: Filter boards by project key (empty = all boards)
            board_type: Filter by type - 'scrum' or 'kanban' (empty = all)
            max_results: Maximum number of boards to return (default 50)

        Returns a list of boards with their names and types.
        Note: Uses Jira Agile REST API (v1).
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            import httpx

            url = f"https://{jira_config.domain}/rest/agile/1.0/board"
            params = {"maxResults": max_results}
            if project_key:
                params["projectKeyOrId"] = project_key
            if board_type:
                params["type"] = board_type

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": jira_config._get_auth_header(),
                        "Accept": "application/json"
                    },
                    params=params
                )
                response.raise_for_status()
                data = response.json()

            boards = []
            for b in data.get("values", []):
                boards.append({
                    "id": b.get("id", ""),
                    "name": b.get("name", ""),
                    "type": b.get("type", ""),
                    "project_key": b.get("location", {}).get("projectKey", ""),
                })

            return json.dumps({
                "total": data.get("total", len(boards)),
                "boards": boards
            }, indent=2)

        except Exception as e:
            return f"Error listing Jira boards: {str(e)}"

    # =========================================================================
    # SPRINTS
    # =========================================================================

    @mcp.tool(
        name="jira_get_sprints",
        annotations={
            "title": "Get Board Sprints",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_get_sprints(
        board_id: int,
        state: str = "active",
        max_results: int = 50
    ) -> str:
        """Get sprints for a Jira board.

        Args:
            board_id: The board ID (get from jira_list_boards)
            state: Sprint state filter - 'active', 'future', 'closed', or comma-separated (default 'active')
            max_results: Maximum number of sprints to return (default 50)

        Returns sprint details including dates and goals.
        Note: Uses Jira Agile REST API (v1).
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            import httpx

            url = f"https://{jira_config.domain}/rest/agile/1.0/board/{board_id}/sprint"
            params = {"maxResults": max_results, "state": state}

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": jira_config._get_auth_header(),
                        "Accept": "application/json"
                    },
                    params=params
                )
                response.raise_for_status()
                data = response.json()

            sprints = []
            for s in data.get("values", []):
                sprint_info = {
                    "id": s.get("id", ""),
                    "name": s.get("name", ""),
                    "state": s.get("state", ""),
                    "start_date": s.get("startDate", ""),
                    "end_date": s.get("endDate", ""),
                }
                goal = s.get("goal")
                if goal:
                    sprint_info["goal"] = goal
                sprints.append(sprint_info)

            return json.dumps({
                "board_id": board_id,
                "total": data.get("total", len(sprints)),
                "sprints": sprints
            }, indent=2)

        except Exception as e:
            return f"Error getting sprints for board {board_id}: {str(e)}"

    # =========================================================================
    # SPRINT ISSUES
    # =========================================================================

    @mcp.tool(
        name="jira_get_sprint_issues",
        annotations={
            "title": "Get Sprint Issues",
            "readOnlyHint": True,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_get_sprint_issues(
        sprint_id: int,
        max_results: int = 50,
        start_at: int = 0
    ) -> str:
        """Get issues in a specific sprint.

        Args:
            sprint_id: The sprint ID (get from jira_get_sprints)
            max_results: Maximum number of issues to return (default 50)
            start_at: Index of the first issue for pagination

        Returns issues in the sprint with their status and details.
        Note: Uses Jira Agile REST API (v1).
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            import httpx

            url = f"https://{jira_config.domain}/rest/agile/1.0/sprint/{sprint_id}/issue"
            params = {"maxResults": max_results, "startAt": start_at}

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": jira_config._get_auth_header(),
                        "Accept": "application/json"
                    },
                    params=params
                )
                response.raise_for_status()
                data = response.json()

            issues = [format_issue_summary(issue) for issue in data.get("issues", [])]

            return json.dumps({
                "sprint_id": sprint_id,
                "total": data.get("total", 0),
                "issues": issues
            }, indent=2)

        except Exception as e:
            return f"Error getting sprint issues: {str(e)}"

    # =========================================================================
    # DELETE ISSUE
    # =========================================================================

    @mcp.tool(
        name="jira_delete_issue",
        annotations={
            "title": "Delete Jira Issue",
            "readOnlyHint": False,
            "destructiveHint": True,
            "idempotentHint": True,
            "openWorldHint": True
        }
    )
    async def jira_delete_issue(
        issue_key: str,
        delete_subtasks: bool = False
    ) -> str:
        """Delete a Jira issue. Use with caution - this is irreversible.

        Args:
            issue_key: The issue key to delete (e.g., 'HR-123')
            delete_subtasks: If True, also delete subtasks (default False - will fail if subtasks exist)

        Returns success confirmation or error.
        """
        if not jira_config.is_configured:
            return "Error: Jira not configured. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN."

        try:
            params = {}
            if delete_subtasks:
                params["deleteSubtasks"] = "true"

            await jira_config.jira_request(
                "DELETE", f"/issue/{issue_key}",
                params=params
            )

            return json.dumps({
                "key": issue_key,
                "message": f"Issue {issue_key} deleted successfully"
            }, indent=2)

        except Exception as e:
            return f"Error deleting issue {issue_key}: {str(e)}"

    logger.info("Jira tools registered successfully")
