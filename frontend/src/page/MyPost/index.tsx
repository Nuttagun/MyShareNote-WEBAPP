import React from "react";
import MyPost  from "./mypost";

const Dashboard: React.FC = () => {
  return (
    <section className="main">
      <div className="contentMain flex justify-center">
        <div className="contentRight py-8 px-14 w-full"><MyPost/></div>
      </div>
    </section>
  );
};

export default Dashboard;