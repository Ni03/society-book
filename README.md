# 📖 Society Book

A full-stack web application for managing housing society member records, built for wing chairmen to register, search, edit, export, and delete resident data with file attachment support.

---

## 🗂️ Project Structure

```
society-book/
├── server/               # Express.js backend (Node.js)
│   ├── src/
│   │   ├── config/       # MongoDB connection
│   │   ├── controllers/  # Route handlers (admin, auth, public)
│   │   ├── middleware/   # JWT authentication
│   │   ├── models/       # Mongoose schemas (Member, Admin)
│   │   ├── routes/       # Express routers
│   │   ├── index.js      # Server entry point
│   │   └── seed.js       # Chairman account seeder
│   └── uploads/          # Uploaded attachment files (auto-created)
│
└── ui/                   # React + Vite frontend (TypeScript)
    └── src/
        ├── api/          # Axios instance with auth interceptors
        ├── components/   # Shared components (Layout, ProtectedRoute)
        ├── context/      # AuthContext (JWT state management)
        ├── pages/        # App pages
        └── types/        # TypeScript interfaces
```

---

## ✨ Features

### 👥 Member Registration (Public)
- Public form accessible via `/public/:wing/:type`
- Supports **Owner** and **Tenant** registration
- File uploads for:
  - 🏠 **Owners** → Index 2 document (optional)
  - 📋 **Tenants** → Rental Agreement (required) + Agreement expiry date
- Vehicle registration — bikes & cars with registration numbers

### 🔐 Chairman Portal (Protected)
| Feature | Description |
|---------|-------------|
| **Login** | JWT-based authentication per wing |
| **Dashboard** | Wing stats summary |
| **Members List** | Filter by All / Owner / Tenant, search by name |
| **Edit Member** | Update phone, flat, vehicles, attachments |
| **Delete Member** | Two-step confirmation modal, auto-deletes attachment file from disk |
| **Vehicle Search** | Search any member by bike/car registration number |
| **Download Attachments** | View or download Index 2 / Agreement files |
| **Export to Excel** | Download wing members as a styled `.xlsx` file |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript |
| Routing | React Router DOM v7 |
| HTTP Client | Axios |
| Notifications | React Hot Toast |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Mongoose 9) |
| Auth | JWT (`jsonwebtoken`) |
| File Uploads | Multer |
| Excel Export | ExcelJS |
| Password Hashing | bcryptjs |

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)

---

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd society-book
```

---

### 2. Configure Environment Variables

Create a `.env` file inside the `server/` directory:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/society-book
JWT_SECRET=your_super_secret_jwt_key
PORT=5000
```

---

### 3. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install UI dependencies
cd ../ui
npm install
```

---

### 4. Seed Chairman Accounts

Run once to create login accounts for all 11 wings (A–K):

```bash
cd server
npm run seed
```

This creates accounts with the following pattern:

| Wing | Username | Password |
|------|----------|----------|
| A | `chairmanA` | `Chairman@A123` |
| B | `chairmanB` | `Chairman@B123` |
| … | … | … |
| K | `chairmanK` | `Chairman@K123` |

> ⚠️ **Security:** Change default passwords in production.

---

### 5. Run the Application

**Start the backend server:**
```bash
cd server
npm run dev       # Development (nodemon, auto-restart)
# or
npm run start     # Production
```
Server runs at: `http://localhost:5000`

**Start the frontend:**
```bash
cd ui
npm run dev
```
UI runs at: `http://localhost:5173`

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Chairman login, returns JWT |

### Public (No Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/public/member` | Register a new member (multipart/form-data) |

### Admin (JWT Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/members` | Get all members (supports `?type=&search=`) |
| `GET` | `/api/admin/members/export` | Download members as `.xlsx` |
| `GET` | `/api/admin/members/:id` | Get single member |
| `PUT` | `/api/admin/members/:id` | Update member |
| `DELETE` | `/api/admin/members/:id` | Delete member + attachment file |
| `GET` | `/api/admin/search` | Search by vehicle reg no (`?registrationNo=`) |

> All admin routes require `Authorization: Bearer <token>` header.

---

## 📄 Excel Export

The **Export Excel** button on the Members page downloads a beautifully styled `.xlsx` file including:

- Frozen, dark-styled header row with auto-filter dropdowns
- Zebra-striped rows with colour-coded Owner/Tenant types
- Columns: #, Full Name, Phone, Flat No, Wing, Type, Bikes, Bike Reg Nos, Cars, Car Reg Nos, Attachment, Agreement Expiry, Registered On
- Respects the active **filter** (All / Owners / Tenants) and **search** term
- Filename format: `Wing_A_Members_2026-03-01.xlsx`

---

## 📁 File Uploads

Uploaded files are stored in `server/uploads/` and served statically at:
```
http://localhost:5000/uploads/<filename>
```

- Owners can upload an **Index 2** document
- Tenants must upload a **Rental Agreement**
- When a member is deleted, their attachment file is also deleted from disk

---

## 🔒 Security

- Passwords are hashed with **bcryptjs**
- All chairmen can only view/edit/delete members of their **own wing**
- JWT token is verified on every protected request
- Expired tokens automatically redirect to login

---

## 🧭 Page Routes (Frontend)

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Redirects to `/login` |
| `/login` | Public | Chairman login page |
| `/public/:wing/:type` | Public | Member self-registration form |
| `/admin/dashboard` | Protected | Wing overview & stats |
| `/admin/members` | Protected | Member list with search, export, delete |
| `/admin/members/:id/edit` | Protected | Edit a member's details |
| `/admin/search` | Protected | Search by vehicle registration number |

---

## 🐛 Known Issues / Notes

- The server must be restarted manually when using `npm run start` (no hot-reload). Use `npm run dev` during development.
- The upload URL is currently hardcoded to `http://localhost:5000` in the UI. Update `SERVER_ORIGIN` in `MembersPage.tsx` and `VehicleSearchPage.tsx` for production deployment.

---

## 📜 License

ISC
