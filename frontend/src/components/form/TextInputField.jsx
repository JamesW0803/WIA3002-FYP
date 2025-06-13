import TextField from '@mui/material/TextField';

const TextInputField = ({ label , value , onChange }) => {
    return (
        <div className="flex items-center gap-4 mb-4 ml-5">
            <label className="w-40 text-left font-medium">{label}</label>
            <TextField 
                id="outlined-basic" 
                label={label} 
                value={value}
                onChange={onChange}
                variant="outlined"
            />
        </div>
    )
}

export default TextInputField;