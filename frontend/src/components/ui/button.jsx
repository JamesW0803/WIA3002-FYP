import React from "react";

export const Button = ({
  children,
  className = "",
  type = "button",
  variant = "default",
  ...props
}) => {
  const baseStyles = "rounded-xl font-semibold px-4 py-2 transition";

  const variants = {
    default:
      "bg-[#1E3A8A] text-white hover:bg-white hover:text-[#1E3A8A] border border-[#1E3A8A]",
    outline: "border border-gray-400 text-gray-800 bg-white hover:bg-gray-100",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
