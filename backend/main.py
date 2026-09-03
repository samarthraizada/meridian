import subprocess
import os
import re
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from anthropic import Anthropic

app = FastAPI(title="Meridian API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DBT_PROJECT_DIR = os.environ.get("DBT_PROJECT_DIR", "/app/meridian_dbt")
PROFILES_DIR = os.environ.get("DBT_PROFILES_DIR", "/app/meridian_dbt")

client = Anthropic()

SYSTEM_PROMPT = """You are an agentic analytics assistant for Meridian Retail Co.
You have access to a governed semantic layer built on dbt + MetricFlow.
Certified metrics available: gross_revenue, order_volume, promo_order_count, promo_attach_rate, total_discount_amount, total_acquisition_cost.
Available dimensions: metric_time__week, metric_time__day, order__channel, order__acquisition_channel, order__region, order__is_new_customer.

When asked a business question, you must:
1. Decide which metrics and dimensions to query
2. Call the query_metrics tool to retrieve the data
3. Reason over the results
4. Return a structured executive briefing with these exact section labels:

EXECUTIVE SUMMARY

[Three paragraphs covering overall performance, key driver story, strategic implication]

ANOMALY FLAG

[One paragraph on the single most unusual finding with specific numbers]

WATCH ITEM

[One paragraph on the forward-looking signal leadership should track]

Always ground your analysis in the actual query results. Never invent numbers.
Tone: direct, confident, C-suite register. No filler phrases. No bullet points. Prose only."""

tools = [
    {
        "name": "query_metrics",
        "description": "Query certified metrics from the Meridian semantic layer via MetricFlow.",
        "input_schema": {
            "type": "object",
            "properties": {
                "metrics": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of metric names to query."
                },
                "group_by": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of dimensions to group by."
                }
            },
            "required": ["metrics", "group_by"]
        }
    }
]


def run_mf_query(metrics: list, group_by: list) -> str:
    metrics_str = ",".join(metrics)
    group_by_str = ",".join(group_by)
    cmd = ["mf", "query", "--metrics", metrics_str, "--group-by", group_by_str]
    env = os.environ.copy()
    env["DBT_PROFILES_DIR"] = PROFILES_DIR
    env["PYTHONIOENCODING"] = "utf-8"
    env["TERM"] = "dumb"
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=DBT_PROJECT_DIR,
        env=env,
        encoding="utf-8",
        errors="replace"
    )
    if result.returncode != 0:
        return f"Query error: {result.stderr}"
    return result.stdout


def parse_output(text: str) -> dict:
    sections = {"summary": "", "anomaly": "", "watch": "", "raw": text}
    summary_match = re.search(r"EXECUTIVE SUMMARY\s*([\s\S]*?)(?=ANOMALY FLAG|WATCH ITEM|$)", text, re.IGNORECASE)
    anomaly_match = re.search(r"ANOMALY FLAG\s*([\s\S]*?)(?=WATCH ITEM|$)", text, re.IGNORECASE)
    watch_match = re.search(r"WATCH ITEM\s*([\s\S]*?)$", text, re.IGNORECASE)
    if summary_match:
        sections["summary"] = summary_match.group(1).strip()
    if anomaly_match:
        sections["anomaly"] = anomaly_match.group(1).strip()
    if watch_match:
        sections["watch"] = watch_match.group(1).strip()
    if not sections["summary"] and not sections["anomaly"] and not sections["watch"]:
        sections["summary"] = text.strip()
    return sections


class BriefingRequest(BaseModel):
    question: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "meridian-api"}


@app.post("/briefing")
async def generate_briefing(request: BriefingRequest):
    async def stream():
        messages = [{"role": "user", "content": request.question}]
        queries_fired = []

        while True:
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4000,
                system=SYSTEM_PROMPT,
                tools=tools,
                messages=messages
            )

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        metrics = block.input["metrics"]
                        group_by = block.input["group_by"]
                        queries_fired.append({
                            "metrics": metrics,
                            "group_by": group_by
                        })
                        yield f"data: {json.dumps({'type': 'query', 'metrics': metrics, 'group_by': group_by})}\n\n"
                        result = run_mf_query(metrics, group_by)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result
                        })

                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})

            elif response.stop_reason == "end_turn":
                final_text = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        final_text += block.text
                sections = parse_output(final_text)
                yield f"data: {json.dumps({'type': 'briefing', 'sections': sections, 'queries': queries_fired})}\n\n"
                break

            else:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Unexpected stop: {response.stop_reason}'})}\n\n"
                break

    return StreamingResponse(stream(), media_type="text/event-stream")