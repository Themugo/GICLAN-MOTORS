// Admin Table Row Component
// Reusable row component for admin tables

import { MoreVertical, Edit, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface Action {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'default';
}

interface AdminTableRowProps {
  id: string | number;
  columns: string[];
  actions?: Action[];
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  className?: string;
}

export function AdminCarRow({
  car,
  onView,
  onEdit,
  onDelete
}: {
  car: any;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {car.image && (
            <img
              src={car.image}
              alt={car.title}
              loading="lazy"
              decoding="async"
              className="w-12 h-12 object-cover rounded"
            />
          )}
          <div>
            <p className="font-medium">{car.title || car.brand}</p>
            <p className="text-sm text-gray-500">{car.year} • {car.mileage?.toLocaleString()} km</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="font-semibold">KES {(car.price || 0).toLocaleString()}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          car.status === 'active' ? 'bg-green-100 text-green-700' :
          car.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {car.status || 'Unknown'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {onView && (
            <button onClick={onView} className="p-1 hover:bg-gray-100 rounded">
              <Eye className="h-4 w-4 text-gray-500" />
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} className="p-1 hover:bg-gray-100 rounded">
              <Edit className="h-4 w-4 text-blue-500" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1 hover:bg-gray-100 rounded">
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function AdminUserRow({
  user,
  onView,
  onSuspend,
  onDelete
}: {
  user: any;
  onView?: () => void;
  onSuspend?: () => void;
  onDelete?: () => void;
}) {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-medium">
              {user.name?.[0] || user.email?.[0] || '?'}
            </span>
          </div>
          <div>
            <p className="font-medium">{user.name || 'Unknown'}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
          user.role === 'dealer' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {user.role || 'user'}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          user.status === 'active' ? 'bg-green-100 text-green-700' :
          user.status === 'suspended' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {user.status || 'pending'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {onView && (
            <button onClick={onView} className="p-1 hover:bg-gray-100 rounded">
              <Eye className="h-4 w-4 text-gray-500" />
            </button>
          )}
          {onSuspend && (
            <button onClick={onSuspend} className="p-1 hover:bg-gray-100 rounded">
              <XCircle className="h-4 w-4 text-yellow-500" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1 hover:bg-gray-100 rounded">
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default AdminCarRow;
