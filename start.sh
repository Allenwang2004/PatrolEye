#!/usr/bin/env bash
# 啟動 / 停止網頁伺服器(居家版 /home、工廠版 /factory、開發工具 /dev 都在同一個伺服器)。
#
#   ./start.sh            啟動(已經在跑就只顯示網址)
#   ./start.sh stop       停止
#   ./start.sh restart    重新啟動
#   ./start.sh status     看有沒有在跑、網址
#   ./start.sh log        看即時紀錄(Ctrl+C 離開,不會停掉伺服器)
#
# 拔電或重開機之後,登入 Pi 執行 ./start.sh 就好。
set -u
cd "$(dirname "$0")"

PY="$HOME/servo/bin/python"
PIDFILE="logs/live.pid"
LOG="logs/live.log"
PORT=8000
mkdir -p logs

running() {
  [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null
}

urls() {
  local v6 v4
  v6=$(ip -6 addr show scope global 2>/dev/null | awk '/inet6/ && !/temporary|deprecated/ {sub("/.*", "", $2); print $2; exit}')
  v4=$(hostname -I 2>/dev/null | awk '{print $1}')
  echo "  Home edition:     https://[${v6:-?}]:$PORT/home"
  echo "  Factory edition:  https://[${v6:-?}]:$PORT/factory"
  echo "  Developer tools:  https://[${v6:-?}]:$PORT/dev"
  [ -n "$v4" ] && echo "  (IPv4, if your network allows it: https://$v4:$PORT/home)"
  echo "  The first visit shows a certificate warning: click Advanced → Proceed."
}

start() {
  if running; then
    echo "Already running (pid $(cat "$PIDFILE"))."
    urls
    return 0
  fi
  # 舊的(不是用這個腳本開的)也先停掉,不然 port 被佔住
  pkill -f "servo/bin/python live.py" 2>/dev/null && sleep 1.5

  [ -e /dev/video0 ] || echo "Warning: camera /dev/video0 not found. Is the C270 plugged in?"
  [ -e /dev/ttyACM0 ] || echo "Warning: servo port /dev/ttyACM0 not found. The page will work but the camera won't turn."
  thr=$(vcgencmd get_throttled 2>/dev/null | cut -d= -f2)
  [ -n "$thr" ] && [ "$thr" != "0x0" ] && echo "Note: power warning flags $thr (under-voltage now or since boot). Use the 5 A supply."

  echo "--- $(date '+%F %T') start ---" >> "$LOG"
  nohup "$PY" live.py >> "$LOG" 2>&1 &
  echo $! > "$PIDFILE"

  printf "Starting"
  for _ in $(seq 1 30); do
    if curl -sk -m 2 -o /dev/null "https://localhost:$PORT/state"; then
      echo " ready."
      urls
      echo "  Voice questions work about 30 s after start (the speech model is loading)."
      return 0
    fi
    if ! running; then
      echo " failed. Last lines of $LOG:"
      tail -15 "$LOG"
      return 1
    fi
    printf "."
    sleep 1
  done
  echo " still not answering after 30 s. Check: ./start.sh log"
  return 1
}

stop() {
  if running; then
    kill "$(cat "$PIDFILE")" && echo "Stopped."
  else
    pkill -f "servo/bin/python live.py" 2>/dev/null && echo "Stopped." || echo "Not running."
  fi
  rm -f "$PIDFILE"
}

case "${1:-start}" in
  start)   start ;;
  stop)    stop ;;
  restart) stop; sleep 1.5; start ;;
  status)  if running; then echo "Running (pid $(cat "$PIDFILE"))."; urls; else echo "Not running. Start it with: ./start.sh"; fi ;;
  log)     tail -f "$LOG" ;;
  *)       echo "Usage: ./start.sh [start|stop|restart|status|log]"; exit 1 ;;
esac
