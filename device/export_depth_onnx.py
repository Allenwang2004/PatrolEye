"""把官方 Depth Anything V2 Metric-Indoor-Small 轉成固定輸入尺寸的 ONNX。
(之後要給 Hailo 編譯也是從這個 ONNX 出發,固定尺寸是必要的。)
需要 torch + transformers,只要跑一次。
"""
from pathlib import Path

import torch
from transformers import AutoModelForDepthEstimation

torch.set_num_threads(1)          # Pi 供電不足時,全核滿載會當機

REPO = "depth-anything/Depth-Anything-V2-Metric-Indoor-Small-hf"
H, W = 392, 700          # 14 的倍數,約 16:9
OUT = Path("models/depth_metric_indoor.onnx")


class Wrap(torch.nn.Module):
    def __init__(self, m):
        super().__init__()
        self.m = m

    def forward(self, x):
        return self.m(pixel_values=x).predicted_depth


model = Wrap(AutoModelForDepthEstimation.from_pretrained(REPO).eval())
OUT.parent.mkdir(exist_ok=True)
torch.onnx.export(model, torch.zeros(1, 3, H, W), str(OUT), input_names=["image"],
                  output_names=["depth"], opset_version=17, dynamo=False)
print("saved", OUT)
