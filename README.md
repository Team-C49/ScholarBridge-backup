
# ScholarBridge

ScholarBridge is a full-stack web platform designed to connect students with scholarship opportunities and help trusts/NGOs manage and approve applications efficiently. The system is built for transparency, scalability, and ease of use for all stakeholders.

## Technology Stack

- PostgreSQL (database)
- Node.js, Express.js (backend API)
- React.js, Vite, Tailwind CSS (frontend)
- JWT (authentication)
- Cloudflare R2 (document storage)

## Features

- Student registration, login, and application submission
- Dark & light mode compatibility on the frontend
- Trust/NGO registration, login, and dashboard
- Multi-trust approval system for scholarship applications
- Smart Filtering: Trusts see only applications matching their preferences
- Auto-close applications when fully funded
- Secure document upload and download (Cloudflare R2)
- Admin dashboard for analytics and management
- Profile management and password change for trusts
- Responsive, modern UI with role-based access

## Project Structure

- `backend/` - Node.js/Express API server, database migrations, and business logic
- `frontend/` - React.js client app (Vite + Tailwind CSS)
- `docs/` - Documentation and setup guides

## Key Endpoints

- `/api/auth/login` - User login (JWT)
- `/api/auth/register` - User registration
- `/api/trusts/dashboard` - Trust dashboard data
- `/api/trusts/profile` - Trust profile info
- `/api/trusts/change-password` - Change trust password
- `/api/student/applications` - Student application management

## How to run

```
Terminal-1:

cd backend/server
npm i
node server.js

Terminal-2:

cd frontend
npm i
npm run dev
```

`.env` file template (inside `backend/server`) :
```
PORT=4000
DATABASE_URL=

JWT_SECRET=
JWT_EXPIRES_IN=

ENCRYPTION_KEY_BASE64=

# .env
NODE_ENV=development            # or production if you want, careful with fallback behavior
MAIL_FROM=""

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

APP_NAME=ScholarBridge

# Cloudflare R2 Configuration
# Replace these with your actual CloudFlare R2 credentials
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_PUBLIC_DOMAIN=
```


## Security

- Passwords are hashed using bcrypt and stored as `password_hash` in the database
- JWT-based authentication for all protected routes
- Role-based access control for students, trusts, and admins

## Contribution

Pull requests are welcome. Please open issues for bugs or feature requests.

## License

This project is licensed under the MIT License.
