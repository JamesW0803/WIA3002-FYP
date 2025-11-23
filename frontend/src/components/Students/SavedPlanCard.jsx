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
  CheckCircle2,
} from "lucide-react";

const SavedPlanCard = ({
  plan,
  type,
  onEdit,
  onDelete,
  onView,
  isOutdated = false,
  onSetCurrent,
}) => {
  const isCurrent = !!plan.isDefault;

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
    <Card
      className={`relative h-full flex flex-col transition-shadow border ${
        isOutdated
          ? "opacity-60"
          : isCurrent
          ? "border-emerald-400 shadow-md shadow-emerald-50"
          : "border-gray-200 hover:shadow-lg"
      }`}
    >
      {/* Outdated overlay */}
      {isOutdated && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-red-500/80 text-white text-xs sm:text-sm px-3 py-2 rounded-full shadow-lg">
            Plan is outdated – academic profile has advanced. Please edit or
            remove.
          </div>
        </div>
      )}

      {/* Card body */}
      <div className="p-5 flex-grow">
        {/* Header row */}
        <div className="flex justify-between items-start mb-4 gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-800 truncate">
              {plan.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Created {formatDate(plan.created)}
            </p>
          </div>

          <div className="flex items-center">
            {isCurrent ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Current plan
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] px-2 py-1 h-auto whitespace-nowrap"
                onClick={onSetCurrent}
              >
                <CalendarDays className="w-3 h-3 mr-1" />
                Set as current
              </Button>
            )}
          </div>
        </div>

        {/* Plan summary */}
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
            <div className="text-sm text-gray-600 bg-blue-50/60 border border-blue-100 p-3 rounded-md">
              <p className="font-medium mb-1">Notes</p>
              <p className="line-clamp-3">{plan.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 text-sm flex items-center justify-center gap-1"
            onClick={onView}
          >
            <Eye className="w-4 h-4" />
            <span>View</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-sm flex items-center justify-center gap-1"
            onClick={onEdit}
          >
            <Pencil className="w-4 h-4" />
            <span>Edit</span>
          </Button>
          <Button
            variant="destructive"
            className="flex-1 text-sm flex items-center justify-center gap-1"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SavedPlanCard;
