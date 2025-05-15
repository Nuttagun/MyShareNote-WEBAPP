import AppBar from "../component/header/index"; 
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <div>
      <AppBar /> 
      <main className="mt-4">
        <Outlet /> 
      </main>
    </div>
  );
};

export default MainLayout;
