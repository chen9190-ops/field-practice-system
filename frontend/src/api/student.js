import request from "./request";

export function getStudent(student_id){
    return request.get(
        `/students/${student_id}`
    );
}

export function registerStudent(data) {
  return request.post("/students/register", data);
}


export function loginStudent(data) {
  return request.post("/students/login", data);
}