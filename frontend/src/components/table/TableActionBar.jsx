import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MessageIcon from "@mui/icons-material/Message"; // import a message icon


const TableActionBar = ({ viewButton, editButton, deleteButton, messageButton, identifier}) => {
  return (
    <div id="action-bar" className="flex flex-row justify-center items-center gap-2">
      {viewButton && (
        <IconButton
          onClick={() => {viewButton.onClick(identifier)}}
          sx={{ color: "#1E3A8A" }}
          title="View"
        >
          <VisibilityIcon />
        </IconButton>
      )}
      {editButton && (
        <IconButton
          onClick={() => {editButton.onClick(identifier)}}
          sx={{ color: "#065F46" }} // green-800
          title="Edit"
        >
          <EditIcon />
        </IconButton>
      )}
      {deleteButton && (
        <IconButton
          onClick={() => {deleteButton.onClick(identifier)}}
          sx={{ color: "#B91C1C" }} // red-700
          title="Delete"
        >
          <DeleteIcon />
        </IconButton>
      )}
      {messageButton && (
        <IconButton
          onClick={() => messageButton.onClick(identifier)}
          sx={{ color: "#2563EB" }} // blue-600
          title="Message"
        >
          <MessageIcon />
        </IconButton>
      )}
    </div>
  );
};

export default TableActionBar;
