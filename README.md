# Invictors: Cipher Quest (Stages 2 & 3)

An interactive, multi-stage cybersecurity and cryptography puzzle platform built with Next.js (App Router, Tailwind CSS, TypeScript) and Supabase real-time synchronization.

## 🚀 Features

- **Team Onboarding**:
  - Teams enter their team designation (`TEAM 1`, `TEAM 2`, etc.) and members.
  - Automatic session restore & state sync from Supabase / local cache.
- **Stage 2: Multi-Layer Cipher Decryption**:
  - 4 distinct cryptographic access code strings distributed across team numbers.
  - Transformation pipeline: `Original String` $\rightarrow$ `ROT13` $\rightarrow$ `Hexadecimal` $\rightarrow$ `Base64`.
  - Hierarchy decoding buttons: `[BASE64]` $\rightarrow$ `[HEXADECIMAL]` $\rightarrow$ `[ROT13]`.
  - Incompatible / decoy algorithms (`[ROT5]`, `[OCTAL]`, `[BINARY]`, `[ATBASH]`, `[CAESAR-7]`) generate glitch and corrupt bytes.
  - Successful decryption triggers confetti and displays the original string in a pop-up modal with direct navigation to Stage 3.
- **Stage 3: Secret Sentence Authentication**:
  - Validates team sentences containing `"I am [role]"`, the team's assigned **Fragment Code**, and **Secret Word**.
  - Reveals the final assigned codewords: `ALPHA`, `SIGMA`, `THETA`, or `DELTA`.
- **Supabase Integration**:
  - Live activity logging for all clicks, decipher steps, and submissions.
  - Automatic progress persistence and recovery.

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file:
```bash
cp .env.example .env.local
```
Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Supabase Database Schema
Copy and execute the contents of `supabase.sql` in your Supabase SQL Editor.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
