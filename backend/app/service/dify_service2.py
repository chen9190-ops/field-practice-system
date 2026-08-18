import requests
import json
import re
import os
from dotenv import load_dotenv
load_dotenv()

DIFY_API_URL = "https://api.dify.ai/v1/workflows/run"
DIFY_API_KEY = os.getenv("DIFY_API_KEY2")


def _print_response_preview(response):
    print("====================")
    print("DIFY STATUS:", response.status_code)
    print("DIFY TEXT PREVIEW:", response.text[:500])
    print("====================")


def extract_report_text(result):
    result_data = result.get("data", {}) if isinstance(result, dict) else {}
    outputs = result_data.get("outputs", {}) \
        if isinstance(result_data, dict) else {}
    outputs = outputs if isinstance(outputs, dict) else {}

    report_text = (
        outputs.get("report")
        or outputs.get("ai_report")
        or outputs.get("textString")
    )
    if not report_text:
        return None
    if not isinstance(report_text, str):
        report_text = str(report_text)

    return re.sub(
        r"<think>.*?</think>",
        "",
        report_text,
        flags=re.DOTALL
    ).strip()

def generate_student_report(
        student_info,
        course_info,
        route_info,
        checkin_records,
        observation_records,
        student_summary,
        personal_summary="",
        ):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DIFY_API_KEY}"
    }
    data = {
        "inputs": {
            "student_info": json.dumps(
                student_info,
                ensure_ascii=False
            ),

            "course_info": json.dumps(
                course_info,
                ensure_ascii=False
            ),

            "route_info": json.dumps(
                route_info,
                ensure_ascii=False
            ),

            "checkin_records": json.dumps(
                checkin_records,
                ensure_ascii=False
            ),

            "observation_records": json.dumps(
                observation_records,
                ensure_ascii=False
            ),

            "student_summary": json.dumps(
                student_summary,
                ensure_ascii=False
            ),
            "personal_summary": personal_summary or ""
        },
        "response_mode": "blocking",
        "user": "student"
    }
    try:
        response = requests.post(
            DIFY_API_URL,
            headers=headers,
            json=data,
            timeout=600
        )
    except requests.Timeout as error:
        raise RuntimeError("Dify请求超时（600秒）") from error
    except requests.RequestException as error:
        raise RuntimeError(f"Dify请求失败：{error}") from error

    try:
        response.raise_for_status()
    except requests.HTTPError as error:
        _print_response_preview(response)
        raise RuntimeError(
            f"Dify接口返回HTTP错误：{response.status_code}"
        ) from error

    try:
        return response.json()
    except ValueError as error:
        _print_response_preview(response)
        raise RuntimeError(
            f"Dify返回了非JSON响应，status_code={response.status_code}"
        ) from error
