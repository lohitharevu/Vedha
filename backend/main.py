
import os
import json
from difflib import SequenceMatcher
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types


app = FastAPI(
    title="VEDHA API",
    description="AI-assisted civic complaint analysis powered by Gemini",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://vedha-intelligence.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-3.8-flash"

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


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
        "ai_model": GEMINI_MODEL if client else "Rule-based fallback",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "project": "VEDHA",
        "gemini_configured": client is not None,
    }


# ---------- Rule-Based Fallback ----------

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
                explanation=f"Rule-based keyword match for {category}.",
            )

    return ComplaintAnalysis(
        category="General Complaint",
        urgency="Medium",
        department="General Services",
        recommended_action=(
            "Review the complaint and assign the appropriate team."
        ),
        explanation=(
            "No specific rule matched. Manual review is recommended."
        ),
    )


# ---------- Gemini Complaint Analysis ----------

@app.post("/analyze", response_model=ComplaintAnalysis)
def analyze(request: ComplaintRequest):
    if client is None:
        return analyze_text(request.complaint)

    prompt = f"""
You are VEDHA, an AI assistant for analyzing civic and campus complaints.

Analyze the complaint below and return a structured assessment.

Complaint source: {request.source}
Requested response language: {request.language}
Complaint: {request.complaint}

Instructions:
- Identify the most appropriate complaint category.
- Select urgency: Low, Medium, High, or Critical.
- Recommend the responsible department.
- Suggest a practical and safe next action.
- Explain briefly which details support your assessment.
- Do not invent facts that are not in the complaint.
- Treat possible immediate danger seriously, but do not claim
  that an emergency has been independently verified.
- Set human_review_required to true.
- Write the explanation and recommended action in the requested language.
"""

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ComplaintAnalysis,
                temperature=0.2,
            ),
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response")

        result = ComplaintAnalysis.model_validate_json(response.text)
        result.human_review_required = True
        return result

    except Exception:
        # Preserve basic functionality if Gemini is temporarily unavailable.
        result = analyze_text(request.complaint)
        result.explanation = (
            "Gemini analysis was unavailable. "
            "This result uses rule-based fallback and requires human review. "
            + result.explanation
        )
        return result


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
