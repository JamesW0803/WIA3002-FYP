import { Select, MenuItem, FormControl, Box, Typography } from "@mui/material";
import FilterListAltIcon from '@mui/icons-material/FilterListAlt';
import { styled } from "@mui/material/styles";

const NoArrowSelect = styled(Select)(({ theme }) => ({
  "& .MuiSelect-icon": {
    display: "none", // Hides the default dropdown arrow
  },
  "&.MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
    border: "none", // Remove the border
  },
  paddingLeft: theme.spacing(1),
  paddingRight: theme.spacing(1),
  minWidth: 120,
}));

const Filter = ({ value, onChange }) => {
  return (
    <FormControl variant="outlined" size="small">
      <NoArrowSelect
        value={value}
        onChange={onChange}
        displayEmpty
        renderValue={(selected) => (
          <Box display="flex" alignItems="center" gap={1}>
            <FilterListAltIcon />
            <Typography>
              {selected ? selected : "Filter"}
            </Typography>
          </Box>
        )}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="compulsory">Compulsory</MenuItem>
        <MenuItem value="elective">Elective</MenuItem>
      </NoArrowSelect>
    </FormControl>
  );
};

export default Filter;
