# Auth0 Setup Instructions - REQUIRED

## ⚠️ Action Required: Configure Auth0 Dashboard

You're seeing a "Callback URL mismatch" error because the Auth0 application needs to be configured with the correct callback URLs.

## 🔧 Configuration Steps

### 1. Open Auth0 Dashboard
Visit: https://manage.auth0.com/dashboard/us/dev-tiag25eta5ht4rl8/applications

### 2. Find Your Application
Look for the application with:
- **Client ID**: `f6VZeO1zbW6TSOzDcKfFNLAf41VxTwY7`
- **Name**: (Your application name)

### 3. Configure Application URIs

Scroll down to the **Application URIs** section and add these values:

#### Allowed Callback URLs
```
http://localhost:3000/auth/callback
```

#### Allowed Logout URLs
```
http://localhost:3000
```

#### Allowed Web Origins
```
http://localhost:3000
```

### 4. Save Changes
Click the **Save Changes** button at the bottom of the page.

### 5. Test Authentication
After saving, try logging in again at: http://localhost:3000/auth

---

## 📋 Quick Copy-Paste Values

For easy configuration, here are the exact values to copy:

**Allowed Callback URLs:**
```
http://localhost:3000/auth/callback
```

**Allowed Logout URLs:**
```
http://localhost:3000
```

**Allowed Web Origins:**
```
http://localhost:3000
```

---

## 🚀 For Production Deployment

When you deploy to production, add your production URLs:

**Allowed Callback URLs:**
```
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

**Allowed Logout URLs:**
```
http://localhost:3000
https://your-production-domain.com
```

**Allowed Web Origins:**
```
http://localhost:3000
https://your-production-domain.com
```

---

## ✅ Verification

After configuration, you should be able to:
1. Visit http://localhost:3000/auth
2. Click "Sign In" or "Create Account"
3. Be redirected to Auth0 Universal Login
4. Log in successfully
5. Be redirected back to your application

---

## 🐛 Troubleshooting

### Still seeing "Callback URL mismatch"?
- Double-check the URLs are exactly as shown above
- Make sure you clicked "Save Changes" in Auth0 dashboard
- Clear your browser cache and cookies
- Try in an incognito/private window

### "Invalid state" error?
- Clear browser cookies
- Make sure `AUTH0_SECRET` is set in `.env.local`
- Restart your development server

### Can't find the application?
- Check you're logged into the correct Auth0 tenant
- The domain should be: `dev-tiag25eta5ht4rl8.us.auth0.com`

---

## 📞 Need Help?

If you're still having issues:
1. Check the Auth0 logs in the dashboard
2. Verify all environment variables in `.env.local`
3. Make sure the development server is running on port 3000
4. Check the browser console for errors

---

**Once configured, your Auth0 integration will be fully functional! 🎉**
