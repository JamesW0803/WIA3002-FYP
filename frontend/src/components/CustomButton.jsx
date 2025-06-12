import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

const CustomButton = ({ title , onClick}) => {
  return (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={onClick}
      sx={{
        backgroundColor: '#1E3A8A',
        color: 'white',
        '&:hover': {
          backgroundColor: '#1E40AF', // Slightly darker blue on hover
        },
        textTransform: 'none', // Optional: Prevents ALL CAPS
      }}
    >
      {title}
    </Button>
  );
};

export default CustomButton;
