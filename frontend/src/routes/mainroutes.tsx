import { lazy } from "react";
import { useRoutes } from "react-router-dom";
import type { RouteObject } from 'react-router-dom';
import Loadable from "../component/third-patry/Loadable";
import MainLayout from "../layout/MainLayout"; // <-- เพิ่ม Layout

const Home = Loadable(lazy(() => import("../page/index")));
const AuthForm = Loadable(lazy(() => import("../page/Authentication/AuthFrom")));

const UserRoutes = (): RouteObject[] => [
  {
    path: "/",
    element: <MainLayout />, 
    children: [
      { path: "/", element: <Home /> },
    ],
  },
  { path: "/auth", element: <AuthForm /> },
];

function ConfigRoutes() {
  return useRoutes(UserRoutes());
}

export default ConfigRoutes;
