import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const TargetSelection = () => {
  const [activeProject, setActiveProject] = useState('')
  const [ips, setIps] = useState([])
  const [targets, setTargets] = useState({})
  const [selectedTarget, setSelectedTarget] = useState('')
  const [manualTarget, setManualTarget] = useState('')
  const [loadingStep, setLoadingStep] = useState('')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('activeProject')
    if (stored) setActiveProject(stored)
    startDiscovery()
  }, [])

  const startDiscovery = async () => {
    setProgress(0)
    setLoadingStep('IP adresleri aranıyor...')
    try {
      const res = await axios.get('http://localhost:5050/nmap-discover')
      const ipList = res.data.ips || []
      setIps(ipList)
      setProgress(50)
      setLoadingStep('Portlar arka planda taranıyor...')

      axios.post('http://localhost:5050/scan-ports', { ips: ipList })
        .then((res) => {
          setTargets(res.data.results || {})
          setProgress(100)
          setLoadingStep('')
        })
        .catch(() => {
          setLoadingStep('')
        })
    } catch (err) {
      console.error(err)
      setError('Tarama sırasında hata oluştu.')
      setLoadingStep('')
    }
  }

const handleSelect = async () => {
  const finalTarget = selectedTarget || manualTarget.trim()
  if (!finalTarget) return setError("Lütfen bir hedef IP girin veya seçin!")
  if (!activeProject) return setError("Aktif proje bulunamadı!")

  try {
    // 1. IP'yi set et
    await axios.post('http://localhost:5050/set-target', {
      project_name: activeProject,
      target_ip: finalTarget
    })

    // 2. İlk düğümü kaydet
    await axios.post(`http://localhost:5050/notes/${activeProject}`, {
      id: "root",
      title: `Proje: ${activeProject}`,
      content:`Ip Adresi: ${finalTarget}`,
      parent: null,
      tool: "root",
      ip: finalTarget
    })

    // 3. Local ve yönlendirme
    localStorage.setItem('targetIP', finalTarget)
    setMessage(`✅ Hedef IP kaydedildi: ${finalTarget}`)
    setError('')
    navigate('/scan')
  } catch (err) {
    console.error(err)
    setError('Hedef IP veya düğüm kaydedilemedi.')
  }
}


  return (
    <div style={{
      fontFamily: 'Consolas, monospace',
      background: '#1e1e1e',
     
      color: '#d4d4d4',
      height: '100vh',
      display: 'flex',
      width: '100vw',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Sabit Başlık ve Tarama Alanı */}
      
      <div style={{ padding: '1rem', flexShrink: 0 }}>
     
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#fff' }}>Hedef Belirleme</h2>
        <p style={{ fontWeight: 'bold', marginBottom: '1rem' }}>
          🎯 Aktif Proje: <span style={{ color: '#4fc3f7' }}>{activeProject}</span>
        </p>
        {loadingStep && (
          <>
            <p style={{ marginBottom: '0.5rem' }}>{loadingStep}</p>
            <div style={{
              height: '8px',
              width: '100%',
              background: '#333',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #4caf50, #2196f3)',
                height: '100%',
                transition: 'width 0.5s ease'
              }}></div>
            </div>
          </>
        )}
        <button onClick={startDiscovery} style={{
          background: '#28a745',
          border: 'none',
          color: '#fff',
          padding: '0.5rem 1rem',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>
          🔄 Yeniden Tara
        </button>
      </div>

      {/* IP Listeleme Alanı */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1rem'
      }}>
        {ips.map(ip => {
          const portInfo = targets[ip]?.ports || []
          const isOnline = portInfo.some(p => p.status === 'open')

          return (
            <div
              key={ip}
              onClick={() => {
                setSelectedTarget(ip)
                setManualTarget('')
              }}
              style={{
                background: selectedTarget === ip ? '#094771' : isOnline ? '#2e3c2f' : '#2e2e2e',
                padding: '1rem',
                borderRadius: '10px',
                border: selectedTarget === ip ? '2px solid #2196f3' : '1px solid #444',
                cursor: 'pointer',
                transition: '0.2s ease',
                boxShadow: selectedTarget === ip ? '0 0 10px #2196f3' : 'none',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ marginBottom: '0.7rem', fontWeight: 'bold', fontSize: '1rem', color: isOnline ? '#4caf50' : '#aaa' }}>
                {ip}
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
                alignItems: 'flex-start'
              }}>
                {portInfo.length === 0 ? (
                  <div style={{ color: '#999', fontSize: '0.85rem' }}>Port taraması bekleniyor...</div>
                ) : (
                  portInfo.map((p, i) => (
                    <div key={i} style={{
                      backgroundColor: p.status === 'open' ? '#4caf50' : '#777',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      color: '#fff'
                    }}>
                      {p.port}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sabit Alt Giriş Alanı */}
      <div style={{
        flexShrink: 0,
        padding: '1rem',
        borderTop: '1px solid #333',
        background: '#1e1e1e'
      }}>
        <h4>Manuel IP veya URL Girişi</h4>
        <input
          type="text"
          value={manualTarget}
          onChange={(e) => {
            setManualTarget(e.target.value)
            setSelectedTarget('')
          }}
          placeholder="192.168.1.100 veya http://site.com"
          style={{
            width: '350px',
            margin: '5px',
            padding: '0.5rem',
            borderRadius: '5px',
            border: '1px solid #555',
            backgroundColor: '#1e1e1e',
            color: '#fff',
            marginBottom: '1rem'
          }}
        />
        <button onClick={handleSelect} style={{
          background: '#007bff',
          border: 'none',
          color: '#fff',
          padding: '0.7rem 1.5rem',
          borderRadius: '5px'
        }}>
          Devam Et
        </button>
        {message && <p style={{ color: 'lightgreen', marginTop: '1rem' }}>{message}</p>}
        {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
      </div>
    </div>
  )
}

export default TargetSelection
