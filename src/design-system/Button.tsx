
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'aqua' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-mono font-black uppercase tracking-wider rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variantStyles = {
    primary: 'bg-[#1E3063] text-white hover:bg-[#121D33] focus:ring-[#00C9CE]/40 shadow-md hover:scale-[1.02]',
    gold: 'bg-[#00C9CE] text-[#1E3063] hover:bg-[#00b5b9] focus:ring-[#00C9CE]/40 shadow-md hover:scale-[1.02]',
    secondary: 'bg-[#2A3B7A] text-white hover:bg-[#1E3063] focus:ring-[#00C9CE]/40 shadow-sm',
    aqua: 'bg-[#00C9CE] text-[#0B1628] hover:bg-[#00b0b4] focus:ring-[#00C9CE]/40 shadow-md hover:scale-[1.02]',
    outline: 'border border-[#E2D8C7] text-[#1E3063] hover:bg-[#F6F1E8] focus:ring-[#1E3063]/20 bg-white',
    ghost: 'text-slate-300 hover:text-white hover:bg-white/10 focus:ring-white/20',
    danger: 'bg-[#991B1B] text-white hover:bg-[#7f1717] focus:ring-red-500/40 shadow-sm',
  };

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-xs',
    lg: 'px-7 py-3.5 text-xs',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

