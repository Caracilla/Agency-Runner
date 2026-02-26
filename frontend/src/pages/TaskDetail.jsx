import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Check, X, Trash2, Plus, ChevronRight,
  UserPlus, UserMinus, Loader2, Send, RotateCcw, CheckCircle2,
  XCircle, Clock, AlertCircle, MessageSquare, GitBranch,
  CornerDownRight, RotateCcw as ReviseIcon, AlertTriangle, Paperclip
} from 'lucide-react'
import { tasksApi, stagesApi, membersApi, briefsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import MemberAvatar from '../components/MemberAvatar'
import PriorityBadge from '../components/PriorityBadge'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import AttachmentsSection from '../components/AttachmentsSection'

const TABS = [
  { key: 'general', label: 'Genel' },
  { key: 'brief', label: 'Brief' },
  { key: 'stages', label: 'Aşamalar' },
  { key: 'members', label: 'Üyeler' },
  { key: 'files', label: 'Dosyalar', icon: Paperclip },
]

// ─── Genel Tab ────────────────────────────────────────────────────────────────
function GeneralTab({ task, members, allTasks, onUpdate }) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [showSubtaskForm, setShowSubtaskForm] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')

  const startEdit = () => {
    setForm({
      title: task.title, description: task.description || '',
      priority: task.priority, status: task.status,
      current_owner_id: task.current_owner_id || '',
      due_date: task.due_date || '',
      parent_task_id: task.parent_task_id || '',
    })
    setEditing(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await tasksApi.update(task.id, {
        ...form,
        current_owner_id: form.current_owner_id || null,
        parent_task_id: form.parent_task_id || null,
      })
      onUpdate()
      setEditing(false)
    } finally { setSaving(false) }
  }

  const createSubtask = async (e) => {
    e.preventDefault()
    if (!subtaskTitle.trim()) return
    const { data } = await tasksApi.create({ title: subtaskTitle.trim(), priority: 'medium', parent_task_id: task.id })
    setSubtaskTitle('')
    setShowSubtaskForm(false)
    onUpdate()
  }

  // Mevcut görevin alt görevi olabilecek görevleri hariç tut
  const parentCandidates = allTasks.filter(t =>
    t.id !== task.id && t.parent_task_id !== task.id
  )

  if (editing) {
    return (
      <div className="space-y-4">
        <div>
          <label className="label">Başlık *</label>
          <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label className="label">Açıklama</label>
          <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Öncelik</label>
            <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
              <option value="urgent">Acil</option>
            </select>
          </div>
          <div>
            <label className="label">Durum</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="todo">Bekliyor</option>
              <option value="in_progress">Devam Ediyor</option>
              <option value="completed">Tamamlandı</option>
              <option value="blocked">Engellendi</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Görev Sahibi</label>
            <select className="input" value={form.current_owner_id} onChange={e => setForm(f => ({ ...f, current_owner_id: e.target.value }))}>
              <option value="">Seçiniz</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bitiş Tarihi</label>
            <input className="input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Üst Görev (Hiyerarşi)</label>
          <select className="input" value={form.parent_task_id} onChange={e => setForm(f => ({ ...f, parent_task_id: e.target.value }))}>
            <option value="">Bağımsız görev (üst görev yok)</option>
            {parentCandidates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
            <Check size={15} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button onClick={() => setEditing(false)} className="btn-secondary">İptal</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Üst görev breadcrumb */}
      {task.parent_id && (
        <div className="flex items-center gap-2 text-sm">
          <GitBranch size={14} className="text-gray-400" />
          <span className="text-gray-400">Üst Görev:</span>
          <button onClick={() => navigate(`/tasks/${task.parent_id}`)}
            className="text-indigo-600 hover:underline font-medium flex items-center gap-1">
            {task.parent_title}
            <StatusBadge status={task.parent_status} />
          </button>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          {task.description
            ? <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            : <p className="text-gray-400 italic">Açıklama eklenmemiş</p>
          }
        </div>
        <button onClick={startEdit} className="btn-secondary flex items-center gap-1.5 ml-4 flex-shrink-0">
          <Edit2 size={14} /> Düzenle
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoRow label="Öncelik"><PriorityBadge priority={task.priority} /></InfoRow>
        <InfoRow label="Durum"><StatusBadge status={task.status} /></InfoRow>
        <InfoRow label="Şu An Kimde">
          {task.owner_name
            ? <MemberAvatar name={task.owner_name} color={task.owner_color} size="sm" showName />
            : <span className="text-gray-400 text-sm">Atanmamış</span>
          }
        </InfoRow>
        <InfoRow label="Bitiş Tarihi">
          {task.due_date
            ? <span className="text-sm text-gray-700">{new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            : <span className="text-gray-400 text-sm">Belirtilmemiş</span>
          }
        </InfoRow>
      </div>

      {/* Alt görevler */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <CornerDownRight size={16} className="text-gray-400" />
            Alt Görevler
            {task.subtasks?.length > 0 && (
              <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{task.subtasks.length}</span>
            )}
          </h3>
          <button onClick={() => setShowSubtaskForm(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            <Plus size={13} /> Alt Görev Ekle
          </button>
        </div>

        {task.subtasks && task.subtasks.length > 0 && (
          <div className="space-y-2 mb-3">
            {task.subtasks.map(sub => {
              const progress = sub.stage_count > 0
                ? Math.round((sub.completed_stages / sub.stage_count) * 100) : null
              return (
                <button key={sub.id} onClick={() => navigate(`/tasks/${sub.id}`)}
                  className="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-indigo-200 transition-all text-left group">
                  <CornerDownRight size={14} className="text-gray-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 truncate">{sub.title}</p>
                    {progress !== null && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{progress}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={sub.priority} />
                    <StatusBadge status={sub.status} />
                    {sub.owner_name && <MemberAvatar name={sub.owner_name} color={sub.owner_color} size="xs" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {showSubtaskForm && (
          <form onSubmit={createSubtask} className="flex items-center gap-2">
            <input
              className="input flex-1"
              placeholder="Alt görev başlığı..."
              value={subtaskTitle}
              onChange={e => setSubtaskTitle(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={!subtaskTitle.trim()} className="btn-primary">Ekle</button>
            <button type="button" onClick={() => { setShowSubtaskForm(false); setSubtaskTitle('') }} className="btn-secondary">İptal</button>
          </form>
        )}

        {(!task.subtasks || task.subtasks.length === 0) && !showSubtaskForm && (
          <p className="text-sm text-gray-400 text-center py-3 border-2 border-dashed border-gray-100 rounded-xl">
            Henüz alt görev yok
          </p>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, children }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  )
}

// ─── Brief Tab ───────────────────────────────────────────────────────────────
function BriefTab({ taskId, members }) {
  const { currentUser } = useAuth()
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('view')
  const [form, setForm] = useState({})
  const [selectedApprovers, setSelectedApprovers] = useState([])
  const [respondData, setRespondData] = useState({ decision: 'approved', comment: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    briefsApi.getByTask(taskId).then(r => setBrief(r.data)).finally(() => setLoading(false))
  }, [taskId])

  useEffect(() => { load() }, [load])

  const startEdit = () => {
    setForm({
      title: brief?.title || '', description: brief?.description || '',
      objectives: brief?.objectives || '', target_audience: brief?.target_audience || '',
      deliverables: brief?.deliverables || '', budget: brief?.budget || '',
      timeline_notes: brief?.timeline_notes || '', notes: brief?.notes || '',
    })
    setMode('edit')
  }

  const saveBrief = async () => {
    setSaving(true)
    try {
      const { data } = brief
        ? await briefsApi.update(brief.id, form)
        : await briefsApi.create(taskId, { ...form, created_by: currentUser.id })
      setBrief(data)
      setMode('view')
    } finally { setSaving(false) }
  }

  const submitForApproval = async () => {
    if (selectedApprovers.length === 0) return alert('En az bir onaylayıcı seçin')
    setSaving(true)
    try {
      const { data } = await briefsApi.submit(brief.id, selectedApprovers)
      setBrief(data); setMode('view'); setSelectedApprovers([])
    } finally { setSaving(false) }
  }

  const handleRespond = async () => {
    setSaving(true)
    try {
      const { data } = await briefsApi.respond(brief.id, { approverId: currentUser.id, ...respondData })
      setBrief(data); setMode('view')
    } finally { setSaving(false) }
  }

  const handleRevise = async () => {
    setSaving(true)
    try {
      const { data } = await briefsApi.revise(brief.id)
      setBrief(data); startEdit()
    } finally { setSaving(false) }
  }

  const myApproval = brief?.approvals?.find(a => a.approver_id === currentUser?.id)
  const canRespond = brief?.status === 'pending' && myApproval?.status === 'pending'

  const briefStatusConfig = {
    draft:    { label: 'Taslak', cls: 'bg-gray-100 text-gray-600 border border-gray-200', icon: Edit2 },
    pending:  { label: 'Onay Bekliyor', cls: 'bg-amber-100 text-amber-700 border border-amber-200', icon: Clock },
    approved: { label: 'Onaylandı', cls: 'bg-green-100 text-green-700 border border-green-200', icon: CheckCircle2 },
    rejected: { label: 'Reddedildi', cls: 'bg-red-100 text-red-700 border border-red-200', icon: XCircle },
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>

  const BRIEF_FIELDS = [
    { field: 'title', label: 'Brief Başlığı *', type: 'input', placeholder: 'Brief başlığı...' },
    { field: 'description', label: 'Genel Açıklama', type: 'textarea', placeholder: 'Proje/görev hakkında genel bilgi...' },
    { field: 'objectives', label: 'Hedefler', type: 'textarea', placeholder: 'Bu görevle ne elde edilmek isteniyor?' },
    { field: 'target_audience', label: 'Hedef Kitle', type: 'textarea', placeholder: 'Bu çalışma kime yönelik?' },
    { field: 'deliverables', label: 'Teslim Edilecekler', type: 'textarea', placeholder: 'Çalışma sonunda ne teslim edilecek?' },
    { field: 'budget', label: 'Bütçe', type: 'input', placeholder: 'Bütçe bilgisi...' },
    { field: 'timeline_notes', label: 'Zaman Çizelgesi', type: 'textarea', placeholder: 'Önemli tarihler, milestone\'lar...' },
    { field: 'notes', label: 'Ek Notlar', type: 'textarea', placeholder: 'Varsa ek bilgiler...' },
  ]

  if (mode === 'edit') {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">{brief ? 'Brief Düzenle' : 'Brief Oluştur'}</h3>
        {BRIEF_FIELDS.map(({ field, label, type, placeholder }) => (
          <div key={field}>
            <label className="label">{label}</label>
            {type === 'input'
              ? <input className="input" placeholder={placeholder} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
              : <textarea className="input resize-none" rows={3} placeholder={placeholder} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
            }
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <button onClick={saveBrief} disabled={saving || !form.title.trim()} className="btn-primary flex items-center gap-2">
            <Check size={15} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button onClick={() => setMode('view')} className="btn-secondary">İptal</button>
        </div>
      </div>
    )
  }

  if (mode === 'submit') {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Onaylayıcıları Seçin</h3>
        <p className="text-sm text-gray-500">Tüm onaylayıcılar onaylarsa brief onaylanmış sayılır.</p>
        <div className="space-y-2">
          {members.filter(m => m.id !== currentUser?.id).map(m => (
            <label key={m.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={selectedApprovers.includes(m.id)}
                onChange={() => setSelectedApprovers(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <MemberAvatar name={m.name} color={m.avatar_color} size="sm" showName />
              {m.role && <span className="text-xs text-gray-400 ml-1">— {m.role}</span>}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={submitForApproval} disabled={saving || selectedApprovers.length === 0} className="btn-primary flex items-center gap-2">
            <Send size={15} /> {saving ? 'Gönderiliyor...' : `Onaya Gönder (${selectedApprovers.length})`}
          </button>
          <button onClick={() => setMode('view')} className="btn-secondary">İptal</button>
        </div>
      </div>
    )
  }

  if (!brief) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 mb-4">Bu görev için henüz brief oluşturulmadı.</p>
        <button onClick={startEdit} className="btn-primary flex items-center gap-2 mx-auto">
          <Plus size={15} /> Brief Oluştur
        </button>
      </div>
    )
  }

  const sc = briefStatusConfig[brief.status]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${sc.cls}`}>
            <sc.icon size={14} /> {sc.label}
          </span>
          {brief.creator_name && <span className="text-sm text-gray-500">{brief.creator_name} tarafından</span>}
        </div>
        <div className="flex gap-2">
          {(brief.status === 'draft' || brief.status === 'rejected') && (
            <button onClick={startEdit} className="btn-secondary flex items-center gap-1.5"><Edit2 size={14} /> Düzenle</button>
          )}
          {brief.status === 'draft' && (
            <button onClick={() => setMode('submit')} className="btn-primary flex items-center gap-2"><Send size={14} /> Onaya Gönder</button>
          )}
          {brief.status === 'rejected' && (
            <button onClick={handleRevise} disabled={saving} className="btn-primary flex items-center gap-2"><RotateCcw size={14} /> Revize Et</button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{brief.title}</h2>
        {[
          { label: 'Genel Açıklama', val: brief.description },
          { label: 'Hedefler', val: brief.objectives },
          { label: 'Hedef Kitle', val: brief.target_audience },
          { label: 'Teslim Edilecekler', val: brief.deliverables },
          { label: 'Bütçe', val: brief.budget },
          { label: 'Zaman Çizelgesi', val: brief.timeline_notes },
          { label: 'Ek Notlar', val: brief.notes },
        ].filter(f => f.val).map(({ label, val }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{val}</p>
          </div>
        ))}
      </div>

      {brief.approvals?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Onay Durumu</h3>
          <div className="space-y-2">
            {brief.approvals.map(a => {
              const statusIcon = {
                pending: <Clock size={16} className="text-amber-500" />,
                approved: <CheckCircle2 size={16} className="text-green-500" />,
                rejected: <XCircle size={16} className="text-red-500" />,
              }[a.status]
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl">
                  <MemberAvatar name={a.approver_name} color={a.approver_color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{a.approver_name}</span>
                      {statusIcon}
                      <span className={`text-xs font-medium ${{ pending: 'text-amber-600', approved: 'text-green-600', rejected: 'text-red-600' }[a.status]}`}>
                        {{ pending: 'Bekleniyor', approved: 'Onayladı', rejected: 'Reddetti' }[a.status]}
                      </span>
                    </div>
                    {a.comment && (
                      <div className="flex items-start gap-1.5 mt-1.5">
                        <MessageSquare size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-600">{a.comment}</p>
                      </div>
                    )}
                  </div>
                  {a.responded_at && <span className="text-xs text-gray-400 flex-shrink-0">{new Date(a.responded_at).toLocaleDateString('tr-TR')}</span>}
                </div>
              )
            })}
          </div>

          {canRespond && (
            <div className="mt-4 p-4 border-2 border-indigo-100 rounded-xl bg-indigo-50">
              <p className="font-medium text-indigo-800 text-sm mb-3">Kararınızı bildirin</p>
              <div className="space-y-3">
                <div className="flex gap-3">
                  {['approved', 'rejected'].map(d => (
                    <label key={d} className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      respondData.decision === d
                        ? d === 'approved' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="decision" value={d} checked={respondData.decision === d} onChange={() => setRespondData(r => ({ ...r, decision: d }))} className="hidden" />
                      {d === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {d === 'approved' ? 'Onayla' : 'Reddet'}
                    </label>
                  ))}
                </div>
                <textarea className="input resize-none" rows={2} placeholder="Yorum (opsiyonel)..." value={respondData.comment} onChange={e => setRespondData(d => ({ ...d, comment: e.target.value }))} />
                <button onClick={handleRespond} disabled={saving} className="btn-primary w-full">{saving ? 'Kaydediliyor...' : 'Kararı Gönder'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Aşamalar Tab (Revize sistemi dahil) ─────────────────────────────────────
function StagesTab({ task, members, onUpdate }) {
  const { currentUser } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', assignee_id: '' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [reviseModal, setReviseModal] = useState(null) // stage object being revised
  const [reviseForm, setReviseForm] = useState({ toStageId: '', comment: '' })

  const stages = task.stages || []
  const completedStages = stages.filter(s => s.status === 'completed')

  const addStage = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await tasksApi.addStage(task.id, { ...form, assignee_id: form.assignee_id || null })
      onUpdate(); setForm({ title: '', description: '', assignee_id: '' }); setShowAdd(false)
    } finally { setSaving(false) }
  }

  const complete = async (stageId) => { await stagesApi.complete(stageId); onUpdate() }
  const start = async (stageId) => { await stagesApi.start(stageId); onUpdate() }
  const deleteStage = async (stageId) => {
    if (!confirm('Bu aşama silinsin mi?')) return
    await stagesApi.delete(stageId); onUpdate()
  }
  const saveEdit = async (stageId) => {
    setSaving(true)
    try {
      await stagesApi.update(stageId, { ...editForm, assignee_id: editForm.assignee_id || null })
      onUpdate(); setEditingId(null)
    } finally { setSaving(false) }
  }

  const submitRevise = async () => {
    if (!reviseForm.comment.trim()) return alert('Revize gerekçesi zorunludur')
    setSaving(true)
    try {
      await stagesApi.requestRevision(reviseModal.id, {
        toStageId: reviseForm.toStageId ? Number(reviseForm.toStageId) : null,
        comment: reviseForm.comment,
        requestedBy: currentUser?.id,
      })
      onUpdate()
      setReviseModal(null)
      setReviseForm({ toStageId: '', comment: '' })
    } finally { setSaving(false) }
  }

  const statusConfig = {
    pending:   { label: 'Bekliyor', cls: 'bg-gray-100 text-gray-500' },
    active:    { label: 'Aktif', cls: 'bg-indigo-100 text-indigo-700' },
    completed: { label: 'Tamamlandı', cls: 'bg-green-100 text-green-700' },
  }

  return (
    <div className="space-y-4">
      {/* Pipeline görselleştirmesi */}
      {stages.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2">
          {stages.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                s.status === 'active' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' :
                s.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {s.status === 'completed' ? <Check size={12} /> : <span>{i + 1}</span>}
                <span className="max-w-24 truncate">{s.title}</span>
                {s.revision_count > 0 && (
                  <span className="bg-orange-200 text-orange-700 text-xs px-1 rounded-full">{s.revision_count}×</span>
                )}
                {s.assignee_name && <MemberAvatar name={s.assignee_name} color={s.assignee_color} size="xs" />}
              </div>
              {i < stages.length - 1 && (
                <ChevronRight size={16} className={s.status === 'completed' ? 'text-green-400' : 'text-gray-300'} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Aşama listesi */}
      <div className="space-y-3">
        {stages.map((s, i) => {
          const sc = statusConfig[s.status]
          const isEditing = editingId === s.id

          if (isEditing) {
            return (
              <div key={s.id} className="border-2 border-indigo-300 rounded-xl p-4 space-y-3">
                <input className="input" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                <textarea className="input resize-none" rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                <select className="input" value={editForm.assignee_id} onChange={e => setEditForm(f => ({ ...f, assignee_id: e.target.value }))}>
                  <option value="">Sorumlu seçin</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(s.id)} disabled={saving} className="btn-primary text-sm">Kaydet</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary text-sm">İptal</button>
                </div>
              </div>
            )
          }

          return (
            <div key={s.id} className={`rounded-xl border-2 p-4 transition-all ${
              s.status === 'active' ? 'border-indigo-200 bg-indigo-50' :
              s.status === 'completed' ? 'border-green-100 bg-green-50/50' : 'border-gray-100 bg-white'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                  s.status === 'completed' ? 'bg-green-500 text-white' :
                  s.status === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {s.status === 'completed' ? <Check size={16} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-medium text-gray-900">{s.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                    {s.revision_count > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium flex items-center gap-1">
                        <AlertTriangle size={10} /> {s.revision_count} revize
                      </span>
                    )}
                  </div>
                  {s.description && <p className="text-sm text-gray-500 mb-2">{s.description}</p>}
                  {s.assignee_name && <MemberAvatar name={s.assignee_name} color={s.assignee_color} size="xs" showName className="mt-1" />}
                  {s.completed_at && (
                    <p className="text-xs text-green-600 mt-1">{new Date(s.completed_at).toLocaleDateString('tr-TR')} tarihinde tamamlandı</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  {s.status === 'pending' && (
                    <button onClick={() => start(s.id)} className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
                      Başlat
                    </button>
                  )}
                  {s.status === 'active' && (
                    <>
                      <button onClick={() => complete(s.id)} className="text-xs bg-green-500 text-white hover:bg-green-600 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1">
                        <Check size={12} /> Tamamla
                      </button>
                      <button
                        onClick={() => { setReviseModal(s); setReviseForm({ toStageId: '', comment: '' }) }}
                        className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                      >
                        <ReviseIcon size={12} /> Revize İste
                      </button>
                    </>
                  )}
                  {s.status !== 'completed' && (
                    <button onClick={() => { setEditingId(s.id); setEditForm({ title: s.title, description: s.description || '', assignee_id: s.assignee_id || '' }) }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit2 size={14} className="text-gray-400" />
                    </button>
                  )}
                  <button onClick={() => deleteStage(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} className="text-gray-300 hover:text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Aşama ekle */}
      {showAdd ? (
        <form onSubmit={addStage} className="border-2 border-dashed border-indigo-300 rounded-xl p-4 space-y-3">
          <input className="input" placeholder="Aşama adı *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          <textarea className="input resize-none" rows={2} placeholder="Açıklama (opsiyonel)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <select className="input" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
            <option value="">Sorumlu kişi seçin</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm">Aşama Ekle</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">İptal</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowAdd(true)} className="w-full border-2 border-dashed border-gray-200 rounded-xl p-3 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2 text-sm">
          <Plus size={16} /> Aşama Ekle
        </button>
      )}

      {/* Revize Modal */}
      <Modal open={!!reviseModal} onClose={() => setReviseModal(null)} title="Revize İste" size="md">
        {reviseModal && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-800">
              <strong>"{reviseModal.title}"</strong> aşaması önceki bir aşamaya geri gönderilecek. Seçtiğiniz aşama yeniden aktive olur.
            </div>
            <div>
              <label className="label">Hangi aşamaya geri gönderilsin?</label>
              <select className="input" value={reviseForm.toStageId} onChange={e => setReviseForm(f => ({ ...f, toStageId: e.target.value }))}>
                <option value="">Aynı aşama (tekrar başlasın)</option>
                {completedStages
                  .filter(s => s.order_index < reviseModal.order_index)
                  .map(s => <option key={s.id} value={s.id}>{s.title} {s.assignee_name ? `(${s.assignee_name})` : ''}</option>)
                }
              </select>
            </div>
            <div>
              <label className="label">Revize Gerekçesi *</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Neden revize isteniyor? Ne düzeltilmeli?"
                value={reviseForm.comment}
                onChange={e => setReviseForm(f => ({ ...f, comment: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={submitRevise} disabled={saving || !reviseForm.comment.trim()} className="btn-primary flex items-center gap-2 flex-1">
                <ReviseIcon size={15} /> {saving ? 'Gönderiliyor...' : 'Revize Gönder'}
              </button>
              <button onClick={() => setReviseModal(null)} className="btn-secondary">İptal</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── Üyeler Tab ──────────────────────────────────────────────────────────────
function MembersTab({ task, members, onUpdate }) {
  const taskMemberIds = new Set(task.members?.map(m => m.id) || [])
  const [adding, setAdding] = useState(false)

  const addMember = async (memberId) => { await tasksApi.addMember(task.id, memberId); onUpdate() }
  const removeMember = async (memberId) => {
    if (!confirm('Bu üye görevden çıkarılsın mı?')) return
    await tasksApi.removeMember(task.id, memberId); onUpdate()
  }

  const available = members.filter(m => !taskMemberIds.has(m.id))

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {task.members?.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
            <MemberAvatar name={m.name} color={m.avatar_color} size="md" />
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{m.name}</p>
              {m.role && <p className="text-xs text-gray-500">{m.role}</p>}
            </div>
            {task.current_owner_id === m.id && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Sorumlu</span>
            )}
            <button onClick={() => removeMember(m.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
              <UserMinus size={15} className="text-gray-300 hover:text-red-500" />
            </button>
          </div>
        ))}
        {(!task.members || task.members.length === 0) && (
          <p className="text-gray-400 text-sm text-center py-4">Henüz üye eklenmemiş</p>
        )}
      </div>
      {available.length > 0 && (
        <div>
          {!adding ? (
            <button onClick={() => setAdding(true)} className="w-full border-2 border-dashed border-gray-200 rounded-xl p-3 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2 text-sm">
              <UserPlus size={16} /> Üye Ekle
            </button>
          ) : (
            <div className="border-2 border-dashed border-indigo-300 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Eklenecek üyeyi seçin</p>
              <div className="space-y-2">
                {available.map(m => (
                  <button key={m.id} onClick={() => { addMember(m.id); setAdding(false) }}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-indigo-50 rounded-xl transition-colors text-left">
                    <MemberAvatar name={m.name} color={m.avatar_color} size="sm" />
                    <div><p className="text-sm font-medium text-gray-900">{m.name}</p>{m.role && <p className="text-xs text-gray-500">{m.role}</p>}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setAdding(false)} className="mt-3 text-sm text-gray-400 hover:text-gray-600">İptal</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Ana TaskDetail ───────────────────────────────────────────────────────────
export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [members, setMembers] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(true)

  const loadTask = useCallback(() => {
    Promise.all([tasksApi.getById(id), membersApi.getAll(), tasksApi.getAll()])
      .then(([tRes, mRes, allRes]) => {
        setTask(tRes.data)
        setMembers(mRes.data)
        setAllTasks(allRes.data)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadTask() }, [loadTask])

  const deleteTask = async () => {
    if (!confirm('Bu görev kalıcı olarak silinsin mi?')) return
    await tasksApi.delete(id)
    navigate('/tasks')
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
  if (!task) return <div className="p-8 text-gray-500">Görev bulunamadı.</div>

  const stageProgress = task.stages?.length > 0
    ? Math.round((task.stages.filter(s => s.status === 'completed').length / task.stages.length) * 100)
    : null

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors mt-0.5">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            {stageProgress !== null && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{stageProgress}% tamamlandı</span>
            )}
            {task.subtasks?.length > 0 && (
              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <GitBranch size={10} /> {task.subtasks.length} alt görev
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
          {task.owner_name && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Şu an:</span>
              <MemberAvatar name={task.owner_name} color={task.owner_color} size="xs" showName />
            </div>
          )}
        </div>
        <button onClick={deleteTask} className="p-2 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0">
          <Trash2 size={18} className="text-gray-300 hover:text-red-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-0.5 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.icon && <tab.icon size={13} />}
            {tab.label}
            {tab.key === 'stages' && task.stages?.length > 0 && <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{task.stages.length}</span>}
            {tab.key === 'members' && task.members?.length > 0 && <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{task.members.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab içeriği */}
      <div className="card p-6">
        {activeTab === 'general' && <GeneralTab task={task} members={members} allTasks={allTasks} onUpdate={loadTask} />}
        {activeTab === 'brief' && <BriefTab taskId={id} members={members} />}
        {activeTab === 'stages' && <StagesTab task={task} members={members} onUpdate={loadTask} />}
        {activeTab === 'members' && <MembersTab task={task} members={members} onUpdate={loadTask} />}
        {activeTab === 'files' && <AttachmentsSection taskId={id} />}
      </div>
    </div>
  )
}
