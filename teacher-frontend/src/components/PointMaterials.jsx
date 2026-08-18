import { useCallback, useEffect, useState } from 'react'
import {
  createPointMaterial, deletePointMaterial, getPointMaterials, getRouteMediaUrl,
  updatePointMaterial, uploadPointMaterial,
} from '../api/route.js'

const emptyDraft = { title: '', description: '', material_type: 'text', external_url: '', file: null }
const materialLabels = { text: '文字资料', file: '文件资料', link: '外部链接' }
const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.webp']
const MAX_FILE_SIZE = 20 * 1024 * 1024

function requestMessage(error, fallback) {
  const detail = error?.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}

export function formatFileSize(value) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes < 0) return '大小未知'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getFileCategory(material) {
  const name = String(material?.file_name || material?.file_url || '').toLowerCase()
  if (name.endsWith('.pdf')) return 'PDF'
  if (/\.docx?$/.test(name)) return 'Word'
  if (/\.pptx?$/.test(name)) return 'PPT'
  if (/\.(jpe?g|png|webp)$/.test(name)) return '图片'
  return '文件'
}

export default function PointMaterials({ pointId }) {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [saving, setSaving] = useState(false)

  const loadMaterials = useCallback(async () => {
    if (!pointId) return
    setLoading(true); setError('')
    try {
      const data = await getPointMaterials(pointId)
      setMaterials(Array.isArray(data?.items) ? data.items : [])
    } catch (requestError) {
      setError(requestMessage(requestError, '学习资料加载失败，请重试'))
    } finally { setLoading(false) }
  }, [pointId])

  useEffect(() => {
    setMaterials([]); setEditorOpen(false); setEditingMaterial(null); setDraft(emptyDraft); setNotice(''); setError('')
    loadMaterials()
  }, [loadMaterials])

  function openCreate() {
    setEditingMaterial(null); setDraft(emptyDraft); setEditorOpen(true); setError(''); setNotice('')
  }

  function openEdit(material) {
    setEditingMaterial(material)
    setDraft({ title: material.title || '', description: material.description || '', material_type: material.material_type, external_url: material.external_url || '', file: null })
    setEditorOpen(true); setError(''); setNotice('')
  }

  function closeEditor() {
    if (saving) return
    setEditorOpen(false); setEditingMaterial(null); setDraft(emptyDraft); setError('')
  }

  async function saveMaterial() {
    const title = draft.title.trim()
    const description = draft.description.trim()
    if (!title) { setError('资料标题不能为空'); return }
    if (draft.material_type === 'link' && !/^https?:\/\//i.test(draft.external_url.trim())) { setError('请输入以 http:// 或 https:// 开头的外部链接'); return }
    if (!editingMaterial && draft.material_type === 'file') {
      if (!draft.file) { setError('请选择需要上传的文件'); return }
      const extension = `.${draft.file.name.split('.').pop()?.toLowerCase()}`
      if (!allowedExtensions.includes(extension)) { setError('仅支持 PDF、Word、PPT、JPG、PNG 或 WebP 文件'); return }
      if (draft.file.size > MAX_FILE_SIZE) { setError('文件不能超过 20MB'); return }
    }
    setSaving(true); setError(''); setNotice('')
    try {
      if (editingMaterial) {
        await updatePointMaterial(editingMaterial.id, {
          title, description,
          ...(editingMaterial.material_type === 'link' ? { external_url: draft.external_url.trim() } : {}),
        })
      } else if (draft.material_type === 'file') {
        await uploadPointMaterial(pointId, { title, description, file: draft.file })
      } else {
        await createPointMaterial(pointId, {
          title, description, material_type: draft.material_type,
          ...(draft.material_type === 'link' ? { external_url: draft.external_url.trim() } : {}),
        })
      }
      await loadMaterials()
      setEditorOpen(false); setEditingMaterial(null); setDraft(emptyDraft)
      setNotice(editingMaterial ? '学习资料已更新' : '学习资料已添加')
    } catch (requestError) {
      setError(requestMessage(requestError, draft.material_type === 'file' ? '学习资料上传失败，请重试' : '学习资料保存失败，请重试'))
    } finally { setSaving(false) }
  }

  async function removeMaterial(material) {
    if (!window.confirm('确定删除该学习资料吗？')) return
    setSaving(true); setError(''); setNotice('')
    try {
      await deletePointMaterial(material.id)
      setMaterials((items) => items.filter((item) => item.id !== material.id))
      if (editingMaterial?.id === material.id) { setEditorOpen(false); setEditingMaterial(null); setDraft(emptyDraft) }
      setNotice('学习资料已删除')
    } catch (requestError) {
      setError(requestMessage(requestError, '学习资料删除失败，请重试'))
    } finally { setSaving(false) }
  }

  if (!pointId) return <section className="point-materials"><div className="point-materials__heading"><span>学习资料</span></div><p className="point-materials__disabled">请先保存观察点后添加学习资料</p></section>

  return <section className="point-materials">
    <div className="point-materials__heading"><span>学习资料</span><button type="button" onClick={openCreate} disabled={saving}>+ 添加学习资料</button></div>
    {error && <p className="point-materials__feedback is-error" role="alert">{error}</p>}
    {notice && <p className="point-materials__feedback is-success" role="status">{notice}</p>}
    {loading ? <p className="point-materials__status">正在加载学习资料...</p> : materials.length === 0 ? <p className="point-materials__status">暂无学习资料</p> : <div className="point-material-list">{materials.map((material) => {
      const fileCategory = material.material_type === 'file' ? getFileCategory(material) : ''
      return <article key={material.id} className="point-material-card"><div className="point-material-card__title"><i aria-hidden="true">{material.material_type === 'file' ? '📄' : material.material_type === 'link' ? '🔗' : '📝'}</i><div><strong>{material.title}</strong><small>{material.material_type === 'file' ? `${fileCategory} · ${formatFileSize(material.file_size)}` : materialLabels[material.material_type] || material.material_type}</small></div></div>{material.description && <p>{material.description}</p>}{material.material_type === 'file' && material.file_name && <span className="point-material-card__filename">{material.file_name}</span>}<div className="point-material-card__actions">{material.material_type === 'file' && material.file_url && <a href={getRouteMediaUrl(material.file_url)} target="_blank" rel="noreferrer">查看文件</a>}{material.material_type === 'link' && material.external_url && <a href={material.external_url} target="_blank" rel="noreferrer">打开链接</a>}<button type="button" onClick={() => openEdit(material)}>编辑</button><button type="button" className="is-danger" disabled={saving} onClick={() => removeMaterial(material)}>删除</button></div></article>
    })}</div>}
    {editorOpen && <div className="point-material-editor"><div className="point-material-editor__heading"><strong>{editingMaterial ? '编辑学习资料' : '添加学习资料'}</strong><button type="button" onClick={closeEditor}>关闭</button></div>{!editingMaterial && <label><span>资料类型</span><select value={draft.material_type} onChange={(event) => setDraft((current) => ({ ...current, material_type: event.target.value, file: null }))}><option value="text">文字</option><option value="file">文件</option><option value="link">链接</option></select></label>}<label><span>资料标题</span><input value={draft.title} maxLength="255" onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label><label><span>{draft.material_type === 'text' ? '资料说明 / 正文' : '资料说明'}</span><textarea rows="4" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>{draft.material_type === 'link' && <label><span>外部链接</span><input type="url" placeholder="https://" value={draft.external_url} onChange={(event) => setDraft((current) => ({ ...current, external_url: event.target.value }))} /></label>}{!editingMaterial && draft.material_type === 'file' && <label><span>选择文件</span><input type="file" accept={allowedExtensions.join(',')} onChange={(event) => setDraft((current) => ({ ...current, file: event.target.files?.[0] || null }))} /><small>支持 PDF、Word、PPT 和图片，最大 20MB</small></label>}{editingMaterial?.material_type === 'file' && <p className="point-material-editor__hint">如需更换文件，请删除后重新上传。</p>}<div className="point-material-editor__actions"><button type="button" className="secondary-button" onClick={closeEditor} disabled={saving}>取消</button><button type="button" className="primary-button" onClick={saveMaterial} disabled={saving}>{saving ? (draft.material_type === 'file' && !editingMaterial ? '上传中...' : '保存中...') : '保存资料'}</button></div></div>}
  </section>
}
