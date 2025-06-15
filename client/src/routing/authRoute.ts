import { Route } from '@tanstack/react-router';
import { rootRoute } from './routingTree';
import AuthPage from '../pages/AuthPage';

export const authRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: AuthPage,
});