import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-3',
  lg: 'h-12 w-12 border-4',
};

const LoadingSpinner = ({
  size = 'md',
  className,
  ...props
}: LoadingSpinnerProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'animate-spin rounded-full border-primary border-t-transparent',
          sizeClasses[size]
        )}
      />
    </div>
  );
};

export default LoadingSpinner;
