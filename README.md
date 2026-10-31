# Book Haven

A single-page Indian bookstore demo built with React, Vite, Express, and a local JSON data file. No MySQL setup is needed.

## Run it

Open a terminal in this folder and run:

```powershell
npm run dev
```

In a second terminal, run:

```powershell
npm start
```

Open the local URL printed by Vite (usually http://localhost:5173). The React development server forwards `/api` requests to Express on port 5000.

To use the production build instead, run `npm run build` and then `npm start`; Express serves the built app at http://localhost:5000.

## Features

- Single-page, responsive bookstore with featured books and reader-friendly design.
- Browse Indian authors and titles with prices in INR. Search by title, author, or genre; filter by genre; sort by price or rating.
- Create an account, sign in, and sign out. Passwords are salted and hashed before they are saved.
- Add books to a personal cart, adjust quantities, remove books, and view subtotal.
- Sample checkout creates a confirmed order (no payment is taken); view order history from **My orders**.
- Books, accounts, carts, and orders persist in `data/store.json`, generated with sample books on first API request.

## Notes

The Express API runs on port 5000 by default. Set `PORT` to change it. Session tokens are held in server memory, so signing in again is required after restarting the server. The sample covers are loaded from Open Library; all store data is kept in the local JSON file.
