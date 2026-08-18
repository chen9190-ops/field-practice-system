import os
import json
import re
from dotenv import load_dotenv
load_dotenv()


# 禁止 requests 使用系统代理
for key in [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
]:
    os.environ.pop(key, None)


from pathlib import Path
import requests


print("ENTER dify_service")


DIFY_API_URL = "https://api.dify.ai/v1/workflows/run"
DIFY_FILE_UPLOAD_URL = "https://api.dify.ai/v1/files/upload"

DIFY_API_KEY = os.getenv("DIFY_API_KEY1")

BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOADS_DIR = BACKEND_ROOT / "uploads"



def get_session():

    session = requests.Session()

    # 关键：
    # 不读取系统代理
    session.trust_env = False

    session.headers.update({
        "Authorization": f"Bearer {DIFY_API_KEY}"
    })

    return session



def _upload_image(photo_url: str):

    photo_path = UPLOADS_DIR / Path(photo_url).name


    if not photo_path.exists():
        raise FileNotFoundError(
            f"Image not found: {photo_path}"
        )


    print("===== DIFY IMAGE UPLOAD =====")
    print(photo_path)



    session = get_session()



    with open(photo_path, "rb") as f:

        files = {
            "file": (
                photo_path.name,
                f,
                "image/jpeg"
            )
        }


        response = session.post(
            DIFY_FILE_UPLOAD_URL,
            data={
                "user":"student"
            },
            files=files,
            timeout=120
        )


    print("UPLOAD STATUS:")
    print(response.status_code)

    print("UPLOAD RESPONSE:")
    print(response.text)



    response.raise_for_status()


    return response.json()["id"]




def analyze_observation(
        text: str,
        longitude: float,
        latitude: float,
        photo_url: str | None = None,
        rock_type: str | None = None
):


    session = get_session()



    inputs = {
        "student_description": text,
        "observation_type": rock_type or "",
        "location": f"{latitude},{longitude}",
        "latitude": str(latitude),
        "longitude": str(longitude),
    }


    if photo_url:

        file_id = _upload_image(photo_url)


        inputs["image"] = {

            "type":"image",

            "transfer_method":"local_file",

            "upload_file_id":file_id

        }



    data = {

        "inputs":inputs,

        "response_mode":"streaming",

        "user":"student"

    }



    print("======================")
    print("WORKFLOW REQUEST")
    print(data)
    print("======================")



    response = session.post(

        DIFY_API_URL,

        json=data,

        timeout=600,

        stream=True

    )



    print("===== WORKFLOW STATUS =====")
    print(response.status_code)


    response.raise_for_status()

    collected_outputs = {}

    for line in response.iter_lines(decode_unicode=True):

        if not line or not line.startswith("data:"):
            continue


        event_data = json.loads(line[5:].strip())

        event_type = event_data.get("event")


        print("========== DIFY EVENT ==========")
        print(event_type)
        print("================================")


        # 获取 Code 节点输出
        if event_type == "node_finished":

            node_data = event_data.get("data", {})

            node_outputs = node_data.get(
                "outputs",
                {}
            )


            if isinstance(node_outputs, dict):

                print("NODE OUTPUT:")
                print(node_outputs)


                for key, value in node_outputs.items():
                    collected_outputs[key] = value



        # streaming字段输出
        elif event_type == "text_chunk":

            data = event_data.get(
                "data",
                {}
            )


            selector = data.get(
                "from_variable_selector",
                []
            )


            text = data.get(
                "text",
                ""
            )   


            if len(selector) == 2:

                key = selector[1]

                collected_outputs[key] = text



        elif event_type == "error":

            raise Exception(
                f"Dify streaming error: {event_data}"
            )


    print("===== FINAL OUTPUT =====")
    print(collected_outputs)

    result = {
        "data": {
            "outputs": collected_outputs
        }
    }



    if "data" not in result:

        raise Exception(
            f"Dify invalid response: {result}"
        )


    return result
