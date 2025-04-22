import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './ScanDashboard.css'
import { useNavigate } from 'react-router-dom'
import NotePanel from './NotePanel'

const handleOpenProjectFolder = async () => {
  if (!activeProject) return alert("Lütfen önce bir proje seçin.")
  try {
    await axios.post('http://localhost:5050/open-project-folder', {
      project: activeProject
    })
    alert("📂 Proje klasörü açıldı.")
  } catch (err) {
    alert("❌ Klasör açılamadı: " + (err.response?.data?.error || err.message))
  }
}


const ScanDashboard = () => {
  const [toolsByGroup, setToolsByGroup] = useState(() => JSON.parse(localStorage.getItem('toolsByGroup')) || {})
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favoriteTools')) || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTool, setSelectedTool] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [toolSessions, setToolSessions] = useState({})
  const [helpOptions, setHelpOptions] = useState([])
  const [targetIP, setTargetIP] = useState('')
  const [activeProject, setActiveProject] = useState('')
  const [customCommand, setCustomCommand] = useState('')
  const [presetScripts, setPresetScripts] = useState(() => JSON.parse(localStorage.getItem('presetScripts')) || {})
  const [presetName, setPresetName] = useState('')
  const [newToolName, setNewToolName] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const terminalOutputRef = useRef(null)
  const commandInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('terminal')
const [aiOutput, setAiOutput] = useState({ type: '', message: '' })
const [isThinking, setIsThinking] = useState(false)

const getAiSuggestion = async () => {
  setIsThinking(true)

  // 🔍 Gönderilecek veriyi net olarak göster
  console.log('📤 AI isteği gönderiliyor →', {
    command: customCommand,
    tool: selectedTool,
    ip: targetIP
  })

  try {
    const res = await axios.post('http://localhost:5050/ai-suggest', {
      command: customCommand,
      tool: selectedTool,
      ip: targetIP
    })

    console.log('✅ AI yanıtı alındı:', res.data)
    setAiOutput(res.data)
  } catch (err) {
    console.error('❌ AI isteği hatası:', err.response?.data || err.message)
    setAiOutput({
      type: 'info',
      message: '❌ AI yanıtı alınamadı.'
    })
  }

  setIsThinking(false)
}


// AI öneri almayı kontrol eden yeni useEffect
/*
useEffect(() => {
  const timer = setTimeout(() => {
    if (customCommand && customCommand.trim().length > 5) {
      getAiSuggestion();
    }
  }, 1000); // 1 saniye debounce

  return () => clearTimeout(timer);
}, [customCommand]); // Sadece customCommand değiştiğinde
*/
const navigate = useNavigate()
  useEffect(() => {
    setTargetIP(localStorage.getItem('targetIP') || '')
    setActiveProject(localStorage.getItem('activeProject') || '')
    loadToolSessions()
  }, [])

  useEffect(() => {
    if (selectedTool) fetchToolHelp(selectedTool)
  }, [selectedTool])

  useEffect(() => {
    setCustomCommand(buildCommand())
  }, [toolSessions, selectedTool, targetIP])
useEffect(() => {
  const ip = localStorage.getItem('targetIP')
  if (!ip) {
    alert('Geçerli bir hedef IP yok. Lütfen proje seçin.')
    window.location.href = '/'  // ya da navigate('/') kullan
  }
}, [])


  const loadToolSessions = () => {
    const sessions = {}
    Object.values(toolsByGroup).flat().forEach(tool => {
      sessions[tool] = { formData: {}, terminalOutput: '' }
    })
    setToolSessions(sessions)
    const defaultGroup = Object.keys(toolsByGroup)[0] || ''
    const defaultTool = toolsByGroup[defaultGroup]?.[0] || ''
    setSelectedGroup(defaultGroup)
    setSelectedTool(defaultTool)
  }
 
 const runInKaliTerminal = async () => {
  try {
    const res = await axios.post('http://localhost:5050/run-in-terminal', {
      command: customCommand
    })
    alert(res.data.message || 'Komut çalıştırıldı.')
  } catch (err) {
    alert('❌ Terminal komutu çalıştırılamadı: ' + (err.response?.data?.error || err.message))
  }
}

  const addTool = () => {
    if (!newToolName || !newGroupName) return
    const updated = { ...toolsByGroup }
    if (!updated[newGroupName]) updated[newGroupName] = []
    if (!updated[newGroupName].includes(newToolName)) {
      updated[newGroupName].push(newToolName)
      localStorage.setItem('toolsByGroup', JSON.stringify(updated))
      setToolsByGroup(updated)
      setNewToolName('')
      setNewGroupName('')
      loadToolSessions()
    } else {
      alert(`${newToolName.toUpperCase()} zaten ${newGroupName.toUpperCase()} grubunda mevcut.`)
    }
  }

  const removeTool = () => {
    if (!selectedTool || !selectedGroup) return
    const confirmDelete = window.confirm(`${selectedTool.toUpperCase()} aracını silmek istediğinize emin misiniz?`)
    if (!confirmDelete) return
    const updated = { ...toolsByGroup }
    updated[selectedGroup] = updated[selectedGroup].filter(tool => tool !== selectedTool)
    if (updated[selectedGroup].length === 0) delete updated[selectedGroup]
    localStorage.setItem('toolsByGroup', JSON.stringify(updated))
    setToolsByGroup(updated)
    loadToolSessions()
  }

  const toggleFavorite = (tool) => {
    const updated = favorites.includes(tool)
      ? favorites.filter(fav => fav !== tool)
      : [...favorites, tool]
    setFavorites(updated)
    localStorage.setItem('favoriteTools', JSON.stringify(updated))
  }

  const fetchToolHelp = async (toolName) => {
    try {
      const res = await axios.get(`http://localhost:5050/tool-help/${toolName}`)
      setHelpOptions(res.data || [])
    } catch {
      setHelpOptions([])
    }
  }

  const handleFormChange = (flag, value) => {
    setToolSessions(prev => ({
      ...prev,
      [selectedTool]: {
        ...prev[selectedTool],
        formData: {
          ...prev[selectedTool].formData,
          [flag]: value
        }
      }
    }))
  }

  const buildCommand = () => {
    const formData = toolSessions[selectedTool]?.formData || {}
    let cmd = selectedTool
    helpOptions.forEach(param => {
      const value = formData[param.flag]
      if (param.type === 'checkbox' && value) cmd += ` ${param.flag}`
      else if (param.type === 'text' && value) cmd += param.flag ? ` ${param.flag} ${value}` : ` ${value}`
    })
    //if (targetIP) cmd += ` ${targetIP}`
    return cmd
  }

  const executeTerminalCommand = async (command) => {
    const resolved = command.replace(/TARGET/g, targetIP || '')
    appendToTerminal(`\n$ ${resolved}`)
    try {
      const res = await axios.post('http://localhost:5050/run', {
        command: resolved,
        tool: selectedTool,
        project: activeProject
      })
      appendToTerminal(`\n${res.data.output || '✅ Komut çalıştı, fakat çıktı yok.'}`)
    } catch (err) {
      appendToTerminal(`\n❌ ${err.response?.data?.output || err.message}`)
    }
  }

  const appendToTerminal = (text) => {
  setToolSessions(prev => {
    const updated = {
      ...prev,
      [selectedTool]: {
        ...prev[selectedTool],
        terminalOutput: (prev[selectedTool].terminalOutput || '') + text
      }
    }
    setTimeout(() => {
      if (terminalOutputRef.current) {
        terminalOutputRef.current.scrollTop = terminalOutputRef.current.scrollHeight
      }
    }, 50)
    return updated
  })
}


  const handleRun = () => executeTerminalCommand(customCommand)

  const handleTerminalEnter = (e) => {
    if (e.key === 'Enter') {
      const cmd = commandInputRef.current.value.trim()
      if (cmd) executeTerminalCommand(cmd)
      commandInputRef.current.value = ''
    }
  }

  const handleSavePreset = () => {
    if (!presetName) return alert('Lütfen script adı girin.')
    const updated = {
      ...presetScripts,
      [selectedTool]: {
        ...(presetScripts[selectedTool] || {}),
        [presetName]: customCommand
      }
    }
    setPresetScripts(updated)
    localStorage.setItem('presetScripts', JSON.stringify(updated))
    alert('Script kaydedildi.')
  }

  return (
    <>
     <div className="banner">
     
  <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>🏠 Anasayfa</div>
  <div onClick={() => navigate('/new')} style={{ cursor: 'pointer' }}>📁 Projeler</div>
  <div onClick={() => navigate('/scan')} style={{ cursor: 'pointer' }}>🛠️ Stüdyo</div>
  <div onClick={() => {
    if (!activeProject) return alert("Lütfen önce bir proje seçin.")
    axios.post('http://localhost:5050/open-project-folder', {
      project: activeProject
    }).then(() => {
      alert('📂 Proje klasörü açıldı.')
    }).catch(err => {
      alert('❌ Klasör açılamadı: ' + (err.response?.data?.error || err.message))
    })
  }}
  style={{ cursor: 'pointer', color: '#ccc', marginLeft: '1rem' }}
>
  📂 Dosyayı Aç</div>
  <div
  onClick={() => {
    if (!activeProject) {
      alert("Lütfen önce bir proje seçin.")
      return
    }
    window.open(`/tree?project=${encodeURIComponent(activeProject)}`, '_blank')
  }}
  style={{ cursor: 'pointer' }}
>
  📊 Bulgular
</div>



  <button
    style={{
      marginLeft: 'auto',
      background: '#007acc',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '0.2rem 0.8rem',
      fontSize: '0.8rem',
      cursor: 'pointer',
      fontWeight: 'bold'
    }}
    onClick={() => window.open('https://www.bilgiveteknoloji.com/forum/public/t/kali-linux-ara-ve-y-ntemleri', '_blank')}
  >
    Yardım
  </button>
</div>

      <div className="scan-wrapper">
        <div className="sidebar">
          <div className="sidebar-content">
            <div style={{ marginBottom: '1rem' }}>
              <strong>📁 {activeProject}</strong><br />
              <small>🎯 {targetIP}</small>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Araç ara..."
              className="input-new-tool"
            />

            <h3>⭐ Favoriler</h3>
            <ul>
              {favorites.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase())).map(tool => (
                <li
                  key={tool}
                  className={`tool-item ${selectedTool === tool ? 'active' : ''}`}
                  onClick={() => setSelectedTool(tool)}>
                  <span>★ {tool.toUpperCase()}</span>
                </li>
              ))}
            </ul>

            <h3>Araçlar</h3>
            {Object.entries(toolsByGroup).map(([group, tools]) => (
              <div key={group}>
                <strong>{group.toUpperCase()}</strong>
                <ul>
                  {tools.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase())).map(tool => (
                    <li
                      key={tool}
                      className={`tool-item ${selectedTool === tool ? 'active' : ''}`}
                      onClick={() => { setSelectedTool(tool); setSelectedGroup(group) }}>
                      {tool.toUpperCase()} <button onClick={(e) => { e.stopPropagation(); toggleFavorite(tool) }}>⭐</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="sidebar-fixed">
            <input value={newToolName} onChange={(e) => setNewToolName(e.target.value)} placeholder="Araç adı" className="input-new-tool" />
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Grup adı" className="input-new-tool" />
            <button onClick={addTool}>+ Ekle</button>
            <button onClick={removeTool}>Sil 🗑️</button>
          </div>
        </div>

        <div className="main-content">
          <div className="code-form">
            <h2>{selectedTool?.toUpperCase()} Ayarları</h2>
            <div className="form-scroll">
              {helpOptions.map((param, i) => {
                const val = toolSessions[selectedTool]?.formData[param.flag] || ''
                return param.type === 'checkbox' ? (
                  <label key={i} className="flag-item">
                    <input
                      type="checkbox"
                      checked={!!val}
                      onChange={(e) => handleFormChange(param.flag, e.target.checked)}
                    />
                    {param.flag} {param.label}
                  </label>
                ) : (
                  <div key={i} className="input-group">
                    <label>{param.flag} - {param.label}</label>
                    <input
                      type="text"
                      value={val}
                      placeholder={param.placeholder || 'değer girin'}
                      onChange={(e) => handleFormChange(param.flag, e.target.value)}
                    />
                  </div>
                )
              })}
            </div>

            <div className="sub-content">
<div className={`ai-suggestion-box ${isThinking ? 'glowing' : ''}`}>
  <label style={{ color: '#4fc3f7', fontWeight: 'bold', marginBottom: '4px' }}>
    💡 Önerilen Komut (AI)
  </label>
  {isThinking && (
  <div className="ai-loader">
    <span>🤖 AI çalışıyor</span>
    <div className="dot"></div>
    <div className="dot"></div>
    <div className="dot"></div>
  </div>
)}

  <div className="ai-output">
    {aiOutput.type === 'suggestion' && (
      <>
        <strong>🔧 Önerilen:</strong><br />
        <code style={{ color: '#0f0' }}>{aiOutput.message}</code>
      </>
    )}
    {aiOutput.type === 'fix' && (
      <>
        <strong>🛠️ Hata Giderildi:</strong><br />
        <code style={{ color: '#ff0' }}>{aiOutput.message}</code>
      </>
    )}
    {aiOutput.type === 'info' && (
      <>
        <strong>ℹ️ Açıklama:</strong><br />
        <span>{aiOutput.message}</span>
      </>
    )}
    {!aiOutput.message && (
      <span style={{ color: '#999' }}>Yapay zeka şu an için öneri sunmadı.</span>
    )}
  </div>
</div>


              <button
    onClick={getAiSuggestion}
    title="Yapay zekadan öneri al"    
  >
    🤖
  </button> <strong> Oluşan Komut: </strong>
              <textarea value={customCommand} onChange={(e) => setCustomCommand(e.target.value)} />
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Hazır script adı"
                className="input-new-tool"
              />
<div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
  <button
    onClick={handleRun}
    style={{
      padding: '0.5rem 1rem',
      background: '#007bff',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}
  >
    ▶️ Çalıştır
  </button>

  <button
    onClick={runInKaliTerminal}
    style={{
      padding: '0.5rem 1rem',
      background: '#333',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}
  >
    🖥️ Kali ile Aç
  </button>

  <button
    onClick={handleSavePreset}
    style={{
      padding: '0.5rem 1rem',
      background: '#28a745',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}
  >
    💾 Kaydet
  </button>
</div>

            </div>
          </div>
	
	 <div className="terminal">
	 <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
	  <strong
	    onClick={() => setActiveTab('terminal')}
	    style={{ cursor: 'pointer', color: activeTab === 'terminal' ? '#4fc3f7' : '#ccc' }}>
	    Terminal
	  </strong>
	  <strong
	    onClick={() => setActiveTab('notes')}
	    style={{ cursor: 'pointer', color: activeTab === 'notes' ? '#4fc3f7' : '#ccc' }}>
	    Bulgu Ekle
	  </strong>
	</div>
	{activeTab === 'terminal' ? (
	  <>
	   
	   
		<div className="terminal-output">
		  {toolSessions[selectedTool]?.terminalOutput?.split('\n').map((line, i) => (
		    <div key={i} style={{ 
		      color: line.startsWith('❌') ? '#ff5252' : 
			     line.startsWith('✅') ? '#4caf50' : '#ccc'
		    }}>
		      {line}
		    </div>
		  ))}
		</div>
	    <input
              ref={commandInputRef}
              type="text"
              placeholder="$ komut girin"
              onKeyDown={handleTerminalEnter}
              className="terminal-input"
            />
          
	  </>
	) : (
	  <div className="terminal-output" style={{ padding: '1rem', color: '#ccc' }}>
	<NotePanel project={activeProject} ip={targetIP} tool={selectedTool} />
	  </div>
	)}
	  </div>


        
          
        
            
            
          

          <div className="function-panel">
            <h3>Hazır Scriptler</h3>
     <ul>
  {presetScripts[selectedTool] && Object.entries(presetScripts[selectedTool]).map(([name, cmd]) => (
    <li key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <button onClick={() => {
        setCustomCommand(cmd)
        setPresetName(name)
        if (commandInputRef.current) commandInputRef.current.value = cmd
      }}>
      ▶ {name.length > 19 ? name.slice(0, 10) + '…' : name}

      </button>
      <span
        onClick={() => {
          const confirmDelete = window.confirm(`"${name}" adlı scripti silmek istediğinize emin misiniz?`)
          if (!confirmDelete) return
          const updated = { ...presetScripts }
          delete updated[selectedTool][name]
          setPresetScripts(updated)
          localStorage.setItem('presetScripts', JSON.stringify(updated))
        }}
        title="Sil"
        style={{ cursor: 'pointer', color: 'red', marginLeft: '0.5rem' }}
      >
        🗑️
      </span>
    </li>
  ))}
</ul>
  
          </div>
     

        </div>
      </div>
    </>
  )
}

export default ScanDashboard
