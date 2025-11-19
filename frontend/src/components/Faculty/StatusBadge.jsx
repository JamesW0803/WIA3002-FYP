import { Tooltip } from "react-tooltip";
import { Info } from "lucide-react";
import { STATUS_STYLES } from "../../constants/statusStyle";

const StatusBadge = ({ status, notes = null }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES["unknown"];

  return (
    <div className="inline-flex items-center space-x-2">
      {/* Badge */}
        <Bagde style={style} Icon={style.icon}/>

      {/* Reason tooltip if exists */}
        {notes && <StatusNotes status={status} notes={notes}/>}
    </div>
  );
};

const Bagde = ({ style , Icon}) => {
    return (
        <div
            className={`inline-flex items-center px-3 py-1 rounded-full border 
            ${style.bg} ${style.text} ${style.border} 
            whitespace-nowrap select-none cursor-default`}
        >
            <Icon size={16} className="mr-1" />
            <span className="text-sm font-medium">{style.label}</span>
      </div>
    )
}

const StatusNotes = ({ status , notes }) => {
    return (
        <div className="relative flex items-center">
            <Info
            size={16}
            data-tooltip-id={`notes-${status}`}
            className="cursor-pointer text-gray-500"
            />
            <Tooltip id={`notes-${status}`} place="right">
                {notes.map((note, index) => <div key={index}> {index+1}) {note}</div>) }
            </Tooltip>
        </div>
    )
}

export default StatusBadge;
