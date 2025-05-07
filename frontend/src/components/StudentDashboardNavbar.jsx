import React from "react";
import Logo from "../assets/logo.svg";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <img src={Logo} alt="Logo" className="h-10 w-10" />
        <span className="text-xl font-bold text-[#1E3A8A]">Plan IT</span>
      </div>
      <div className="flex gap-6 text-[#1E3A8A] font-semibold">
        <Link to="/student-dashboard" className="hover:text-blue-900">
          Dashboard
        </Link>
        <Link to="/manual-course-entry" className="hover:text-blue-900">
          Manual Course Entry
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
