import { useState } from 'react';
import { User } from 'lucide-react';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const statusSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
};

const statusColors = {
  online: 'bg-emerald-500',
  offline: 'bg-gray-400',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-rose-500',
    'bg-pink-500',
    'bg-fuchsia-500',
    'bg-purple-500',
    'bg-violet-500',
    'bg-indigo-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-emerald-500',
    'bg-green-500',
    'bg-lime-500',
    'bg-amber-500',
    'bg-orange-500',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({
  src,
  alt,
  name = 'User',
  size = 'md',
  shape = 'circle',
  status,
  className = '',
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = src && !imageError;
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div className={`relative inline-flex ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={alt || name}
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
          className={`
            ${sizes[size]}
            ${shapeClass}
            object-cover
          `}
        />
      ) : (
        <div
          className={`
            ${sizes[size]}
            ${shapeClass}
            ${bgColor}
            flex items-center justify-center
            font-semibold text-white
          `}
        >
          {initials || <User size={Number(size.replace('xl', '16').replace('lg', '12').replace('md', '10').replace('sm', '8').replace('xs', '6'))} />}
        </div>
      )}

      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            ${statusSizes[size]}
            ${statusColors[status]}
            ${shape === 'circle' ? 'rounded-full' : 'rounded'}
            border-2 border-white
          `}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

// Avatar Group Component
export interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    name: string;
  }>;
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = 'md',
  className = '',
}: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visible.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          name={avatar.name}
          size={size}
          className="ring-2 ring-white"
        />
      ))}

      {remaining > 0 && (
        <div
          className={`
            ${sizes[size]}
            rounded-full
            bg-[var(--surface)]
            border-2 border-white
            flex items-center justify-center
            text-xs font-medium text-[var(--text-secondary)]
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default Avatar;
