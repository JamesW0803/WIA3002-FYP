import React from "react";

const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 sm:py-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-gray-600 text-sm sm:text-base mt-1">
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* anything you pass (e.g., buttons) will render here */}
        {actions ? <div className="flex-shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
};

export default PageHeader;
