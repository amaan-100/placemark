import html
import json
import re
from pathlib import Path

import fitz

BASE = Path(__file__).resolve().parents[1]
MAX_PDF_PAGES = 30

SKILL_VOCABULARY = [
    "python",
    "java",
    "javascript",
    "typescript",
    "c++",
    "c#",
    "react",
    "next.js",
    "vue",
    "angular",
    "node.js",
    "flask",
    "django",
    "fastapi",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "redis",
    "linux",
    "kali",
    "networking",
    "cybersecurity",
    "security",
    "information security",
    "git",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "terraform",
    "ansible",
    "siem",
    "splunk",
    "burp suite",
    "wireshark",
    "nmap",
    "metasploit",
    "owasp",
    "penetration testing",
    "incident response",
    "threat hunting",
    "firewall",
    "tcp/ip",
    "dns",
    "http",
    "bash",
    "powershell",
    "html",
    "css",
    "tailwind",
    "graphql",
    "rest",
    "ci/cd",
    "jenkins",
    "github actions",
    "pandas",
    "numpy",
    "tensorflow",
    "pytorch",
    "machine learning",
    "data analysis",
    "agile",
    "jira",
    "excel",
    "tableau",
    "power bi",
    "figma",
    "ui/ux",
    "seo",
    "content writing",
    "copywriting",
    "editing",
    "social media",
    "video editing",
    "customer service",
    "sales",
    "accounting",
    "bookkeeping",
    "project management",
    "product management",
    "communication",
    "leadership",
]

_SKILL_PATTERNS = [
    (skill, re.compile(rf"(?<![a-z0-9]){re.escape(skill)}(?![a-z0-9])"))
    for skill in SKILL_VOCABULARY
]

ASPIRATIONAL_MARKERS = (
    "interested in",
    "aspiring",
    "aiming to",
    "would like to",
    "want to",
    "hope to",
    "plan to",
    "seeking",
    "looking for",
    "career goal",
    "objective:",
    "learning",
    "currently learning",
    "eager to",
    "keen to",
    "strive to",
)

_LEARNING_GUARD = r"(?<!machine )(?<!deep )(?<!reinforcement )(?<!active )"


def _aspirational_pattern(marker: str) -> re.Pattern[str]:
    pattern = rf"(?<![a-z0-9]){re.escape(marker)}(?![a-z0-9])"
    if marker == "learning":
        pattern = rf"{_LEARNING_GUARD}{pattern}"
    return re.compile(pattern)


_ASPIRATIONAL_PATTERNS = [_aspirational_pattern(marker) for marker in ASPIRATIONAL_MARKERS]

_CLAUSE_SPLIT = re.compile(r"(?<=[.!?])\s+")

TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")


def html_to_text(value: str) -> str:
    return SPACE_RE.sub(" ", html.unescape(TAG_RE.sub(" ", value or ""))).strip()


def _is_aspirational(clause: str) -> bool:
    low = clause.lower()
    return any(pattern.search(low) for pattern in _ASPIRATIONAL_PATTERNS)


def non_aspirational_text(text: str) -> str:
    kept: list[str] = []
    for line in (text or "").splitlines():
        clauses = [clause for clause in _CLAUSE_SPLIT.split(line) if not _is_aspirational(clause)]
        cleaned = " ".join(clause.strip() for clause in clauses if clause.strip())
        if cleaned:
            kept.append(cleaned)
    return "\n".join(kept)


def extract_skills(text: str) -> list[str]:
    low = non_aspirational_text(text).lower()
    found: list[str] = []
    for skill, pattern in _SKILL_PATTERNS:
        if pattern.search(low):
            found.append(skill)
    return found


def extract_pdf(path: str) -> str:
    doc = fitz.open(path)
    try:
        if doc.needs_pass:
            raise ValueError("Encrypted PDFs are not supported.")
        if doc.page_count > MAX_PDF_PAGES:
            raise ValueError(f"PDF has too many pages (max {MAX_PDF_PAGES}).")
        return "\n".join(page.get_text() for page in doc).strip()
    finally:
        doc.close()


def resume_facts(text: str) -> dict:
    return {"skills": extract_skills(text), "raw_text": text}


def local_jobs() -> list[dict]:
    return json.loads((BASE / "data/mock_jobs.json").read_text(encoding="utf-8"))


def rank_jobs(jobs: list[dict], skills: list[str], goal: str, location: str | None = None) -> list[dict]:
    words = set(re.findall(r"[a-zA-Z0-9+#.-]{3,}", goal.lower()))
    loc_words = set(re.findall(r"[a-zA-Z0-9+#.-]{3,}", (location or "").lower()))
    ranked = []
    for job in jobs:
        text = " ".join(
            [
                job.get("title", ""),
                job.get("company", ""),
                job.get("location", ""),
                " ".join(job.get("skills", [])),
            ]
        ).lower()
        skill_hits = sum(1 for skill in skills if skill.lower() in text)
        goal_hits = sum(1 for word in words if word in text)
        location_hits = sum(1 for word in loc_words if word in text) if loc_words else 0
        base_score = skill_hits * 15 + goal_hits * 8 + location_hits * 10
        ranked.append({**job, "match_score": min(100, base_score)})
    return sorted(ranked, key=lambda item: item["match_score"], reverse=True)


def deterministic_document(resume_text: str, job: dict) -> tuple[str, str]:
    skills = resume_facts(resume_text)["skills"]
    relevant = [skill for skill in skills if skill in " ".join(job.get("skills", [])).lower()]
    cover = (
        f"Dear Hiring Team,\n\nI am interested in the {job['title']} opportunity at "
        f"{job['company']}. My background includes skills already present in my resume: "
        f"{', '.join(relevant or skills[:6]) or 'the experience described in my resume'}.\n\n"
        "I would welcome the opportunity to discuss how my existing experience can "
        "contribute to the role.\n\nRegards,\nCandidate"
    )
    return resume_text, cover


def interview_question(goal: str) -> str:
    bank = [
        "Explain a security incident you would investigate first in a SOC and why.",
        "How would you identify whether a suspicious network connection is malicious?",
        "Tell me about a technical project you built and one challenge you solved.",
        "What is the difference between authentication and authorization?",
        "How would you safely investigate a phishing email?",
    ]
    return bank[sum(map(ord, goal or "")) % len(bank)]


def evaluate_answer(answer: str) -> tuple[int, str]:
    words = len(answer.split())
    terms = [
        "because",
        "example",
        "approach",
        "test",
        "risk",
        "monitor",
        "evidence",
        "mitigate",
    ]
    hits = sum(term in answer.lower() for term in terms)
    score = min(100, 35 + min(words, 40) + hits * 6)
    feedback = (
        "Good structure. Add a concrete example and explain your reasoning."
        if words >= 25
        else "Answer is too short. Give context, your approach, evidence, and outcome."
    )
    if score >= 80:
        feedback = (
            "Strong answer. Keep the reasoning concrete and connect it to measurable "
            "outcomes where your resume supports them."
        )
    return score, feedback


RUBRIC_WEIGHTS = {
    "relevance": 30,
    "structure": 25,
    "evidence": 25,
    "accuracy": 20,
}

WEAK_AREA_THRESHOLD = 60

INTERVIEW_FOCUS_QUESTIONS = {
    "evidence": [
        "Walk me through a specific project where you applied {goal} skills. "
        "What exactly did you do, and what was the outcome?",
        "Give a concrete example where your approach to {goal} changed after you "
        "saw data or test results.",
    ],
    "structure": [
        "Describe, step by step, how you would approach a typical {goal} task from "
        "start to finish.",
        "How do you decide what to do first when facing an unfamiliar {goal} problem?",
    ],
    "accuracy": [
        "Explain a core concept in {goal} and where people commonly get it wrong.",
        "What is the difference between two closely related ideas in {goal}, and when "
        "would you use each?",
    ],
    "relevance": [
        "Why do you want to work in {goal}, and which of your existing skills fits it best?",
        "Which part of {goal} do you find hardest, and how would you close that gap?",
    ],
}

GENERAL_INTERVIEW_QUESTIONS = [
    "Tell me about a technical project you built and one challenge you solved.",
    "How would you decide what to investigate first when a system behaves unexpectedly?",
    "Describe a time you had to learn something quickly to finish a task.",
]


def _clamp_score(value: float, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, int(round(value))))


def rubric_breakdown(answer: str, score: int) -> dict[str, int]:
    text = (answer or "").lower()
    words = len((answer or "").split())
    sentences = max(1, len([part for part in re.split(r"[.!?]", answer or "") if part.strip()]))
    sequence = sum(
        token in text
        for token in ("first", "then", "next", "finally", "because", "so that", "step")
    )
    evidence = sum(
        token in text
        for token in ("example", "log", "evidence", "test", "metric", "data", "measured")
    )
    digits = len(re.findall(r"\d", answer or ""))
    domain = sum(
        token in text
        for token in (
            "risk",
            "monitor",
            "mitigate",
            "approach",
            "hypothesis",
            "security",
            "incident",
            "network",
        )
    )

    raw = {
        "relevance": _clamp_score(35 + min(words, 60) * 0.5),
        "structure": _clamp_score(30 + sequence * 12 + min(sentences, 5) * 6 + min(words, 60) * 0.2),
        "evidence": _clamp_score(25 + evidence * 12 + min(digits, 6) * 4),
        "accuracy": _clamp_score(30 + domain * 9 + min(words, 80) * 0.25),
    }

    weight_total = sum(RUBRIC_WEIGHTS.values())
    weighted = sum(raw[dim] * RUBRIC_WEIGHTS[dim] for dim in raw) / weight_total
    if weighted <= 0:
        return {dim: _clamp_score(score) for dim in raw}
    factor = score / weighted
    return {dim: _clamp_score(value * factor) for dim, value in raw.items()}


def weak_dimensions(rubric: dict, threshold: int = WEAK_AREA_THRESHOLD) -> list[str]:
    if not rubric:
        return []
    weak = [dim for dim, value in rubric.items() if value < threshold]
    if not weak:
        return [min(rubric, key=rubric.get)]
    return sorted(weak, key=lambda dim: rubric.get(dim))


def merge_weak_areas(existing: list[str], new: list[str]) -> list[str]:
    merged = list(existing)
    for dim in new:
        if dim not in merged:
            merged.append(dim)
    return merged


def next_interview_question(goal: str, turn_index: int, weak_areas: list[str]) -> str:
    role = (goal or "the role").strip() or "the role"
    seed = sum(map(ord, role))
    focus = weak_areas[0] if weak_areas else None
    bank = INTERVIEW_FOCUS_QUESTIONS.get(focus)
    if bank:
        return bank[(turn_index + seed) % len(bank)].format(goal=role)
    return GENERAL_INTERVIEW_QUESTIONS[(turn_index + seed) % len(GENERAL_INTERVIEW_QUESTIONS)]
