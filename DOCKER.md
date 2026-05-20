# Docker Setup

Build and run the React Study App using Docker.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+ (optional, for docker-compose)

## Quick Start

### Using Docker Compose (Recommended)

```bash
docker-compose up --build
```

App runs at `http://localhost:3000`

Stop:
```bash
docker-compose down
```

### Using Docker CLI

#### Build Image

```bash
cd react-study-app
docker build -t react-study-app:latest .
```

#### Run Container

```bash
docker run -p 3000:3000 --name react-study-app react-study-app:latest
```

App runs at `http://localhost:3000`

#### Stop Container

```bash
docker stop react-study-app
docker rm react-study-app
```

## Dockerfile Details

Multi-stage build process:

1. **Builder Stage**: Node 20 Alpine
   - Install dependencies (`npm ci`)
   - Build React app (`npm run build`)
   - Output to `dist/`

2. **Runtime Stage**: Node 20 Alpine (lightweight)
   - Copy built `dist/` from builder
   - Install `serve` (lightweight HTTP server)
   - Expose port 3000
   - Health check enabled

Benefits:
- Final image ~150MB (vs ~500MB without multi-stage)
- No build tools in production image
- Faster deployments

## Environment Variables

Current setup uses production defaults. To customize:

```bash
docker run -e NODE_ENV=production -p 3000:3000 react-study-app:latest
```

## Health Checks

Container includes health check that:
- Runs every 30 seconds
- Times out after 10 seconds
- Retries up to 3 times
- Waits 5 seconds before first check

Check status:
```bash
docker ps
```

Look for `(healthy)` or `(unhealthy)` status.

## Volumes (Development)

For live development with Docker:

```bash
docker run -v $(pwd)/react-study-app/src:/app/src -p 3000:3000 react-study-app:latest
```

Note: This requires rebuilding the image after source changes.

## Networking

### Port Mapping

```bash
# Run on different port
docker run -p 8080:3000 react-study-app:latest
# App accessible at http://localhost:8080
```

### Docker Compose Network

Services in docker-compose.yml can communicate by service name:
```javascript
// From another container
fetch('http://app:3000')
```

## Image Size Optimization

Current image ~150MB. To reduce further:

```dockerfile
# Option 1: Use distroless image
FROM gcr.io/distroless/nodejs20-debian11
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs react-study-app

# Run interactively
docker run -it react-study-app:latest /bin/sh
```

### Port Already in Use

```bash
# Use different port
docker run -p 8080:3000 react-study-app:latest

# Or kill existing process
lsof -i :3000
kill -9 <PID>
```

### Slow Build

```bash
# Build without cache
docker build --no-cache -t react-study-app:latest .
```

### Container Exits Immediately

```bash
# Check exit code
docker ps -a | grep react-study-app

# View logs
docker logs <container-id>
```

## Docker Compose Commands

```bash
# Build and start
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes
docker-compose down -v

# Restart service
docker-compose restart app
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/build-push-action@v4
        with:
          context: ./react-study-app
          push: false
          tags: react-study-app:latest
```

## Production Deployment

### Docker Hub

```bash
# Tag image
docker tag react-study-app:latest username/react-study-app:latest

# Push
docker push username/react-study-app:latest

# Run from registry
docker run -p 3000:3000 username/react-study-app:latest
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: react-study-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: react-study-app
  template:
    metadata:
      labels:
        app: react-study-app
    spec:
      containers:
      - name: app
        image: username/react-study-app:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
```

## Best Practices

1. **Use specific Node version**: `node:20-alpine` (not `node:latest`)
2. **Use `.dockerignore`**: Exclude unnecessary files (node_modules, .git, etc.)
3. **Multi-stage builds**: Separate build and runtime stages
4. **Health checks**: Always include health probes
5. **Security**: Run as non-root user (optional)
6. **Layer caching**: Order commands by change frequency
7. **Minimal base images**: Alpine Linux (5MB vs Debian 100MB+)

## Security Considerations

Current setup runs as root. For production, add:

```dockerfile
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs
```

## Resources

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Documentation](https://docs.docker.com/compose)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
