import request from "./request";

export function getRoutes(){
    return request.get("/routes");
}

export function getStudentRoutes(studentId) {
    return request.get(`/students/${studentId}/routes`);
}

export function getCurrentCourseRoutes(studentId) {
    return request.get(`/students/${studentId}/current-course/routes`);
}

export function getRoute(route_id){
    return request.get(
        `/routes/${route_id}`
    );
}

export function getPoints(route_id){

    return request.get(
        `/routes/${route_id}/points`
    );

}

function normalizeRoutePath(routePoints) {
    return (Array.isArray(routePoints) ? routePoints : [])
        .map((point, index) => ({
            latitude: Number(point?.latitude),
            longitude: Number(point?.longitude),
            order_index: Number(point?.order_index ?? index),
        }))
        .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
        .sort((first, second) => first.order_index - second.order_index)
        .map((point, index) => ({ ...point, order_index: index }));
}

function routeMapRequest(route_id, student_id) {
    return request.get(
        `/routes/${route_id}/map`,
        {
            params: {
                ...(student_id == null ? {} : { student_id }),
                _ts: Date.now(),
            },
        },
    ).then((response) => ({
        ...response,
        data: {
            ...response.data,
            route_points: normalizeRoutePath(response.data?.route_points),
        },
    }));
}

export function getRoutePath(route_id, student_id){
    return routeMapRequest(route_id, student_id);
}

export function getRouteMap(route_id, student_id) {
    return routeMapRequest(route_id, student_id);
}

export function getRouteMediaUrl(path) {
    if (!path) return "";
    if (/^(https?:|blob:|data:)/i.test(path)) return path;
    return `${request.defaults.baseURL}/${String(path).replace(/^\/+/, "")}`;
}
