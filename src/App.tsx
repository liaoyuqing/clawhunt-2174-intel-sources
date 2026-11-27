import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { IntelSourcesPage } from "./pages/workbench/intel/sources";

export const SOURCES_ROUTE = "/workbench/intel/sources";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={SOURCES_ROUTE} element={<IntelSourcesPage />} />
        <Route path="*" element={<Navigate to={SOURCES_ROUTE} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
