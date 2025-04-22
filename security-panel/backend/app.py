from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import json
import re
import shlex
import platform

from datetime import datetime

app = Flask(__name__)
CORS(app)

DATA_DIR = 'data'

import subprocess
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/ai-suggest', methods=['POST'])
def ai_suggest():
    try:
        data = request.get_json()
        command = data.get('command', '').strip()
        ip = data.get('ip', '').strip()

        if not command or len(command) < 3:
            return jsonify({'type': 'error', 'message': 'Geçersiz komut'}), 400

        # IP'yi komutla birleştir
        full_command = f"{command} {ip}"

        # Ollama çağrısı
        proc = subprocess.Popen(
            ['ollama', 'run', 'kali-fix', full_command],  # Burada ip'yi komuta dahil ettik
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        try:
            stdout, stderr = proc.communicate(timeout=6000)
            if proc.returncode != 0:
                raise Exception(stderr)
                
            return jsonify({
                'type': 'suggestion',
                'message': stdout.strip()
            })

        except subprocess.TimeoutExpired:
            proc.kill()
            return jsonify({
                'type': 'error',
                'message': 'AI zaman aşımı'
            }), 500

    except Exception as e:
        return jsonify({
            'type': 'error',
            'message': f"AI hatası: {str(e)}"
        }), 500

            



@app.route('/run-in-terminal', methods=['POST'])
def run_in_terminal():
    data = request.get_json()
    cmd = data.get('command', '')

    if not cmd:
        return jsonify({'error': 'Komut eksik'}), 400

    try:
        # Geçici bir komut dosyası oluştur
        script_path = "/tmp/kali_temp_command.sh"
        with open(script_path, "w") as f:
            f.write(f"#!/bin/bash\n{cmd}\necho ''\necho '--- Komut bitti, terminal açık kalıyor ---'\nbash\n")

        os.chmod(script_path, 0o755)

        # Sistemde hangi terminal varsa onu çalıştır
        terminals = ["xfce4-terminal", "x-terminal-emulator", "konsole", "mate-terminal", "lxterminal", "tilix", "gnome-terminal", "xterm"]
        for term in terminals:
            if subprocess.call(["which", term], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
                subprocess.Popen([term, "-e", f"bash {script_path}"])
                return jsonify({'message': f'{term} ile terminal başlatıldı.'})
        
        return jsonify({'error': 'Hiçbir uyumlu terminal bulunamadı.'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/open-project-folder', methods=['POST'])
def open_project_folder():
    data = request.get_json()
    project_name = data.get('project')

    if not project_name:
        return jsonify({'error': 'Proje adı gerekli'}), 400

    project_path = os.path.join(DATA_DIR, project_name)

    if not os.path.exists(project_path):
        return jsonify({'error': 'Klasör bulunamadı'}), 404

    try:
        if platform.system() == 'Windows':
            subprocess.Popen(f'explorer "{project_path}"')
        elif platform.system() == 'Darwin':  # MacOS
            subprocess.Popen(['open', project_path])
        else:  # Linux
            subprocess.Popen(['xdg-open', project_path])
        return jsonify({'message': 'Klasör açıldı'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
@app.route('/run', methods=['POST'])
def run_command():
    data = request.get_json()
    cmd = data.get('command')
    tool = data.get('tool')
    project = data.get('project')

    if not cmd or not tool or not project:
        return jsonify({'error': 'Eksik veri: command, tool ve project gerekli'}), 400

    project_dir = os.path.join(DATA_DIR, project)  # aktif proje dizini

    try:
        result = subprocess.check_output(
            cmd,
            shell=True,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=30,
            cwd=project_dir  # 🔥 ÇALIŞMA DİZİNİ BURASI!
        )
        save_log(project, tool, cmd, result)
        return jsonify({"output": result})
    except subprocess.CalledProcessError as e:
        save_log(project, tool, cmd, e.output)
        return jsonify({'error': 'Komut hatası', 'output': e.output}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def save_log(project_name, tool, command, output):
    timestamp = datetime.now().isoformat()
    log_data = {
        "timestamp": timestamp,
        "command": command,
        "output": output,
        "tool": tool
    }
    log_dir = os.path.join(DATA_DIR, project_name, 'logs')
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"{tool}_log.json")

    if os.path.exists(log_file):
        with open(log_file, 'r') as f:
            existing = json.load(f)
    else:
        existing = []

    existing.append(log_data)
    with open(log_file, 'w') as f:
        json.dump(existing, f, indent=2)

@app.route('/logs/<project>/<tool>', methods=['GET'])
def get_tool_logs(project, tool):
    log_file = os.path.join(DATA_DIR, project, 'logs', f"{tool}_log.json")
    try:
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = json.load(f)
        else:
            logs = []
        return jsonify({'logs': logs})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/create-project', methods=['POST'])
def create_project():
    data = request.get_json()
    project_name = data.get('name')

    if not project_name:
        return jsonify({'error': 'Proje adı gerekli'}), 400

    project_path = os.path.join(DATA_DIR, project_name)

    if os.path.exists(project_path):
        return jsonify({'error': 'Bu isimde bir proje zaten var'}), 400

    try:
        os.makedirs(project_path)
        os.makedirs(os.path.join(project_path, 'scan-results'))
        os.makedirs(os.path.join(project_path, 'logs'))

        config = {
            'project_name': project_name,
            'created_at': datetime.now().isoformat(),
            'targets': [],
            'tools_used': [],
            'notes': ''
        }

        with open(os.path.join(project_path, 'config.json'), 'w') as f:
            json.dump(config, f, indent=4)

        return jsonify({'success': True, 'path': project_path})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/projects', methods=['GET'])
def list_projects():
    try:
        projects = [
            name for name in os.listdir(DATA_DIR)
            if os.path.isdir(os.path.join(DATA_DIR, name))
        ]
        return jsonify({'projects': projects})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get-target/<project>', methods=['GET'])
def get_target(project):
    target_file = os.path.join(DATA_DIR, project, 'target.txt')
    if not os.path.exists(target_file):
        return jsonify({'target': ''})  # IP henüz ayarlanmamış olabilir
    with open(target_file, 'r') as f:
        target_ip = f.read().strip()
    return jsonify({'target': target_ip})

@app.route('/delete-project/<project>', methods=['DELETE'])
def delete_project(project):
    import shutil
    project_path = os.path.join(DATA_DIR, project)
    if os.path.exists(project_path):
        shutil.rmtree(project_path)
        return jsonify({'message': f'{project} silindi'})
    else:
        return jsonify({'error': 'Proje bulunamadı'}), 404


@app.route('/set-target', methods=['POST'])
def set_target():
    data = request.get_json()
    project_name = data.get('project_name')
    target_ip = data.get('target_ip')

    if not project_name or not target_ip:
        return jsonify({'error': 'project_name ve target_ip gerekli'}), 400

    config_path = os.path.join(DATA_DIR, project_name, 'config.json')
    target_txt_path = os.path.join(DATA_DIR, project_name, 'target.txt')

    try:
        # config.json güncelle
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
        else:
            config = {}

        if 'targets' not in config:
            config['targets'] = []

        if target_ip not in config['targets']:
            config['targets'].append(target_ip)

        with open(config_path, 'w') as f:
            json.dump(config, f, indent=4)

        # ✅ target.txt dosyasına da yaz
        with open(target_txt_path, 'w') as f:
            f.write(target_ip.strip())

        return jsonify({'success': True, 'message': 'Hedef IP kaydedildi'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/nmap-discover', methods=['GET'])
def discover_ips():
    try:
        ip = os.popen("hostname -I").read().strip()
        ip_oktet = re.search(r'(\d+\.\d+\.\d+\.)', ip).group(1)

        cmd = f"nmap -sn {ip_oktet}0/24"
        output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, text=True)

        ips = []
        for line in output.splitlines():
            if "Nmap scan report for" in line:
                ip_line = line.split("for")[-1].strip()
                if re.match(r'^\d+\.\d+\.\d+\.\d+$', ip_line):
                    ips.append(ip_line)

        return jsonify({'ips': ips})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/scan-ports', methods=['POST'])
def scan_ports():
    data = request.get_json()
    ips = data.get('ips', [])
    if not ips:
        return jsonify({'error': 'IP listesi boş'}), 400

    history_path = os.path.join(DATA_DIR, 'scan-history.json')
    if os.path.exists(history_path):
        with open(history_path, 'r') as f:
            scan_history = json.load(f)
    else:
        scan_history = {}

    result = {}

    for ip in ips:
        try:
            output = subprocess.check_output(
                f"nmap -p 1-1000 {ip}",
                shell=True,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=15
            )
            open_ports = re.findall(r"(\d+)/tcp\s+open", output)
            open_ports = [int(p) for p in open_ports]
        except:
            open_ports = []

        # geçmiş portlar
        previous_ports = scan_history.get(ip, {}).get("ports", [])
        all_ports = list(set(previous_ports + open_ports))

        port_status = []
        for port in all_ports:
            status = "open" if port in open_ports else "closed"
            port_status.append({"port": port, "status": status})

        result[ip] = {
            "ports": port_status
        }

        scan_history[ip] = {
            "ports": all_ports,
            "last_seen": datetime.now().isoformat()
        }

    with open(history_path, 'w') as f:
        json.dump(scan_history, f, indent=2)

    return jsonify({'results': result})

@app.route('/notes/<project>', methods=['GET', 'POST'])
def manage_notes(project):
    project_path = os.path.join(DATA_DIR, project)
    notes_path = os.path.join(project_path, 'notes.json')

    if not os.path.exists(project_path):
        return jsonify({'error': 'Proje bulunamadı'}), 404

    if request.method == 'GET':
        if os.path.exists(notes_path):
            with open(notes_path, 'r') as f:
                return jsonify(json.load(f))
        else:
            return jsonify([])

    elif request.method == 'POST':
        new_note = request.get_json()
        if not new_note:
            return jsonify({'error': 'Eksik veri'}), 400

        existing = []
        if os.path.exists(notes_path):
            with open(notes_path, 'r') as f:
                existing = json.load(f)

        new_note['id'] = str(len(existing) + 1)
        new_note['timestamp'] = datetime.now().isoformat()
        existing.append(new_note)

        with open(notes_path, 'w') as f:
            json.dump(existing, f, indent=2)

        return jsonify({'message': 'Not kaydedildi', 'note': new_note})
        
@app.route('/tree/<project>', methods=['GET'])
def build_tree(project):
    project_path = os.path.join(DATA_DIR, project)
    notes_path = os.path.join(project_path, 'notes.json')

    if not os.path.exists(notes_path):
        return jsonify({'error': 'Kayıtlı not bulunamadı'}), 404

    with open(notes_path, 'r') as f:
        notes = json.load(f)

    note_dict = {note['id']: {**note, 'children': []} for note in notes}

    roots = []
    for note in note_dict.values():
        parent_id = note.get('parent')
        if parent_id and parent_id in note_dict:
            note_dict[parent_id]['children'].append(note)
        elif not parent_id or parent_id == 'root':
            roots.append(note)

    # Eğer gerçekten ID'si 'root' olan bir düğüm varsa onu döndür
    for r in roots:
        if r['id'] == 'root':
            return jsonify(r)

    # Eğer tek bir kök varsa onu döndür
    if len(roots) == 1:
        return jsonify(roots[0])

    # Aksi durumda sahte bir kök oluştur ve tüm rootları altına bağla
    return jsonify({
        'id': 'root',
        'title': 'Kök Düğüm',
        'children': roots
    })


@app.route('/notes/<project>/<note_id>', methods=['PUT', 'DELETE'])
def modify_note(project, note_id):
    project_path = os.path.join(DATA_DIR, project)
    notes_path = os.path.join(project_path, 'notes.json')

    if not os.path.exists(notes_path):
        return jsonify({'error': 'Not bulunamadı'}), 404

    with open(notes_path, 'r') as f:
        notes = json.load(f)

    updated_notes = []
    found = False

    for note in notes:
        if note['id'] == note_id:
            if request.method == 'PUT':
                data = request.get_json()
                note['title'] = data.get('title', note['title'])
                note['content'] = data.get('content', note['content'])
                note['tool'] = data.get('tool', note.get('tool', ''))
                note['parent'] = data.get('parent', note.get('parent', ''))
                found = True
        else:
            updated_notes.append(note)

    if request.method == 'DELETE':
        updated_notes = [note for note in notes if note['id'] != note_id]
        found = any(note['id'] == note_id for note in notes)

    if not found:
        return jsonify({'error': 'Not bulunamadı'}), 404

    with open(notes_path, 'w') as f:
        json.dump(updated_notes if request.method == 'DELETE' else notes, f, indent=2)

    return jsonify({'message': 'Güncelleme başarılı' if request.method == 'PUT' else 'Silme başarılı'})



@app.route('/tool-help/<tool_name>', methods=['GET'])
def get_tool_help(tool_name):
    help_flags = ['--help', '-h', '-help', 'help']
    output = ''
    
    for flag in help_flags:
        try:
            command = shlex.split(f"{tool_name} {flag}")
            output = subprocess.check_output(command, stderr=subprocess.STDOUT, text=True, timeout=10)
            break
        except subprocess.CalledProcessError as e:
            output = e.output or ''
            if output:
                break
        except:
            continue
    else:
        return jsonify({'error': f'{tool_name} için help komutu bulunamadı.'}), 404

    if len(output) > 10000:
        output = output[:10000] + "\n... (çıktı sınırlandı)"

    options = []
    for line in output.splitlines():
        line = line.strip()
        match = re.match(r"^(\-{1,2}[a-zA-Z0-9\-_]+)(?:[ =]+(\[?.+?\]?))?", line)
        if match:
            flag = match.group(1)
            desc = match.group(2) or ""
            flag_type = "text" if "<" in desc or desc.endswith("=") else "checkbox"
            options.append({
                "flag": flag,
                "label": desc,
                "type": flag_type,
                "placeholder": "değer girin" if flag_type == "text" else ""
            })
    return jsonify(options)


if __name__ == '__main__':
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    print("🚀 Flask sunucusu başlatıldı.")
    app.run(host='0.0.0.0', port=5050)
