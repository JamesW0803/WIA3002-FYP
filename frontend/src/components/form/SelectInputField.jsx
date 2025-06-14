import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

const SelectInputField = ({ label , options , value , onChange, editMode = true}) => {
  console.log("options: "   ,options)
  return (
    <div className="flex items-center gap-4 mb-4 ml-5">
      <label className="w-40 text-left font-semibold">{label}</label>
      <FormControl fullWidth> 
        {editMode && <InputLabel>{label}</InputLabel>}
        <Select
          value={value}
          onChange={onChange}
          label={editMode ? label : undefined}
          disabled={!editMode}
          IconComponent={editMode ? undefined : () => null} // Conditional icon

          sx={{
            '& .MuiInputBase-input.Mui-disabled': {
              fontWeight: 'normal',
              WebkitTextFillColor: 'black', // make disabled text black
            },
            '& fieldset': {
              border: !editMode ? 'none' : undefined, // remove border when not editing
            },
            '& .MuiSelect-select': {
              paddingTop: '10px',
              paddingBottom: '10px',
            },
          }}
        >
          {options.map((option) => (
            <MenuItem key={option.label} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
};

export default SelectInputField;
