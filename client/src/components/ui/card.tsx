import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-3 border-black bg-ocean-mid/90 shadow-[6px_6px_0_0_rgba(0,0,0,1)]',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-1.5 p-4 pt-3', className)} {...props} />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'font-display text-base text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('font-body text-xs text-white/70 leading-relaxed', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2 mb-1', className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4 pt-0', className)} {...props} />
  );
}

interface CardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  overlay?: boolean;
}

function CardImage({ className, overlay = true, alt, ...props }: CardImageProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-t-[1px]">
      <img
        className={cn(
          'aspect-video w-full object-cover',
          overlay && 'brightness-60',
          className,
        )}
        alt={alt ?? ''}
        {...props}
      />
      {overlay && (
        <div className="absolute inset-0 bg-black/35" />
      )}
    </div>
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
  CardImage,
};
