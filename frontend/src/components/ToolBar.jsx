import SearchBar from "./SearchBar";
import Filter from "./Filter";
import CustomButton from "./CustomButton"
import AddIcon from '@mui/icons-material/Add';

const ToolBar = ({searchBar, filter, button, addButton = true}) => {


    return (
        <div id="tool-bar" className="flex flex-row justify-between mx-10 mt-10">
            <SearchBar/>
            <div id="tool-bar-right-session">
                <Filter/>
                {addButton && 
                    <CustomButton
                        title = {button.title}
                        onClick={button.onClick}
                        startIcon={<AddIcon/>}
                    />
                }
            </div>
        </div>
    )
}

export default ToolBar;