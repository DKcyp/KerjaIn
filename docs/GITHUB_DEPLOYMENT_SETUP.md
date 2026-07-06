# GitHub Deployment Setup Guide

This guide explains how to set up GitHub Secrets for automated deployment of the Logbook application.

## Required GitHub Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### Server Configuration
- `SERVER_HOST` - Your server's IP address or domain name
- `SERVER_USER` - SSH username for your server
- `SERVER_SSH_KEY` - Private SSH key for server access (entire key content)
- `SERVER_PORT` - SSH port (optional, defaults to 22)
- `SERVER_DIR` - Full path to your application directory on the server
- `APP_PORT` - Port where the application will run (optional, defaults to 3000)

### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string
  - Format: `postgresql://username:password@host:port/database?schema=public`

### SSO Configuration
- `SSO_DASHBOARD_URL` - SSO Dashboard URL for login redirections
- `NEXT_PUBLIC_SSO_DASHBOARD_URL` - Public SSO Dashboard URL (same as above)
- `SSO_API_URL` - SSO API URL for backend calls
- `NEXT_PUBLIC_SSO_API_URL` - Public SSO API URL (same as above)
- `SSO_ENABLED` - Enable/disable SSO (optional, defaults to "true")
- `SSO_BYPASS_FOR_DEV` - Bypass SSO for development (optional, defaults to "false")
- `SSO_CALLBACK_URL` - SSO callback URL
  - Format: `https://your-domain.com/api/auth/sso-callback`
- `NEXT_PUBLIC_SSO_CALLBACK_URL` - Public SSO callback URL (same as above)
- `NEXT_PUBLIC_APP_URL` - Your application's public URL
  - Format: `https://your-domain.com`

### Legacy SSO Support (will be removed in future versions)
- `SSO_BASE_URL` - Legacy SSO base URL
- `NEXT_PUBLIC_SSO_BASE_URL` - Public legacy SSO base URL

### API Keys
- `EXTERNAL_API_KEY` - Key for inter-application communication
- `MARKETING_API_KEY` - Marketing system API key

### Marketing API Configuration
- `MARKETING_API_URL` - Marketing API base URL
  - Format: `https://your-marketing-api.com/api/external`
- `MARKETING_BLUEPRINT_ENDPOINT` - Blueprint endpoint (optional, defaults to "/contracts/update-status")
- `MARKETING_GOLIVE_ENDPOINT` - Go Live endpoint (optional, defaults to "/contracts/update-status-development")

## Example Secret Values

### Development/Staging Environment
```
SERVER_HOST=192.168.1.15
SERVER_USER=ubuntu
SERVER_DIR=/var/www/logbook
APP_PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/logbook?schema=public
SSO_DASHBOARD_URL=http://192.168.1.6:3000
NEXT_PUBLIC_SSO_DASHBOARD_URL=http://192.168.1.6:3000
SSO_API_URL=http://192.168.1.6:4000
NEXT_PUBLIC_SSO_API_URL=http://192.168.1.6:4000
SSO_CALLBACK_URL=http://192.168.1.15:3000/api/auth/sso-callback
NEXT_PUBLIC_SSO_CALLBACK_URL=http://192.168.1.15:3000/api/auth/sso-callback
NEXT_PUBLIC_APP_URL=http://192.168.1.15:3000
```

### Production Environment
```
SERVER_HOST=your-production-server.com
SERVER_USER=deploy
SERVER_DIR=/var/www/logbook-production
APP_PORT=3000
DATABASE_URL=postgresql://prod_user:secure_pass@db.example.com:5432/logbook_prod?schema=public
SSO_DASHBOARD_URL=https://sso.yourcompany.com
NEXT_PUBLIC_SSO_DASHBOARD_URL=https://sso.yourcompany.com
SSO_API_URL=https://sso-api.yourcompany.com
NEXT_PUBLIC_SSO_API_URL=https://sso-api.yourcompany.com
SSO_CALLBACK_URL=https://logbook.yourcompany.com/api/auth/sso-callback
NEXT_PUBLIC_SSO_CALLBACK_URL=https://logbook.yourcompany.com/api/auth/sso-callback
NEXT_PUBLIC_APP_URL=https://logbook.yourcompany.com
```

## SSH Key Setup

1. Generate SSH key pair on your local machine:
   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions@yourcompany.com"
   ```

2. Copy the public key to your server:
   ```bash
   ssh-copy-id -i ~/.ssh/id_rsa.pub user@your-server.com
   ```

3. Copy the **private key** content to GitHub Secret `SERVER_SSH_KEY`:
   ```bash
   cat ~/.ssh/id_rsa
   ```
   Copy the entire output including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`

## Deployment Process

The GitHub Action will:

1. Connect to your server via SSH
2. Navigate to the application directory
3. Create `.env.production` file from GitHub Secrets
4. Pull latest code from the repository
5. Install dependencies (if package files changed)
6. Run Prisma migrations
7. Generate Prisma client
8. Build the Next.js application
9. Start/restart the application using PM2

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify `SERVER_HOST`, `SERVER_USER`, and `SERVER_SSH_KEY`
   - Ensure SSH key is properly formatted (include headers/footers)
   - Check server SSH configuration

2. **Database Connection Failed**
   - Verify `DATABASE_URL` format and credentials
   - Ensure database server is accessible from your application server

3. **Build Failures**
   - Check that all required secrets are set
   - Verify environment variable names match exactly
   - Check application logs for specific error messages

4. **SSO Issues**
   - Ensure all SSO URLs are accessible
   - Verify callback URLs match your domain
   - Check SSO system configuration

### Viewing Deployment Logs

1. Go to your GitHub repository
2. Click on "Actions" tab
3. Click on the latest deployment run
4. Expand the "Deploy to server" step to view detailed logs

## Security Best Practices

1. **Never commit sensitive data** to the repository
2. **Use strong, unique API keys** for each environment
3. **Regularly rotate SSH keys** and API keys
4. **Limit SSH key access** to specific IP ranges if possible
5. **Use separate secrets** for different environments (dev/staging/prod)
6. **Review secret access logs** regularly

## Environment File Priority

Next.js loads environment files in this order:
1. `.env.production` (created by GitHub Action)
2. `.env.local` (if exists, not recommended for production)
3. `.env`
4. `.env.example` (template only, not loaded)

The GitHub Action creates `.env.production` which takes precedence over other environment files.
