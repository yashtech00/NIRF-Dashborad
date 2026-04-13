import { axiosInstance } from "./axiosInstances";


export const nirfScrape = async (year: string, rankingType: string) => {
    try{
        const res = await axiosInstance.post("api/nirf/scrape", { year, ranking_type: rankingType });
        return res.data;
    }catch(e){
        console.log(e);
    }
}

export const nirfQueueStatus = async () => {
    try{
        const res = await axiosInstance.get("api/nirf/queue-status");
        return res.data;
    }catch(e){
        console.log(e);
    }
}

export const nirfExportExcel = async (year?: string, rankingType?: string) => {
    try{
        const params: any = {};
        if (year) params.year = year;
        if (rankingType) params.rankingType = rankingType;

        const res = await axiosInstance.get("api/nirf/export-excel", {
            params,
            responseType: "blob"
        });
        return res.data;
    }catch(e){
        console.log(e);
        throw e;
    }
}

export const nirfGetAvailableDatasets = async () => {
    try {
        const res = await axiosInstance.get("api/nirf/available-datasets");
        return res.data;
    } catch(e) {
        console.log(e);
        throw e;
    }
}

export const nirfClearQueue = async () => {
    try {
        const res = await axiosInstance.post("api/nirf/clear-queue");
        return res.data;
    } catch(e) {
        console.log(e);
        throw e;
    }
}

export const nirfDeleteDataset = async (year: string, ranking_type: string) => {
    try {
        const res = await axiosInstance.delete("api/nirf/dataset", {
            params: { year, ranking_type }
        });
        return res.data;
    } catch(e) {
        console.log(e);
        throw e;
    }
}