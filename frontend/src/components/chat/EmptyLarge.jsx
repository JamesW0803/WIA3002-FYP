import { MessageSquarePlus, Bot } from "lucide-react";
import { motion } from "framer-motion";

function EmptyLarge({ title, subtitle, icon: Icon = MessageSquarePlus }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full w-full flex flex-col items-center justify-center text-center text-gray-500 p-8"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center">
          <Icon className="w-10 h-10 text-brand" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand rounded-full flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-lg font-semibold text-gray-700">{title}</div>
        <div className="text-sm text-gray-500 max-w-md">{subtitle}</div>
      </div>
    </motion.div>
  );
}

export default EmptyLarge;
