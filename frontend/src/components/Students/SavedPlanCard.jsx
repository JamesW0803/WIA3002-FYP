import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  CalendarDays,
  BookOpenText,
  LineChart,
  LibraryBig,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  MoreVertical,
  Send,
} from "lucide-react";

const SavedPlanCard = ({
  plan,
  type,
  onEdit,
  onDelete,
  onView,
  isOutdated = false,
  onSetCurrent,
  onSendToAdvisor, // ✅ NEW
}) => {
  const isCurrent = plan.isDefault;

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

  // --- Menu UX ---
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    const onMouseDown = (e) => {
      const menuEl = menuRef.current;
      const btnEl = btnRef.current;
      if (!menuEl || !btnEl) return;

      // close if click is outside both the menu and the trigger button
      if (!menuEl.contains(e.target) && !btnEl.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [menuOpen]);

  const canMarkCurrent = !isOutdated && !isCurrent && !!onSetCurrent;
  const canSendAdvisor = !isOutdated && !isCurrent;

  const handleMarkCurrent = async () => {
    setMenuOpen(false);
    if (!canMarkCurrent) return;
    await onSetCurrent();
  };

  const handleSendAdvisor = () => {
    setMenuOpen(false);
    if (!canSendAdvisor) return;
    onSendToAdvisor(plan);
  };

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

          {/* Right side: badge + Send button */}
          <div className="flex items-center gap-2 flex-shrink-0 self-start">
            {isCurrent && (
              <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Current plan
              </span>
            )}

            {canSendAdvisor && (
              <button
                type="button"
                onClick={handleSendAdvisor}
                disabled={!canSendAdvisor}
                className={`p-2 rounded-full transition-colors
                  ${
                    canSendAdvisor
                      ? "hover:bg-gray-100 text-gray-700"
                      : "text-gray-400 cursor-not-allowed"
                  }`}
                title="Send to advisor"
              >
                <Send className="w-5 h-5" />
              </button>
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

      {/* Actions (keep your existing buttons) */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 text-sm flex items-center justify-center gap-2"
            onClick={onView}
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          {!isCurrent && (
            <Button
              variant="outline"
              className="flex-1 text-sm flex items-center justify-center gap-2"
              onClick={onEdit}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          )}
          {!isCurrent && (
            <Button
              variant="outline"
              className="flex-1 text-sm flex items-center justify-center gap-2 text-red-600 hover:text-red-700"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SavedPlanCard;
