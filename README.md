# TechMastery - Coding Practice & Tutorials

This is a modern learning platform built with a Client-Server architecture. The project is split into two parts: a **Next.js Frontend** and an **Express.js Backend API**.

To run the entire project successfully, you must start **both** servers. Always start the Backend first.

## 1. Start the Backend (API Server)
The backend is responsible for reading the markdown content and serving it dynamically to the frontend. It runs on **Port 3005**.

Open a terminal and run the following commands:

```bash
# Navigate to the server folder
cd server

# Install dependencies (only needed the first time)
npm install

# Start the backend server
node index.js
```
*You should see the message: `Tutorials Content Backend API is running on http://localhost:3005`*

## 2. Start the Frontend (Next.js App)
The frontend provides the premium UI and fetches data from the backend. It runs on **Port 3000**.

Open a **new, separate terminal tab** and run:

```bash
# Ensure you are in the root directory (d:\AB\Tutorial)
cd d:\AB\Tutorial

# Install dependencies (only needed the first time)
npm install

# Start the frontend server
npm run dev
```
*You should see a message indicating it started on `http://localhost:3000`*

## 3. View the App
Once both servers are running, open your web browser and navigate to:
**http://localhost:3000**

---

## Troubleshooting: "Port 3000 is in use" or "500 Internal Server Error"

If your Next.js server crashes, gets stuck loading, or says "EPERM: operation not permitted", it means your `.next` cache is corrupted and a hidden Node process is locking it. 

To fix it manually, run these exact commands in your terminal:

```powershell
# 1. forcefully kill all hidden node processes (this releases the file locks and frees port 3000)
taskkill /F /IM node.exe

# 2. Delete the corrupted Next.js cache folder
Remove-Item -Path d:\AB\Tutorial\.next -Recurse -Force

# 3. You can now start the Backend and Frontend normally again!
```
