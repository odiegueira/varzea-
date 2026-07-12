import { Shield } from "lucide-react";

export function TeamCrest({ url, name, className = "h-full w-full object-contain" }: { url: string | null; name: string; className?: string }) {
  if (url) {
    return <img src={url} alt={name} className={className} loading="lazy" />;
  }
  return (
    <div className={`flex items-center justify-center h-full w-full text-primary ${className}`}>
      <Shield className="h-2/3 w-2/3" strokeWidth={1.5} />
    </div>
  );
}