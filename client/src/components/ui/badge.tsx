import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border-2 border-black px-2.5 py-0.5 text-[10px] font-display font-bold uppercase tracking-wider transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-accent-yellow text-storm-dark border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]',
        secondary:
          'bg-storm-mid text-white border-black/50 shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]',
        success:
          'bg-accent-green text-storm-dark border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]',
        locked:
          'bg-storm-dark/80 text-storm-light border-storm-light/30',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
