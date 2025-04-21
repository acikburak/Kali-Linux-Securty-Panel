# 📊 Scan & Attack Studio

> **ShadowRecon** is an open-source **network reconnaissance and analysis studio** developed for cybersecurity professionals and penetration testers.  
With a modern web interface and powerful CLI integrations, it enables you to **visualize, automate**, and **document** your assessments.

---

## 👨‍💻 Developer

**Ali Burak AÇIK**  
Cybersecurity Specialist & Full Stack Developer  
🌐 [www.bilgiveteknoloji.com](https://www.bilgiveteknoloji.com)  
📺 [YouTube Channel](https://www.youtube.com/@burakacik2458)  
📧 acikburak321@gmail.com

---

## 🚀 Features

- 🎯 Target IP definition and Nmap-based scanning
- ⚙️ GUI integration for Kali tools (nmap, wpscan, hydra, dirb...)
- 🧠 Terminal output + smart note-taking with dynamic tree view
- 🗂️ Project-based file structure and result history
- 🔁 Save and reuse preset scripts
- 🌐 Auto-start in browser upon launch
- 🔍 Interactive SVG-based finding viewer (D3.js-powered)
- 💻 Optional execution in native Kali terminal (with tmux support)

---

## ⚙️ Installation

### 1. Backend (Python / Flask)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Frontend (React)
```bash
cd frontend
npm install
```

### 3. To Start the Full System
```bash
chmod +x start.sh
./start.sh
```

> This script will launch both the Flask backend and React frontend automatically.

---

## 📦 Required Packages

### Python (backend/requirements.txt)
Flask  
Flask-CORS

### Node.js (frontend/package.json)
- react
- axios
- react-router-dom
- d3

> Also required: `tmux`  
Install with:  
```bash
sudo apt install tmux
```

---

## 🔄 Updates

The system is designed to support auto-update checks on launch.  
Example: implement a GitHub-based `git pull` for fetching updates from the repository.

---

## 🛡️ License

This project is licensed under the **GNU General Public License v3.0**.  
See the [LICENSE](./LICENSE) file for complete details.

---

## 💬 Contributing

We welcome contributions via **Pull Requests** and **Issues**.  
Your suggestions, bug reports, and feature requests are highly appreciated!
