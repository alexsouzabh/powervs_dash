import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from '@angular/common/http';
import axios from "axios";
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: "root"
})
export class UserService {
    public baseUrl = environment.production? environment.production_url : environment.development_url

    constructor(private http: HttpClient) {}

    public async getAllUsers() : Promise<any> {
        let config = {
            method: 'get',
            url: `${this.baseUrl}/api/readAllUsers`,
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

    public async updateUser(id, user) : Promise<any> {
        const httpOptions = {
            headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
          };
          try {
            this.http.post<any>(`${this.baseUrl}/api/updateUser/${id}`, user, httpOptions).toPromise();
          } catch (error) {
            console.log(error);
          }
    }
}