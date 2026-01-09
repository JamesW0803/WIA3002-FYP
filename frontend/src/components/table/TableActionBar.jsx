import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MessageIcon from "@mui/icons-material/Message"; // import a message icon


const TableActionBar = ({ viewButton, editButton, deleteButton, messageButton, identifier, item}) => {
  const isEditable = item?.find(d => d.isEditable !== undefined)?.isEditable ?? true;
  const isDeletable = item?.find(d => d.isDeletable !== undefined)?.isDeletable ?? false;

  return (
    <td className="px-6 py-4">
      <div className="flex flex-row justify-center items-center gap-1">
        {viewButton && (
          <IconButton
            onClick={() => {viewButton.onClick(identifier)}}
            size="small"
            sx={{ 
              color: "#3B82F6",
              "&:hover": { 
                backgroundColor: "#EFF6FF",
                color: "#1E40AF"
              }
            }}
            title="View"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        )}
        {messageButton && (
          <IconButton
            onClick={() => messageButton.onClick(identifier)}
            size="small"
            sx={{ 
              color: "#8B5CF6",
              "&:hover": { 
                backgroundColor: "#F5F3FF",
                color: "#6D28D9"
              }
            }}
            title="Message"
          >
            <MessageIcon fontSize="small" />
          </IconButton>
        )}
        {editButton && isEditable &&  (
          <IconButton
            onClick={() => {editButton.onClick(identifier)}}
            size="small"
            sx={{ 
              color: "#10B981",
              "&:hover": { 
                backgroundColor: "#ECFDF5",
                color: "#059669"
              }
            }}
            title="Edit"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}
        {deleteButton && isDeletable&& (
          <IconButton
            onClick={() => {deleteButton.onClick(identifier)}}
            size="small"
            sx={{ 
              color: "#EF4444",
              "&:hover": { 
                backgroundColor: "#FEF2F2",
                color: "#DC2626"
              }
            }}
            title="Delete"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </div>
    </td>
  );
};

export default TableActionBar;
