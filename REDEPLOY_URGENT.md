# 🚨 URGENT: EasyPanel Redeploy Required

## ❌ **Current Issue:**

API บน `https://kkc-alaskan-api.ruhy1d.easypanel.host` ได้รับ **502 error** และ CORS error

## ✅ **Root Cause Fixed:**

- ✅ แก้ไข TypeError ใน `app.options('*')` route
- ✅ ปรับ CORS configuration ให้ทำงานได้
- ✅ ทดสอบ local แล้วว่า API ทำงานปกติ

## 🚀 **Action Required: Redeploy**

### Step 1: Update Repository

```bash
git add .
git commit -m "Fix CORS and path-to-regexp TypeError - Ready for EasyPanel"
git push origin main
```

### Step 2: Redeploy in EasyPanel Dashboard

1. เข้าไปยัง EasyPanel Dashboard
2. ไปที่ app `kkc-alaskan-api`
3. กด **"Redeploy"** button
4. รอให้ Docker build เสร็จ

### Step 3: Check Environment Variables

ตรวจสอบว่า Environment Variables ถูกต้อง:

```bash
NODE_ENV=production
PORT=3000
MYSQL_HOST=kkc_alaskan_db
MYSQL_PORT=3306
MYSQL_USER=alaskan
MYSQL_PASSWORD=@Alaskan2025
MYSQL_DATABASE=game_topup
JWT_SECRET=Alaskan2025_Super_Secret_JWT_Key_Production_EasyPanel
FRONTEND_URL=https://alaskans.store
```

### Step 4: Verify Health Check

หลัง redeploy เสร็จ:

```bash
curl https://kkc-alaskan-api.ruhy1d.easypanel.host/health
```

Expected: `{"status":"OK",...}`

### Step 5: Test CORS

```bash
curl -X OPTIONS \
  -H "Origin: https://alaskans.store" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  https://kkc-alaskan-api.ruhy1d.easypanel.host/api/users
```

Expected: Status 200 with CORS headers

## 📋 **Fixed Code Summary:**

### Before (Broken):

```javascript
app.options("*", (req, res) => {
  // ❌ This caused TypeError
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  // ... more headers
  res.sendStatus(200);
});
```

### After (Fixed):

```javascript
app.use(
  cors({
    origin: [
      "http://localhost:4200",
      "https://alaskans.store",
      "https://kkc-alaskan-api.ruhy1d.easypanel.host",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// ✅ No manual app.options() - let CORS middleware handle it
```

## 🔍 **Troubleshooting:**

### If Health Check Still Fails:

1. Check EasyPanel logs for container errors
2. Verify MySQL connection to `kkc_alaskan_db`
3. Check if port 3000 is properly exposed

### If CORS Still Fails:

1. Verify the fix was deployed
2. Check that https://alaskans.store is in origin list
3. Test with different browsers

---

## ⚡ **Quick Deploy Commands:**

```bash
# 1. Commit changes
git add . && git commit -m "Fix CORS TypeError - Ready for production"

# 2. Push to repository
git push origin main

# 3. Redeploy in EasyPanel (manual step)

# 4. Test
curl https://kkc-alaskan-api.ruhy1d.easypanel.host/health
```

**Status: Ready for redeploy! 🚀**
