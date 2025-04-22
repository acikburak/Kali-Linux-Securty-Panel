// TreeView bileşeni - Güncellenmiş: SVG kaydetme, ebeveyn güncelleme, etiket düzenleme ve tıklamada formu doldurma
import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import axios from 'axios'
import { useLocation } from 'react-router-dom'

const TreeView = () => {
  const svgRef = useRef()
  const [treeData, setTreeData] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tag, setTag] = useState('')
  const [parent, setParent] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newParent, setNewParent] = useState('')
  const [linkSpacing, setLinkSpacing] = useState(1050)
  const [currentTransform, setCurrentTransform] = useState(d3.zoomIdentity)

  const location = useLocation()
const params = new URLSearchParams(location.search)
const project = params.get('project') || ''

  useEffect(() => {
    if (project) fetchTree()
  }, [project])

  const fetchTree = async () => {
    try {
      const res = await axios.get(`http://localhost:5050/tree/${project}`)
      setTreeData(res.data)
    } catch (err) {
      console.error('Ağaç alınamadı:', err)
    }
  }

 const updateNote = async () => {
  if (!selectedNode?.id) return

  if (!title.trim()) {
    alert("Başlık boş bırakılamaz.")
    return
  }

  if (parent === selectedNode.id) {
    alert("Bir düğüm kendisinin ebeveyni olamaz.")
    return
  }

  if (selectedNode.id === 'root' && parent) {
    alert("Kök düğümün ebeveyni değiştirilemez.")
    return
  }

  try {
    await axios.put(`http://localhost:5050/notes/${project}/${selectedNode.id}`, {
      title,
      content,
      parent: parent || null,
      tool: tag
    })
    await fetchTree()
  } catch (err) {
    console.error('Güncellenemedi:', err)
    alert("Düğüm güncellenirken bir hata oluştu.")
  }
}


  const deleteNote = async () => {
  if (!selectedNode?.id) return

  if (selectedNode.id === 'root') {
    alert("Kök düğüm silinemez.")
    return
  }

  const confirmDelete = window.confirm(`“${selectedNode.title}” düğümünü silmek istediğinizden emin misiniz?\nAlt düğümler otomatik olarak kök dizine aktarılacak.`)
  if (!confirmDelete) return

  try {
    // önce alt düğümleri root'a taşı
    const allNodes = d3.hierarchy(treeData).descendants()
    const children = allNodes.filter(d => d.data.parent === selectedNode.id)

    for (const child of children) {
      await axios.put(`http://localhost:5050/notes/${project}/${child.data.id}`, {
        ...child.data,
        parent: null
      })
    }

    // sonra düğümü sil
    await axios.delete(`http://localhost:5050/notes/${project}/${selectedNode.id}`)
    setSelectedNode(null)
    await fetchTree()
  } catch (err) {
    console.error('Silinemedi:', err)
    alert("Silme işlemi sırasında bir hata oluştu.")
  }
}


  const addNote = async () => {
  if (!newTitle.trim()) {
    alert("Yeni düğüm başlığı boş bırakılamaz.")
    return
  }

  if (newParent === newTitle) {
    alert("Düğüm kendisinin ebeveyni olamaz.")
    return
  }

  try {
    await axios.post(`http://localhost:5050/notes/${project}`, {
      title: newTitle,
      content: newContent,
      parent: newParent || null,
      tag: newTag
    })
    setNewTitle('')
    setNewContent('')
    setNewParent('')
    setNewTag('')
    await fetchTree()
  } catch (err) {
    console.error('Eklenemedi:', err)
    alert("Yeni düğüm eklenirken bir hata oluştu.")
  }
}


  const saveSvg = () => {
    const svgElement = svgRef.current
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svgElement)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project}-tree.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (treeData) drawTree()
  }, [treeData, linkSpacing])

  const drawTree = () => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const width = window.innerWidth * 2
    const height = window.innerHeight * 5

    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        setCurrentTransform(event.transform)
        svg.select('g.zoom-container').attr('transform', event.transform)
      })

    svg.call(zoom).call(zoom.transform, currentTransform)

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('class', 'zoom-container')
      .attr('transform', currentTransform)

    const root = d3.hierarchy(treeData)
    const treeLayout = d3.tree().nodeSize([linkSpacing, 400])
    treeLayout(root)

    const initialX = 350
    const initialY = 200
    const initialZoom = 0.3
    const centerX = initialX - root.x * initialZoom
    const centerY = initialY - root.y * initialZoom

    g.attr('transform', `translate(${centerX}, ${centerY}) scale(${initialZoom})`)
    setCurrentTransform(d3.zoomIdentity.translate(centerX, centerY).scale(initialZoom))

    g.selectAll('path.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#0ff')
      .attr('stroke-width', 1.5)
      .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))

    const node = g.selectAll('g.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .on('click', (event, d) => {
        setSelectedNode(d.data)
        setTitle(d.data.title || '')
        setContent(d.data.content || '')
        setTag(d.data.tool || '')
        setParent(d.data.parent || '')
      })

    node.append('foreignObject')
      .attr('width', 450)
      .attr('height', 290)
      .attr('x', -250)
      .attr('y', -145)
      .append('xhtml:div')
      .style('background', '#222')
      .style('color', '#0ff')
      .style('padding', '12px')
      .style('border', '2px solid #0ff')
      .style('borderRadius', '16px')
      .style('fontSize', '14px')
      .style('fontFamily', 'Arial, sans-serif')
      .style('textAlign', 'center')
      .html(d => `
        <strong style="font-size:18px">${d.data.title}</strong><br/>
        <textarea readonly style="width: 95%; height: 180px; resize: none; background: rgba(17, 17, 17, 0.85); color: #0ff; border: none; padding: 6px; font-family: monospace; font-size: 13px; box-shadow: inset 0 0 4px #0ff;">${d.data.content || ''}</textarea>
        <em>${d.data.tool || ''}</em>
      `)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#1e1e1e', color: '#fff', fontFamily: 'monospace' }}>
      <div style={{ width: '300px', padding: '1rem', borderRight: '1px solid #444', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>📝 Düğüm Bilgisi</h3>
        <p style={{ color: '#4fc3f7', marginBottom: '1rem', textAlign: 'center' }}>📂 Seçili Proje: <strong>{project}</strong></p>
        <button onClick={saveSvg} style={{ marginBottom: '1rem', background: '#222', color: '#0ff', border: '1px solid #0ff', padding: '0.5rem', width: '100%' }}>📥 SVG Kaydet</button>
        <label style={{ fontSize: '0.9rem', marginTop: '1rem' }}>Düğüm aralığı:</label>
        <input type="range" min="40"  max="2000" step="10" value={linkSpacing} onChange={(e) => setLinkSpacing(Number(e.target.value))} style={{ width: '100%' }} />

        {selectedNode ? (
          <>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık" style={{ width: '95%', marginBottom: '0.5rem', padding: '0.4rem',  background: '#2c2c2c', color: '#fff', border: '1px solid #555' }} />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="İçerik" rows={4} style={{ width: '95%', marginBottom: '0.5rem', padding: '0.4rem', background: '#2c2c2c', color: '#fff', border: '1px solid #555' }} />
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Etiket" style={{ width: '95%', marginBottom: '0.5rem', padding: '0.4rem', background: '#2c2c2c', color: '#fff', border: '1px solid #555' }} />
            <select value={parent || ''} onChange={(e) => setParent(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.4rem', background: '#2c2c2c', color: '#fff', border: '1px solid #555' }}>
              <option value="">Yeni ebeveyn seçin</option>
              {treeData && d3.hierarchy(treeData).descendants().filter(d => d.data.id !== selectedNode.id).map(d => (
                <option key={d.data.id} value={d.data.id}>{`${d.data.title} (${d.data.id})`}</option>
              ))}
            </select>
            <button onClick={updateNote} style={{ padding: '0.5rem', background: '#4caf50', color: '#fff', border: 'none', marginRight: '0.5rem' }}>Güncelle</button>
            <button onClick={deleteNote} style={{ padding: '0.5rem', background: '#f44336', color: '#fff', border: 'none' }}>Sil</button>
          </>
        ) : (
          <p>Bir düğüm seçin...</p>
        )}

        <h4 style={{ marginTop: '2rem' }}>➕ Yeni Düğüm</h4>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Yeni başlık" style={{ width: '95%', marginBottom: '0.5rem', padding: '0.4rem', background: '#2c2c2c', color: '#fff', border: '1px solid #555' }} />
        <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Yeni içerik" rows={3} style={{ width: '95%', marginBottom: '0.5rem', padding: '0.4rem', background: '#2c2c2c', color: '#fff', border: '1px solid #555' }} />
        <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Yeni etiket" style={{ width: '95%', marginBottom: '0.5rem', padding: '0.4rem', background: '#2c2c2c', color: '#fff', border: '1px solid #555' }} />
        <select value={newParent} onChange={(e) => setNewParent(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.4rem', background: '#2c2c2c', color: '#fff', border: '1px solid #555' }}>
          <option value="">Ebeveyn düğüm seç</option>
          {treeData && d3.hierarchy(treeData).descendants().map(d => (
            <option key={d.data.id} value={d.data.id}>{`${d.data.title} (${d.data.id})`}</option>
          ))}
        </select>
        <button onClick={addNote} style={{ padding: '0.5rem', background: '#2196f3', color: '#fff', border: 'none' }}>Ekle</button>
      </div>
      <div style={{ width: '100vw', padding: '1rem', overflowY: 'auto', overflowX: 'hidden' }}>
        <svg ref={svgRef}></svg>
      </div>
    </div>
  )
}

export default TreeView
