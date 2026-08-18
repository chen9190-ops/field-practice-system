import request from "./request";

export function getObservation(student_id){
    return request.get(
        `/observations/student/${student_id}`
    );
}

export function getObservationRecords(student_id) {
    return request.get(`/observations/student/${student_id}/records`);
}

export function toggleObservationFavorite(observation_id) {
    return request.put(`/observations/${observation_id}/favorite`);
}

export function toggleObservationPin(observation_id) {
    return request.put(`/observations/${observation_id}/pin`);
}

export function deleteObservation(observation_id) {
    return request.delete(`/observations/${observation_id}`);
}

export function createObservation(data){
    const observationType = data.observation_type === "fixed" ? "fixed" : "free";
    return request.post(
        "/observations",
        {
            ...data,
            observation_type: observationType,
            point_id: observationType === "fixed" ? Number(data.point_id) : null,
        }
    );
}


export function uploadPhoto(observation_id,file){

    const formData=new FormData();

    formData.append(
        "photo",
        file
    );


    return request.post(
        `/observations/${observation_id}/upload_photo`,
        formData
    );
} 

export function createAIAnalysis(observation_id){
    return request.post(
        `/observations/${observation_id}/ai_analysis`
    );
}

export function getAIAnalysis(observation_id){
    return request.get(
        `/observations/${observation_id}/ai_analysis`
    );
}
