import { Construction } from "lucide-react";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50">
      <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 shadow-inner">
        <Construction className="w-12 h-12" />
      </div>
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500">Fitur ini sedang dalam tahap pengembangan. Silakan kembali lagi nanti.</p>
    </div>
  );
}
