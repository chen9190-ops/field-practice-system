import request from "./request";

export function getCheckin(student_id, route_id){
    return request.get(
        `/checkins/student/${student_id}/route/${route_id}`
    );
}

export function getRoutePoints(route_id) {
    return request.get(`/routes/${route_id}/points`);
}

export function getStudentCheckins(student_id) {
    return request.get(`/checkins/student/${student_id}`);
}

export function autoCheckIn(route_id, data) {
    const formData = new FormData();
    formData.append("route_id", route_id);
    formData.append("student_id", data.student_id);
    formData.append("point_id", data.point_id);
    formData.append("latitude", data.latitude);
    formData.append("longitude", data.longitude);
    formData.append("photo", data.photo);
    return request.post(`/routes/${route_id}/auto_checkin`, formData);
}

export function syncOfflineCheckIn(route_id, data) {
    const formData = new FormData();
    formData.append("route_id", data.route_id);
    formData.append("student_id", data.student_id);
    formData.append("point_id", data.point_id);
    formData.append("latitude", data.latitude);
    formData.append("longitude", data.longitude);
    formData.append("checked_at", data.checked_at || "");
    formData.append("photo", data.photo);
    return request.post(`/routes/${route_id}/sync_offline_checkin`, formData);
}
