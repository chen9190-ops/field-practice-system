import { data } from "react-router-dom";
import request from "./request";

export function AiAnalysis(id){
    return request.post(
        `/observations/${id}/ai_analysis`,
        data
    );
}