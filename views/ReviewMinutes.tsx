import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Meeting, AgendaItem, Attendee, Decision, ActionItem } from '../types';
import { GoogleGenAI } from '@google/genai';
import Modal from '../components/Modal';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { MailIcon } from '../components/icons/MailIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { PlusIcon } from '../components/icons/PlusIcon';

const ReviewMinutes: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useLocalStorage<Meeting[]>('meetings', []);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [minutes, setMinutes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [editableAgenda, setEditableAgenda] = useState<AgendaItem[]>([]);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  const [editableAttendees, setEditableAttendees] = useState<Attendee[]>([]);
  
  const updateMeeting = useCallback((updatedMeeting: Meeting) => {
    setMeetings(prevMeetings => prevMeetings.map(m => m.id === id ? updatedMeeting : m));
    setMeeting(updatedMeeting);
  }, [id, setMeetings]);

  const generateMinutes = useCallback(async (currentMeeting: Meeting) => {
    if (!process.env.API_KEY) {
        setError("API key is not configured. Please set the API_KEY environment variable.");
        setMinutes("API key not configured. Cannot generate minutes.");
        return;
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    setIsLoading(true);
    setError(null);

    const getAttendeeNameLocal = (attendeeId: string) => {
        return currentMeeting.attendees.find(a => a.id === attendeeId)?.name || 'Unknown';
    };

    const meetingDataForPrompt = {
        title: currentMeeting.title,
        date: currentMeeting.date,
        startTime: currentMeeting.startTime,
        endTime: currentMeeting.endTime,
        location: currentMeeting.location,
        attendees: currentMeeting.attendees.map(a => a.name),
        agenda: currentMeeting.agenda.map(item => ({
            title: item.title,
            presenter: item.presenter,
            notes: item.notes,
        })),
        decisions: currentMeeting.decisions.map(d => ({
            motion: d.motion,
            mover: getAttendeeNameLocal(d.moverId),
            seconder: getAttendeeNameLocal(d.seconderId),
            outcome: d.outcome,
        })),
        actionItems: currentMeeting.actionItems.map(a => ({
            description: a.description,
            owner: getAttendeeNameLocal(a.ownerId),
            dueDate: a.dueDate,
        })),
    };

    const prompt = `
      You are a professional secretary tasked with creating formal meeting minutes.
      Based on the following JSON data, generate a comprehensive and well-structured meeting minutes document in Markdown format.

      **Meeting Data:**
      \`\`\`json
      ${JSON.stringify(meetingDataForPrompt, null, 2)}
      \`\`\`

      **Instructions for the Markdown output:**
      1.  **Header:** Start with the meeting title as a main heading (#). Include the Date, Start Time, End Time, and Location clearly below the title.
      2.  **Attendees:** Create a section (##) for attendees and list each attendee's name.
      3.  **Agenda and Discussion:** Create a main section (##) for "Agenda & Discussion Summary". For each agenda item, create a sub-section (###) with its title. Under each agenda item, summarize the key points from the notes. Ensure the summary is coherent and professional. If notes are empty, state that the topic was on the agenda but no detailed notes were recorded.
      4.  **Decisions:** Create a section (##) for "Decisions Made". List each decision clearly, including the motion, mover, seconder, and the final outcome.
      5.  **Action Items:** Create a section (##) for "Action Items". Present the action items in a table format with columns for "Task", "Assigned To", and "Due Date".
      6.  **Tone & Formatting:** Maintain a formal and objective tone throughout. Use Markdown formatting (bolding, lists, etc.) to enhance readability. Do not include the original JSON data in your output.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text;
        setMinutes(text);
    } catch (e) {
        console.error("Error generating minutes:", e);
        setError("Failed to generate minutes. The AI service may be unavailable or there might be an issue with your request.");
        setMinutes("Error: Could not generate minutes.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentMeeting = meetings.find(m => m.id === id);
    if (currentMeeting) {
      setMeeting(currentMeeting);
      if (!minutes && !isLoading) { // Only generate if not already generated
         generateMinutes(currentMeeting);
      }
    } else {
        navigate('/dashboard');
    }
  }, [id, meetings, generateMinutes, navigate, minutes, isLoading]);

  const handleSaveMinutes = () => {
    // In a real app, this would save the edited minutes back to a specific field in the meeting object.
    setIsEditingMinutes(false);
  };
  
  const handleEmail = () => {
    if (!meeting) return;
    const subject = `Meeting Minutes: ${meeting.title}`;
    const body = `Please find the minutes for the meeting "${meeting.title}" held on ${meeting.date}.\n\n---\n\n${minutes}`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };
  
  const handleExportPDF = () => {
    if (!meeting) return;

    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 72; // 1 inch = 72 points
    const pageContentWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const indent = 20;
    let y = margin;

    const checkPageBreak = (spaceNeeded: number) => {
        if (y + spaceNeeded > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
        }
    };
    
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(meeting.title, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
    y += 30;

    // Meeting Details & Timestamp
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const details = [
        `Date: ${new Date(meeting.date).toDateString()}`,
        `Time: ${meeting.startTime} - ${meeting.endTime || 'N/A'}`,
        `Location: ${meeting.location}`,
        `Generated on: ${new Date().toLocaleString()}`
    ];
    details.forEach(detail => {
        doc.text(detail, margin, y);
        y += 15;
    });
    y += 10;

    const getAttendeeNameLocal = (attendeeId: string) => {
        return meeting.attendees.find(a => a.id === attendeeId)?.name || 'Unknown';
    };

    // Attendees
    checkPageBreak(30 + meeting.attendees.length * 15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Attendees', margin, y);
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    meeting.attendees.forEach(attendee => {
        const status = `(${attendee.status.charAt(0).toUpperCase() + attendee.status.slice(1)})`;
        doc.text(`- ${attendee.name} ${status}`, margin, y);
        y += 15;
    });
    y += 10;

    // Agenda & Notes
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Minutes by Agenda Item', margin, y);
    y += 20;
    meeting.agenda.forEach(item => {
        const titleText = `${item.title} (Presenter: ${item.presenter})`;
        const titleLines = doc.splitTextToSize(titleText, pageContentWidth);
        checkPageBreak(20 + titleLines.length * 15 + (item.notes ? 30 : 0));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 12 + 5;
        
        if (item.notes) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            const noteLines = doc.splitTextToSize(item.notes, pageContentWidth - indent);
            checkPageBreak(noteLines.length * 15);
            doc.text(noteLines, margin + indent, y);
            y += noteLines.length * 12 + 10;
        } else {
             doc.setFont('helvetica', 'italic');
             doc.setFontSize(10);
             doc.text("No detailed notes were recorded for this item.", margin + indent, y);
             y += 20;
        }
    });

    // Decisions Log
    if (meeting.decisions.length > 0) {
        const decisionBody = meeting.decisions.map(d => [d.motion, getAttendeeNameLocal(d.moverId), getAttendeeNameLocal(d.seconderId), d.outcome.charAt(0).toUpperCase() + d.outcome.slice(1)]);
        // @ts-ignore
        doc.autoTable({
            head: [['Decisions Log', '', '', ''], ['Motion', 'Moved By', 'Seconded By', 'Outcome']],
            body: decisionBody,
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: [7, 82, 156] }, // #07529C
            showHead: 'everyPage',
            didDrawPage: (data: any) => { y = data.cursor.y; },
            margin: { left: margin, right: margin }
        });
        y = (doc as any).lastAutoTable.finalY + 20;
    }

    // Action Items
    if (meeting.actionItems.length > 0) {
        const actionItemsBody = meeting.actionItems.map(a => [a.description, getAttendeeNameLocal(a.ownerId), new Date(a.dueDate).toLocaleDateString()]);
        // @ts-ignore
        doc.autoTable({
            head: [['Action Items', '', ''], ['Task', 'Assigned To', 'Due Date']],
            body: actionItemsBody,
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: [7, 82, 156] }, // #07529C
            showHead: 'everyPage',
            didDrawPage: (data: any) => { y = data.cursor.y; },
            margin: { left: margin, right: margin }
        });
        y = (doc as any).lastAutoTable.finalY + 30;
    }

    // Sign-off section
    checkPageBreak(60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Record by: ___________________________', margin, y);
    y += 40;
    doc.text('Approved by: __________________________', margin, y);
    
    doc.save(`${meeting.title.replace(/\s+/g, '_')}_minutes.pdf`);
  };


  const handleOpenAgendaModal = () => {
    if (!meeting) return;
    setEditableAgenda([...meeting.agenda.map(a => ({...a}))]);
    setIsAgendaModalOpen(true);
  };

  const handleSaveAgenda = () => {
    if (!meeting) return;
    updateMeeting({ ...meeting, agenda: editableAgenda });
    setIsAgendaModalOpen(false);
  };
  
  const handleEditableAgendaChange = (index: number, field: keyof Omit<AgendaItem, 'id' | 'notes'>, value: string | number) => {
    const updatedAgenda = [...editableAgenda];
    updatedAgenda[index] = { ...updatedAgenda[index], [field]: value };
    setEditableAgenda(updatedAgenda);
  };
  
  const addEditableAgendaItem = () => {
    const newItem: AgendaItem = { id: `agenda-${Date.now()}`, title: '', presenter: '', timeAllocation: 10, notes: '' };
    setEditableAgenda([...editableAgenda, newItem]);
  };
  
  const removeEditableAgendaItem = (index: number) => {
    setEditableAgenda(editableAgenda.filter((_, i) => i !== index));
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
    const newAttendee: Attendee = { id: `att-${Date.now()}`, name: '', email: '', status: 'present' };
    setEditableAttendees([...editableAttendees, newAttendee]);
  };

  const removeEditableAttendee = (index: number) => {
    setEditableAttendees(editableAttendees.filter((_, i) => i !== index));
  };

  if (!meeting) {
    return <div className="text-center py-10">Loading meeting details...</div>;
  }
  
  const getAttendeeName = (attendeeId: string) => meeting.attendees.find(a => a.id === attendeeId)?.name || 'Unknown';

  return (
    <div className="container mx-auto">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
            <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-700 hover:text-brand-primary font-semibold transition-colors mb-2"
            aria-label="Go back to dashboard"
            >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-bold text-brand-dark">{meeting.title} - Draft Minutes</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            {isEditingMinutes ? (
                <button onClick={handleSaveMinutes} className="bg-brand-primary hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg">Save</button>
            ) : (
                <button onClick={() => setIsEditingMinutes(true)} disabled={isLoading || !!error} className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"><PencilIcon className="w-4 h-4" /> Edit AI Draft</button>
            )}
            <button onClick={handleExportPDF} disabled={isLoading || !!error} className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"><DownloadIcon className="w-4 h-4" /> Export PDF</button>
            <button onClick={handleEmail} disabled={isLoading || !!error} className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"><MailIcon className="w-4 h-4" /> Email AI Draft</button>
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-brand-dark">Attendees</h3>
                <button onClick={handleOpenAttendeesModal} className="text-gray-500 hover:text-brand-primary" aria-label="Edit Attendees"><PencilIcon className="w-5 h-5"/></button>
            </div>
             <ul className="text-sm space-y-1">
                {meeting.attendees.map(a => <li key={a.id}>{a.name} <span className="text-gray-500 capitalize">({a.status})</span></li>)}
            </ul>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
             <h3 className="text-lg font-bold text-brand-dark mb-2">Decisions Log</h3>
             {meeting.decisions.length > 0 ? <ul className="list-disc pl-5 text-sm space-y-1">
                {meeting.decisions.map(d => <li key={d.id}>Motion to "{d.motion}" by {getAttendeeName(d.moverId)}. Outcome: <span className="font-semibold capitalize">{d.outcome}</span></li>)}
            </ul> : <p className="text-sm text-gray-500">No decisions were logged.</p>}
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
             <h3 className="text-lg font-bold text-brand-dark mb-2">Action Items</h3>
             {meeting.actionItems.length > 0 ? <ul className="list-disc pl-5 text-sm space-y-1">
                 {meeting.actionItems.map(a => <li key={a.id}>{a.description} - <strong>{getAttendeeName(a.ownerId)}</strong> (Due: {a.dueDate})</li>)}
            </ul> : <p className="text-sm text-gray-500">No action items were logged.</p>}
        </div>
      </div>
      
       <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-brand-dark">Minutes by Agenda Item</h2>
             <button onClick={handleOpenAgendaModal} className="text-gray-500 hover:text-brand-primary" aria-label="Edit Agenda"><PencilIcon className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
             {meeting.agenda.map(item => (
                <div key={item.id}>
                    <h3 className="font-bold text-md text-gray-800">{item.title}</h3>
                    <p className="text-sm text-gray-500 mb-1">Presenter: {item.presenter}</p>
                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed bg-gray-50 p-3 rounded-md">{item.notes || 'No notes for this item.'}</pre>
                </div>
            ))}
        </div>
       </div>

      <div className="bg-white rounded-lg shadow-md p-6 lg:p-8 mt-6">
        <h2 className="text-xl font-bold text-brand-dark mb-4">AI Generated Draft</h2>
        {isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Generating minutes with Gemini AI...</p>
          </div>
        ) : error ? (
            <div className="text-center py-20 bg-red-50 text-red-700 p-4 rounded-lg">
                <h3 className="font-bold">An Error Occurred</h3>
                <p>{error}</p>
            </div>
        ) : isEditingMinutes ? (
          <textarea
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-full h-[70vh] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-primary focus:outline-none font-mono text-sm"
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
            {minutes}
          </pre>
        )}
      </div>

       {/* Edit Agenda Modal */}
       <Modal isOpen={isAgendaModalOpen} onClose={() => setIsAgendaModalOpen(false)} title="Edit Agenda">
          <div className="space-y-4">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {editableAgenda.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-md">
                  <div className="col-span-5"><input type="text" placeholder="Title" value={item.title} onChange={e => handleEditableAgendaChange(index, 'title', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded" /></div>
                  <div className="col-span-4"><input type="text" placeholder="Presenter" value={item.presenter} onChange={e => handleEditableAgendaChange(index, 'presenter', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded" /></div>
                  <div className="col-span-2"><input type="number" placeholder="Mins" value={item.timeAllocation} onChange={e => handleEditableAgendaChange(index, 'timeAllocation', parseInt(e.target.value) || 0)} className="w-full text-sm p-1 border border-gray-300 rounded" /></div>
                  <div className="col-span-1 flex justify-end"><button onClick={() => removeEditableAgendaItem(index)} className="text-red-500 hover:text-red-700" aria-label="Remove item"><TrashIcon className="w-5 h-5" /></button></div>
                </div>
              ))}
            </div>
            <button onClick={addEditableAgendaItem} className="mt-3 flex items-center gap-2 text-sm text-brand-primary font-semibold hover:underline"><PlusIcon className="w-4 h-4" /> Add Item</button>
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
                  <div className="col-span-5"><input type="text" placeholder="Name" value={attendee.name} onChange={e => handleEditableAttendeeChange(index, 'name', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded" /></div>
                  <div className="col-span-4"><input type="email" placeholder="Email" value={attendee.email} onChange={e => handleEditableAttendeeChange(index, 'email', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded" /></div>
                  <div className="col-span-2"><select value={attendee.status} onChange={e => handleEditableAttendeeChange(index, 'status', e.target.value)} className="w-full text-sm p-1 border border-gray-300 rounded capitalize"><option value="present">Present</option><option value="absent">Absent</option><option value="guest">Guest</option></select></div>
                  <div className="col-span-1 flex justify-end"><button onClick={() => removeEditableAttendee(index)} className="text-red-500 hover:text-red-700" aria-label="Remove Attendee"><TrashIcon className="w-5 h-5" /></button></div>
                </div>
              ))}
            </div>
            <button onClick={addEditableAttendee} className="mt-3 flex items-center gap-2 text-sm text-brand-primary font-semibold hover:underline"><PlusIcon className="w-4 h-4" /> Add Attendee</button>
            <div className="flex justify-end pt-4 border-t mt-4">
              <button onClick={() => setIsAttendeesModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors mr-2">Cancel</button>
              <button onClick={handleSaveAttendees} className="bg-brand-primary hover:bg-blue-800 text-white font-bold py-2 px-6 rounded-lg transition-colors">Save Attendees</button>
            </div>
          </div>
        </Modal>
    </div>
  );
};

export default ReviewMinutes;