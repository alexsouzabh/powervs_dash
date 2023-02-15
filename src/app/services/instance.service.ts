import { Injectable } from "@angular/core";
import axios from "axios";
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: "root"
})
export class InstanceService {
    public baseUrl = environment.production? environment.production_url : environment.development_url

    public async getAllInstances() : Promise<Array<Object>> {
        let config = {
            method: 'get',
            url: `${this.baseUrl}/api/getAllInstances`,
            headers: { 'Content-Type': 'application/application' }
        };

        try {
            let { data } = await axios(config);
            return data
        } catch(error) {
            console.log(error);
        }
        return []
    }

    public async getInstance(instanceId: string) : Promise<Object> {
        let config = {
            method: 'get',
            url: `${this.baseUrl}/api/getInstance/${instanceId}`,
            headers: { 'Content-Type': 'application/application' }
        };

        try {
            let { data } = await axios(config);
            return data
        } catch(error) {
            console.log(error);
        }
        return {}
    }
}