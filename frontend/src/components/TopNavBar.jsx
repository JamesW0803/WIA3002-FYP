import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { STUDENT_NAV_ITEMS, ADMIN_NAV_ITEMS } from  '../constants/navItems';
import LogoFrame from "./LogoFrame"
import Logo from "../assets/logo.svg";


const TopNavBar = () => {
    const { user } = useAuth();
    const navItems = user.role === "student" ? STUDENT_NAV_ITEMS : ADMIN_NAV_ITEMS;
    console.log("user role", user.role)
    return (
        <div 
            id="topNavBar"
            className = "flex items-center p-4 w-full pl-52" 
        >
            <LogoFrame img={Logo} title="Plan It"/>
            {navItems.map( (item) => {
                return (
                    <Link 
                        to={item.path}
                        className = "mx-10 font-bold text-[#1E3A8A]"
                    > 
                        {item.title} 
                    </Link>
                )
            })}
        </div>
    )
}

 export default TopNavBar;