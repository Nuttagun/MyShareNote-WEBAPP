import React from 'react';
import Introdection from '../introduction'
import Notes from '../Post/post'

const Home: React.FC = () => {


  return (
    <div>
      <div><Introdection /></div>
      <Notes />
    </div>
  );
};

export default Home;
