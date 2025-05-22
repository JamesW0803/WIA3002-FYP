import React from "react";

export const Card = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`bg-white rounded-2xl shadow-md border border-gray-200 p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardContent = ({ className = "", children, ...props }) => {
  return (
    <div className={`p-2 ${className}`} {...props}>
      {children}
    </div>
  );
};
