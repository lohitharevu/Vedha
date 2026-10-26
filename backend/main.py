
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from difflib import SequenceMatcher
from typing import Literal

app = FastAPI(
    title="VEDHA API",
    description="AI-assisted civic complaint analysis",
    version="1.0.0",
)

# Allow requests from the VEDHA frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Data Models ----------

class ComplaintRequest(BaseModel):
    complaint: str = Field(min_length=3, max_length=2000)
    source: str = "Campus"
    language: str = "English"


class ComplaintAnalysis(BaseModel):
    category: str
    urgency: Literal["Low", "Medium", "High", "Critical"]
    department: str
    recommended_action: str
    explanation: str
    human_review_required: bool = True


class ExistingComplaint(BaseModel):
    id: str | int | None = None
    complaint: str
    category: str | None = None
    status: str | None = None


class DuplicateRequest(BaseModel):
    complaint: str = Field(min_length=3, max_length=2000)
    existing_complaints: list[ExistingComplaint] = Field(
        default_factory=list
    )


# ---------- Health Routes ----------

@app.get("/")
def home():
    return {
        "project": "VEDHA",
        "status": "running",
        "message": "VEDHA backend is online",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "project": "VEDHA",
    }


# ---------- Complaint Analysis ----------

def analyze_text(text: str) -> ComplaintAnalysis:
    message = text.lower()

    rules = [
        (
            ["fire", "smoke", "building burning"],
            "Fire Safety", "Critical", "Emergency Services",
            "Alert emergency services and secure the affected area.",
        ),
        (
            ["live wire", "exposed wire", "electric shock", "sparking"],
            "Electrical Hazard", "Critical", "Electrical Department",
            "Restrict access and request urgent electrical inspection.",
        ),
        (
            ["water leakage", "water leak", "burst pipe", "no water"],
            "Water Supply", "High", "Water Department",
            "Inspect the water supply and repair the reported fault.",
        ),
        (
            ["garbage", "trash", "waste", "overflowing bin"],
            "Sanitation", "Medium", "Sanitation Department",
            "Arrange waste collection and inspect the affected area.",
        ),
        (
            ["pothole", "broken road", "road damage"],
            "Road Maintenance", "Medium", "Public Works Department",
            "Inspect the road and schedule necessary repairs.",
        ),
        (
            ["streetlight", "street light", "lamp not working"],
            "Street Lighting", "Low", "Electrical Department",
            "Inspect the streetlight and arrange a repair.",
        ),
    ]

    for keywords, category, urgency, department, action in rules:
        if any(word in message for word in keywords):
            return ComplaintAnalysis(
                category=category,
                urgency=urgency,
                department=department,
                recommended_action=action,
                explanation=f"Matched keywords for {category}.",
            )

    return ComplaintAnalysis(
        category="General Complaint",
        urgency="Medium",
        department="General Services",
        recommended_action=(
            "Review the complaint and assign the appropriate team."
        ),
        explanation=(
            "No specific category matched. Manual review is recommended."
        ),
    )


@app.post("/analyze", response_model=ComplaintAnalysis)
def analyze(request: ComplaintRequest):
    return analyze_text(request.complaint)


# ---------- Duplicate Detection ----------

@app.post("/duplicates")
def duplicates(request: DuplicateRequest):
    new_text = request.complaint.lower().strip()
    matches = []

    for item in request.existing_complaints:
        old_text = item.complaint.lower().strip()
        similarity = SequenceMatcher(
            None, new_text, old_text
        ).ratio()

        if similarity >= 0.45:
            matches.append({
                "id": item.id,
                "complaint": item.complaint,
                "category": item.category,
                "status": item.status,
                "similarity": round(similarity * 100, 2),
                "human_review_required": True,
            })

    matches.sort(
        key=lambda item: item["similarity"],
        reverse=True,
    )

    matches = matches[:5]

    return {
        "potential_duplicates": matches,
        "count": len(matches),
        "human_review_required": True,
    }
