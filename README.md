# SettleUp - Smart Expense Splitter

Split group expenses smartly with debt simplification. Minimize transactions and settle up easily.

## Project info

This is a React-based expense splitting application built with modern web technologies.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

You can clone this repo and push changes using your favorite IDE.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Technologies used

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Auth configuration

This app now uses Firebase free-tier services for auth and persisted user profile data.

- Email/password auth via Firebase Authentication
- Google sign-in via Firebase Authentication popup
- Profile persistence in Cloud Firestore (`users` collection)

Set these values from your Firebase project config in `.env`:

```sh
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""
```

For member invite emails (on adding a member to a group), configure EmailJS in `.env`:

```sh
VITE_EMAILJS_SERVICE_ID=""
VITE_EMAILJS_TEMPLATE_ID=""
VITE_EMAILJS_PUBLIC_KEY=""
```

In EmailJS, create a template that uses these params:

- `to_email`
- `to_name`
- `group_name`
- `inviter_name`
- `message`

In Firebase Console, enable:

1. Authentication → Sign-in method → Email/Password + Google
2. Firestore Database (create in test mode for initial setup)

Restart the dev server after updating environment variables.

## How can I deploy this project?

You can deploy this project to any static hosting service like Vercel, Netlify, or GitHub Pages. Simply build the project with `npm run build` and deploy the `dist` folder.

## Technologies used
