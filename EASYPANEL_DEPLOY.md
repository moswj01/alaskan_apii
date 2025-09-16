# Alaskan API - Easy Panel Deployment

## Environment Variables (Set in Easy Panel)

```env
NODE_ENV=production
PORT=3000
MYSQL_HOST=kkc_alaskan
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=@Alaskan2025
MYSQL_DATABASE=game_topup
JWT_SECRET=your-super-secret-jwt-key
```

## Easy Panel Setup Instructions

### 1. Create New App

- Go to Easy Panel dashboard
- Click "Create App"
- Choose "Docker" as source
- Enter your repository URL

### 2. Configure Environment Variables

Add these environment variables in Easy Panel:

- `NODE_ENV`: `production`
- `PORT`: `3000`
- `MYSQL_HOST`: `kkc_alaskan`
- `MYSQL_PORT`: `3306`
- `MYSQL_USER`: `root`
- `MYSQL_PASSWORD`: `@Alaskan2025`
- `MYSQL_DATABASE`: `game_topup`
- `JWT_SECRET`: Generate a strong secret key

### 3. Port Configuration

- Set container port: `3000`
- Set public port: `80` or `443` (for HTTPS)

### 4. Volume Mounts (Optional)

- No persistent volumes needed for this stateless API

### 5. Deploy

- Click "Deploy" and wait for build completion
- Access your API at the provided domain

## API Endpoints

### Authentication

- `POST /login` - Login with email/password

### CRUD Operations (All require JWT token)

- `GET /api/{table}` - Get all records
- `GET /api/{table}/{id}` - Get single record
- `POST /api/{table}` - Create new record
- `PUT /api/{table}/{id}` - Update record
- `DELETE /api/{table}/{id}` - Delete record

### Available Tables

- users, customers, games, products, orders, order_items, payments, inventory_items, audit_logs

## Test Login Credentials

- Email: `admin@alaskan.com`
- Password: `1234`

## Notes

- Make sure your MySQL database is accessible from Easy Panel
- Update CORS origins if needed for your frontend domain
- Consider using environment-specific JWT secrets
