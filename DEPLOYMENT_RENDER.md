# 🚀 Deploying PrajaSeva Portal to Render

This guide outlines the step-by-step procedure to deploy the **PrajaSeva Portal** onto [Render](https://render.com) for public access by judges and users.

---

## ⚡ Method 1: 1-Click Blueprint Deployment (Recommended)

Render natively reads the included `render.yaml` in the repository and configures everything automatically.

### Steps:
1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Connect your GitHub account and select your repository:
   ```
   https://github.com/ybhargavi40021978-alt/Prajaseva
   ```
4. Render will detect `render.yaml` and display the **prajaseva-portal** web service configuration:
   - **Runtime:** Node
   - **Plan:** Free
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
5. Click **Apply**.
6. Wait 2–3 minutes for the build and deployment to complete. Render will generate a live URL such as:
   ```
   https://prajaseva-portal.onrender.com
   ```

---

## 🛠️ Method 2: Manual Web Service Setup (Step-by-Step)

If you prefer to configure the service manually on Render:

1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** → **Web Service**.
2. Select **Build and deploy from a Git repository**.
3. Connect your repository: `https://github.com/ybhargavi40021978-alt/Prajaseva`.
4. Configure the settings:
   - **Name:** `prajaseva-portal`
   - **Region:** Choose closest to your audience (e.g., `Singapore` or `Oregon`).
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install && npm run build
     ```
   - **Start Command:**
     ```bash
     npm start
     ```
   - **Instance Type:** `Free`
5. Under **Advanced** → **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `JWT_SECRET`: `prajaseva-super-secure-jwt-secret-2026`
6. Under **Advanced** → **Health Check Path**:
   - `/api/health`
7. Click **Create Web Service**.

---

## 🐍 Method 3: Deploying Python FastAPI Backend Separately (Optional)

If you prefer to run the **Python FastAPI** backend on Render:

1. Click **New +** → **Web Service**.
2. Connect your repository: `https://github.com/ybhargavi40021978-alt/Prajaseva`.
3. Configure the settings:
   - **Name:** `prajaseva-api-python`
   - **Root Directory:** `backend-python`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/api/health`
4. Click **Create Web Service**.
5. Once deployed, note down the Python backend URL (e.g., `https://prajaseva-api-python.onrender.com`).
6. Deploy the Frontend as a **Static Site** on Render:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
   - **Environment Variable:** `VITE_API_URL` = `https://prajaseva-api-python.onrender.com`

---

## 🔑 Post-Deployment Live Verification

Once Render displays **"Your service is live"**:

1. Open your live Render URL (`https://<your-app>.onrender.com/`).
2. Verify **Health Check**: Open `https://<your-app>.onrender.com/api/health` (should return JSON `{ status: "healthy", ... }`).
3. Verify **Multilingual Engine**: Switch language from English to Telugu or Hindi.
4. Verify **Authentication & Zero-State**:
   - Login with verified judge accounts:
     - **Citizen:** `citizen@ap.gov.in` / `Citizen@123`
     - **Department Officer:** `officer@ap.gov.in` / `Officer@123`
     - **Administrator:** `admin@ap.gov.in` / `Admin@123`
   - Register a new citizen account to test live registration and password toggle.
5. Verify **Role Restrictions**: Click **Department Services** while logged in as citizen (expect `Access Denied`).
