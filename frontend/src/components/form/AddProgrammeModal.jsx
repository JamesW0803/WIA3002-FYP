import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem
} from "@mui/material";
import { programmeFormFields } from "../../constants/programmeFormConfig";

const AddProgrammeModal = ({ open, onClose, onSave, formData, handleInputChange }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Programme</DialogTitle>
      <DialogContent dividers>
        {programmeFormFields.map((field) => (
          field.type === "text" ? (
            <TextField
              key={field.key}
              label={field.label}
              value={formData[field.key] || ""}
              onChange={(e) => handleInputChange(field.key)(e)}
              margin="normal"
              fullWidth
            />
          ) : field.type === "select" ? (
            <TextField
              key={field.key}
              label={field.label}
              select
              value={formData[field.key] || ""}
              onChange={(e) => handleInputChange(field.key)(e)}
              margin="normal"
              fullWidth
            >
              {field.options.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          ) : null
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button onClick={onSave} color="primary" variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddProgrammeModal;
