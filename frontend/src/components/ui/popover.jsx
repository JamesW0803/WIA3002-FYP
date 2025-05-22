// frontend/src/components/ui/advanced-popover.jsx
import React, { useState, useRef, useEffect } from "react";

export const Popover = ({ children }) => {
  return <div className="relative inline-block">{children}</div>;
};

export const PopoverTrigger = ({ children, onClick }) => {
  return React.cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e);
      onClick?.(e);
    },
  });
};

export const PopoverContent = ({
  children,
  className = "",
  align = "center",
  sideOffset = 4,
  onClose,
  open,
  ...props
}) => {
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  const alignmentClasses = {
    start: "left-0",
    center: "left-1/2 transform -translate-x-1/2",
    end: "right-0",
  };

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      className={`absolute z-50 w-72 rounded-md border bg-white p-4 shadow-md outline-none animate-in fade-in-80 ${alignmentClasses[align]} ${className}`}
      style={{ marginTop: `${sideOffset}px` }}
      {...props}
    >
      {children}
    </div>
  );
};
