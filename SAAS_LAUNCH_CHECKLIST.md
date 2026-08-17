# ðŸš€ ResellQ — SaaS Launch Checklist

Checklist complète pour lancer ResellQ en production ce soir.

---

## âœ… Status: READY FOR LAUNCH

### Phase 1: Production Environment Setup

#### 1. **Hosting & Deployment**
- [ ] Choose hosting provider:
  - **Recommended: Vercel** (Next.js native, auto-scaling, free tier available)
  - Alternative: Railway, Render, AWS Amplify
- [ ] Create production account and project
- [ ] Configure domain: `resellq.com` (or custom)
- [ ] Set up SSL/TLS certificate (auto-managed by hosting)
- [ ] Configure custom domain DNS records

#### 2. **Database Setup**
- [ ] Choose database:
  - **Recommended: PostgreSQL** (Vercel Postgres, Railway, or managed service)
  - Alternative: MongoDB, SQLite on disk (not for production)
- [ ] Create production database
- [ ] Run Prisma migrations: `npx prisma migrate deploy`
- [ ] Set up database backups (automatic)
- [ ] Test database connection from app

#### 3. **Environment Variables (Production)**
- [ ] Create `.env.production` with all required vars:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/resellq

# NextAuth
NEXTAUTH_URL=https://resellq.com
NEXTAUTH_SECRET=<strong-random-key>

# Stripe (Get keys from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (if using AI features)
OPENAI_API_KEY=sk-...

# Optional: Admin credentials for seed
ADMIN_EMAIL=admin@resellq.com
ADMIN_PASSWORD=<strong-password>
```

#### 4. **Stripe Production Setup**
- [ ] Switch Stripe account to **Live Mode**
- [ ] Get **Live Publishable Key** (pk_live_...)
- [ ] Get **Live Secret Key** (sk_live_...)
- [ ] Get **Webhook Secret** for production
- [ ] Add production domain to Stripe webhook settings
- [ ] Create product plans in Stripe Dashboard:
  - `resellq-pro-monthly` (75€/month)
  - `resellq-business-monthly` (199€/month)
  - etc.
- [ ] Test payment flow in Stripe Dashboard Sandbox (before going live)
- [ ] Configure webhook endpoint: `https://resellq.com/api/webhooks/stripe`

#### 5. **NextAuth Configuration**
- [ ] Generate secure `NEXTAUTH_SECRET`:
  ```bash
  openssl rand -base64 32
  ```
- [ ] Set `NEXTAUTH_URL=https://resellq.com` (production)
- [ ] Configure email provider (if using email auth)
- [ ] Test login/signup flow

#### 6. **Security Hardening**
- [ ] Verify security headers are enabled (middleware.ts)
- [ ] Enable HSTS (already in code)
- [ ] Set up CORS if needed
- [ ] Review `.env.example` (no secrets exposed)
- [ ] Remove `.env.local` from version control
- [ ] Update `.gitignore` (included âœ“)
- [ ] Enable rate limiting (optional, via hosting provider)
- [ ] Set up DDoS protection (hosting provider default)

#### 7. **Analytics & Monitoring**
- [ ] Set up analytics (optional):
  - Google Analytics (add tracking ID)
  - Vercel Analytics (automatic if using Vercel)
  - PostHog, Mixpanel, etc.
- [ ] Set up error monitoring:
  - Sentry, LogRocket, or Vercel error logs
- [ ] Set up uptime monitoring:
  - UptimeRobot, Pingdom
  - Health endpoint: `https://resellq.com/api/health`
- [ ] Enable application logs in hosting provider

#### 8. **Email & Notifications**
- [ ] Set up transactional email service:
  - SendGrid, Mailgun, AWS SES, or Resend
  - Add email templates for:
    - Welcome/signup confirmation
    - Payment receipt
    - Password reset
    - Subscription notifications
- [ ] Test email delivery
- [ ] Configure email sender address (noreply@resellq.com or custom)

---

### Phase 2: Application Verification

#### 9. **Build & Deployment**
- [ ] Run production build locally:
  ```bash
  npm run build
  ```
- [ ] Verify no build errors
- [ ] Deploy to hosting provider:
  - Connect GitHub repo (recommended)
  - Enable auto-deploy on push
  - Set environment variables in hosting dashboard
- [ ] Test production deployment
- [ ] Verify app is accessible: `https://resellq.com`

#### 10. **Core Pages Testing**
- [ ] Home page loads correctly: `/`
- [ ] Pricing displays properly: `/#pricing`
- [ ] Payment/checkout works: `/payment`
- [ ] Auth pages function: `/auth/signin`, `/auth/signup`
- [ ] Dashboard loads (with/without subscription): `/dashboard`
- [ ] Legal pages accessible: `/cgv`, `/confidentialite`, `/mentions-legales`
- [ ] Navigation and links work
- [ ] Footer displays and links function

#### 11. **Authentication Flow**
- [ ] User signup works â†’ creates account in DB
- [ ] User login works â†’ redirects to dashboard
- [ ] Logout works â†’ clears session
- [ ] Password reset works (if implemented)
- [ ] Session persistence works (refresh page â†’ stays logged in)
- [ ] Unauthorized users redirected from protected routes

#### 12. **Payment Flow**
- [ ] Stripe checkout integration works
- [ ] Users can select plan and proceed to payment
- [ ] Test payment succeeds and creates subscription
- [ ] Webhook processes successfully (test via Stripe Dashboard)
- [ ] User marked as `subscriptionStatus='ACTIVE'` after payment
- [ ] Invoice sent to customer email
- [ ] Billing page shows subscription status correctly
- [ ] Cancel subscription works

#### 13. **API & Database**
- [ ] Health endpoint responds: `GET /api/health` â†’ 200 OK
- [ ] Database queries execute correctly
- [ ] User data persists correctly
- [ ] Subscription data stores and retrieves correctly
- [ ] API errors return proper status codes
- [ ] Rate limiting works (if enabled)

#### 14. **Performance**
- [ ] Page load times < 3s (Lighthouse audit)
- [ ] Core Web Vitals score good (LCP, FID, CLS)
- [ ] Images optimized (Next.js Image component)
- [ ] No console errors or warnings
- [ ] Database queries optimized (no N+1 queries)

#### 15. **Responsive Design**
- [ ] Mobile (320px) — all pages readable
- [ ] Tablet (768px) — layout adjusts properly
- [ ] Desktop (1920px) — full experience
- [ ] Test on real devices (or DevTools)
- [ ] Touch interactions work on mobile
- [ ] Forms are mobile-friendly

#### 16. **Browser Compatibility**
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

### Phase 3: Content & Legal

#### 17. **Legal & Compliance**
- [ ] Terms & Conditions (CGV) page filled
- [ ] Privacy Policy (Confidentialité) page filled
- [ ] Legal Notice (Mentions légales) page filled
- [ ] GDPR cookie consent banner working
- [ ] User data export/deletion capability (optional)
- [ ] Compliance with local regulations (France/EU)

#### 18. **Branding & Messaging**
- [ ] Logo displays correctly
- [ ] Brand colors consistent
- [ ] Messaging aligned with brand tone
- [ ] All text is spell-checked (FR/EN)
- [ ] Contact email is active: `contact@resellq.com`
- [ ] Company info is accurate (footer, legal pages)

#### 19. **SEO Preparation**
- [ ] Sitemap generated: `/sitemap.xml` âœ“
- [ ] Robots.txt configured: `/robots.txt` âœ“
- [ ] Meta tags correct (title, description, OG)
- [ ] Canonical URLs set
- [ ] Mobile-friendly (mobile first)
- [ ] Schema markup added (optional, for rich results)
- [ ] Submit sitemap to Google Search Console

#### 20. **Email & Communication**
- [ ] Contact email monitored: `contact@resellq.com`
- [ ] Welcome email template ready
- [ ] Payment confirmation email ready
- [ ] Subscription status emails ready
- [ ] Support response plan documented

---

### Phase 4: Go-Live

#### 21. **Final Checks**
- [ ] All checklist items above completed
- [ ] 3-5 test users created and verified
- [ ] Payment test transactions completed (use Stripe test cards)
- [ ] All pages load without errors
- [ ] Console has no critical warnings
- [ ] Health check passes: `/api/health` â†’ 200
- [ ] Database backups configured
- [ ] Error logging enabled
- [ ] Monitoring alerts set up

#### 22. **Go-Live Actions**
- [ ] Set DNS records for `resellq.com`
- [ ] Verify SSL certificate active (green lock)
- [ ] Test from different networks (mobile/wifi/4G)
- [ ] Post announcement (social media, email list, etc.)
- [ ] Monitor error logs for first 24h
- [ ] Be ready for support questions

#### 23. **Post-Launch Monitoring (24-48h)**
- [ ] Monitor uptime (should be 99.9%+)
- [ ] Check error logs regularly
- [ ] Respond to user feedback/issues
- [ ] Monitor database performance
- [ ] Monitor Stripe transactions
- [ ] Check email delivery
- [ ] Monitor payment success rate

---

## ðŸ“‹ Quick Deployment Commands

```bash
# Build for production
npm run build

# Test production build locally
npm run start

# Deploy (depends on hosting provider)
# Vercel: git push (auto-deploys)
# Railway/Render: git push or dashboard deploy
# Docker: docker build . && docker push

# Run database migrations
npx prisma migrate deploy

# Seed admin user (if needed)
npx ts-node seed.ts
```

---

## ðŸ”‘ Critical Environment Variables

| Variable | Where to Get | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL provider | âœ… YES |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | âœ… YES |
| `NEXTAUTH_URL` | Your domain (https://resellq.com) | âœ… YES |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard â†’ Live Keys | âœ… YES |
| `STRIPE_SECRET_KEY` | Stripe Dashboard â†’ Live Keys | âœ… YES |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard â†’ Webhooks | âœ… YES |
| `OPENAI_API_KEY` | OpenAI API Dashboard | âš ï¸ If using AI |

---

## ðŸŽ¯ Success Criteria

âœ… **All pages load without errors**  
âœ… **Users can sign up and log in**  
âœ… **Payment flow works end-to-end**  
âœ… **Subscription activates correctly**  
âœ… **Health endpoint returns 200**  
âœ… **No console errors**  
âœ… **SSL certificate active**  
âœ… **Database backups enabled**  
âœ… **Monitoring/logging enabled**  
âœ… **Legal pages complete**  

---

## âš ï¸ Common Mistakes to Avoid

- âŒ Using test API keys in production
- âŒ Exposing secrets in version control
- âŒ Not setting up database backups
- âŒ Not testing payment flow thoroughly
- âŒ Not monitoring errors after launch
- âŒ Using HTTP instead of HTTPS
- âŒ Missing CORS/CSRF protections
- âŒ Not setting up error logging
- âŒ Forgetting to test on mobile

---

## ðŸ“ž Support & Troubleshooting

If you encounter issues:
1. Check error logs in hosting provider dashboard
2. Check Sentry/error monitoring service
3. Verify environment variables are correct
4. Test database connection
5. Check Stripe webhook logs
6. Review application logs: `npm run dev` locally with same env vars

---

**Last Updated:** July 3, 2026  
**Status:** Ready for deployment  
**Estimated Time to Complete:** 2-4 hours (depending on setup complexity)  

