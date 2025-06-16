// routing/routingTree.ts
import { createRootRoute, createRouter } from '@tanstack/react-router'
import { authRoute } from './authRoute'
import { homeRoute, studentDetailsRoute } from './homeRoute'
import RootLayout from '../RootLayout'
import { QueryClient } from '@tanstack/react-query'
import { store } from '../store/store'

export const rootRoute = createRootRoute({
  component: RootLayout,
})

export const routeTree = rootRoute.addChildren([
  authRoute,
  homeRoute,studentDetailsRoute,
])

const queryClient = new QueryClient()
export const router = createRouter({
  routeTree,
  context: { queryClient, store },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
