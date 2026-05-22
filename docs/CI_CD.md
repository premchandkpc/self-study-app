# CI/CD Pipeline Documentation

Automated build, test, and deployment pipelines using GitHub Actions.

## Workflows

### 1. Build & Test (`build.yml`)

Runs on every push and pull request to `main` and `develop`.

**Triggers:**
- Push to main or develop
- Pull request targeting main or develop

**Steps:**
1. Checkout code
2. Setup Node.js (tests 18.x and 20.x)
3. Install dependencies
4. Run ESLint
5. Build application
6. Validate build output
7. Upload artifacts

**Matrix Testing:**
- Node.js 18.x
- Node.js 20.x

**Artifacts:**
- Build output stored for 5 days
- Available in Actions > Build artifacts

### 2. Docker Build & Push (`docker.yml`)

Builds Docker image and pushes to registries.

**Triggers:**
- Push to main or develop
- Tags (v*)
- Pull request to main (build only, no push)

**Steps:**
1. Checkout code
2. Setup Docker Buildx
3. Login to Docker Hub
4. Login to GitHub Container Registry
5. Extract metadata (tags, labels)
6. Build and push image
7. Test image (PR only)

**Tags Generated:**
- `branch-name` (e.g., `main`, `develop`)
- `vX.Y.Z` (semantic versions)
- `vX.Y` (major.minor)
- `sha-<commit>` (commit SHA)
- `latest` (for main branch)

**Registries:**
- Docker Hub: `{username}/react-study-app`
- GitHub Container Registry: `ghcr.io/{repo}`

**Secrets Required:**
- `DOCKER_USERNAME` — Docker Hub username
- `DOCKER_PASSWORD` — Docker Hub token

### 3. Lint & Code Quality (`lint.yml`)

Runs linting checks on code quality.

**Triggers:**
- Push to main or develop
- Pull request to main or develop

**Jobs:**
1. **ESLint** — JavaScript/React linting
2. **Markdown Lint** — Documentation linting

**ESLint Rules:**
- React hooks correctness
- React refresh patterns
- No unused variables

**Markdown Lint:**
- Checks all `.md` files (excluding node_modules)
- Configuration: `.markdownlint.json`

### 4. Deploy to Production (`deploy.yml`)

Deploys to production server.

**Triggers:**
- Push to main
- Tag push (v*)
- Manual trigger (workflow_dispatch)

**Steps:**
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Build for production
5. Create build artifact
6. Upload artifact
7. SSH to production server
8. Deploy via Docker Compose
9. Verify deployment
10. Create release notes (for tags)

**Secrets Required:**
- `DEPLOY_SERVER_HOST` — Production server IP/hostname
- `DEPLOY_SERVER_USER` — SSH username
- `DEPLOY_SERVER_KEY` — SSH private key
- `DEPLOY_URL` — Production URL for verification

**Deployment Process:**
```bash
# On production server:
cd /app/react-study-app
wget build-artifact.tar.gz
tar -xzf build-artifact.tar.gz
docker-compose down
docker-compose up -d --build
```

## Setup Instructions

### 1. GitHub Secrets Configuration

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

#### For Docker Workflow

```
DOCKER_USERNAME = your-docker-username
DOCKER_PASSWORD = your-docker-token  # Create in Docker Hub
```

#### For Deploy Workflow

```
DEPLOY_SERVER_HOST = your.server.ip
DEPLOY_SERVER_USER = deploy-user
DEPLOY_SERVER_KEY = -----BEGIN OPENSSH PRIVATE KEY-----
                    ... (SSH private key) ...
                    -----END OPENSSH PRIVATE KEY-----
DEPLOY_URL = https://your-app.com
```

### 2. Generate Docker Hub Token

1. Login to Docker Hub
2. Account Settings > Security > New Access Token
3. Set permissions: Read & Write
4. Copy token to GitHub Secrets

### 3. Setup SSH Key

```bash
# Generate key
ssh-keygen -t ed25519 -f deploy-key

# Add public key to server
cat deploy-key.pub >> ~/.ssh/authorized_keys

# Copy private key to GitHub Secrets
cat deploy-key
```

### 4. Configure Production Server

```bash
# Create app directory
mkdir -p /app/react-study-app
cd /app/react-study-app

# Create docker-compose.yml (same as root)
cp docker-compose.yml /app/react-study-app/

# Ensure Docker is installed
docker --version
docker-compose --version
```

## Workflow Status Badges

Add to README.md:

```markdown
[![Build & Test](https://github.com/YOUR_REPO/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_REPO/actions/workflows/build.yml)
[![Docker Build](https://github.com/YOUR_REPO/actions/workflows/docker.yml/badge.svg)](https://github.com/YOUR_REPO/actions/workflows/docker.yml)
[![Code Quality](https://github.com/YOUR_REPO/actions/workflows/lint.yml/badge.svg)](https://github.com/YOUR_REPO/actions/workflows/lint.yml)
```

## Troubleshooting

### Build Fails on npm ci

**Issue:** `npm ERR! ci can only install packages with an existing package-lock.json`

**Solution:** Ensure `package-lock.json` is committed to git.

### Docker Push Fails

**Issue:** `denied: requested access to the resource is denied`

**Solution:** 
- Verify Docker credentials in secrets
- Ensure Docker Hub token has read/write access

### Deployment Fails

**Issue:** SSH connection timeout

**Solution:**
- Check server firewall allows SSH port 22
- Verify `DEPLOY_SERVER_HOST` is correct
- Test SSH locally: `ssh -i deploy-key user@host`

### Markdown Lint Errors

**Issue:** Linting fails on valid markdown

**Solution:** Update `.markdownlint.json` rules or exclude files in workflow.

## Performance Optimization

### Cache Dependencies

Workflows use `npm ci --prefer-offline` for faster installs:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20.x'
    cache: 'npm'
    cache-dependency-path: 'react-study-app/package-lock.json'
```

### Docker Build Cache

Uses GitHub Actions cache (mode=max):

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

Subsequent builds reuse layers, reducing build time by 50-80%.

### Parallel Job Execution

Jobs run in parallel:
- ESLint + Markdown Lint in `lint.yml`
- Node 18.x + 20.x in `build.yml`

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to git
   - Rotate tokens regularly
   - Use GitHub Actions secrets, not env vars

2. **SSH Keys**
   - Use ed25519 (not RSA)
   - Restrict key permissions: `chmod 600 deploy-key`
   - Use separate deploy user (not root)

3. **Docker Registry**
   - Use access tokens, not passwords
   - Enable 2FA on Docker Hub
   - Scan images for vulnerabilities

4. **Artifact Retention**
   - Limit retention to necessary days
   - Prevent disk space issues on server

## Monitoring & Notifications

### GitHub Actions Notifications

- Email on workflow failure (default)
- Custom notifications via webhooks

### Slack Integration

Add to workflow:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

## Cost Optimization

GitHub Actions includes free tier:
- **Public repos:** Unlimited
- **Private repos:** 2,000 minutes/month free

Current setup uses ~2-5 minutes per build. Adjust retention policies:

```yaml
retention-days: 7  # Reduce from 30 to save space
```

## Future Enhancements

- [ ] Code coverage reports
- [ ] Performance benchmarking
- [ ] Automated dependency updates (Dependabot)
- [ ] SAST scanning (CodeQL)
- [ ] E2E testing
- [ ] Blue-green deployment
- [ ] Canary deployments
- [ ] Rollback automation

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [ESLint GitHub Action](https://github.com/marketplace/actions/eslint-action)
- [SSH Deploy Action](https://github.com/appleboy/ssh-action)
