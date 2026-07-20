# LUXE

LUXE is a Node.js and Express e-commerce application with EJS views, MongoDB persistence, user authentication, admin management, cart, checkout, order, wallet, wishlist, offers, coupons, referrals, and PayPal payment support.

## Tech Stack

- Node.js
- Express
- EJS
- MongoDB with Mongoose
- Express Session with MongoDB session storage
- Passport Google OAuth
- PayPal Checkout SDK
- Nodemailer

## Project Structure

```text
config/        App configuration, database, passport, and PayPal setup
constants/     Shared server constants and messages
controller/    Route controller logic
middleware/    Express middleware and error handling
model/         Mongoose models
public/        Static assets
routers/       Express route definitions
service/       Business/service-layer logic
utilites/      Utility helpers
views/         EJS templates
app.js         Application entry point
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

PAYPALID=your_paypal_client_id
SECRET_CODE=your_paypal_secret

ADMIN=admin_email
PASSWORDADMIN=admin_password

EMAIL=your_email_address
PASSWORD=your_email_app_password
```

Run the project in development mode:

```bash
npm run dev
```

Run the project in production mode:

```bash
npm start
```

The server runs at:

```text
http://localhost:5000
```

If `PORT` is set in `.env`, use that port instead.

## Available Scripts

- `npm run dev` - starts the app with Nodemon
- `npm start` - starts the app with Node

## Main Routes

- `/` - user-facing store routes
- `/admin` - admin routes
- `/cart` - cart routes
- `/checkout` - checkout routes
- `/order` - order routes
- `/error-test` - development-only error test routes

## Notes

- Keep `.env` out of version control.
- Make sure MongoDB is running or the MongoDB connection string is valid before starting the app.
- Google OAuth, PayPal, and email features require valid credentials.
