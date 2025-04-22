import { useState, useEffect } from 'react'
import axios from 'axios'

const NotePanel = ({ project, ip, tool }) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedParent, setSelectedParent] = useState('')
  const [label, setLabel] = useState(tool || '')
  const [notes, setNotes] = useState([])

  useEffect(() => {
    if (project) fetchNotes()
  }, [project])

  const fetchNotes = async () => {
    try {
      const res = await axios.get(`http://localhost:5050/notes/${project}`)
      setNotes(res.data || [])
    } catch (err) {
      console.error('Notlar alınamadı:', err)
    }
  }

  const handleSave = async () => {
    if (!title || !content) return alert('Başlık ve içerik boş bırakılamaz.')
    const note = {
      title,
      content,
      parent: selectedParent,
      tool: label,
      ip
    }
    try {
      const res = await axios.post(`http://localhost:5050/notes/${project}`, note)
      setNotes(prev => [...prev, res.data.note])
      setTitle('')
      setContent('')
      setSelectedParent('')
    } catch (err) {
      console.error('Not kaydedilemedi:', err)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div><strong>Proje:</strong> {project}</div>
      <div><strong>IP:</strong> {ip}</div>
      <div><strong>Araç:</strong> {tool}</div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Başlık"
        style={{ padding: '0.4rem' }}
      />
      <textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  placeholder="Not içeriği"
  rows={4}
  style={{
    padding: '0.4rem',
    height: '300px', // 👈 istediğin yüksekliği buradan ayarla
    resize: 'vertical', // isteğe bağlı: sadece dikey büyüsün
    background: '#2c2c2c',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '14px',
    width: '98%'
  }}
/>

      <select
        value={selectedParent}
        onChange={(e) => setSelectedParent(e.target.value)}
        style={{ padding: '0.4rem' }}
      >
        <option value="root">Düğüm Seç</option>
        
        {notes.map(note => (
          <option key={note.id} value={note.id}>{note.title}</option>
        ))}
      </select>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Etiket"
        style={{ padding: '0.4rem' }}
      />
      <button
        onClick={handleSave}
        style={{ padding: '0.5rem', background: '#007acc', color: '#fff', border: 'none', borderRadius: '4px' }}
      >
        Notu Kaydet
      </button>
    </div>
  )
}

export default NotePanel
