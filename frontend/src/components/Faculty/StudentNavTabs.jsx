const StudentNavTabs = ({ tabs, activeTab, setActiveTab }) => {

  return (
    <div className="ml-20 mt-10"> {/* Add some left margin */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={`text-center py-3 px-4 text-sm font-semibold transition-all duration-200
                ${
                  isActive
                    ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                    : "text-gray-500 hover:text-gray-700 bg-gray-50"
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StudentNavTabs;
