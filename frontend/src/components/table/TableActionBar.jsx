import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const TableActionBar = ({ viewButton, editButton, deleteButton, identifier}) => {
  return (
    <div id="action-bar" className="flex flex-row justify-end gap-2 pr-[400px]">
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
    </div>
  );
};

export default TableActionBar;
