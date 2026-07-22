import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-display font-bold border-3 border-black transition-all duration-100 ease-out shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[1px_1px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]',
  {
    variants: {
      variant: {
        primary: 'bg-ocean-mid text-white hover:bg-ocean-light',
        success: 'bg-accent-green text-storm-dark hover:bg-green-500',
        danger: 'bg-warning-red text-white hover:bg-red-600',
        ghost: 'bg-transparent text-white border-white/30 shadow-none hover:bg-white/10 hover:shadow-none active:shadow-none',
        locked: 'bg-storm-dark text-storm-light border-storm-light/30 shadow-none cursor-not-allowed',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-7 py-3 text-base',
        full: 'w-full px-5 py-2.5 text-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
