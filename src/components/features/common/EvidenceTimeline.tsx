import { Clock, User, FileText, AlertTriangle } from 'lucide-react';
import { timeAgo } from '../../../utils/helpers';

interface TimelineEvent {
  id: string;
  type: 'upload' | 'note' | 'status_change' | 'escalation';
  description: string;
  user?: string;
  timestamp: string;
  details?: string;
}

interface EvidenceTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export default function EvidenceTimeline({ events, className = '' }: EvidenceTimelineProps) {
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'upload':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'note':
        return <User className="h-4 w-4 text-gray-500" />;
      case 'status_change':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'escalation':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'upload':
        return 'border-l-blue-500';
      case 'note':
        return 'border-l-gray-400';
      case 'status_change':
        return 'border-l-yellow-500';
      case 'escalation':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-400';
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No activity yet
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {events.map((event, index) => (
        <div
          key={event.id}
          className={`relative pl-6 border-l-2 ${getEventColor(event.type)} pb-4 last:pb-0`}
        >
          <div className="absolute -left-3 top-0 bg-white p-1">
            {getEventIcon(event.type)}
          </div>

          <div className="ml-4">
            <p className="text-sm font-medium text-gray-900">{event.description}</p>

            {event.details && (
              <p className="mt-1 text-sm text-gray-600">{event.details}</p>
            )}

            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              {event.user && <span>by {event.user}</span>}
              <span>{timeAgo(event.timestamp)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
