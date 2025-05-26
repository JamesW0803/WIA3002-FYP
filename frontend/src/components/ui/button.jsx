export const Button = ({
  children,
  className = "",
  type = "button",
  variant = "default",
  size = "default",
  ...props
}) => {
  const baseStyles =
    "flex items-center justify-center gap-1 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E3A8A]";

  const sizeStyles = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
    lg: "px-6 py-3 text-base",
  };

  const variants = {
    default: "bg-[#1E3A8A] text-white hover:bg-[#172B6D] shadow-sm",
    defaultWithIcon:
      "bg-[#1E3A8A] text-white hover:bg-[#172B6D] shadow-sm flex-row gap-2",
    outline: "border border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#F0F4FF]",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 border border-transparent",
    success: "bg-green-600 text-white hover:bg-green-700",
    ghost: "hover:bg-gray-100 text-gray-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
