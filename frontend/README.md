# ScholarBridge - Frontend

A modern, responsive React frontend for the ScholarBridge scholarship management platform with role-based access control for Students, Trusts/NGOs, and Admins.

## Features

### 🎯 Core Features
- **Role-based Access Control**: Separate dashboards for Students, Trusts, and Admins
- **3-Step Student Registration**: Email verification, OTP confirmation, and profile completion
- **Trust Registration**: Public registration form with admin approval workflow
- **Modern UI/UX**: State-of-the-art design with smooth animations and responsive layout
- **Secure Authentication**: JWT-based authentication with protected routes

### 🎨 UI/UX Features
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Smooth Animations**: Framer Motion for delightful user interactions
- **Modern Components**: Clean, accessible form components and layouts
- **Toast Notifications**: Real-time feedback with react-hot-toast
- **Loading States**: Proper loading indicators and disabled states

### 🔐 Authentication Flow
1. **Student Registration**:
   - Step 1: College email + password creation
   - Step 2: OTP verification via email
   - Step 3: Personal info, KYC, and bank details

2. **Trust Registration**:
   - Public registration form
   - Admin approval required
   - Email notification with temporary credentials

3. **Login**:
   - Role-based login (Student/Trust/Admin)
   - JWT token management
   - Automatic redirection to appropriate dashboard

## Tech Stack

- **React 19** - Latest React with modern features
- **React Router DOM 6** - Client-side routing
- **Tailwind CSS 4** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Axios** - HTTP client for API calls
- **React Hot Toast** - Toast notifications
- **Lucide React** - Modern icon library

## Project Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Header.jsx
│   │   └── ProtectedRoute.jsx
│   └── signup/
│       ├── Step1.jsx
│       ├── Step2.jsx
│       └── Step3.jsx
├── contexts/
│   └── AuthContext.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── SignUpPage.jsx
│   ├── TrustRegistrationPage.jsx
│   ├── StudentDashboard.jsx
│   ├── TrustDashboard.jsx
│   └── AdminDashboard.jsx
├── utils/
│   └── api.js
├── config/
│   └── env.js
├── App.jsx
├── main.jsx
└── index.css
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend API running on `http://localhost:4000`

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd scholarbridge-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=http://localhost:4000/api
   VITE_APP_NAME=ScholarBridge
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

The frontend is designed to work seamlessly with the ScholarBridge backend API. Key endpoints:

### Authentication
- `POST /api/auth/register/step1` - Student registration step 1
- `POST /api/auth/register/step2` - OTP verification
- `POST /api/auth/register/step3` - Complete profile
- `POST /api/auth/login` - User login
- `POST /api/trusts/register-request` - Trust registration

### Protected Routes
- `GET /api/student/profile` - Student profile
- `GET /api/student/applications` - Student applications
- `GET /api/trusts/applications` - Trust applications view
- `POST /api/trusts/approve` - Approve application
- `GET /api/admin/trust-requests` - Admin trust requests

## Role-Based Access

### Student Role
- View and manage scholarship applications
- Track funding status
- Update profile information
- Submit new applications

### Trust Role
- Review student applications
- Approve/reject applications
- Track approved funding
- Manage payment status

### Admin Role
- Approve/reject trust registrations
- Manage user accounts
- Resolve issues and disputes
- View platform analytics

## Customization

### Styling
The project uses Tailwind CSS with custom CSS variables and utility classes. Key customization points:

- **Colors**: Defined in `src/index.css` CSS variables
- **Components**: Reusable classes in `src/index.css`
- **Animations**: Custom keyframes and Framer Motion variants

### API Configuration
Update `src/utils/api.js` to modify:
- Base URL configuration
- Request/response interceptors
- Error handling

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel/Netlify
1. Connect your repository
2. Set environment variables
3. Deploy automatically on push

### Environment Variables for Production
```env
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_APP_NAME=ScholarBridge
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**ScholarBridge** - Bridging the gap between students and educational funding opportunities.