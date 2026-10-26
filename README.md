
# 🌿 VEDHA
### AI-Powered Civic Complaint Analysis Platform

> Making civic grievance management smarter, faster, and more organized.

VEDHA is a civic complaint analysis platform designed to help organize public grievances through complaint classification, priority assignment, and duplicate complaint detection. It helps structure complaint information and makes it easier to identify potentially urgent issues.

The current prototype uses predefined keyword rules for classification and text similarity techniques for duplicate detection.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Features](#-features)
- [How It Works](#-how-it-works)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Running Locally](#-running-locally)
- [API Endpoints](#-api-endpoints)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Limitations](#-limitations)
- [Future Enhancements](#-future-enhancements)

---

## 🎯 Overview

Public authorities receive complaints related to water supply, sanitation, road maintenance, electrical hazards, and other civic issues. Manually reviewing and organizing these complaints can take time.

VEDHA provides a web-based interface to analyze complaint text, assign categories and configured priority levels, and identify potentially similar complaints.

### Project Objectives

- Automate basic complaint categorization.
- Assign priority levels using predefined rules.
- Identify potentially duplicate complaints.
- Provide a simple interface for complaint analysis.
- Establish a foundation for future intelligent grievance management.

---

## ⚠️ Problem Statement

Traditional complaint handling can face several challenges:

- Manual classification can be time-consuming.
- Urgent issues may be difficult to identify among many complaints.
- Multiple people may report the same issue using different wording.
- Unstructured complaints can be harder to organize and analyze.

---

## 💡 Our Solution

VEDHA introduces a structured complaint analysis workflow. Users submit complaint text through the frontend, and the backend processes it using predefined classification rules. The system assigns a category and priority based on those rules and can compare complaint descriptions to identify potential duplicates.

This approach demonstrates how automation can support more organized civic grievance management.

---

## ✨ Features

### 1. Complaint Analysis
Accepts complaint information from users and sends it to the backend for processing.

### 2. Complaint Classification
Classifies complaints into configured categories:

- 🔥 Fire Safety
- ⚡ Electrical Hazard
- 💧 Water Supply
- 🧹 Sanitation
- 🛣️ Road Maintenance
- 💡 Street Lighting
- 📋 General Complaint

### 3. Priority Assignment
Assigns a priority according to the configured category rules.

| Category | Configured Priority |
|---|---|
| Fire Safety | Critical |
| Electrical Hazard | Critical |
| Water Supply | High |
| Sanitation | Medium |
| Road Maintenance | Medium |
| Street Lighting | Low |
| General Complaint | Medium |

> Priority assignment currently follows predefined rules. It is not a comprehensive assessment of real-world risk.

### 4. Duplicate Complaint Detection
Uses Python's `SequenceMatcher` to compare complaint descriptions and identify potentially similar reports.

The current similarity threshold is `0.45` (45%). Similarity does not guarantee that two complaints describe the same incident.

### 5. REST API Integration
Uses FastAPI endpoints to exchange complaint data and analysis results between the frontend and backend in JSON format.

### 6. Modern User Interface
Provides a web interface built with React and TypeScript, styled with a green glowing visual theme.

---

## 🔄 How It Works

1. **Submit:** The user enters a civic complaint.
2. **Send:** The frontend sends the complaint to the backend through an HTTP request.
3. **Classify:** The backend checks the complaint text against predefined keyword rules.
4. **Prioritize:** A priority level is assigned according to the configured rules.
5. **Compare:** The duplicate detection endpoint compares complaint text with other complaints.
6. **Return:** The backend returns the results as JSON.
7. **Display:** The frontend displays the available analysis results.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Builds the frontend interface |
| TypeScript | Adds static typing to frontend code |
| Vite | Frontend development server and build tool |
| Python | Implements backend logic |
| FastAPI | Provides REST API endpoints |
| Uvicorn | Runs the FastAPI application |
| `SequenceMatcher` | Compares text similarity |
| CSS | Styles the user interface |
| JSON | Exchanges data between frontend and backend |
| Git and GitHub | Version control and source code hosting |
| Netlify | Frontend deployment |
| Render | Backend deployment |

---

## 🏗️ System Architecture

```text
                  USER
                    |
                    v
         React + TypeScript Frontend
                    |
                    | HTTP Request / JSON
                    v
             FastAPI Backend
                    |
          +---------+---------+
          |                   |
          v                   v
   Keyword-Based         Text Similarity
   Classification        Comparison
          |                   |
          v                   v
   Category and          Potential Duplicate
   Priority Results      Results
          |                   |
          +---------+---------+
                    |
                    v
             JSON Response
                    |
                    v
          Frontend Result Display
```

---

## 📂 Project Structure

```text
VEDHA/
├── frontend/
│   ├── src/
│   │   ├── api.ts
│   │   └── ...
│   ├── package.json
│   ├── .env
│   └── ...
│
├── backend/
│   ├── main.py
│   └── requirements.txt
│
├── README.md
└── .gitignore
```

The frontend may contain additional components, pages, stylesheets, and configuration files. This structure represents the main application layout.

---

## ⚙️ Installation

### Prerequisites

Install the following tools:

- Python 3.10 or later
- Node.js and npm
- Git
- A code editor such as Visual Studio Code

### Step 1: Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd vedha
```

Replace the placeholder with your actual GitHub repository URL.

### Step 2: Set Up the Backend

Open a terminal in the project root:

```powershell
cd backend
python -m venv venv
```

Activate the virtual environment on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

The backend dependency file should include the packages required by the implementation. For a basic FastAPI application, these include:

```text
fastapi
uvicorn[standard]
```

### Step 3: Set Up the Frontend

Open a second terminal:

```powershell
cd frontend
npm install
```

### Step 4: Configure the API URL

Create a `.env` file inside the `frontend/` directory, next to `package.json`.

For local development, add:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The frontend reads this variable to determine the backend API base URL.

> Never put private API keys or secrets in variables prefixed with `VITE_`, because these values can be exposed to browser users.

---

## ▶️ Running Locally

Run the frontend and backend in separate terminals.

### Start the Backend

From the `backend/` directory:

```powershell
python -m uvicorn main:app --reload --port 8000
```

Backend addresses:

- API root: http://127.0.0.1:8000/
- Health check: http://127.0.0.1:8000/health
- Interactive API documentation: http://127.0.0.1:8000/docs

Keep the backend terminal running.

### Start the Frontend

In a second terminal:

```powershell
cd frontend
npm run dev
```

Open the URL displayed by Vite, usually:

http://localhost:5173/

If Vite selects another port, use the URL printed in the terminal and ensure that the backend CORS configuration allows that frontend origin.

---

## 🔌 API Endpoints

The backend currently provides these endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Returns basic project or status information |
| GET | `/health` | Checks whether the backend is responding |
| POST | `/analyze` | Analyzes a submitted complaint |
| POST | `/duplicates` | Identifies potentially similar complaints |

### Health Check

**Request**

```http
GET /health
```

**Example response**

```json
{
  "status": "healthy"
}
```

### Analyze Complaint

**Request**

```http
POST /analyze
Content-Type: application/json
```

**Example request body**

```json
{
  "complaint": "There is a dangerous electrical wire hanging near my street.",
  "source": "web",
  "language": "en"
}
```

The backend processes the complaint using its configured rules and returns an analysis response. Refer to the running API documentation for the exact response fields.

### Duplicate Detection

**Request**

```http
POST /duplicates
Content-Type: application/json
```

This endpoint compares complaint descriptions according to the backend's request schema and returns potential matches.

For the exact request and response formats, open:

http://127.0.0.1:8000/docs

---

## 🧪 Testing

Use this checklist to verify the application:

- [ ] The backend starts without errors.
- [ ] The `/health` endpoint returns a healthy response.
- [ ] The frontend loads successfully.
- [ ] The frontend can communicate with the backend.
- [ ] A fire-related complaint is classified according to the configured rules.
- [ ] An electrical hazard receives the configured Critical priority.
- [ ] A water supply complaint receives the configured High priority.
- [ ] Similar complaint descriptions can be submitted to the duplicate detection endpoint.
- [ ] API errors are handled appropriately.

For manual API testing, use FastAPI's interactive documentation at `/docs`.

---

## 🌐 Deployment

VEDHA uses separate hosting services for its frontend and backend.

### Frontend — Netlify

Configure the frontend build with the following settings:

| Setting | Value |
|---|---|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Environment variable | `VITE_API_BASE_URL` |

Set `VITE_API_BASE_URL` to the deployed backend's base URL, without adding `/analyze` or `/duplicates` to the value.

### Backend — Render

Configure the backend service with the correct backend root directory and dependency file.

A typical start command, when `main.py` is in the service root directory, is:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### CORS Configuration

The backend must allow requests from the frontend's deployed origin.

For the current Netlify site, the origin is:

```text
https://vedha-intelligence.netlify.app
```

Also allow the appropriate local development origins when needed.

After changing frontend environment variables on Netlify, trigger a new build so the updated API URL is included in the frontend bundle.

---

## ⚠️ Limitations

- Classification depends on predefined keywords and may miss context or unfamiliar wording.
- Priority levels follow configured rules and do not independently assess real-world danger.
- Text similarity may identify unrelated complaints or miss genuine duplicates.
- Duplicate detection does not independently verify location, time, or incident identity.
- The prototype requires further testing and validation before use in real public-safety workflows.

---

## 🔮 Future Enhancements

Potential improvements include:

- Machine-learning-based complaint classification.
- Multilingual complaint analysis.
- Location-aware duplicate detection.
- Complaint status tracking and notifications.
- An analytics dashboard for authorities.
- Authentication and role-based access control.
- Automated testing and improved error handling.
- Integration with real civic grievance management systems.

These are proposed improvements, not claims about features already implemented.

---

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a new feature branch.
3. Make and test your changes.
4. Commit with a descriptive message.
5. Open a pull request explaining your changes.

---

## 📌 Project Status

VEDHA is a prototype demonstrating a structured civic complaint analysis workflow. Its current implementation focuses on keyword-based classification, configured priority assignment, and text-similarity-based duplicate detection.

## 📄 License

MIT LICENSE

**VEDHA — Towards smarter and more efficient civic grievance management.**
