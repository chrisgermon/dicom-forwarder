# Decap CMS Integration Guide

CrowdHub now includes Decap CMS (formerly Netlify CMS), a Git-based content management system with no native dependencies.

## Features

- **Git-Based**: All content stored in Git (no database required)
- **Pure JavaScript**: No native dependencies or build complications
- **User-Friendly**: Visual editor for non-technical users
- **Markdown Support**: Rich text editing with markdown
- **Media Management**: Upload and manage images
- **Customizable**: Flexible content models

## Accessing the CMS

Once your site is deployed, access the CMS at:
```
https://your-domain.com/admin/
```

For local development:
```
http://localhost:8080/admin/
```

## Setup for GitHub

1. **Connect to GitHub** (if not already connected)
   - Click GitHub → Connect to GitHub in Lovable
   - Authorize and create repository

2. **Enable Git Gateway** (for authentication)
   - Go to your deployed site settings
   - Enable Identity service (if using Netlify)
   - Or configure GitHub OAuth for other hosting

3. **Configure Authentication**
   Edit `public/admin/config.yml` to set up authentication:
   ```yaml
   backend:
     name: git-gateway
     branch: main
   ```

## Content Structure

Decap CMS is configured to manage:

### Pages
- General site pages
- Location: `content/pages/`
- Format: Markdown with frontmatter

### Blog Posts
- News articles and blog content
- Location: `content/blog/`
- Format: Markdown with frontmatter

### Settings
- Site-wide configuration
- Location: `content/settings/`
- Format: JSON

## Local Development

For local testing without authentication:

1. Uncomment in `public/admin/config.yml`:
   ```yaml
   local_backend: true
   ```

2. Run the Decap proxy server:
   ```bash
   npx decap-server
   ```

3. Access admin at `http://localhost:8080/admin/`

## Customization

Edit `public/admin/config.yml` to:
- Add new content types
- Modify field schemas
- Change file paths
- Configure media storage

Example adding a new collection:
```yaml
collections:
  - name: "products"
    label: "Products"
    folder: "content/products"
    create: true
    fields:
      - { label: "Name", name: "name", widget: "string" }
      - { label: "Price", name: "price", widget: "number" }
      - { label: "Description", name: "description", widget: "markdown" }
```

## Deployment

Decap CMS works with any hosting provider:

### Lovable Deploy
- Automatic deployment
- Configure Git Gateway for authentication

### Netlify
- Automatic Git Gateway integration
- Identity service included
- No additional configuration needed

### Vercel / Other Hosts
- Set up GitHub OAuth app
- Configure backend in `config.yml`:
  ```yaml
  backend:
    name: github
    repo: your-username/your-repo
    branch: main
  ```

## Content in Your App

To use content from Decap CMS in your app:

1. **Parse markdown files** during build or at runtime
2. **Use the content** in your components
3. **Sync changes** from Git automatically

Example reading a blog post:
```typescript
// In your component or API route
import { readFileSync } from 'fs';
import matter from 'gray-matter';

const content = readFileSync('content/blog/my-post.md', 'utf-8');
const { data, content: body } = matter(content);
```

## Resources

- [Decap CMS Documentation](https://decapcms.org/docs/)
- [Configuration Options](https://decapcms.org/docs/configuration-options/)
- [Widgets Reference](https://decapcms.org/docs/widgets/)
- [GitHub Community](https://github.com/decaporg/decap-cms/discussions)

## Migration from TinaCMS

Decap CMS replaces TinaCMS with:
- ✅ No native dependencies (no better-sqlite3, no node-gyp)
- ✅ Pure JavaScript (works everywhere)
- ✅ Git-based storage (version control built-in)
- ✅ Simple setup (no complex build configuration)
- ✅ Open source and actively maintained
