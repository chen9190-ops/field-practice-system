import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useStudentAuth } from "../context/StudentAuthContext";

export function ProtectedStudentRoute({ children }) {
  const { student } = useStudentAuth();
  const location = useLocation();

  if (!student) {
    return (
      <Navigate
        to="/student/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}
