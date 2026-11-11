from app.agents import _grounded_skills
from app.tools import deterministic_document, extract_skills, non_aspirational_text


def test_extract_skills_finds_listed_skills():
    skills = extract_skills("Skills: Python, SQL, React")
    assert "python" in skills
    assert "sql" in skills
    assert "react" in skills


def test_extract_skills_ignores_aspirational_line():
    skills = extract_skills("Interested in learning Kubernetes and Go.")
    assert "kubernetes" not in skills
    assert "go" not in skills


def test_extract_skills_keeps_current_but_drops_future():
    skills = extract_skills("Aspiring to become a Java developer. Skills: Python.")
    assert "python" in skills
    assert "java" not in skills


def test_non_aspirational_text_drops_only_marked_lines():
    text = (
        "Skills: Python, SQL\n"
        "Interested in learning Kubernetes\n"
        "Built a Flask API with Python"
    )
    kept = non_aspirational_text(text)
    assert "Skills: Python, SQL" in kept
    assert "Built a Flask API with Python" in kept
    assert "Kubernetes" not in kept


def test_extract_skills_unaffected_in_normal_prose():
    skills = extract_skills("Built a Flask API with Python")
    assert "python" in skills
    assert "flask" in skills


def test_grounded_skills_rejects_substring_trap():
    result = _grounded_skills(
        {"skills": ["java"]}, "Skills: JavaScript, Python", []
    )
    assert "java" not in result


def test_grounded_skills_preserves_deterministic_list():
    result = _grounded_skills(
        {"skills": ["java"]}, "Skills: JavaScript, Python", ["python", "sql"]
    )
    assert result[:2] == ["python", "sql"]
    assert "java" not in result


def test_grounded_skills_rejects_company_name_match():
    result = _grounded_skills({"skills": ["go"]}, "Worked at Google as an intern", [])
    assert "go" not in result


def test_grounded_skills_word_boundary_keeps_cpp():
    result = _grounded_skills(
        {"skills": ["react", "c++"]}, "Skills: React, C++", []
    )
    assert "react" in result
    assert "c++" in result


def test_grounded_skills_rejects_aspirational_only_skill():
    result = _grounded_skills(
        {"skills": ["kubernetes"]}, "Interested in learning Kubernetes", []
    )
    assert "kubernetes" not in result


def test_grounded_skills_rejects_single_character():
    result = _grounded_skills({"skills": ["c"]}, "Skills: C, Python", [])
    assert "c" not in result


def test_deterministic_document_does_not_invent_skills():
    resume = "Skills: Python\nBuilt a small data project."
    job = {
        "title": "Platform Engineer",
        "company": "Acme",
        "skills": ["kubernetes", "python"],
    }
    _, cover = deterministic_document(resume, job)
    assert "kubernetes" not in cover.lower()
