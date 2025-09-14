const dateLabel = (d) => {
  const date = new Date(d);
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
};

function DateChip({ when }) {
  return (
    <div className="flex items-center my-6">
      <div className="flex-1 border-t border-gray-200" />
      <span className="px-4 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-full shadow-sm">
        {dateLabel(when)}
      </span>
      <div className="flex-1 border-t border-gray-200" />
    </div>
  );
}

export default DateChip;
