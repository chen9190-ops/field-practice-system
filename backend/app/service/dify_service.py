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


from io import BytesIO
from pathlib import Path
import requests

from PIL import Image, ImageOps

from app.core.upload_dir import get_uploads_root


print("ENTER dify_service")


DIFY_API_URL = "https://api.dify.ai/v1/workflows/run"
DIFY_FILE_UPLOAD_URL = "https://api.dify.ai/v1/files/upload"

DIFY_API_KEY = os.getenv("DIFY_API_KEY1")

UPLOADS_DIR = get_uploads_root()

# 发送给 Dify/Tongyi 前的图片约束。
# Tongyi serverless 单请求上限约 5MB，图片在模型侧会被 base64 编码（体积约膨胀 4/3），
# 因此压缩目标定为单张 < 1MB，并在发送前硬性拦截 >= 4MB 的图片。
AI_IMAGE_MAX_EDGE = 1280
AI_IMAGE_JPEG_QUALITY = 80
AI_IMAGE_TARGET_BYTES = 1 * 1024 * 1024
AI_IMAGE_HARD_LIMIT_BYTES = 4 * 1024 * 1024



def get_session():

    session = requests.Session()

    # 关键：
    # 不读取系统代理
    session.trust_env = False

    session.headers.update({
        "Authorization": f"Bearer {DIFY_API_KEY}"
    })

    return session



def _compress_image_for_ai(photo_path: Path):
    """读取本地图片并压缩为 RGB JPEG。

    规则：EXIF orientation 校正 -> 转 RGB -> 最大边 1280px -> JPEG q80，
    若仍超过 1MB 则逐步降低质量。SVG 不允许直接发送给 Tongyi。
    返回 (jpeg_bytes, (width, height), 原始字节数)。
    """
    raw_size = photo_path.stat().st_size

    if photo_path.suffix.lower() == ".svg":
        raise ValueError(f"SVG 图片不支持直接发送给 AI 分析: {photo_path.name}")

    try:
        with Image.open(photo_path) as img:
            img = ImageOps.exif_transpose(img)
            img = img.convert("RGB")
            img.thumbnail(
                (AI_IMAGE_MAX_EDGE, AI_IMAGE_MAX_EDGE),
                Image.LANCZOS,
            )
            width, height = img.size

            quality = AI_IMAGE_JPEG_QUALITY
            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=quality, optimize=True)
            while buffer.tell() > AI_IMAGE_TARGET_BYTES and quality > 30:
                quality -= 10
                buffer = BytesIO()
                img.save(buffer, format="JPEG", quality=quality, optimize=True)
    except Image.UnidentifiedImageError as exc:
        raise ValueError(
            f"无法识别的图片格式（疑似 SVG 或损坏文件）: {photo_path.name}"
        ) from exc

    return buffer.getvalue(), (width, height), raw_size


def _upload_image(photo_url: str):

    photo_path = UPLOADS_DIR / Path(photo_url).name


    if not photo_path.exists():
        raise FileNotFoundError(
            f"Image not found: {photo_path}"
        )


    jpeg_bytes, (width, height), raw_size = _compress_image_for_ai(photo_path)


    # 日志只输出图片尺寸 / MIME / 字节数，不打印 base64 或图片内容
    print("===== DIFY IMAGE UPLOAD =====")
    print(
        f"file={photo_path.name} orig_bytes={raw_size} "
        f"compressed_bytes={len(jpeg_bytes)} "
        f"size={width}x{height} mime=image/jpeg"
    )


    if len(jpeg_bytes) >= AI_IMAGE_HARD_LIMIT_BYTES:
        raise ValueError(
            f"压缩后图片仍为 {len(jpeg_bytes)} 字节，"
            f"超过 {AI_IMAGE_HARD_LIMIT_BYTES} 字节发送上限，已拦截"
        )


    session = get_session()



    files = {
        "file": (
            photo_path.name,
            BytesIO(jpeg_bytes),
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

    if response.status_code >= 400:
        print("UPLOAD ERROR:")
        print(response.text[:500])



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
