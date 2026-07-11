# RAG pipeline (Self-RAG / LangGraph) — structural notes

This directory implements the Self-RAG workflow described in the root `CLAUDE.md`. The notes below describe the implementation contracts for this pipeline.

## State accumulation contract (`schemas.py`)

`GraphState` accumulates `queries`, `documents`, `answer`, `grade`, and `feedback` via `Annotated[..., operator.add]`.

Node return values must preserve the reducer types declared in `GraphState`. For accumulated fields, wrap each attempt's value in a single-element list (e.g. `{"queries": [queries]}`).

As a result:

- `state["queries"]` is `list[list[str]]` — one inner list per attempt.
- `state["documents"]` is `list[list[Document]]` — one inner list per attempt.
- `state["answer"]`, `state["grade"]`, and `state["feedback"]` are `list[str]` — one string per attempt.

Use `[-1]` for the current attempt and `[0]` for the initial attempt.
Mixing them up is the easiest bug to introduce when modifying this pipeline.

`retry_count` is the one exception — it's a plain `int`, not accumulated.

## Retry limit (`workflows.py`)

`decide_to_finish` routes based on the latest grade:
- `"useful"` → `finish` (END).
- `retry_count == 1` → `force_finish` → `analyze_failure_node` → END.
- otherwise → `retry` → back to `generate_queries_node`.

There is exactly **one** retry, ever. Raising this limit means changing the `retry_count == 1` check, not adding a new constant elsewhere.

## Prompts (`prompts.py`)

Retry feedback is passed to the next `generate_queries_node` call as the literal prefix `フィードバック: `. If you change this prefix, also update `nodes.py`, whose logging slices the string assuming that exact prefix.

## Chains (`chains.py`)

Four chains share a single `ChatOpenAI` model:
- `generate_queries_chain` and `grade_answer_chain` use `.with_structured_output()` against the Pydantic models `MultiQuery` and `GradeAnswer` (`schemas.py`).
- `generate_answer_chain` and `analyze_failure_chain` use `StrOutputParser()` (plain string output).

Changing a structured-output Pydantic model requires updating the corresponding prompt as well.

## Downstream persistence

`chat_details` persists one row per attempt, mirroring the accumulated state.
Changing a node's return shape affects persistence as well — check `services/rag/repository.py`'s `save_chat_result`.

## Verifying changes here

Run the `verify` skill (`.claude/skills/verify/SKILL.md`) after modifying this pipeline. It exercises both the normal path and the retry /
hallucination path.
