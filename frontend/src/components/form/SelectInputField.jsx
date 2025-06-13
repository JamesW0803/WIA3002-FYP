import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

const SelectInputField = ({ label , options , value , onChange}) => {
  return (
    <div className="flex items-center gap-4 mb-4 ml-5">
      <label className="w-40 text-left font-medium">{label}</label>
      <FormControl className="w-[500px]">
        <InputLabel>{label}</InputLabel>
        <Select
          value={value}
          onChange={onChange}
          label={label}
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
