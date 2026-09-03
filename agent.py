import subprocess
import os
from anthropic import Anthropic

DBT_PROJECT_DIR = r'C:\Users\samar\Documents\Projects\meridian\meridian_dbt'
PROFILES_DIR = os.path.expanduser(r'~\.dbt')

client = Anthropic()

SYSTEM_PROMPT = """You are an agentic analytics assistant for Meridian Retail Co.
You have access to a governed semantic layer built on dbt + MetricFlow.
Certified metrics available: gross_revenue, order_volume, promo_order_count, promo_attach_rate, total_discount_amount, total_acquisition_cost.
Available dimensions: metric_time__week, metric_time__day, order__channel, order__acquisition_channel, order__region, order__is_new_customer.

When asked a business question, you must:
1. Decide which metrics and dimensions to query
2. Call the query_metrics tool to retrieve the data
3. Reason over the results
4. Return a structured executive briefing with: Executive Summary, Anomaly Flag, Watch Item

Always ground your analysis in the actual query results. Never invent numbers.
Tone: direct, confident, C-suite register. No filler phrases."""

tools = [
    {
        "name": "query_metrics",
        "description": "Query certified metrics from the Meridian semantic layer via MetricFlow. Returns a table of results.",
        "input_schema": {
            "type": "object",
            "properties": {
                "metrics": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of metric names to query. Must be from the certified metrics list."
                },
                "group_by": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of dimensions to group by. Must be from the available dimensions list."
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
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=DBT_PROJECT_DIR,
        env=env
    )
    if result.returncode != 0:
        return f"Query error: {result.stderr}"
    return result.stdout


def process_tool_call(tool_name: str, tool_input: dict) -> str:
    if tool_name == "query_metrics":
        metrics = tool_input["metrics"]
        group_by = tool_input["group_by"]
        print(f"  -> Querying: metrics={metrics} group_by={group_by}")
        result = run_mf_query(metrics, group_by)
        print(f"  -> Result preview: {result[:200]}")
        return result
    return "Unknown tool"


def run_agent(user_question: str) -> str:
    print(f"\nQuestion: {user_question}")
    print("Agent thinking...\n")

    messages = [{"role": "user", "content": user_question}]

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
                    result = process_tool_call(block.name, block.input)
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
            return final_text

        else:
            return f"Unexpected stop reason: {response.stop_reason}"


if __name__ == "__main__":
    question = (
        "Give me a full executive briefing on Meridian Retail Co. performance "
        "for June 2026. Focus on revenue trends, channel mix, and any anomalies "
        "worth flagging."
    )
    briefing = run_agent(question)
    print("\n" + "=" * 60)
    print("EXECUTIVE BRIEFING")
    print("=" * 60)
    print(briefing)