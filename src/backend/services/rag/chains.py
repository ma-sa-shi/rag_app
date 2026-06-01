from services.rag.prompts import (
    generate_queries_prompt,
    generate_answer_prompt,
    grade_answer_prompt,
    analyze_failure_prompt,
)
from config import settings
from services.rag.schemas import MultiQuery, GradeAnswer
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI


model = ChatOpenAI(model=settings.OPENAI_MODEL_NAME)

generate_queries_chain = (
    generate_queries_prompt
    | model.with_structured_output(MultiQuery)
    | (lambda x: x.queries)
)
generate_answer_chain = generate_answer_prompt | model | StrOutputParser()
grade_answer_chain = grade_answer_prompt | model.with_structured_output(GradeAnswer)
analyze_failure_chain = analyze_failure_prompt | model | StrOutputParser()
