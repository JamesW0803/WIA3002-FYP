import Button from '@mui/material/Button';

const CustomButton = ({ 
  title, 
  onClick, 
  startIcon = null, 
  variant = 'contained',
  sx = {},
  ...props
 }) => {

  const defaultStyles = {
    backgroundColor: variant === 'contained' ? '#1E3A8A' : 'transparent',
    color: variant === 'contained' ? 'white' : '#1E3A8A',
    borderColor: variant === 'outlined' ? '#1E3A8A' : undefined,
    textTransform: 'none',
    '&:hover': {
      backgroundColor:
        variant === 'contained' ? '#1E40AF' : '#EEF2FF',
      borderColor: variant === 'outlined' ? '#1E40AF' : undefined,
    },
  };

  return (
    <Button
      variant={variant}
      startIcon={startIcon}
      onClick={onClick}
      sx={{ ...defaultStyles, ...sx }}
      {...props}
    >
      {title}
    </Button>
  );
};

export default CustomButton;
