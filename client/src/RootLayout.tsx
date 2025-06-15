import { Outlet } from '@tanstack/react-router';

const RootLayout = () => {
  return (
    <div>
      <Outlet />
    </div>
  );
};

export default RootLayout;