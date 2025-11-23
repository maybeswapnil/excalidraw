# Excalidraw Backend - Docker Setup

This directory contains the WebSocket backend for Excalidraw with MongoDB persistence and real-time synchronization.

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Port 5000 available (backend)
- Port 27017 available (MongoDB)

### Setup

1. **Clone environment variables:**
```bash
cp .env.example .env
```

2. **Start services with Docker Compose:**
```bash
docker-compose -f docker-compose.backend.yml up -d
```

This will start:
- MongoDB database on `localhost:27017`
- Backend server on `localhost:5000`

3. **Verify services are running:**
```bash
docker-compose -f docker-compose.backend.yml ps
```

### Health Checks

Both services include health checks:

```bash
# Check backend health
curl http://localhost:5000/health

# Check MongoDB connection from within Docker
docker-compose -f docker-compose.backend.yml exec mongodb mongosh -u admin -p password --authenticationDatabase admin
```

## Docker Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.backend.yml logs -f

# Specific service
docker-compose -f docker-compose.backend.yml logs -f backend
docker-compose -f docker-compose.backend.yml logs -f mongodb
```

### Stop Services
```bash
docker-compose -f docker-compose.backend.yml down
```

### Stop and Remove Volumes (Clean Reset)
```bash
docker-compose -f docker-compose.backend.yml down -v
```

### Rebuild Docker Image
```bash
docker-compose -f docker-compose.backend.yml build --no-cache
```

## Building Docker Image Manually

```bash
# Build image
docker build -t excalidraw-backend:latest -f backend/Dockerfile .

# Run container
docker run -d \
  --name excalidraw-backend \
  -p 5000:5000 \
  -e MONGODB_URI="mongodb://admin:password@host.docker.internal:27017/excalidraw?authSource=admin" \
  excalidraw-backend:latest

# Stop container
docker stop excalidraw-backend
docker rm excalidraw-backend
```

## Production Deployment

### Using Docker Compose
1. Copy `.env.example` to `.env` and update with production values
2. Set `NODE_ENV=production` in `.env`
3. Use strong passwords for MongoDB
4. Run: `docker-compose -f docker-compose.backend.yml up -d`

### Push to Registry
```bash
# Login to Docker registry
docker login

# Build and tag
docker build -t your-registry/excalidraw-backend:1.0.0 -f backend/Dockerfile .

# Push
docker push your-registry/excalidraw-backend:1.0.0
```

### Kubernetes Deployment
See `kubernetes/` directory for Helm charts and manifests (if available).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Backend server port |
| `NODE_ENV` | development | Environment (development/production) |
| `MONGODB_URI` | - | MongoDB connection string |
| `MONGO_USERNAME` | admin | MongoDB admin username |
| `MONGO_PASSWORD` | password | MongoDB admin password |
| `MONGO_DB_NAME` | excalidraw | MongoDB database name |

## Troubleshooting

### MongoDB Connection Failed
- Check `MONGODB_URI` is correct
- Verify MongoDB container is running: `docker-compose -f docker-compose.backend.yml ps mongodb`
- Check MongoDB logs: `docker-compose -f docker-compose.backend.yml logs mongodb`

### Backend Not Responding
- Check logs: `docker-compose -f docker-compose.backend.yml logs backend`
- Verify port 5000 is free: `lsof -i :5000`
- Check backend health: `curl http://localhost:5000/health`

### Port Already in Use
- Change port in `.env`: `BACKEND_PORT=5001`
- Or kill existing process: `lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9`

### Reset Everything
```bash
docker-compose -f docker-compose.backend.yml down -v
docker system prune -a
docker-compose -f docker-compose.backend.yml up -d --build
```

## Network Configuration

Services communicate over `excalidraw-network` bridge network:
- `mongodb:27017` - Internal MongoDB address
- `backend:5000` - Internal backend address

To connect from host machine:
- MongoDB: `localhost:27017`
- Backend: `localhost:5000`

## Security Notes

- Change default MongoDB credentials in `.env`
- Use environment variables from secure vaults in production
- Enable MongoDB authentication in production
- Use HTTPS/WSS in production
- Consider using private Docker registries
- Regularly update base images (`node:24-alpine`, `mongo:7.0-alpine`)

## Related Documentation

- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node)
- [MongoDB Docker Images](https://hub.docker.com/_/mongo)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
