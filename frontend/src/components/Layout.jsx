import { Outlet } from "react-router-dom";
import TopNavBar from ".//TopNavBar";

const Layout = () => {
  return (
    <div id="DashboardLayout">
      <TopNavBar />
      <Outlet />
    </div>
  );
};

export default Layout;
