import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';


const SearchBar = () => {
    return (
        <TextField
            variant="outlined"
            placeholder="Search"
            // value={value}
            // onChange={onChange}
            size="small"
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                },
            }}
        />
    );
}

export default SearchBar;