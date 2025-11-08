import React from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  CalendarDays,
  BookOpenText,
  LineChart,
  LibraryBig,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";

const SavedPlanCard = ({ plan, type, onEdit, onDelete, onView }) => {
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const computeTotalCredits = (plan) =>
    (plan?.years || []).reduce(
      (t, y) =>
        t +
        (y.semesters || []).reduce(
          (s, sem) =>
            s +
            (sem.courses || []).reduce((cTot, c) => cTot + (c?.credit || 0), 0),
          0
        ),
      0
    );

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {formatDate(plan.created)}
          </span>
        </div>

        <div className="space-y-3 mb-4">
          {type === "program" ? (
            <>
              <div className="flex items-center text-sm gap-2">
                <CalendarDays className="w-4 h-4 text-gray-500" />
                <span>{plan.semesters} semesters</span>
              </div>
              <div className="flex items-center text-sm gap-2">
                <BookOpenText className="w-4 h-4 text-gray-500" />
                <span>{computeTotalCredits(plan)} total credits</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center text-sm gap-2">
                <LineChart className="w-4 h-4 text-gray-500" />
                <span>
                  Current: {Number(plan.currentGPA).toFixed(2)} | Target:{" "}
                  {plan.targetGPA
                    ? Number(plan.targetGPA).toFixed(2)
                    : "Not set"}
                </span>
              </div>
              <div className="flex items-center text-sm gap-2">
                <LibraryBig className="w-4 h-4 text-gray-500" />
                <span>{plan.terms} terms forecast</span>
              </div>
            </>
          )}

          {plan.notes && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              <p className="font-medium mb-1">Notes:</p>
              <p>{plan.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:justify-between">
          {[
            {
              icon: <Eye className="w-4 h-4" />,
              text: "View",
              action: onView,
              variant: "outline",
            },
            {
              icon: <Pencil className="w-4 h-4" />,
              text: "Edit",
              action: onEdit,
              variant: "outline",
            },
            {
              icon: <Trash2 className="w-4 h-4" />,
              text: "Delete",
              action: onDelete,
              variant: "destructive",
            },
          ].map((btn, index) => (
            <Button
              key={index}
              variant={btn.variant}
              className="flex-1 text-sm flex flex-col items-center justify-center h-full py-2 px-1"
              onClick={btn.action}
            >
              <div className="flex flex-col items-center gap-1">
                {btn.icon}
                <span>{btn.text}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default SavedPlanCard;
