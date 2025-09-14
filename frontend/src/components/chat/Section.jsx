import ListSkeleton from "./ListSkeleton";
import { motion } from "framer-motion";

function Section({ title, children, loading, count }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-6"
    >
      {title && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs uppercase font-medium text-gray-500 tracking-wider">
            {title} {count !== undefined && `(${count})`}
          </h3>
          {loading && (
            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
      {loading ? <ListSkeleton /> : children}
    </motion.div>
  );
}

export default Section;
