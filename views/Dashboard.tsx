import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Meeting, Attendee, AgendaItem } from '../types';
import { MEETING_TEMPLATES } from '../constants';
import Modal from '../components/Modal';
import { PlusIcon } from '../components/icons/PlusIcon';
import { ClockIcon } from '../components/icons/ClockIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import { TrashIcon } from '../components/icons/TrashIcon';

const Dashboard: React.FC = () => {
  const [meetings, setMeetings] = useLocalStorage<Meeting[]>('meetings', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({ title: '', date: '', startTime: '', location: '' });
  const [attendeesStr, setAttendeesStr] = useState('');
  const [template, setTemplate] = useState(MEETING_TEMPLATES[0].name);
  const [searchTerm, setSearchTerm] = useState('');
  const [agendaItems, setAgendaItems] = useState<Omit<AgendaItem, 'id' | 'notes'>[]>(MEETING_TEMPLATES[0].agenda);
  const navigate = useNavigate();

  useEffect(() => {
    const selectedTemplate = MEETING_TEMPLATES.find(t => t.name === template);
    setAgendaItems(selectedTemplate ? [...selectedTemplate.agenda] : []);
  }, [template]);

  const handleAgendaChange = (index: number, field: keyof Omit<AgendaItem, 'id' | 'notes'>, value: string | number) => {
    const updatedAgenda = [...agendaItems];
    updatedAgenda[index] = { ...updatedAgenda[index], [field]: value };
    setAgendaItems(updatedAgenda);
  };

  const addAgendaItem = () => {
    setAgendaItems([...agendaItems, { title: '', presenter: '', timeAllocation: 10 }]);
  };

  const removeAgendaItem = (index: number) => {
    const updatedAgenda = agendaItems.filter((_, i) => i !== index);
    setAgendaItems(updatedAgenda);
  };

  const resetForm = () => {
    setNewMeeting({ title: '', date: '', startTime: '', location: '' });
    setAttendeesStr('');
    setTemplate(MEETING_TEMPLATES[0].name);
    setAgendaItems(MEETING_TEMPLATES[0].agenda);
  };

  const handleCreateMeeting = () => {
    const attendees: Attendee[] = attendeesStr
      .split('\n')
      .filter(line => line.trim() !== '')
      .map((line, index) => {
        const [name, email] = line.split(',').map(s => s.trim());
        return { id: `att-${Date.now()}-${index}`, name: name || '', email: email || '', status: 'present' };
      });
    
    const agenda: AgendaItem[] = agendaItems.map((item, index) => ({
      ...item,
      id: `agenda-${Date.now()}-${index}`,
      notes: ''
    }));

    const meeting: Meeting = {
      id: `m-${Date.now()}`,
      status: 'scheduled',
      attendees,
      agenda,
      actionItems: [],
      decisions: [],
      ...newMeeting,
    } as Meeting;

    setMeetings(prev => [...prev, meeting]);
    setIsModalOpen(false);
    resetForm();
    navigate(`/meeting/${meeting.id}`);
  };

  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => 
      meeting.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [meetings, searchTerm]);

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-brand-dark">Meetings</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-brand-primary hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
        >
          <PlusIcon className="w-5 h-5" />
          New Meeting
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search meetings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none"
        />
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {filteredMeetings.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredMeetings.map(meeting => (
              <li key={meeting.id} className="hover:bg-gray-50 transition-colors">
                <Link to={`/meeting/${meeting.id}`} className="block p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-brand-primary">{meeting.title}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <ClockIcon className="w-4 h-4 mr-2" />
                        {new Date(meeting.date).toDateString()} at {meeting.startTime}
                      </div>
                       <div className="flex items-center text-sm text-gray-500 mt-1">
                        <UsersIcon className="w-4 h-4 mr-2" />
                        {meeting.attendees.length} attendees
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${
                      meeting.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      meeting.status === 'inprogress' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {meeting.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center p-12 text-gray-500">
            <p className="text-lg">No meetings found.</p>
            <p>Click "New Meeting" to get started.</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Meeting">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Meeting Title</label>
            <input type="text" value={newMeeting.title} onChange={e => setNewMeeting({...newMeeting, title: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" value={newMeeting.date} onChange={e => setNewMeeting({...newMeeting, date: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Start Time</label>
              <input type="time" value={newMeeting.startTime} onChange={e => setNewMeeting({...newMeeting, startTime: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
            </div>
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700">Location / Link</label>
            <input type="text" value={newMeeting.location} onChange={e => setNewMeeting({...newMeeting, location: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Attendees (Name, Email - one per line)</label>
            <textarea rows={4} value={attendeesStr} onChange={e => setAttendeesStr(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" placeholder="John Doe, john.doe@example.com&#10;Jane Smith, jane.smith@example.com"></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Meeting Template</label>
            <select value={template} onChange={e => setTemplate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
              {MEETING_TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Agenda Items</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {agendaItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-md">
                  <div className="col-span-5">
                    <label className="text-xs text-gray-500 sr-only">Title</label>
                    <input type="text" placeholder="Title" value={item.title} onChange={e => handleAgendaChange(index, 'title', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded" />
                  </div>
                  <div className="col-span-4">
                     <label className="text-xs text-gray-500 sr-only">Presenter</label>
                    <input type="text" placeholder="Presenter" value={item.presenter} onChange={e => handleAgendaChange(index, 'presenter', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded" />
                  </div>
                  <div className="col-span-2">
                     <label className="text-xs text-gray-500 sr-only">Minutes</label>
                    <input type="number" placeholder="Mins" value={item.timeAllocation} onChange={e => handleAgendaChange(index, 'timeAllocation', parseInt(e.target.value) || 0)} className="w-full text-sm p-1 border border-gray-300 rounded" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                     <button onClick={() => removeAgendaItem(index)} className="text-red-500 hover:text-red-700" aria-label="Remove item"><TrashIcon className="w-5 h-5"/></button>
                  </div>
                </div>
              ))}
            </div>
             <button onClick={addAgendaItem} className="mt-3 flex items-center gap-2 text-sm text-brand-primary font-semibold hover:underline">
                <PlusIcon className="w-4 h-4" /> Add Agenda Item
             </button>
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={handleCreateMeeting} className="bg-brand-primary hover:bg-blue-800 text-white font-bold py-2 px-6 rounded-lg transition-colors">Create Meeting</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;