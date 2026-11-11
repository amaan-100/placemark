import time

from fastapi import APIRouter
from sqlalchemy import select

from ..agents import orchestrator
from ..deps import DbSession, SessionId
from ..errors import AppError
from ..models import Interview, InterviewTurn, utcnow
from ..schemas import (
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewDetailResponse,
    InterviewListResponse,
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewSummaryOut,
    InterviewTurnOut,
)
from ..services.traces import record_run
from ..tools import merge_weak_areas, weak_dimensions

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


def _interview_or_error(db: DbSession, session_id: str, interview_id: int) -> Interview:
    interview = db.get(Interview, interview_id)
    if interview is None or interview.session_id != session_id:
        raise AppError(404, "interview_not_found", "Interview not found.")
    return interview


def _open_turn(db: DbSession, interview: Interview) -> InterviewTurn | None:
    return db.scalars(
        select(InterviewTurn)
        .where(
            InterviewTurn.interview_id == interview.id,
            InterviewTurn.answer.is_(None),
        )
        .order_by(InterviewTurn.turn_index)
    ).first()


def _legacy_turn(db: DbSession, interview: Interview) -> InterviewTurn | None:
    if not interview.question:
        return None
    turn = InterviewTurn(
        interview_id=interview.id,
        turn_index=interview.turn_count,
        question=interview.question,
        rubric={},
    )
    db.add(turn)
    db.flush()
    return turn


def _answered_transcript(db: DbSession, interview_id: int) -> list[dict]:
    rows = db.scalars(
        select(InterviewTurn)
        .where(
            InterviewTurn.interview_id == interview_id,
            InterviewTurn.answer.is_not(None),
        )
        .order_by(InterviewTurn.turn_index)
    ).all()
    return [{"question": row.question, "answer": row.answer} for row in rows]


@router.post("", response_model=InterviewStartResponse, status_code=201)
async def start_interview(
    req: InterviewStartRequest,
    db: DbSession,
    session_id: SessionId,
) -> InterviewStartResponse:
    started = time.perf_counter()
    question, llm_meta = await orchestrator.interview.question(req.goal)
    interview = Interview(
        session_id=session_id,
        goal=req.goal,
        question=question,
        status="IN_PROGRESS",
    )
    db.add(interview)
    db.flush()
    db.add(
        InterviewTurn(
            interview_id=interview.id,
            turn_index=0,
            question=question,
            rubric={},
        )
    )
    interview.turn_count = 0
    db.commit()
    db.refresh(interview)
    latency_ms = (time.perf_counter() - started) * 1000

    record_run(
        db,
        session_id,
        agent="interview",
        action="question",
        output={
            "interview_id": interview.id,
            "goal": req.goal,
            "turn": 0,
            "max_turns": interview.max_turns,
            "llm": llm_meta,
        },
        latency_ms=latency_ms,
        input_text=req.goal,
    )

    return InterviewStartResponse(
        interview_id=interview.id,
        question=interview.question,
        status=interview.status,
        turn=0,
        max_turns=interview.max_turns,
    )


@router.post(
    "/{interview_id}/evaluate",
    response_model=InterviewAnswerResponse,
)
async def evaluate_interview(
    interview_id: int,
    req: InterviewAnswerRequest,
    db: DbSession,
    session_id: SessionId,
) -> InterviewAnswerResponse:
    if req.interview_id != interview_id:
        raise AppError(400, "interview_mismatch", "Interview ID does not match the request body.")
    interview = _interview_or_error(db, session_id, interview_id)
    if interview.status == "COMPLETE":
        raise AppError(409, "interview_complete", "This interview is already complete.")

    turn = _open_turn(db, interview) or _legacy_turn(db, interview)
    if turn is None:
        raise AppError(
            409,
            "interview_no_open_turn",
            "There is no open question to answer for this interview.",
        )

    started = time.perf_counter()
    score, feedback, rubric, llm_meta = await orchestrator.interview.evaluate(
        interview.goal,
        turn.question,
        req.answer,
    )
    latency_ms = (time.perf_counter() - started) * 1000

    turn.answer = req.answer
    turn.score = score
    turn.feedback = feedback
    turn.rubric = rubric
    interview.turn_count = (interview.turn_count or 0) + 1
    if interview.turn_count == 1:
        interview.answer = req.answer
        interview.score = score
        interview.feedback = feedback
    interview.weak_areas = merge_weak_areas(
        list(interview.weak_areas or []),
        weak_dimensions(rubric),
    )
    interview.updated_at = utcnow()

    next_question = None
    if interview.turn_count >= interview.max_turns:
        interview.status = "COMPLETE"
        if not interview.feedback:
            interview.feedback = feedback
    else:
        transcript = _answered_transcript(db, interview.id)
        next_question, _ = await orchestrator.interview.next_question(
            interview.goal,
            transcript,
            list(interview.weak_areas or []),
        )
        db.add(
            InterviewTurn(
                interview_id=interview.id,
                turn_index=interview.turn_count,
                question=next_question,
                rubric={},
            )
        )
        interview.status = "IN_PROGRESS"

    db.commit()
    db.refresh(interview)
    db.refresh(turn)

    record_run(
        db,
        session_id,
        agent="interview",
        action="evaluate",
        output={
            "interview_id": interview.id,
            "turn": interview.turn_count,
            "max_turns": interview.max_turns,
            "score": score,
            "status": interview.status,
            "llm": llm_meta,
        },
        latency_ms=latency_ms,
        input_text=req.answer,
    )

    return InterviewAnswerResponse(
        interview_id=interview.id,
        turn=interview.turn_count,
        max_turns=interview.max_turns,
        score=score,
        feedback=feedback,
        rubric=rubric,
        next_question=next_question,
        status=interview.status,
    )


@router.get("/{interview_id}", response_model=InterviewDetailResponse)
def get_interview(
    interview_id: int,
    db: DbSession,
    session_id: SessionId,
) -> InterviewDetailResponse:
    interview = _interview_or_error(db, session_id, interview_id)
    turn_rows = db.scalars(
        select(InterviewTurn)
        .where(InterviewTurn.interview_id == interview.id)
        .order_by(InterviewTurn.turn_index)
    ).all()
    return InterviewDetailResponse(
        id=interview.id,
        goal=interview.goal,
        status=interview.status,
        turn_count=interview.turn_count,
        max_turns=interview.max_turns,
        weak_areas=list(interview.weak_areas or []),
        turns=[InterviewTurnOut.model_validate(row) for row in turn_rows],
        created_at=interview.created_at,
        updated_at=interview.updated_at,
    )


@router.get("", response_model=InterviewListResponse)
def list_interviews(
    db: DbSession,
    session_id: SessionId,
) -> InterviewListResponse:
    rows = db.scalars(
        select(Interview)
        .where(Interview.session_id == session_id)
        .order_by(Interview.id.desc())
    ).all()
    return InterviewListResponse(
        interviews=[InterviewSummaryOut.model_validate(row) for row in rows]
    )
