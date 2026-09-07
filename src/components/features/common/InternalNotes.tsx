import { useState, type FormEvent } from 'react';
import { MessageSquare, Send, Lock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface Note {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  isPrivate: boolean;
}

interface InternalNotesProps {
  disputeId: string;
  initialNotes?: Note[];
  onAddNote?: (content: string, isPrivate: boolean) => void;
}

export default function InternalNotes({ 
  disputeId, 
  initialNotes = [], 
  onAddNote 
}: InternalNotesProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newNote, setNewNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const { user } = useAuth();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !user) return;

    const note: Note = {
      id: Date.now().toString(),
      content: newNote,
      author: user.name || user.email || 'Unknown',
      createdAt: new Date().toISOString(),
      isPrivate
    };

    setNotes([note, ...notes]);
    onAddNote?.(newNote, isPrivate);
    setNewNote('');
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add an internal note..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <MessageSquare className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
        </div>
        
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Lock className="h-4 w-4" />
            Private note
          </label>
          
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Add Note
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`p-3 rounded-lg ${
              note.isPrivate ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{note.author}</span>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {note.isPrivate && <Lock className="h-3 w-3" />}
                <span>{new Date(note.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <p className="text-sm text-gray-700">{note.content}</p>
          </div>
        ))}
        
        {notes.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-4">
            No internal notes yet
          </p>
        )}
      </div>
    </div>
  );
}
