import React from "react";

export const Textarea = React.forwardRef((props, ref) => {
  const { className = "", ...rest } = props;

  return (
    <textarea
      ref={ref}
      className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...rest}
    />
  );
});

Textarea.displayName = "Textarea";
