
import { AgendaItem } from './types';

export const MEETING_TEMPLATES: { name: string; agenda: Omit<AgendaItem, 'id' | 'notes'>[] }[] = [
  {
    name: 'Quarterly Board Meeting',
    agenda: [
      { title: 'Call to Order', presenter: 'Chairperson', timeAllocation: 5 },
      { title: 'Approval of Previous Minutes', presenter: 'Secretary', timeAllocation: 10 },
      { title: 'CEO Report', presenter: 'CEO', timeAllocation: 20 },
      { title: 'Financial Review', presenter: 'CFO', timeAllocation: 30 },
      { title: 'Committee Updates', presenter: 'Committee Heads', timeAllocation: 25 },
      { title: 'New Business', presenter: 'Chairperson', timeAllocation: 20 },
      { title: 'Adjournment', presenter: 'Chairperson', timeAllocation: 5 },
    ],
  },
  {
    name: 'Annual General Meeting (AGM)',
    agenda: [
      { title: 'Welcome and Opening Remarks', presenter: 'Chairperson', timeAllocation: 10 },
      { title: 'Confirmation of Quorum', presenter: 'Secretary', timeAllocation: 5 },
      { title: 'Adoption of Agenda', presenter: 'Chairperson', timeAllocation: 5 },
      { title: 'Approval of Last AGM Minutes', presenter: 'Secretary', timeAllocation: 10 },
      { title: 'President\'s Report', presenter: 'President', timeAllocation: 15 },
      { title: 'Treasurer\'s Report & Financial Statements', presenter: 'Treasurer', timeAllocation: 20 },
      { title: 'Election of Board Members', presenter: 'Nominating Chair', timeAllocation: 30 },
      { title: 'Appointment of Auditors', presenter: 'Chairperson', timeAllocation: 10 },
      { title: 'Other Business', presenter: 'Chairperson', timeAllocation: 15 },
      { title: 'Adjournment', presenter: 'Chairperson', timeAllocation: 5 },
    ],
  },
  {
    name: 'Blank Meeting',
    agenda: [],
  },
];
