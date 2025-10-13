import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Meeting, AgendaItem, ActionItem, Decision, Attendee } from '../types';
import Modal from '../components/Modal';
import { FlagIcon } from '../components/icons/FlagIcon';
import { GavelIcon } from '../components/icons/GavelIcon';
import { MicIcon } from '../components/icons/MicIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { PlusIcon } from '../components/icons/PlusIcon';

const LiveMeeting: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useLocalStorage<Meeting[]>('meetings', []);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [activeAgendaItemId, setActiveAgendaItemId] = useState<string | null>(null);

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  
  const [newAction, setNewAction] = useState<Omit<ActionItem, 'id'>>({ description: '', ownerId: '', dueDate: '', agendaItemId: ''});
  const [newDecision, setNewDecision] = useState<Omit<Decision, 'id'>>({ motion: '', moverId: '', seconderId: '', outcome: 'carried', agendaItemId: ''});
  const [editableAgenda, setEditableAgenda] = useState<AgendaItem[]>([]);
  const [editableAttendees, setEditableAttendees] = useState<Attendee[]>([]);

  useEffect(() => {
    const currentMeeting = meetings.find(m => m.id === id);
    if (currentMeeting) {
      setMeeting(currentMeeting);
      if (currentMeeting.agenda.length > 0 && !activeAgendaItemId) {
        setActiveAgendaItemId(currentMeeting.agenda[0].id);
      }
      if(currentMeeting.status === 'scheduled'){
         setMeetings(meetings.map(m => m.id === id ? {...m, status: 'inprogress'} : m));
      }
    }
  }, [id, meetings, setMeetings, activeAgendaItemId]);

  const updateMeeting = useCallback((updatedMeeting: Meeting) => {
    setMeetings(prevMeetings => prevMeetings.map(m => m.id === id ? updatedMeeting : m));
    setMeeting(updatedMeeting);
  }, [id, setMeetings]);
  
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!meeting || !activeAgendaItemId) return;
    const updatedAgenda = meeting.agenda.map(item =>
      item.id === activeAgendaItemId ? { ...item, notes: e.target.value } : item
    );
    updateMeeting({ ...meeting, agenda: updatedAgenda });
  };
  
  const handleAddSpeaker = (speakerId: string) => {
    if (!meeting || !activeAgendaItemId) return;
    const speaker = meeting.attendees.find(a => a.id === speakerId);
    if (!speaker) return;
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const speakerText = `\n[${timestamp}] ${speaker.name}: `;
    
    const updatedAgenda = meeting.agenda.map(item =>
      item.id === activeAgendaItemId ? { ...item, notes: (item.notes || '') + speakerText } : item
    );
    updateMeeting({ ...meeting, agenda: updatedAgenda });
  };

  const handleSaveAction = () => {
    if (!meeting || !activeAgendaItemId) return;
    const action: ActionItem = { ...newAction, id: `action-${Date.now()}`, agendaItemId: activeAgendaItemId };
    updateMeeting({ ...meeting, actionItems: [...meeting.actionItems, action]});
    setIsActionModalOpen(false);
    setNewAction({ description: '', ownerId: '', dueDate: '', agendaItemId: ''});
  };

  const handleSaveDecision = () => {
    if (!meeting || !activeAgendaItemId) return;
    const decision: Decision = { ...newDecision, id: `decision-${Date.now()}`, agendaItemId: activeAgendaItemId };
    updateMeeting({ ...meeting, decisions: [...meeting.decisions, decision]});
    setIsDecisionModalOpen(false);
    setNewDecision({ motion: '', moverId: '', seconderId: '', outcome: 'carried', agendaItemId: ''});
  };

  const handleEndMeeting = () => {
    if (!meeting) return;
    const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    updateMeeting({ ...meeting, status: 'completed', endTime });
    navigate(`/review/${id}`);
  };
  
  const handleOpenAgendaModal = () => {
    if (!meeting) return;
    setEditableAgenda([...meeting.agenda.map(a => ({...a}))]); // Deep copy for editing
    setIsAgendaModalOpen(true);
  };

  const handleSaveAgenda = () => {
    if (!meeting) return;
    updateMeeting({ ...meeting, agenda: editableAgenda });
    // If active item was deleted, select the first one.
    if (!editableAgenda.some(item => item.id === activeAgendaItemId) && editableAgenda.length > 0) {
      setActiveAgendaItemId(editableAgenda[0].id);
    } else if (editableAgenda.length === 0) {
      setActiveAgendaItemId(null);
    }
    setIsAgendaModalOpen(false);
  };
  
  const handleEditableAgendaChange = (index: number, field: keyof Omit<AgendaItem, 'id' | 'notes'>, value: string | number) => {
    const updatedAgenda = [...editableAgenda];
    updatedAgenda[index] = { ...updatedAgenda[index], [field]: value };
    setEditableAgenda(updatedAgenda);
  };
  
  const addEditableAgendaItem = () => {
    const newItem: AgendaItem = {
        id: `agenda-${Date.now()}`,
        title: '',
        presenter: '',
        timeAllocation: 10,
        notes: ''
    };
    setEditableAgenda([...editableAgenda, newItem]);
  };
  
  const removeEditableAgendaItem = (index: number) => {
      const updatedAgenda = editableAgenda.filter((_, i) => i !== index);
      setEditableAgenda(updatedAgenda);
  };

  const handleOpenAttendeesModal = () => {
    if (!meeting) return;
    setEditableAttendees([...meeting.attendees.map(a => ({...a}))]);
    setIsAttendeesModalOpen(true);
  };

  const handleSaveAttendees = () => {
    if (!meeting) return;
    updateMeeting({ ...meeting, attendees: editableAttendees });
    setIsAttendeesModalOpen(false);
  };
  
  const handleEditableAttendeeChange = (index: number, field: keyof Attendee, value: string) => {
    const updatedAttendees = [...editableAttendees];
    updatedAttendees[index] = { ...updatedAttendees[index], [field]: value };
    setEditableAttendees(updatedAttendees);
  };
  
  const addEditableAttendee = () => {
    const newAttendee: Attendee = {
        id: `att-${Date.now()}`,
        name: '',
        email: '',
        status: 'present'
    };
    setEditableAttendees([...editableAttendees, newAttendee]);
  };
  
  const removeEditableAttendee = (index: number) => {
    const updatedAttendees = editableAttendees.filter((_, i) => i !== index);
    setEditableAttendees(updatedAttendees);
  };

  if (!meeting) return <div className="text-center py-10">Loading meeting...</div>;

  const activeAgendaItem = meeting.agenda.find(item => item.id === activeAgendaItemId);
  const getAttendeeName = (attendeeId: string) => meeting.attendees.find(a => a.id === attendeeId)?.name || 'Unknown';

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-700 hover:text-brand-primary font-semibold transition-colors"
          aria-label="Go back to previous page"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Agenda */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-4 sticky top-24">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-bold text-brand-dark">Agenda</h2>
              <button onClick={handleOpenAgendaModal} className="text-gray-500 hover:text-brand-primary" aria-label="Edit Agenda">
                  <PencilIcon className="w-5 h-5"/>
              </button>
            </div>
            <ul>
              {meeting.agenda.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveAgendaItemId(item.id)}
                    className={`w-full text-left p-3 rounded-md transition-colors text-sm ${activeAgendaItemId === item.id ? 'bg-brand-primary text-white' : 'hover:bg-gray-100'}`}
                  >
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs opacity-80">{item.presenter} - {item.timeAllocation} min</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Center Column: Notes */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-lg shadow-md">
              <div className="p-4 border-b">
                  <h2 className="text-xl font-bold text-brand-dark">{activeAgendaItem?.title || 'Notes'}</h2>
                  <p className="text-sm text-gray-500">{activeAgendaItem ? 'Take notes for the current agenda item.' : 'Select an agenda item to begin.'}</p>
              </div>
              <div className="p-4">
                  <textarea
                      value={activeAgendaItem?.notes || ''}
                      onChange={handleNoteChange}
                      placeholder={activeAgendaItem ? "Start typing your notes here..." : "No agenda item selected."}
                      className="w-full h-96 p-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-brand-primary focus:outline-none resize-none"
                      disabled={!activeAgendaItem}
                  />
              </div>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-bold mb-2 text-brand-dark">Meeting Logs</h3>
               <div className="space-y-4">
                  {meeting.decisions.length > 0 && <div>
                      <h4 className="font-semibold text-gray-600">Decisions</h4>
                      <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                          {meeting.decisions.map(d => <li key={d.id}>Motion to "{d.motion}" by {getAttendeeName(d.moverId)}, seconded by {getAttendeeName(d.seconderId)}. Outcome: <span className="font-semibold capitalize">{d.outcome}</span></li>)}
                      </ul>
                  </div>}
                  {meeting.actionItems.length > 0 && <div>
                      <h4 className="font-semibold text-gray-600">Action Items</h4>
                      <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                          {meeting.actionItems.map(a => <li key={a.id}>{a.description} - <strong>{getAttendeeName(a.ownerId)}</strong> (Due: {a.dueDate})</li>)}
                      </ul>
                  </div>}
               </div>
          </div>

        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-4 sticky top-24 space-y-4">
              <h2 className="text-xl font-bold mb-2 border-b pb-2 text-brand-dark">Controls</h2>
              <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-600 flex items-center gap-2"><MicIcon className="w-4 h-4" /> Add Speaker</label>
                    <button onClick={handleOpenAttendeesModal} className="text-gray-500 hover:text-brand-primary" aria-label="Edit Attendees">
                        <PencilIcon className="w-4 h-4"/>
                    </button>
                  </div>
                  <select disabled={!activeAgendaItem} onChange={(e) => handleAddSpeaker(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:bg-gray-100">
                      <option>Select Attendee...</option>
                      {meeting.attendees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
              </div>
              <button onClick={() => setIsActionModalOpen(true)} disabled={!activeAgendaItem} className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-blue-300"><FlagIcon className="w-5 h-5"/> Log Action Item</button>
              <button onClick={() => setIsDecisionModalOpen(true)} disabled={!activeAgendaItem} className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-green-300"><GavelIcon className="w-5 h-5"/> Log Decision</button>
              <button onClick={handleEndMeeting} className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors mt-8"><CheckCircleIcon className="w-5 h-5"/> End & Generate Draft</button>
          </div>
        </div>

         {/* Action Item Modal */}
        <Modal isOpen={isActionModalOpen} onClose={() => setIsActionModalOpen(false)} title="Log New Action Item">
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input type="text" onChange={e => setNewAction({...newAction, description: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned To (Owner)</label>
                  <select onChange={e => setNewAction({...newAction, ownerId: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary">
                      <option>Select Attendee...</option>
                      {meeting.attendees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input type="date" onChange={e => setNewAction({...newAction, dueDate: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary" />
              </div>
              <div className="flex justify-end pt-4">
                  <button onClick={handleSaveAction} className="bg-brand-primary hover:bg-blue-800 text-white font-bold py-2 px-6 rounded-lg transition-colors">Save Action</button>
              </div>
          </div>
        </Modal>

        {/* Decision Modal */}
        <Modal isOpen={isDecisionModalOpen} onClose={() => setIsDecisionModalOpen(false)} title="Log New Decision">
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700">Motion</label>
                  <input type="text" onChange={e => setNewDecision({...newDecision, motion: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Moved By</label>
                      <select onChange={e => setNewDecision({...newDecision, moverId: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary">
                          <option>Select Attendee...</option>
                          {meeting.attendees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                  </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700">Seconded By</label>
                      <select onChange={e => setNewDecision({...newDecision, seconderId: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary">
                          <option>Select Attendee...</option>
                          {meeting.attendees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                  </div>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Outcome</label>
                  <select onChange={e => setNewDecision({...newDecision, outcome: e.target.value as Decision['outcome']})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary">
                      <option value="carried">Carried</option>
                      <option value="defeated">Defeated</option>
                      <option value="tabled">Tabled</option>
                  </select>
              </div>
              <div className="flex justify-end pt-4">
                  <button onClick={handleSaveDecision} className="bg-brand-primary hover:bg-blue-800 text-white font-bold py-2 px-6 rounded-lg transition-colors">Save Decision</button>
              </div>
          </div>
        </Modal>

        {/* Edit Agenda Modal */}
        <Modal isOpen={isAgendaModalOpen} onClose={() => setIsAgendaModalOpen(false)} title="Edit Agenda">
          <div className="space-y-4">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {editableAgenda.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-md">
                  <div className="col-span-5">
                    <input type="text" placeholder="Title" value={item.title} onChange={e => handleEditableAgendaChange(index, 'title', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded" />
                  </div>
                  <div className="col-span-4">
                    <input type="text" placeholder="Presenter" value={item.presenter} onChange={e => handleEditableAgendaChange(index, 'presenter', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" placeholder="Mins" value={item.timeAllocation} onChange={e => handleEditableAgendaChange(index, 'timeAllocation', parseInt(e.target.value) || 0)} className="w-full text-sm p-1 border border-gray-300 rounded" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeEditableAgendaItem(index)} className="text-red-500 hover:text-red-700" aria-label="Remove item"><TrashIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addEditableAgendaItem} className="mt-3 flex items-center gap-2 text-sm text-brand-primary font-semibold hover:underline">
              <PlusIcon className="w-4 h-4" /> Add Item
            </button>
            <div className="flex justify-end pt-4 border-t mt-4">
              <button onClick={() => setIsAgendaModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors mr-2">Cancel</button>
              <button onClick={handleSaveAgenda} className="bg-brand-primary hover:bg-blue-800 text-white font-bold py-2 px-6 rounded-lg transition-colors">Save Agenda</button>
            </div>
          </div>
        </Modal>

        {/* Edit Attendees Modal */}
        <Modal isOpen={isAttendeesModalOpen} onClose={() => setIsAttendeesModalOpen(false)} title="Edit Attendees">
          <div className="space-y-4">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {editableAttendees.map((attendee, index) => (
                <div key={attendee.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-md">
                  <div className="col-span-5">
                    <input type="text" placeholder="Name" value={attendee.name} onChange={e => handleEditableAttendeeChange(index, 'name', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded" />
                  </div>
                  <div className="col-span-4">
                    <input type="email" placeholder="Email" value={attendee.email} onChange={e => handleEditableAttendeeChange(index, 'email', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded" />
                  </div>
                  <div className="col-span-2">
                    <select value={attendee.status} onChange={e => handleEditableAttendeeChange(index, 'status', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded capitalize">
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="guest">Guest</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeEditableAttendee(index)} className="text-red-500 hover:text-red-700" aria-label="Remove Attendee"><TrashIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addEditableAttendee} className="mt-3 flex items-center gap-2 text-sm text-brand-primary font-semibold hover:underline">
              <PlusIcon className="w-4 h-4" /> Add Attendee
            </button>
            <div className="flex justify-end pt-4 border-t mt-4">
              <button onClick={() => setIsAttendeesModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors mr-2">Cancel</button>
              <button onClick={handleSaveAttendees} className="bg-brand-primary hover:bg-blue-800 text-white font-bold py-2 px-6 rounded-lg transition-colors">Save Attendees</button>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
};

export default LiveMeeting;