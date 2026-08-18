import React, { createContext, useContext, useMemo, useState } from "react";
import {
  clearStudent,
  getStudent,
  saveStudent,
} from "../utils/studentAuth";

const StudentAuthContext = createContext(null);

export function StudentAuthProvider({ children }) {
  const [student, setStudent] = useState(() => getStudent());

  const value = useMemo(() => ({
    student,
    login(nextStudent) {
      saveStudent(nextStudent);
      setStudent(nextStudent);
    },
    logout() {
      clearStudent();
      setStudent(null);
    },
  }), [student]);

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);

  if (!context) {
    throw new Error("useStudentAuth must be used within StudentAuthProvider");
  }

  return context;
}
