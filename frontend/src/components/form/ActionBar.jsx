import Button from "../CustomButton"

const ActionBar = ({ button1 , button2 }) => {
  return (
    <div id="action-bar" className="flex flex-row justify-end pr-[400px]">
        <Button
          title={button1.title}
          onClick={button1.onClick}
          sx={{
            backgroundColor: '#E5E7EB', // Tailwind's gray-200
            color: '#000000', // black
            '&:hover': {
              backgroundColor: '#D1D5DB' // slightly darker gray
            },
            mx : 1,
            my : 2
          }}        
        />
        <Button
          title={button2.title}
          onClick={button2.onClick}
          sx={{
            backgroundColor: '#1E3A8A', // blue-800
            color: 'white',
            '&:hover': {
              backgroundColor: '#1E40AF', // blue-900
            },
            mx : 1,
            my : 2
          }}        
        />    
    </div>
  );
};

export default ActionBar;
