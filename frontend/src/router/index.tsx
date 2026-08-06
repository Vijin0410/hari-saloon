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
const AdminLoginPage = lazy(() =>
  import('@/pages/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })),
);
const UserPage = lazy(() => import('@/pages/UserPage').then((module) => ({ default: module.UserPage })));
const RolePage = lazy(() => import('@/pages/RolePage').then((module) => ({ default: module.RolePage })));
const MenuPage = lazy(() => import('@/pages/MenuPage').then((module) => ({ default: module.MenuPage })));
const DictPage = lazy(() => import('@/pages/DictPage').then((module) => ({ default: module.DictPage })));
const TenantPage = lazy(() => import('@/pages/TenantPage').then((module) => ({ default: module.TenantPage })));
const StorePage = lazy(() => import('@/pages/StorePage').then((module) => ({ default: module.StorePage })));
const MemberPage = lazy(() => import('@/pages/MemberPage').then((module) => ({ default: module.MemberPage })));
const MemberLevelPage = lazy(() => import('@/pages/MemberLevelPage').then((module) => ({ default: module.MemberLevelPage })));
const MemberTagPage = lazy(() => import('@/pages/MemberTagPage').then((module) => ({ default: module.MemberTagPage })));
const DeptPage = lazy(() => import('@/pages/DeptPage').then((module) => ({ default: module.DeptPage })));
const ForbiddenPage = lazy(() =>
  import('@/pages/ForbiddenPage').then((module) => ({ default: module.ForbiddenPage })),
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout variant="store" />,
    errorElement: <NotFoundPage />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/admin/login',
    element: <AuthLayout variant="admin" />,
    errorElement: <NotFoundPage />,
    children: [{ index: true, element: <AdminLoginPage /> }],
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
          {
            path: 'system/dept',
            element: (
              <PermissionRoute permission="system:dept:list">
                <DeptPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'system/dicts',
            element: (
              <PermissionRoute permission="system:dict:list">
                <DictPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'system/tenants',
            element: (
              <PermissionRoute permission="system:tenant:list">
                <TenantPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'biz/stores',
            element: (
              <PermissionRoute permission="biz:store:list">
                <StorePage />
              </PermissionRoute>
            ),
          },
          {
            path: 'biz/members',
            element: (
              <PermissionRoute permission="biz:member:list">
                <MemberPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'biz/members/level',
            element: (
              <PermissionRoute permission="biz:memberLevel:list">
                <MemberLevelPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'biz/members/tag',
            element: (
              <PermissionRoute permission="biz:memberTag:list">
                <MemberTagPage />
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
