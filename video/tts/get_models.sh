#!/usr/bin/env bash
# Download the Kokoro TTS model files (about 350 MB) into tts/models/.
set -e
cd "$(dirname "$0")"
mkdir -p models
base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f models/kokoro-v1.0.onnx ] || curl -L -o models/kokoro-v1.0.onnx $base/kokoro-v1.0.onnx
[ -f models/voices-v1.0.bin ] || curl -L -o models/voices-v1.0.bin $base/voices-v1.0.bin
echo done
