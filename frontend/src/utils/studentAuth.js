const STUDENT_STORAGE_KEY = "student";

export function saveStudent(student) {
  window.localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(student));
}

export function getStudent() {
  try {
    const student = JSON.parse(window.localStorage.getItem(STUDENT_STORAGE_KEY));
    return student && typeof student === "object" ? student : null;
  } catch {
    return null;
  }
}

export function clearStudent() {
  window.localStorage.removeItem(STUDENT_STORAGE_KEY);
}
