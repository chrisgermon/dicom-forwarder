# Crowd IT MCP Server

Unified MCP server for HaloPSA integration, deployed on Google Cloud Run.

## Quick Start

### 1. Deploy to Cloud Run

```bash
chmod +x deploy.sh update-secrets.sh
./deploy.sh
```

### 2. Update HaloPSA Credentials

After deployment, update your API credentials:

```bash
./update-secrets.sh
```

You'll be prompted for:
- **Client ID**: Your HaloPSA API application client ID
- **Client Secret**: Your HaloPSA API application client secret

### 3. Get Authentication Token

Since the service requires authentication, you need to get an identity token:

```bash
# Get your Cloud Run service URL
SERVICE_URL=$(gcloud run services describe crowdit-mcp-server \
    --region=australia-southeast1 \
    --format='value(status.url)')

# Get an identity token (valid for 1 hour)
TOKEN=$(gcloud auth print-identity-token --audiences=$SERVICE_URL)

echo "Service URL: $SERVICE_URL"
echo "Token: $TOKEN"
```

### 4. Configure Claude Desktop

Add to your Claude Desktop config (`~/.config/claude/claude_desktop_config.json` on Linux, `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "crowdit": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://crowdit-mcp-server-XXXXX-ts.a.run.app/mcp",
        "--header",
        "Authorization: Bearer YOUR_TOKEN_HERE"
      ]
    }
  }
}
```

**Note:** Replace `YOUR_TOKEN_HERE` with a fresh token from step 3. Tokens expire after 1 hour.

### 5. Alternative: Service Account Authentication

For persistent access without token refresh, create a service account:

```bash
# Create service account
gcloud iam service-accounts create mcp-client \
    --display-name="MCP Client"

# Grant invoker role
gcloud run services add-iam-policy-binding crowdit-mcp-server \
    --region=australia-southeast1 \
    --member="serviceAccount:mcp-client@crowdmcp.iam.gserviceaccount.com" \
    --role="roles/run.invoker"

# Create key file
gcloud iam service-accounts keys create ~/mcp-sa-key.json \
    --iam-account=mcp-client@crowdmcp.iam.gserviceaccount.com
```

Then use the service account for authentication in your MCP client.

## Available Tools

| Tool | Description |
|------|-------------|
| `halopsa_search_tickets` | Search tickets with filters (status, client, text, date) |
| `halopsa_get_ticket` | Get full ticket details by ID |
| `halopsa_update_ticket` | Update ticket status or add notes |
| `halopsa_get_clients` | List/search HaloPSA clients |
| `server_status` | Check MCP server and integration status |

## Testing

Test the endpoint with curl:

```bash
SERVICE_URL="https://crowdit-mcp-server-XXXXX-ts.a.run.app"
TOKEN=$(gcloud auth print-identity-token --audiences=$SERVICE_URL)

# Test MCP endpoint
curl -X POST "$SERVICE_URL/mcp" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Updating the Server

To deploy updates:

```bash
gcloud run deploy crowdit-mcp-server \
    --project=crowdmcp \
    --region=australia-southeast1 \
    --source=.
```

## Logs

View service logs:

```bash
gcloud run logs read crowdit-mcp-server \
    --region=australia-southeast1 \
    --limit=50
```
