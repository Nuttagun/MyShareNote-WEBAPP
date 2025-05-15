import React from "react";
import Home  from "./Home/Home";

const Dashboard: React.FC = () => {
  return (
    <section className="main">
      <div className="contentMain flex justify-center">
        <div className="contentRight py-8 px-14 w-full"><Home/></div>
      </div>
    </section>
  );
};

export default Dashboard;