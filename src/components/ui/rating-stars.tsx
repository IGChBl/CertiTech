import { Star } from "lucide-react";

export function RatingStars({ rating, count }: { rating: number; count?: number }) {
  const rounded = Math.round(rating);

  return (
    <div className="inline-flex items-center gap-1.5 text-amber-500">
      <div className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((index) => (
          <Star key={index} className={`h-4 w-4 ${index <= rounded ? "fill-current" : "text-slate-300"}`} />
        ))}
      </div>
      <span className="text-sm font-medium text-slate-700">
        {rating.toFixed(1)}
        {count !== undefined ? ` (${count})` : ""}
      </span>
    </div>
  );
}
