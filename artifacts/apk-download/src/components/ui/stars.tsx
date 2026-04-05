import { cn } from "@/lib/utils";
import { Star, StarHalf } from "lucide-react";

interface StarsProps {
  rating: number;
  className?: string;
  size?: number;
}

export function Stars({ rating, className, size = 16 }: StarsProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn("flex items-center space-x-0.5", className)}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          size={size}
          className="fill-primary text-primary"
          strokeWidth={0}
        />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star size={size} className="text-muted-foreground" strokeWidth={1.5} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star size={size} className="fill-primary text-primary" strokeWidth={0} />
          </div>
        </div>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          size={size}
          className="text-muted-foreground"
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}