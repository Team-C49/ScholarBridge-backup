
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

## Setup Guide

See `SETUP_GUIDE.md` for step-by-step installation and environment configuration.

## Documentation

- [Smart Filtering Algorithm](docs/smart-filtering-algorithm.md)
- [Cloudflare R2 Integration](docs/cloudflare-r2-integration.md)
- [Document Management System](docs/document-management-system.md)
- [Quick R2 Setup](docs/r2-quick-setup.md)

## Key Endpoints

- `/api/auth/login` - User login (JWT)
- `/api/auth/register` - User registration
- `/api/trusts/dashboard` - Trust dashboard data
- `/api/trusts/profile` - Trust profile info
- `/api/trusts/change-password` - Change trust password
- `/api/student/applications` - Student application management

## Security

- Passwords are hashed using bcrypt and stored as `password_hash` in the database
- JWT-based authentication for all protected routes
- Role-based access control for students, trusts, and admins

## Contribution

Pull requests are welcome. Please open issues for bugs or feature requests.

## License

This project is licensed under the MIT License.
