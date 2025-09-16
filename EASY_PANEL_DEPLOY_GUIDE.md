# Easy Panel Deployment Guide

## การ Deploy Alaskan API ไปยัง Easy Panel

### ขั้นตอนการ Deploy

1. **เข้าสู่ Easy Panel Dashboard**

   - เข้าไปยัง Easy Panel dashboard ของคุณ
   - สร้าง App ใหม่

2. **สร้าง App บน Easy Panel**

   ```bash
   App Name: alaskan-api
   App Type: Docker
   ```

3. **ตั้งค่า Environment Variables**

   ```
   NODE_ENV=production
   PORT=3000
   MYSQL_HOST=kkc_alaskan
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=@Alaskan2025
   MYSQL_DATABASE=game_topup
   JWT_SECRET=Alaskan2025_Super_Secret_JWT_Key_Production
   FRONTEND_URL=https://your-app-url.easypanel.host
   ```

4. **ตั้งค่า Dockerfile**

   - Easy Panel จะใช้ Dockerfile ที่มีอยู่แล้วในโปรเจ็กต์

5. **ตั้งค่า Port Mapping**

   - Internal Port: 3000
   - External Port: 80 หรือ 443

6. **Deploy**
   - กดปุ่ม Deploy
   - รอให้ container build และเริ่มทำงาน

### การตรวจสอบหลัง Deploy

1. **Health Check**

   ```bash
   curl https://your-app-url.easypanel.host/health
   ```

2. **Test API**

   ```bash
   curl https://your-app-url.easypanel.host/
   ```

3. **Test Login**
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@alaskan.com", "password": "@Alaskan2025"}' \
     https://your-app-url.easypanel.host/login
   ```

### Troubleshooting

1. **ถ้าไม่สามารถเชื่อมต่อ MySQL ได้**

   - ตรวจสอบค่า MYSQL_HOST
   - ตรวจสอบว่า database server ทำงานปกติ

2. **ถ้า App ไม่เริ่มต้น**

   - ตรวจสอบ logs ใน Easy Panel
   - ตรวจสอบ Environment Variables

3. **ถ้า Health Check ล้มเหลว**
   - ตรวจสอบว่า PORT เป็น 3000
   - ตรวจสอบ container logs

### URL Structure หลัง Deploy

- **Health Check**: `https://your-app-url.easypanel.host/health`
- **Login**: `https://your-app-url.easypanel.host/login`
- **API Endpoints**: `https://your-app-url.easypanel.host/api/{table}`

### Security Notes

- JWT_SECRET ควรเป็น random string ที่ซับซ้อน
- ห้ามเปิดเผย database credentials
- ใช้ HTTPS เสมอใน production
