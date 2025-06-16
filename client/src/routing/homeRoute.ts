// routing/homeRoute.ts
import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './routingTree'
import HomePage from '../pages/HomePage'
import StudentDetails from '../pages/StudentDetails'

// Parent
export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/home',
  component: HomePage,
})

// Child
export const studentDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/student/$id',    
  component: StudentDetails,
})
