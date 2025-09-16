# Alaskan API

## Local Development

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Docker Build (Local Testing)

```bash
docker build -t alaskan-api .
docker run -p 3000:3000 alaskan-api
```

## Easy Panel Deployment

See `EASYPANEL_DEPLOY.md` for detailed deployment instructions.

## API Documentation

See `API_DOC.md` for API usage examples.
