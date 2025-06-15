import TextField from '@mui/material/TextField';

const TextInputField = ({ label , value , onChange , editMode = true , size = "medium"}) => {
    return (
        <div className="flex items-center gap-4 mb-4 ml-5">
            <label className="w-80 text-left font-semibold mr-10">{label}</label>
            <TextField 
                id="outlined-basic" 
                label={editMode ? label : undefined} // only show label in edit mode
                value={value}
                onChange={onChange}
                disabled={!editMode}
                variant="outlined"
                fullWidth
                multiline
                size={size}
                sx={{
                    '& .MuiInputBase-input.Mui-disabled': {
                        fontWeight: 'normal',
                        WebkitTextFillColor: 'black', // override the greyed-out text color
                    },
                    '& fieldset': {
                        border: !editMode ? 'none' : undefined,
                    },
                    
                }}
            />
        </div>
    )
}

export default TextInputField;