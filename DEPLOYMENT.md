# Deployment Guide - Cyber Girlfriend

This guide covers deploying the Cyber Girlfriend application to production using Cloudflare Workers and Pages.

## Prerequisites

- Cloudflare account
- Node.js 18+ and Bun 1.0+
- OpenAI API key with Realtime API access
- Git repository

## Deployment Options

### Option 1: Cloudflare Pages (Frontend) + Workers (Backend)

This is the recommended approach for production deployment.

#### Step 1: Deploy Frontend to Cloudflare Pages

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Cloudflare Pages:**
   ```bash
   # Install Wrangler CLI
   npm install -g wrangler

   # Login to Cloudflare
   wrangler login

   # Deploy to Pages
   wrangler pages deploy dist --project-name=cyber-girlfriend
   ```

3. **Configure custom domain (optional):**
   - Go to Cloudflare Dashboard → Pages → cyber-girlfriend
   - Add custom domain under "Custom domains"

#### Step 2: Deploy Backend to Cloudflare Workers

1. **Configure environment variables:**
   ```bash
   # Set OpenAI API key
   wrangler secret put OPENAI_API_KEY

   # Set other secrets
   wrangler secret put JWT_SECRET
   wrangler secret put SESSION_SECRET
   ```

2. **Update wrangler.toml:**
   - Edit `wrangler.toml` with your account ID
   - Configure routes and domains

3. **Deploy backend:**
   ```bash
   cd backend
   bun run build
   wrangler deploy
   ```

#### Step 3: Configure CORS

Update backend CORS settings to allow your frontend domain:

```typescript
// backend/src/index.ts
app.use('*', cors({
  origin: ['https://your-domain.pages.dev', 'https://your-custom-domain.com'],
  credentials: true,
}))
```

### Option 2: Traditional Hosting

#### Frontend Deployment (Vercel/Netlify)

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Vercel:**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

   Or **Deploy to Netlify:**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

#### Backend Deployment (Railway/Render)

1. **Deploy to Railway:**
   - Connect your GitHub repository
   - Set environment variables
   - Railway will auto-deploy on push

2. **Or deploy to Render:**
   - Create new Web Service
   - Connect repository
   - Set build command: `cd backend && bun install && bun run build`
   - Set start command: `cd backend && bun run start`

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.com
VITE_WS_URL=wss://your-backend-url.com
```

### Backend (.env)
```env
NODE_ENV=production
PORT=8000
WS_PORT=8001
DATABASE_URL=./data/cyber-girlfriend.db
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
FRONTEND_URL=https://your-frontend-url.com
```

## Database Setup

### SQLite (Development/Small Scale)
- Database file is created automatically
- Suitable for single-server deployments

### PostgreSQL (Production/Scale)
For production at scale, migrate to PostgreSQL:

1. **Install PostgreSQL adapter:**
   ```bash
   cd backend
   bun add pg
   ```

2. **Update Drizzle config:**
   ```typescript
   // drizzle.config.ts
   export default {
     schema: "./src/db/schema.ts",
     out: "./drizzle",
     driver: "pg",
     dbCredentials: {
       connectionString: process.env.DATABASE_URL,
     },
   };
   ```

3. **Run migrations:**
   ```bash
   bun run db:migrate
   ```

## SSL/HTTPS Configuration

### Cloudflare (Automatic)
- SSL is automatically configured
- Use "Full (strict)" SSL mode

### Custom Server
1. Obtain SSL certificate (Let's Encrypt)
2. Configure in your server
3. Redirect HTTP to HTTPS

## Performance Optimization

### Frontend
- ✅ Code splitting (Vite handles this)
- ✅ Asset optimization (images, fonts)
- ✅ Service worker caching
- ✅ Lazy loading components

### Backend
- ✅ Enable compression
- ✅ Implement rate limiting
- ✅ Use Redis for caching (optional)
- ✅ Database connection pooling

## Monitoring & Logging

### Cloudflare Analytics
- Built-in analytics for Workers and Pages
- Real-time performance metrics

### External Services
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Datadog** for comprehensive monitoring

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] API keys rotated regularly
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens implemented

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (Cloudflare, AWS ALB)
- Deploy multiple backend instances
- Implement session affinity for WebSockets

### Database Scaling
- Read replicas for queries
- Connection pooling
- Caching layer (Redis)

### CDN Configuration
- Static assets served from CDN
- Edge caching for API responses
- Geographic distribution

## Backup & Recovery

### Database Backups
```bash
# Automated daily backups
0 2 * * * /path/to/backup-script.sh
```

### Disaster Recovery
- Regular backup testing
- Documented recovery procedures
- Multiple backup locations

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: npm run install:all
      
      - name: Build
        run: npm run build
      
      - name: Deploy Frontend
        run: wrangler pages deploy frontend/dist
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      
      - name: Deploy Backend
        run: cd backend && wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Post-Deployment

1. **Test all features:**
   - Voice recording and playback
   - Conversation persistence
   - Personality switching
   - Export functionality
   - PWA installation

2. **Monitor performance:**
   - Check response times
   - Monitor error rates
   - Review user feedback

3. **Set up alerts:**
   - Downtime notifications
   - Error rate thresholds
   - Performance degradation

## Troubleshooting

### Common Issues

**WebSocket connection fails:**
- Check CORS configuration
- Verify WSS protocol is used
- Ensure firewall allows WebSocket traffic

**Database connection errors:**
- Verify DATABASE_URL is correct
- Check database server is running
- Ensure migrations are applied

**API rate limiting:**
- Implement exponential backoff
- Add request queuing
- Monitor OpenAI API usage

## Support

For deployment issues:
- Check logs in Cloudflare Dashboard
- Review GitHub Issues
- Contact support team

## Cost Estimation

### Cloudflare (Recommended)
- **Pages**: Free tier (unlimited requests)
- **Workers**: $5/month (10M requests)
- **Total**: ~$5-10/month for small scale

### Traditional Hosting
- **Frontend (Vercel)**: Free tier
- **Backend (Railway)**: $5-20/month
- **Database**: $10-50/month
- **Total**: ~$15-70/month

## Next Steps

After successful deployment:
1. Set up monitoring and alerts
2. Configure automated backups
3. Implement CI/CD pipeline
4. Plan for scaling
5. Gather user feedback

