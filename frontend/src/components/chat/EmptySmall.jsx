import { MessageSquarePlus } from "lucide-react";

function EmptySmall({ icon: Icon = MessageSquarePlus, title, subtitle }) {
  return (
    <div className="p-6 border border-dashed rounded-xl text-center text-gray-500">
      <Icon className="w-6 h-6 mx-auto mb-2" />
      <div className="text-sm font-medium text-gray-700">{title}</div>
      <div className="text-xs">{subtitle}</div>
    </div>
  );
}

export default EmptySmall;
