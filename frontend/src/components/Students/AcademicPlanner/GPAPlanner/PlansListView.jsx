import React from "react";
import { Card } from "../../../ui/card";
import { Plus } from "lucide-react";
import SavedPlanCard from "../../SavedPlanCard";

const PlansListView = ({
  gpaForecasts,
  onView,
  onEdit,
  onDelete,
  onCreateNew,
}) => {
  return (
    <div className="mb-8">
      <h4 className="font-medium text-[#1E3A8A] mb-4">
        Your Saved GPA Forecasts
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gpaForecasts.map((forecast) => (
          <SavedPlanCard
            key={forecast.id}
            plan={forecast}
            type="gpa"
            onView={() => onView(forecast)}
            onEdit={() => onEdit(forecast)}
            onDelete={() => onDelete(forecast.id)}
          />
        ))}
        <NewPlanCard onCreate={onCreateNew} />
      </div>
    </div>
  );
};

const NewPlanCard = ({ onCreate }) => (
  <div onClick={onCreate} className="min-h-[300px] cursor-pointer">
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col border-dashed border-2 border-gray-300 hover:border-blue-300">
      <div className="p-5 flex-grow flex flex-col items-center justify-center text-center">
        <Plus className="w-8 h-8 text-gray-400 mb-2" />
        <h3 className="text-lg font-medium text-gray-600 mb-1">
          Create New GPA Forecast
        </h3>
        <p className="text-sm text-gray-500">
          Simulate different grade scenarios
        </p>
      </div>
    </Card>
  </div>
);

export default PlansListView;
