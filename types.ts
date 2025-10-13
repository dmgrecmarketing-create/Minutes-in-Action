
export interface Attendee {
  id: string;
  name: string;
  email: string;
  status: 'present' | 'absent' | 'guest';
}

export interface AgendaItem {
  id: string;
  title: string;
  presenter: string;
  timeAllocation: number; // in minutes
  notes: string;
}

export interface ActionItem {
  id: string;
  description: string;
  ownerId: string;
  dueDate: string;
  agendaItemId: string;
}

export interface Decision {
  id: string;
  motion: string;
  moverId: string;
  seconderId: string;
  outcome: 'carried' | 'defeated' | 'tabled';
  agendaItemId: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: string;
  attendees: Attendee[];
  agenda: AgendaItem[];
  actionItems: ActionItem[];
  decisions: Decision[];
  status: 'scheduled' | 'inprogress' | 'completed';
}
