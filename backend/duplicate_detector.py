
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Load the embedding model once, not for every complaint.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)


def find_similar_complaints(
    new_complaint: str,
    existing_complaints: list[dict],
    threshold: float = 0.65,
    top_k: int = 5,
) -> list[dict]:
    """
    Find potentially related complaints using semantic similarity.

    Each existing complaint should contain:
        id: unique complaint ID
        text: complaint description

    Similarity is a candidate-matching score, not proof of duplication.
    A human reviewer must confirm matches.
    """
    if not 0 <= threshold <= 1:
        raise ValueError("threshold must be between 0 and 1")

    if top_k < 1:
        raise ValueError("top_k must be at least 1")

    if not new_complaint.strip():
        return []

    if not existing_complaints:
        return []

    valid_complaints = [
        item for item in existing_complaints
        if isinstance(item.get("text"), str) and item["text"].strip()
    ]

    if not valid_complaints:
        return []

    texts = [item["text"] for item in valid_complaints]

    embeddings = model.encode(
        [new_complaint] + texts,
        normalize_embeddings=True,
    )

    scores = cosine_similarity(
        embeddings[0:1],
        embeddings[1:],
    )[0]

    matches = []

    for item, score in zip(valid_complaints, scores):
        similarity = float(score)

        if similarity >= threshold:
            matches.append({
                "id": item.get("id"),
                "text": item["text"],
                "similarity": round(similarity, 4),
                "review_required": True,
            })

    matches.sort(
        key=lambda item: item["similarity"],
        reverse=True,
    )

    return matches[:top_k]
