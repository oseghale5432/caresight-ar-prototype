import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Edit, AlertCircle, Save, Key, LineChart, Shield, Upload, Image as ImageIcon, Pill, HelpCircle, Settings, PlusCircle } from 'lucide-react';
import contentLibrary from '../data/contentLibrary.json';

const AdminPanel = ({ sessionLogs, onClearLogs, onLogEvent }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [library, setLibrary] = useState(contentLibrary);
  const [openaiKey, setOpenaiKey] = useState('');
  
  // Modals editing states
  const [editingItem, setEditingItem] = useState(null);
  const [editingMed, setEditingMed] = useState(null);
  const [editingFAQ, setEditingFAQ] = useState(null);

  // 1. Equipment Form State
  const [newEqName, setNewEqName] = useState('');
  const [newEqDesc, setNewEqDesc] = useState('');
  const [newEqSafety, setNewEqSafety] = useState('');
  const [newEqCategory, setNewEqCategory] = useState('Equipment');
  const [newEqInst, setNewEqInst] = useState('');
  const [newEqSnap, setNewEqSnap] = useState('');

  // 2. Medication Form State
  const [newMedName, setNewMedName] = useState('');
  const [newMedPurpose, setNewMedPurpose] = useState('');
  const [newMedSideEffects, setNewMedSideEffects] = useState('');
  const [newMedInst, setNewMedInst] = useState('');

  // 3. FAQ Form State
  const [newFAQQuestion, setNewFAQQuestion] = useState('');
  const [newFAQAnswer, setNewFAQAnswer] = useState('');

  // 4. Room & AI Settings State
  const [hospitalName, setHospitalName] = useState(contentLibrary.hospitalName);
  const [roomNumber, setRoomNumber] = useState(contentLibrary.roomNumber);
  const [systemPrompt, setSystemPrompt] = useState(contentLibrary.aiGuidelines.systemPrompt);
  const [escalationKeywords, setEscalationKeywords] = useState(contentLibrary.aiGuidelines.escalationKeywords.join(', '));

  // Load configuration from local storage
  useEffect(() => {
    const savedLibrary = localStorage.getItem('caresight_library');
    if (savedLibrary) {
      const parsed = JSON.parse(savedLibrary);
      setLibrary(parsed);
      setHospitalName(parsed.hospitalName || contentLibrary.hospitalName);
      setRoomNumber(parsed.roomNumber || contentLibrary.roomNumber);
      if (parsed.aiGuidelines) {
        setSystemPrompt(parsed.aiGuidelines.systemPrompt || contentLibrary.aiGuidelines.systemPrompt);
        setEscalationKeywords(parsed.aiGuidelines.escalationKeywords?.join(', ') || contentLibrary.aiGuidelines.escalationKeywords.join(', '));
      }
    }
    const savedKey = localStorage.getItem('caresight_openai_key');
    if (savedKey) {
      setOpenaiKey(savedKey);
    }
  }, []);

  const saveLibraryToLocalStorage = (updatedLib) => {
    localStorage.setItem('caresight_library', JSON.stringify(updatedLib));
    setLibrary(updatedLib);
    onLogEvent('admin_modified_content', { time: Date.now() });
  };

  // Convert uploaded image file to Base64
  const handleImageFileChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditingItem(prev => ({ ...prev, adminSnap: reader.result }));
        } else {
          setNewEqSnap(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- 1. EQUIPMENT ACTIONS ---
  const handleAddEquipment = (e) => {
    e.preventDefault();
    if (!newEqName || !newEqDesc) return;

    const newId = newEqName.toLowerCase().replace(/\s+/g, '-');
    const instructionsArray = newEqInst.split('\n').filter(line => line.trim().length > 0);
    
    const newItem = {
      id: newId,
      name: newEqName,
      category: newEqCategory,
      description: newEqDesc,
      safetyNote: newEqSafety,
      instructions: instructionsArray.length > 0 ? instructionsArray : ["Approved hospital bedside device."],
      escalationGuidance: "Please alert nursing staff if any issue arises with this equipment.",
      adminSnap: newEqSnap
    };

    const updatedLib = { ...library, equipment: [...library.equipment, newItem] };
    saveLibraryToLocalStorage(updatedLib);
    
    setNewEqName('');
    setNewEqDesc('');
    setNewEqSafety('');
    setNewEqInst('');
    setNewEqSnap('');
  };

  const handleDeleteEquipment = (id) => {
    if (confirm("Are you sure you want to delete this equipment?")) {
      const updatedLib = { ...library, equipment: library.equipment.filter(e => e.id !== id) };
      saveLibraryToLocalStorage(updatedLib);
    }
  };

  const handleSaveEditItem = () => {
    const updatedEq = library.equipment.map(e => e.id === editingItem.id ? editingItem : e);
    const updatedLib = { ...library, equipment: updatedEq };
    saveLibraryToLocalStorage(updatedLib);
    setEditingItem(null);
  };

  // --- 2. MEDICATION ACTIONS ---
  const handleAddMedication = (e) => {
    e.preventDefault();
    if (!newMedName || !newMedPurpose) return;

    const newId = newMedName.toLowerCase().replace(/\s+/g, '-');
    const newMed = {
      id: newId,
      name: newMedName,
      purpose: newMedPurpose,
      sideEffects: newMedSideEffects || "None reported.",
      instructions: newMedInst || "Take as directed by clinical staff."
    };

    const updatedLib = { ...library, medicationFAQs: [...(library.medicationFAQs || []), newMed] };
    saveLibraryToLocalStorage(updatedLib);

    setNewMedName('');
    setNewMedPurpose('');
    setNewMedSideEffects('');
    setNewMedInst('');
  };

  const handleDeleteMedication = (id) => {
    if (confirm("Are you sure you want to delete this medication?")) {
      const updatedLib = { ...library, medicationFAQs: library.medicationFAQs.filter(m => m.id !== id) };
      saveLibraryToLocalStorage(updatedLib);
    }
  };

  const handleSaveEditMed = () => {
    const updatedMeds = library.medicationFAQs.map(m => m.id === editingMed.id ? editingMed : m);
    const updatedLib = { ...library, medicationFAQs: updatedMeds };
    saveLibraryToLocalStorage(updatedLib);
    setEditingMed(null);
  };

  // --- 3. FAQ ACTIONS ---
  const handleAddFAQ = (e) => {
    e.preventDefault();
    if (!newFAQQuestion || !newFAQAnswer) return;

    const newFAQ = {
      question: newFAQQuestion,
      answer: newFAQAnswer
    };

    const updatedLib = { ...library, faq: [...library.faq, newFAQ] };
    saveLibraryToLocalStorage(updatedLib);

    setNewFAQQuestion('');
    setNewFAQAnswer('');
  };

  const handleDeleteFAQ = (question) => {
    if (confirm("Are you sure you want to delete this FAQ?")) {
      const updatedLib = { ...library, faq: library.faq.filter(f => f.question !== question) };
      saveLibraryToLocalStorage(updatedLib);
    }
  };

  const handleSaveEditFAQ = () => {
    const updatedFAQ = library.faq.map((f, index) => index === editingFAQ.index ? { question: editingFAQ.question, answer: editingFAQ.answer } : f);
    const updatedLib = { ...library, faq: updatedFAQ };
    saveLibraryToLocalStorage(updatedLib);
    setEditingFAQ(null);
  };

  // --- 4. GENERAL CONFIGURATION & AI RULES ---
  const handleSaveSettings = () => {
    const kwArray = escalationKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const updatedLib = {
      ...library,
      hospitalName,
      roomNumber,
      aiGuidelines: {
        systemPrompt,
        escalationKeywords: kwArray
      }
    };
    saveLibraryToLocalStorage(updatedLib);
    localStorage.setItem('caresight_openai_key', openaiKey);
    alert('Hospital Configuration & AI Rules saved successfully!');
    onLogEvent('admin_modified_settings', { hospitalName, roomNumber });
  };

  // Metrics
  const scanCount = sessionLogs.filter(l => l.event === 'object_viewed').length;
  const questionCount = sessionLogs.filter(l => l.event.includes('ai_query')).length;
  const escalationCount = sessionLogs.filter(l => l.event === 'ai_query_escalated').length;

  return (
    <div className="admin-container">
      {/* Sidebar Nav */}
      <div className="admin-sidebar">
        <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', paddingLeft: '16px', marginBottom: '16px' }}>
          Management Console
        </h3>
        <div className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <LineChart size={16} /> Overview
        </div>
        <div className={`admin-nav-item ${activeTab === 'equipment' ? 'active' : ''}`} onClick={() => setActiveTab('equipment')}>
          <Database size={16} /> Bedside Equipment
        </div>
        <div className={`admin-nav-item ${activeTab === 'meds-faqs' ? 'active' : ''}`} onClick={() => setActiveTab('meds-faqs')}>
          <Pill size={16} /> Meds & Room FAQs
        </div>
        <div className={`admin-nav-item ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
          <Settings size={16} /> Hospital & AI Safety
        </div>
        <div className={`admin-nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
          <Shield size={16} /> Activity Audit Logs
        </div>
      </div>

      {/* Main Body */}
      <div className="admin-body">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div className="admin-title-row">
              <h2>Dashboard Overview</h2>
            </div>
            <div className="admin-stats-grid">
              <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                <div className="stat-header">Total Scannable Equipment</div>
                <div className="stat-value">{library.equipment.length}</div>
              </div>
              <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-secondary)' }}>
                <div className="stat-header">Total AR Pin Scans</div>
                <div className="stat-value">{scanCount}</div>
              </div>
              <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
                <div className="stat-header">Total Patient Questions</div>
                <div className="stat-value">{questionCount}</div>
              </div>
              <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                <div className="stat-header">Clinical Escalations Triggered</div>
                <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{escalationCount}</div>
              </div>
            </div>

            <h3 style={{ marginBottom: '16px' }}>Recent Activity Logs</h3>
            <div className="glass-panel" style={{ padding: '20px', maxHeight: '350px', overflowY: 'auto' }}>
              {sessionLogs.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', textAlign: 'center', padding: '24px' }}>
                  No recent activities logged.
                </div>
              ) : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                  {sessionLogs.slice().reverse().map((log, index) => (
                    <li key={index} style={{ 
                      paddingBottom: '12px', 
                      borderBottom: '1px solid var(--glass-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <strong style={{ color: log.event === 'ai_query_escalated' ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                          {log.event.toUpperCase()}
                        </strong>
                        <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>
                          {JSON.stringify(log.meta)}
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SCANNABLE BEDSIDE EQUIPMENT */}
        {activeTab === 'equipment' && (
          <div>
            <div className="admin-title-row">
              <h2>Bedside Equipment</h2>
            </div>
            
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Equipment Name</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {library.equipment.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#1a2233', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.adminSnap ? (
                            <img src={item.adminSnap} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <ImageIcon size={16} color="var(--text-tertiary)" />
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: '600' }}>{item.name}</td>
                      <td>
                        <span className={`info-bubble-tag ${item.category === 'Safety' ? 'safety' : ''}`} style={{ fontSize: '0.65rem' }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => setEditingItem(item)}>
                            <Edit size={14} />
                          </button>
                          <button className="btn-icon" style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }} onClick={() => handleDeleteEquipment(item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color="var(--color-primary)" /> Add Bedside Scannable
              </h3>
              <form onSubmit={handleAddEquipment}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Equipment Name</label>
                    <input type="text" className="form-control" placeholder="e.g. Bedside Monitor" value={newEqName} onChange={(e) => setNewEqName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={newEqCategory} onChange={(e) => setNewEqCategory(e.target.value)}>
                      <option value="Equipment">Clinical Equipment</option>
                      <option value="Safety">Patient Safety</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Reference snap (Photo Upload)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-md)', background: '#1a2233', border: '2px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {newEqSnap ? <img src={newEqSnap} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={20} />}
                    </div>
                    <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                      <Upload size={14} /> Upload Snap
                      <input type="file" accept="image/*" onChange={(e) => handleImageFileChange(e, false)} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows="3" placeholder="Short description..." value={newEqDesc} onChange={(e) => setNewEqDesc(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Safety Warning Note</label>
                  <input type="text" className="form-control" placeholder="e.g. Do not adjust settings." value={newEqSafety} onChange={(e) => setNewEqSafety(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Clinical Instructions (One per line)</label>
                  <textarea className="form-control" rows="3" placeholder="Instructions..." value={newEqInst} onChange={(e) => setNewEqInst(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary"><Plus size={16} /> Add Equipment</button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: MEDICATIONS & FAQS */}
        {activeTab === 'meds-faqs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            {/* Medication Section */}
            <div>
              <div className="admin-title-row">
                <h2>Manage Patient Medications</h2>
              </div>
              <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Medication Name</th>
                      <th>Purpose</th>
                      <th>Instructions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {library.medicationFAQs?.map(med => (
                      <tr key={med.id}>
                        <td style={{ fontWeight: '600' }}>{med.name}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{med.purpose}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{med.instructions}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => setEditingMed(med)}>
                              <Edit size={14} />
                            </button>
                            <button className="btn-icon" style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }} onClick={() => handleDeleteMedication(med.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="glass-panel" style={{ padding: '32px' }}>
                <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><PlusCircle size={18} /> Add Approved Medication</h3>
                <form onSubmit={handleAddMedication}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label className="form-label">Medication Name</label>
                      <input type="text" className="form-control" placeholder="e.g. Aspirin (81mg)" value={newMedName} onChange={(e) => setNewMedName(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Primary Purpose</label>
                      <input type="text" className="form-control" placeholder="e.g. Prevents blood clots" value={newMedPurpose} onChange={(e) => setNewMedPurpose(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Side Effects</label>
                    <input type="text" className="form-control" placeholder="e.g. Easy bruising" value={newMedSideEffects} onChange={(e) => setNewMedSideEffects(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Usage Instructions</label>
                    <input type="text" className="form-control" placeholder="Instructions..." value={newMedInst} onChange={(e) => setNewMedInst(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-primary">Add Medication</button>
                </form>
              </div>
            </div>

            {/* Room FAQ Section */}
            <div>
              <div className="admin-title-row">
                <h2>Manage Room FAQs</h2>
              </div>
              <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Approved Answer</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {library.faq.map((faq, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600', maxWidth: '250px' }}>{faq.question}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{faq.answer}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => setEditingFAQ({ ...faq, index: idx })}>
                              <Edit size={14} />
                            </button>
                            <button className="btn-icon" style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }} onClick={() => handleDeleteFAQ(faq.question)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="glass-panel" style={{ padding: '32px' }}>
                <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><HelpCircle size={18} /> Add Room FAQ</h3>
                <form onSubmit={handleAddFAQ}>
                  <div className="form-group">
                    <label className="form-label">Question</label>
                    <input type="text" className="form-control" placeholder="e.g. Can I get out of bed?" value={newFAQQuestion} onChange={(e) => setNewFAQQuestion(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Approved Answer</label>
                    <textarea className="form-control" rows="3" placeholder="Answer..." value={newFAQAnswer} onChange={(e) => setNewFAQAnswer(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-primary">Add FAQ</button>
                </form>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: SYSTEM CONFIG & AI SAFETY RULES */}
        {activeTab === 'config' && (
          <div>
            <div className="admin-title-row">
              <h2>Hospital Configuration & AI Safety</h2>
            </div>
            
            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Hospital details */}
              <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>Hospital & Room Settings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Hospital Name</label>
                  <input type="text" className="form-control" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Room Number</label>
                  <input type="text" className="form-control" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
                </div>
              </div>

              {/* AI Safety Rules */}
              <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginTop: '16px' }}>AI Safety Guidelines</h3>
              <div className="form-group">
                <label className="form-label">System Instruction Prompt</label>
                <textarea className="form-control" rows="5" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Trigger Escalation Keywords (comma-separated)</label>
                <input type="text" className="form-control" value={escalationKeywords} onChange={(e) => setEscalationKeywords(e.target.value)} />
              </div>

              {/* OpenAI Key */}
              <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginTop: '16px' }}>API Configurations</h3>
              <div className="form-group">
                <label className="form-label">OpenAI API Key (Live ChatGPT RAG)</label>
                <input type="password" className="form-control" placeholder="sk-..." value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
              </div>

              <button className="btn-primary" onClick={handleSaveSettings} style={{ alignSelf: 'flex-start', padding: '12px 32px' }}>
                <Save size={16} /> Save Settings
              </button>

            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div>
            <div className="admin-title-row">
              <h2>Session Activity Audit</h2>
              <button className="btn-secondary" onClick={onClearLogs} style={{ color: 'var(--color-danger)' }}>
                Reset Audit Trail
              </button>
            </div>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Activity Type</th>
                    <th>Activity Details</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionLogs.map((log, index) => (
                    <tr key={index}>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td><span className={`info-bubble-tag ${log.event === 'ai_query_escalated' ? 'safety' : ''}`} style={{ fontSize: '0.7rem' }}>{log.event}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}><code>{JSON.stringify(log.meta)}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Edit Equipment Modal */}
      {editingItem && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 style={{ marginBottom: '20px' }}>Edit Equipment: {editingItem.name}</h3>
            <div className="form-group">
              <label className="form-label">Reference Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-md)', background: '#1a2233', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {editingItem.adminSnap ? <img src={editingItem.adminSnap} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon />}
                </div>
                <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                  Replace Photo
                  <input type="file" accept="image/*" onChange={(e) => handleImageFileChange(e, true)} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows="3" value={editingItem.description} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Safety Warning</label>
              <input type="text" className="form-control" value={editingItem.safetyNote} onChange={(e) => setEditingItem({ ...editingItem, safetyNote: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Context Instructions</label>
              <textarea className="form-control" rows="4" value={editingItem.instructions.join('\n')} onChange={(e) => setEditingItem({ ...editingItem, instructions: e.target.value.split('\n') })} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-primary" onClick={handleSaveEditItem}><Save size={16} /> Save Changes</button>
              <button className="btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medication Modal */}
      {editingMed && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 style={{ marginBottom: '20px' }}>Edit Medication: {editingMed.name}</h3>
            <div className="form-group">
              <label className="form-label">Medication Name</label>
              <input type="text" className="form-control" value={editingMed.name} onChange={(e) => setEditingMed({ ...editingMed, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Purpose</label>
              <input type="text" className="form-control" value={editingMed.purpose} onChange={(e) => setEditingMed({ ...editingMed, purpose: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Side Effects</label>
              <input type="text" className="form-control" value={editingMed.sideEffects} onChange={(e) => setEditingMed({ ...editingMed, sideEffects: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Instructions</label>
              <input type="text" className="form-control" value={editingMed.instructions} onChange={(e) => setEditingMed({ ...editingMed, instructions: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-primary" onClick={handleSaveEditMed}><Save size={16} /> Save Changes</button>
              <button className="btn-secondary" onClick={() => setEditingMed(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit FAQ Modal */}
      {editingFAQ && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 style={{ marginBottom: '20px' }}>Edit Room FAQ</h3>
            <div className="form-group">
              <label className="form-label">Question</label>
              <input type="text" className="form-control" value={editingFAQ.question} onChange={(e) => setEditingFAQ({ ...editingFAQ, question: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Answer</label>
              <textarea className="form-control" rows="4" value={editingFAQ.answer} onChange={(e) => setEditingFAQ({ ...editingFAQ, answer: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-primary" onClick={handleSaveEditFAQ}><Save size={16} /> Save Changes</button>
              <button className="btn-secondary" onClick={() => setEditingFAQ(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
