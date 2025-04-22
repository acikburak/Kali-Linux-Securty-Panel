#!/bin/bash

echo "Yapay zeka hazırlanıyor"
ollama rm kali-fix
ollama create kali-fix -f kali-fix.Modelfile

echo "🔍 Ortam kontrol ediliyor..."

# Tmux yüklü mü?
if ! command -v tmux &> /dev/null; then
  echo "❌ tmux yüklü değil. Lütfen 'sudo apt install tmux' ile yükleyin."
  exit 1
fi

SESSION="scanpanel"

# Varsa eski oturumu sil
tmux kill-session -t $SESSION 2>/dev/null

# Yeni oturum başlat
tmux new-session -d -s $SESSION

# 1. panel: backend
tmux send-keys -t $SESSION 'cd backend && source venv/bin/activate && echo "🚀 Backend başlatılıyor..." && python3 app.py' C-m

# 2. panel: frontend
tmux split-window -v -t $SESSION
tmux send-keys -t $SESSION 'echo "🌐 Frontend başlatılıyor..." && npm run dev' C-m

# 🔓 3. panel: tarayıcıyı aç
tmux split-window -h -t $SESSION
tmux send-keys -t $SESSION 'sleep 5 && xdg-open http://localhost:5173' C-m

# Paneli göster
tmux select-pane -t 0
tmux attach-session -t $SESSION

