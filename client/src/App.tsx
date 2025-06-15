import React from 'react';
import { Outlet } from '@tanstack/react-router';

const App:React.FC = () => {
  return (
    <div>
      <Outlet />
    </div>
  );
};

export default App;