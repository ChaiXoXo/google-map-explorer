import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapDataService {

  constructor(private http: HttpClient) { }

  mapDataEndPoint: string = `/api/maps/api/place/nearbysearch/json?location=48.8566,2.3522&radius=25000&key=YOUR_KEY`;

  getMarkers(): Observable<any> {
    return this.http.get<any>(this.mapDataEndPoint);
  }
}
