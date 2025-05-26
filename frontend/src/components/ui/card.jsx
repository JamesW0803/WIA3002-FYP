export const Card = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-[#1E3A8A]/20 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardContent = ({ className = "", children, ...props }) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};
