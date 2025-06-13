import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { STUDENT_NAV_ITEMS, ADMIN_NAV_ITEMS } from "../constants/navItems";
import LogoFrame from "./LogoFrame";
import Logo from "../assets/logo.svg";
import { UserCircle } from "lucide-react";

const TopNavBar = () => {
  const { user } = useAuth();
  const navItems =
    user?.role === "student" ? STUDENT_NAV_ITEMS : ADMIN_NAV_ITEMS;

  const location = useLocation();

  return (
    <div
      id="topNavBar"
      className="flex items-center justify-between px-24 py-4 shadow-md bg-white sticky top-0 z-50"
    >
      {/* Left side - Logo only */}
      <div>
        <LogoFrame img={Logo} title="Plan It" />
      </div>

      {/* Right side - Navigation Items and Profile Icon */}
      <div className="flex items-center gap-16">
        {/* Navigation Items */}
        {navItems.map((item) => {
          if (item.submenu) {
            const isAnySubItemActive = item.submenu.some(
              (subItem) => location.pathname === subItem.path
            );

            return (
              <div
                className="relative group h-full flex items-center"
                key={item.title}
              >
                <div
                  className={`font-semibold text-[#1E3A8A] h-full flex items-center border-b-2 ${
                    isAnySubItemActive
                      ? "border-[#1E3A8A]"
                      : "border-transparent group-hover:border-[#1E3A8A]"
                  } cursor-default`}
                >
                  {item.title}
                </div>

                <div className="absolute top-full left-0 pt-1 hidden group-hover:block">
                  <div className="flex flex-col bg-white shadow-md rounded-md z-50 min-w-[150px]">
                    {item.submenu.map((subItem) => {
                      const isActive = location.pathname === subItem.path;
                      return (
                        <Link
                          key={subItem.title}
                          to={subItem.path}
                          className={`px-4 py-2 text-sm hover:bg-blue-100 text-[#1E3A8A] ${
                            isActive ? "bg-blue-100 font-semibold" : ""
                          }`}
                        >
                          {subItem.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          } else {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.title}
                to={item.path}
                className={`h-full flex items-center font-semibold text-[#1E3A8A] border-b-2 ${
                  isActive
                    ? "border-[#1E3A8A]"
                    : "border-transparent hover:border-[#1E3A8A]"
                }`}
              >
                {item.title}
              </Link>
            );
          }
        })}

        {/* Profile Icon (far right) */}
        <div className="flex items-center">
          <Link
            to={
              user?.role === "student" ? "/student-profile" : "/admin/profile"
            }
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <UserCircle className="h-8 w-8 text-[#1E3A8A]" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TopNavBar;
