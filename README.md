# CampusSphere - Smart Campus Management System

CampusSphere is a powerful, professional, fully responsive web application/PWA designed for comprehensive campus management. Built for a B.Tech 3rd-year mini project, it incorporates academic tracking, smart bus management with QR tracking, a smart library with subscription-based lending, and fee management.

## Problem Statement

Managing academic information, attendance, examination fees,
transportation, and library services separately can make it
difficult for students and administrators to access information
efficiently.

CampusSphere aims to provide a centralized platform that
simplifies campus information management and improves access
to essential student services.

## Project Objectives

- Provide a centralized student information portal.
- Enable students to view their academic and attendance details.
- Simplify examination fee status management.
- Support campus transportation management.
- Improve library book and lending management.
- Provide role-based access for students and administrators.

## Key Features

- Student and administrator authentication.
- Role-based access control.
- Student dashboard.
- Academic and attendance tracking.
- Examination fee management.
- Bus and transportation management.
- Library and book management.
- Announcements and campus information.

## Future Scope

- Mobile application integration.
- Push notifications for announcements and reminders.
- Advanced academic performance analytics.
- Enhanced reporting for administrators.
- Additional campus services and integrations.

## Conclusion

CampusSphere provides a centralized approach to campus
management by integrating student information, academic
tracking, transportation, library services, and fee management
into a single web application.
## Tech Stack
- React 19 (via Vite)
- Vanilla CSS for styling
- Firebase Authentication (RBAC for Admins & Students)
- Firebase Firestore (Database)
- Firebase Realtime Database (Live bus tracking)
- Lucide React (Icons)

## Setup Instructions

1. Clone or copy this repository to your local machine.
2. Ensure you have Node.js installed.
3. Open a terminal in the project root directory and run:
   ```bash
   npm install
   ```
4. Set up the Environment Variables (see below).
5. Start the development server:
   ```bash
   npm run dev
   ```

## Firebase Configuration

Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
Enable **Authentication** (Email/Password), **Firestore Database**, and **Realtime Database**.

### Environment Variables

Create a `.env.local` file in the root of the project with your Firebase configuration values:

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_DATABASE_URL="your-database-url"
```

## Demo Initialization

To quickly populate the database with demo buses, books, and announcements, an admin can log in and click the **"Inject Demo Data"** button located on the top right of the Admin Dashboard.

## Demo Login Information

You can create new student accounts via the Register page. For admin access, you will need to manually change a user's `role` to `"admin"` directly within your Firebase Firestore `users` collection, or use an existing admin account if you created one.

## Deployment Steps (Vercel)

1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. Add the environment variables from your `.env.local` file into the Vercel project settings.
4. Set the Framework Preset to `Vite`.
5. Click **Deploy**. The application will now be accessible via a production URL on all devices.
