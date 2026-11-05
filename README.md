# InfoMatrix / Gyarados – Digital Library and Asset Management System

A digital library and digital asset management website built with React, Vite, Tailwind CSS, and Supabase.

## Technology Stack

- **Frontend:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase
- **Authentication:** Supabase Auth
- **Database:** Supabase PostgreSQL
- **File Storage:** Supabase Storage
- **Routing:** React Router DOM

## Features

### Digital Library
- Browse and search books
- View book information and descriptions
- Access uploaded book covers
- Read uploaded PDF books
- Borrow and return books

### Digital Asset Management
- Upload digital assets
- Organize and manage files
- View and download stored assets
- Delete digital assets

### User Authentication
- User registration and login
- Persistent authentication sessions
- User profile management
- Role-based access control

### Administration
- Admin dashboard
- Manage registered users
- Update user roles
- Manage library resources and digital assets

## Installation and Setup

### 1. Clone or download the project

Open the project folder in Visual Studio Code.

### 2. Install dependencies

Open the terminal inside `gyarados-master` and run:

```bash
npm install
```

### 3. Configure Supabase

Create a `.env.local` file in the `gyarados-master` root directory.

Add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Replace the placeholder values with your actual Supabase project credentials.

You can find these in your Supabase project settings.

**Important:** Never put your Supabase service role key in frontend environment variables.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually:

```text
http://localhost:5173
```

### 5. Build for production

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Supabase Configuration

The application connects directly to Supabase through its JavaScript client.

The following services are used:

- **Supabase Auth:** User authentication and session management.
- **Supabase Database:** Books, categories, profiles, borrowing records, and digital asset information.
- **Supabase Storage:** Book covers, book PDFs, and digital assets.
- **Supabase RPC:** Administrative operations and database functions.

### Storage Buckets

The application uses these Supabase Storage buckets:

| Bucket | Purpose |
|---|---|
| `book-covers` | Uploaded book cover images |
| `book-pdfs` | Uploaded PDF books |
| `digital-assets` | Uploaded digital assets |

Make sure the required buckets, database tables, policies, and RPC functions are configured in your Supabase project.

## Project Structure

```text
gyarados-master/
├── public/
├── src/
│   ├── api/
│   │   ├── supabaseApi.js
│   │   └── adminApi.js
│   ├── components/
│   ├── context/
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── pages/
│   └── App.jsx
├── .env.local
├── .env.example
├── package.json
└── README.md
```

## Development Notes

- The application uses Supabase as its backend.
- No separate Mock API server is required.
- Database operations are handled through Supabase.
- Uploaded files are stored in Supabase Storage.
- Access to administrative functions is controlled through database permissions and role checks.

## Production Deployment

Before deploying:

1. Configure the production Supabase environment variables.
2. Verify database tables and Row Level Security policies.
3. Verify Storage bucket permissions.
4. Test authentication and administrative functions.
5. Run `npm run build`.
6. Deploy the generated `dist/` folder using your preferred hosting provider.

---

**InfoMatrix – Digital Library and Asset Management System**

*Powered by Gyarados.*