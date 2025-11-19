import { CheckCircle, AlertTriangle, Clock, HelpCircle } from "lucide-react";

export const STATUS_STYLES = {
  on_track: {
    label: "On Track",
    icon: CheckCircle,
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
  },
  at_risk: {
    label: "At Risk",
    icon: AlertTriangle,
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-300",
  },
  delayed: {
    label: "Delayed",
    icon: Clock,
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
  },
};
