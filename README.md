# ProofCraft Backend

API server + Admin Dashboard for ProofCraft.

**Live URL:** `https://proof-craft-backend.vercel.app`  
**Admin Dashboard:** `https://proof-craft-backend.vercel.app/admin`  
**Admin credentials:** Username: `Omar_The_Innovator` / Password set in env

---

## Stack
- Node.js + Express
- MongoDB Atlas (free M0 tier)
- Nodemailer (Gmail SMTP)
- JWT authentication
- Helmet + rate limiting + XSS protection

---

## Local Setup

```bash
git clone https://github.com/omar-pushing/proof-craft-backend.git
cd proof-craft-backend
npm install
cp .env.example .env
# Fill in .env values (see below)
npm run dev
```

### .env values you must fill in

| Key | Where to get it |
|-----|----------------|
| `MONGODB_URI` | Create free cluster at [mongodb.com/atlas](https://mongodb.com/atlas) → Connect → Drivers → copy URI |
| `JWT_SECRET` | Any random 32+ char string — use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `EMAIL_PASS` | Gmail → Settings → Security → 2-Step Verification → App Passwords → create one for "Mail" |
| `ADMIN_PASSWORD` | Already set to `O#V2N*TT@R` — change if you want |

---

## Deployment to Vercel

### 1. Push to GitHub
```bash
git init
git remote add origin https://github.com/omar-pushing/proof-craft-backend.git
git add .
git commit -m "Initial backend"
git push -u origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import `proof-craft-backend` from GitHub
3. **Framework:** Other (Node.js)
4. Add these Environment Variables in Vercel dashboard:

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_random_secret_here
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=Omar_The_Innovator
ADMIN_PASSWORD=O#V2N*TT@R
EMAIL_USER=omar.ahmed.ibrahiem2@gmail.com
EMAIL_PASS=your_gmail_app_password
FRONTEND_URL=https://proofcraft.online
NODE_ENV=production
```

5. Deploy → assign domain `proof-craft-backend.vercel.app`

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user (requires JWT) |

### CV (requires user JWT)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cv` | Get user's CVs |
| POST | `/api/cv` | Create CV |
| PUT | `/api/cv/:id` | Update CV |
| DELETE | `/api/cv/:id` | Delete CV |
| POST | `/api/cv/:id/share` | Generate share link |
| GET | `/api/cv/public/:slug` | View public CV |

### Case Studies (requires user JWT)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/casestudies` | Get user's case studies |
| POST | `/api/casestudies` | Create case study |
| PUT | `/api/casestudies/:id` | Update |
| DELETE | `/api/casestudies/:id` | Delete |
| POST | `/api/casestudies/:id/publish` | Publish + generate link |
| GET | `/api/casestudies/public/:slug` | View public case study |

### Public (no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/faqs` | FAQs for homepage |
| GET | `/api/public/testimonials` | Testimonials |
| GET | `/api/public/content` | Site content (headlines etc.) |
| GET | `/api/public/stats` | Real user/CV/case counts |

### Feedback (no auth, rate limited 5/hr)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/feedback` | Submit feedback (emails omar.ahmed.ibrahiem2@gmail.com) |

### Admin (requires admin JWT)
All at `/api/admin/*` — login at `/api/admin/login` then use Bearer token.

---

## Gmail App Password Setup

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification → turn ON
3. Security → App passwords
4. Select app: Mail, device: Other → name it "ProofCraft"
5. Copy the 16-character password → use as `EMAIL_PASS`

---

## Security Features
- Helmet.js security headers (CSP, HSTS, X-Frame-Options, etc.)
- Rate limiting: auth (10/15min), API (100/min), feedback (5/hr)
- Input sanitization: XSS filtering + MongoDB operator injection prevention
- JWT with 7-day expiry
- Passwords hashed with bcrypt (cost factor 12)
- CORS restricted to allowed origins only
- Admin credentials seeded once on first server start
