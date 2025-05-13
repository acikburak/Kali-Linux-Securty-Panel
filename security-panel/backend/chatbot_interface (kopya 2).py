import os
import json
import socket
import gradio as gr
import requests
import subprocess
import time
import threading
from urllib.parse import urlparse, parse_qs

# Hafıza Yükleme
def load_kai_memory(project_name):
    memory_path = f"data/{project_name}/kaiMemory.json"
    if not os.path.exists(memory_path):
        kai_memory = {
            "project": project_name,
            "hedef_ip": None,
            "local_ip": socket.gethostbyname(socket.gethostname()),
            "komut_gecmisi": [],
            "acik_portlar": [],
            "notlar": {},
            "bekleyen_bulgu": None,
            "suggested_commands": {},
            "bekleyen_yorum": None,
            "bulgu_sozluk": {},
            "gecmis_ai_yorumlari": []
        }
        os.makedirs(f"data/{project_name}", exist_ok=True)
        with open(memory_path, "w") as f:
            json.dump(kai_memory, f, indent=2)
    else:
        with open(memory_path, "r") as f:
            kai_memory = json.load(f)
    return kai_memory, memory_path

# Hafıza Güncelleme
def update_kai_memory(project_name, update_data):
    memory_path = f"data/{project_name}/kaiMemory.json"
    kai_memory, _ = load_kai_memory(project_name)
    kai_memory.update(update_data)
    with open(memory_path, "w") as f:
        json.dump(kai_memory, f, indent=2)
    return kai_memory

# Komut Çalıştırıcı
def run_command_blocking(command):
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    output, _ = process.communicate()
    return output

# Ana Akış Fonksiyonu
def local_ai_chat_stream(message, history, request: gr.Request):
    try:
        parsed = urlparse(str(request.url))
        query = parse_qs(parsed.query)
        hedef_ip = query.get("ip", [None])[0]
        project_name = query.get("project", [None])[0]
    except Exception:
        yield "⚠️ URL bilgileri çözümlenemedi."
        return

    kullanici_ip = request.client.host
    if not hedef_ip or not project_name:
        yield "⚠️ Hedef IP veya proje adı eksik."
        return

    kai_memory, _ = load_kai_memory(project_name)
    kai_memory["hedef_ip"] = hedef_ip
    kai_memory["local_ip"] = kullanici_ip

    if message.strip().lower() in ["kali aç", "terminal aç"]:
        try:
            response = requests.post("http://localhost:5050/run-in-terminal", json={
                "command": "tail -f /tmp/kai_terminal_output.log &"
            })
            if response.status_code == 200:
                yield "🖥️ Terminal API üzerinden açıldı ve log dosyası izleniyor."
            else:
                yield f"❌ API isteği başarısız: {response.status_code} - {response.text}"
        except Exception as e:
            yield f"❌ Terminal başlatma API hatası: {str(e)}"
        return

    if message.strip().lower() == "logları göster":
        try:
            with open("/tmp/kai_terminal_output.log", "r") as f:
                logs = f.readlines()[-20:]
            yield "📜 Son Loglar:\n" + "".join(logs)
        except Exception as e:
            yield f"❌ Log dosyası okunamadı: {str(e)}"
        return

    if message.strip().lower() == "bulguları göster":
        try:
            log_ozeti = "\n📚 Kai Hafıza Özeti:\n"
            for key, value in kai_memory.items():
                log_ozeti += f"\n🔹 {key}:\n"
                if isinstance(value, dict):
                    if not value:
                        log_ozeti += "  (boş sözlük)\n"
                    for k, v in value.items():
                        log_ozeti += f"  - {k}: {v}\n"
                elif isinstance(value, list):
                    if key == "komut_gecmisi":
                        for item in value[-10:]:
                            log_ozeti += f"  - {item}\n"
                    elif not value:
                        log_ozeti += "(boş liste)\n"
                    else:
                        for item in value:
                            log_ozeti += f"  - {item}\n"
                elif value is None:
                    log_ozeti += "  (veri yok)\n"
                else:
                    log_ozeti += f"  {value}\n"
            yield log_ozeti
        except Exception as e:
            yield f"❌ Hafıza görüntüleme hatası: {str(e)}"
        return
        
    if message.strip().lower() == "evet" and kai_memory.get("bekleyen_yorum"):
        yorum = kai_memory.pop("bekleyen_yorum")
        kai_memory["gecmis_ai_yorumlari"].append(yorum)
        note = {
            "title": "AI Yorumu",
            "content": yorum,
            "tool": "ai",
            "ip": hedef_ip,
            "parent": "root"
        }
        try:
            requests.post(f"http://localhost:5050/notes/{project_name}", json=note)
            update_kai_memory(project_name, kai_memory)
            yield "✅ Yorum başarıyla bulgu olarak kaydedildi."
        except Exception as e:
            yield f"❌ Yorum kaydedilemedi: {str(e)}"
        return

    if message.strip().lower() in ["hayır", "vazgeç"] and kai_memory.get("bekleyen_yorum"):
        kai_memory["bekleyen_yorum"] = None
        update_kai_memory(project_name, kai_memory)
        yield "🚫 AI yorumu kaydedilmedi."
        return

    if message.strip().lower().startswith("run:"):
        komut = message.replace("RUN:", "").strip()
        yield f"📟 Komut gönderildi:\n```{komut}```"
        yield f"🌟 Proje: `{project_name}` | Hedef IP: `{hedef_ip}`"
        yield "⌛ Komut çalıştırılıyor, lütfen bekleyin..."

        try:
            output = run_command_blocking(komut)
            os.makedirs("/tmp", exist_ok=True)
            with open("/tmp/kai_terminal_output.log", "a") as logf:
                logf.write(f"\n$ {komut}  # Hedef IP: {hedef_ip}\n{output}\n")

            kai_memory["komut_gecmisi"].append(komut)
            kai_memory["komut_gecmisi"] = kai_memory["komut_gecmisi"][-50:]

            if "ftp" in komut.lower() and "anonymous" in output.lower():
                kai_memory.setdefault("notlar", {})["ftp:anonymous"] = True

            if "nmap" in komut.lower():
                open_ports = [line.split("/")[0] for line in output.splitlines() if "/tcp" in line and "open" in line]
                kai_memory["acik_portlar"] = list(set(kai_memory.get("acik_portlar", []) + open_ports))

            system_message = f"""
Proje: {project_name}
Hedef IP: {hedef_ip}
Komut: {komut}
Açık Portlar: {kai_memory.get('acik_portlar', [])}
Notlar: {kai_memory.get('notlar', {})}
Gecmis AI Yorumlari: {kai_memory.get('gecmis_ai_yorumlari', [])}

Yukarıdaki çıktıyı analiz et. Potansiyel zafiyetleri veya bulguları belirt.
"""
            response = requests.post("http://localhost:5050/ai-suggest", json={
                "command": output,
                "ip": hedef_ip,
                "history": [],
                "system_message": system_message
            })
            response.raise_for_status()
            yorum = response.json().get("message", "Yorum yok")
            kai_memory["bekleyen_yorum"] = yorum

            if "bulgu" in yorum.lower() or "zafiyet" in yorum.lower():
                sozluk = kai_memory.get("bulgu_sozluk", {})
                count = len(sozluk) + 1
                sozluk[f"bulgu_{count}"] = yorum
                kai_memory["bulgu_sozluk"] = sozluk

            update_kai_memory(project_name, kai_memory)
            yield f"🧾 Terminal Çıktısı:\n```{output}```"
            yield f"🤖 AI Yorumu:\n{yorum}\n\n💾 Bu yorumu not olarak kaydetmek ister misin? (evet / hayır)"
        except Exception as e:
            yield f"🚨 Komut çalıştırma hatası: {str(e)}"
        return

    try:
        system_message = f"""
Hedef IP: {hedef_ip}
Notlar: {kai_memory.get('notlar', {})}
Gecmis AI Yorumlari: {kai_memory.get('gecmis_ai_yorumlari', [])}

Komutu analiz et, açıklayıcı yorum yap. Varsa bulgu ya da zafiyeti belirt.
"""
        response = requests.post("http://localhost:5050/ai-suggest", json={
            "command": message,
            "ip": hedef_ip,
            "history": [],
            "system_message": system_message
        })
        response.raise_for_status()
        yorum = response.json().get("message", "Yorum yok")
        kai_memory["bekleyen_yorum"] = yorum

        if "bulgu" in yorum.lower() or "zafiyet" in yorum.lower():
            sozluk = kai_memory.get("bulgu_sozluk", {})
            count = len(sozluk) + 1
            sozluk[f"bulgu_{count}"] = yorum
            kai_memory["bulgu_sozluk"] = sozluk

        update_kai_memory(project_name, kai_memory)
        yield f"🤖 AI Yorumu:\n{yorum}\n\n💾 Bu yorumu not olarak kaydetmek ister misin? (evet / hayır)"
    except Exception as e:
        yield f"❌ AI yorum alınamadı: {e}"

# Arayüz Tanımı
def create_gradio_interface():
    try:
        with open('data/default/kaiMemory.json', 'r') as f:
            memory = json.load(f)
            hedef_ip = memory.get('hedef_ip', '192.168.1.100')
            local_ip = memory.get('local_ip', '127.0.0.1')
    except:
        hedef_ip = '192.168.1.100'
        local_ip = '127.0.0.1'

    return gr.ChatInterface(
        fn=local_ai_chat_stream,
        title="🛡️ Asistan kai",
        description="Ben kai. RUN: ile terminalde komut çalıştırırım. \n v 'kali aç' dersen yeni terminalde izleme başlatırım \n Açık terimanelde beni izlemek için bu kodu çalıştırın: tail -f /tmp/kai_terminal_output.log & ",
        submit_btn="Gönder",
        theme=gr.themes.Soft(primary_hue='cyan'),
        examples=[
            f"nmap ile detaylı port tarama kodunu yaz",
            f"RUN: ssh user@{local_ip}",
            f"RUN: ping -c 4 {hedef_ip}",
            f"RUN: curl http://{hedef_ip}",
            "kali aç",
            "logları göster",
            "Bulguları göster"
        ]
    )

# Log İzleyici

def monitor_terminal_output():
    log_path = "/tmp/kai_terminal_output.log"
    print("🧠 Terminal izleyici başlatıldı.")
    try:
        with open(log_path, "r") as f:
            f.seek(0, 2)
            while True:
                line = f.readline()
                if line:
                    print(f"\n📤 Log: {line.strip()}")
                else:
                    time.sleep(0.2)
    except Exception as e:
        print(f"❌ Log izleme hatası: {str(e)}")

threading.Thread(target=monitor_terminal_output, daemon=True).start()
