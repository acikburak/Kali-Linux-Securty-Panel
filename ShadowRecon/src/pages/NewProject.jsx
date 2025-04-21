import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const NewProject = () => {
  const [projectName, setProjectName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [existingProjects, setExistingProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    axios.get('http://localhost:5050/projects')
      .then(res => setExistingProjects(res.data.projects || []))
      .catch(err => console.error("Projeler alınamadı", err))
  }, [])

  const isValidName = (name) => /^[a-zA-Z0-9_-]+$/.test(name)

  const handleCreate = async () => {
    const trimmed = projectName.trim()
    if (!trimmed) return setError("Proje adı boş olamaz.")
    if (!isValidName(trimmed)) return setError("Sadece harf, sayı, - ve _ karakterleri kullanılabilir.")
    if (existingProjects.includes(trimmed)) return setError("Bu isimde bir proje zaten var.")

    try {
      await axios.post('http://localhost:5050/create-project', { name: trimmed })
      setExistingProjects([...existingProjects, trimmed])
      setMessage("✅ Proje oluşturuldu.")
      setError('')
      setProjectName('')
    } catch (err) {
      setError(err.response?.data?.error || "Hata oluştu.")
      setMessage('')
    }
  }

  const handleDelete = async (proj) => {
    const confirmed = window.confirm(`"${proj}" adlı projeyi silmek istiyor musunuz?`)
    if (!confirmed) return

    try {
      await axios.delete(`http://localhost:5050/delete-project/${proj}`)
      setExistingProjects(existingProjects.filter(p => p !== proj))
      setSelectedProject('')
    } catch (err) {
      alert("Silinemedi.")
    }
  }

  const handleOpen = async (proj) => {
    try {
      const res = await axios.get(`http://localhost:5050/get-target/${proj}`)
      const targetIP = res.data.target?.trim()
      localStorage.setItem('activeProject', proj)
      if (targetIP) {
        localStorage.setItem('targetIP', targetIP)
        navigate('/scan')
      } else {
        navigate('/target')
      }
    } catch (err) {
      alert("Hedef IP alınamadı.")
    }
  }

  const filteredProjects = existingProjects.filter(proj =>
    proj.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Sol Sütun */}
        <div style={styles.column}>
          <h2 style={styles.header}>🛠️ Yeni Proje Oluştur</h2>
          <input
            className="input"
            placeholder="Proje adı girin (örn: test_scan_01)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            style={styles.input}
          />
          <button className="button" onClick={handleCreate} style={styles.button}>➕ Oluştur</button>
          {message && <p style={{ color: 'lightgreen' }}>{message}</p>}
          {error && <p style={{ color: '#ff5555' }}>{error}</p>}

          <h2 style={{ ...styles.header, marginTop: '2rem' }}>📁 Mevcut Projeler</h2>
          <input
            className="input"
            placeholder="🔍 Proje ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
          />

          <div style={styles.projectList}>
            {filteredProjects.length === 0 && <p style={{ color: '#888' }}>Eşleşen proje bulunamadı.</p>}
            {filteredProjects.map((proj, i) => (
              <div key={i} className="project-item" style={styles.projectItem} onClick={() => handleOpen(proj)}>
                <span>{proj}</span>
                <span onClick={(e) => { e.stopPropagation(); handleDelete(proj) }} title="Sil">🗑️</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ Sütun */}
        <div style={styles.column}>
          <h3 style={{ color: '#ccc', marginBottom: '0.5rem' }}>💬 Kullanıcı Geri Bildirim Alanı</h3>
          <iframe
            src="https://www.bilgiveteknoloji.com/forum/public/t/g-venlik-taramas-y-netim-paneli"
            title="Geri Bildirim"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '600px',
              border: '1px solid #444',
              borderRadius: '8px',
              background: '#111'
            }}
          ></iframe>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    background: '#1e1e1e',
    color: '#fff',
    fontFamily: 'monospace',
    minHeight: '100vh',
    width: '100vw',
    padding: '2rem 5vw',
    boxSizing: 'border-box'
  },
  container: {
    display: 'flex',
    gap: '3rem',
    alignItems: 'flex-start'
  },
  column: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  input: {
    width: '100%',
    padding: '0.6rem',
    marginBottom: '1rem',
    background: '#1e1e1e',
    border: '1px solid #444',
    color: '#0ff',
    borderRadius: '5px',
    fontFamily: 'monospace'
  },
  button: {
    padding: '0.6rem 1.2rem',
    background: '#007acc',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '1rem'
  },
  projectList: {
    maxHeight: '400px',
    overflowY: 'auto',
    paddingRight: '6px',
    border: '1px solid #333',
    borderRadius: '6px'
  },
  projectItem: {
    padding: '0.6rem',
    marginBottom: '0.5rem',
    background: '#2d2d2d',
    color: '#0ff',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    cursor: 'pointer'
  },
  header: {
    color: '#4fc3f7',
    marginBottom: '1rem'
  }
}

export default NewProject
