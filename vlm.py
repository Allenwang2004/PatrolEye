"""視覺模型介面:目前用雲端 Claude Haiku(claude -p)代替,之後換成 Qwen2-VL-2B 只要改 ask()。

模擬 Hailo-10H 的條件:
  - 圖先縮成固定解析度(INPUT_W×INPUT_H)才給模型看
  - 回答一律是固定格式的 JSON
  - 延遲另外照 HAILO_SEC 計算(雲端實際花多久不算數)
"""
import json
import subprocess
import tempfile
import time
from pathlib import Path

import cv2

MODEL = "haiku"
INPUT_W, INPUT_H = 672, 378     # 假設的固定輸入解析度(Hailo 上的實際值確認後再改)
HAILO_SEC = 6.5                 # 模擬每次判讀的延遲(5–8 秒取中間)
TMP = Path(tempfile.gettempdir()) / "vlm_in"


def prep(img, crop=None):
    """crop = (x0, y0, x1, y1),0~1 的比例。裁完再縮到固定解析度。"""
    if crop:
        h, w = img.shape[:2]
        x0, y0, x1, y1 = crop
        img = img[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    return cv2.resize(img, (INPUT_W, INPUT_H), interpolation=cv2.INTER_AREA)


def ask(img, prompt, schema, crop=None, retries=2):
    """回傳 (dict 答案, 雲端實際秒數)。img 是 BGR 影像或檔案路徑。"""
    if isinstance(img, (str, Path)):
        img = cv2.imread(str(img))
    TMP.mkdir(exist_ok=True)
    path = TMP / f"{time.time_ns()}.jpg"
    cv2.imwrite(str(path), prep(img, crop), [cv2.IMWRITE_JPEG_QUALITY, 90])
    full = f"Read the image at {path}, then answer based only on what is in the image:\n{prompt}"
    try:
        return _run(full, schema, retries)
    finally:
        path.unlink(missing_ok=True)


def ask_text(prompt, schema, retries=2):
    """不看圖,只問文字(例如從問題判斷要找哪個物品)。"""
    return _run(prompt, schema, retries, tools=False)


def _run(prompt, schema, retries, tools=True):
    cmd = ["claude", "-p", prompt, "--model", MODEL, "--output-format", "json",
           "--json-schema", json.dumps(schema), "--max-turns", "4",
           "--disallowedTools", "Bash", "Edit", "Write", "WebFetch", "WebSearch"]
    if tools:
        cmd += ["--allowedTools", "Read"]
    t0 = time.time()
    for k in range(retries + 1):
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        try:
            out = json.loads(r.stdout)
            ans = out.get("structured_output") or json.loads(out["result"])
            return ans, time.time() - t0
        except (json.JSONDecodeError, KeyError, TypeError):
            if k == retries:
                raise RuntimeError(f"模型回應無法解析:{r.stdout[-500:]} {r.stderr[-300:]}")

if __name__ == "__main__":
    import sys
    schema = {"type": "object", "properties": {"description": {"type": "string"}}, "required": ["description"]}
    print(ask(sys.argv[1], "用一句中文描述畫面。", schema))
