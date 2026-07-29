# 🧬 BioArchive v2 — NISER Biological Sciences Academic Portal

**BioArchive v2** is a modern, high-performance study material and resource archive tailored for students and faculty of the **School of Biological Sciences (SBS), NISER Bhubaneswar**. 

It features real-time search, interactive curriculum navigation, NISER Google SSO authentication, dynamic file uploads to Google Drive, and automated Google Sheets metadata synchronization.

---

## 🌟 Key Features

- **⚡ Fast Global Search**: Instant relevance-ranked search across courses, topics, professors, and file types with professor alias & acronym matching.
- **📚 Interactive Curriculum**: Semester-by-semester course directory covering Semesters 1–8 and Advanced Elective Courses.
- **🔒 NISER SSO & Role Gatekeeping**: Secure Google OAuth authentication restricting downloads and protected materials to `@niser.ac.in` domain accounts.
- **📤 Chunked Resumable Uploads**: Upload past papers, lecture slides, notes, and lab manuals directly to Google Drive with automated backup and Sheet synchronization.
- **🎨 Glassmorphism UI & WebGL**: Ocean blue glass dark theme powered by Framer Motion micro-animations and WebGL 3D canvas with graceful non-GPU fallbacks.
- **💬 Community Request Board**: Interactive material request system allowing students to request missing study resources.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **Runtime**: Edge Runtime / Serverless
- **Styling**: Vanilla CSS Modules with Glassmorphism Design Tokens & Tailwind CSS
- **3D Graphics**: Three.js WebGL Engine
- **Storage & Database**: Google Drive API v3 + Google Sheets API v4 + Cloudflare KV
- **Deployment**: Vercel / Cloudflare Pages / Node.js

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm / yarn / pnpm

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/bioarchive-v2.git
   cd bioarchive-v2
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your Google Cloud Service Account credentials, Google OAuth Client ID, and Google Sheet ID in `.env.local`.

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🛡️ License & Contributing

Maintained with ❤️ by the **BioArchive Team**. Contributions and pull requests from NISER students and developers are welcome!
