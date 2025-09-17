# Production Setup Guide

## Google OAuth Configuration

### 1. Google Cloud Console Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create or select your project**
3. **Enable Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add your authorized redirect URIs:
     ```
     https://api.joincall.co/api/auth/callback/google
     ```
   - Copy the Client ID and Client Secret

### 2. Environment Variables

#### Backend (Server) Variables

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# App URLs
FRONTEND_URL=https://app.joincall.co
BACKEND_URL=https://api.joincall.co

# Email
EMAIL_FROM=noreply@joincall.co
RESEND_API_KEY=your_resend_api_key

# Auth
BETTER_AUTH_SECRET=your_generated_secret_from_better_auth

# Redis/Valkey
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Environment
NODE_ENV=production
PORT=1284
```

#### Frontend (Vercel) Variables

```env
# Backend API
NEXT_PUBLIC_BACKEND_URL=https://api.joincall.co

# Optional: Callback URL override
NEXT_PUBLIC_CALLBACK_URL=https://app.joincall.co/app

# Database (if needed for migrations)
DATABASE_URL=postgresql://username:password@host:port/database

# Google OAuth (for server-side operations)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Auth
BETTER_AUTH_SECRET=your_generated_secret_from_better_auth

# Environment
NODE_ENV=production
```

### 3. Important URLs to Configure

#### In Google Cloud Console:

- **Authorized JavaScript origins**: `https://app.joincall.co`
- **Authorized redirect URIs**: `https://api.joincall.co/api/auth/callback/google`

#### In your environment:

- **Frontend URL**: `https://app.joincall.co`
- **Backend URL**: `https://api.joincall.co`

### 4. Deployment Checklist

- [ ] Google OAuth credentials created and configured
- [ ] All environment variables set in production
- [ ] URLs match between Google Console and environment variables
- [ ] HTTPS enabled for both frontend and backend
- [ ] Database accessible from production environment
- [ ] Redis/Valkey accessible from production environment

### 5. Common Issues

#### `redirect_uri_mismatch` Error

- **Cause**: The redirect URI in your OAuth request doesn't match what's registered in Google Cloud Console
- **Solution**: Make sure the redirect URI in Google Cloud Console exactly matches:
  ```
  https://api.joincall.co/api/auth/callback/google
  ```

#### Environment Variables Not Working

- **Frontend variables**: Must start with `NEXT_PUBLIC_` to be accessible in the browser
- **Backend variables**: Regular environment variables work fine

#### CORS Issues

- Make sure your backend allows requests from your frontend domain
- Check the `trustedOrigins` in your auth configuration

### 6. Testing Production Setup

1. **Test OAuth flow**:

   - Try logging in with Google
   - Check that redirect works properly
   - Verify user session is created

2. **Test API calls**:

   - Verify all API endpoints work with production URLs
   - Check that authentication works across services

3. **Check logs**:
   - Monitor server logs for errors
   - Check browser console for client-side errors
