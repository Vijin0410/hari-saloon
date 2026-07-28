/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { MainLayout } from '@/app/layouts/MainLayout';
import { PermissionRoute } from '@/router/PermissionRoute';
import { ProtectedRoute } from '@/router/ProtectedRoute';
import { NotFoundPage } from '@/pages/NotFoundPage';

const HomePage = lazy(() => import('@/pages/HomePage').then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const UserPage = lazy(() => import('@/pages/UserPage').then((module) => ({ default: module.UserPage })));
const RolePage = lazy(() => import('@/pages/RolePage').then((module) => ({ default: module.RolePage })));
const MenuPage = lazy(() => import('@/pages/MenuPage').then((module) => ({ default: module.MenuPage })));
const ForbiddenPage = lazy(() =>
  import('@/pages/ForbiddenPage').then((module) => ({ default: module.ForbiddenPage })),
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    errorElement: <NotFoundPage />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <NotFoundPage />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <HomePage /> },
          {
            path: 'system/users',
            element: (
              <PermissionRoute permission="system:user:list">
                <UserPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'system/roles',
            element: (
              <PermissionRoute permission="system:role:list">
                <RolePage />
              </PermissionRoute>
            ),
          },
          {
            path: 'system/menus',
            element: (
              <PermissionRoute permission="system:menu:list">
                <MenuPage />
              </PermissionRoute>
            ),
          },
          { path: 'forbidden', element: <ForbiddenPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
