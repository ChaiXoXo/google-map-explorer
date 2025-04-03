import { Component, ViewChild } from '@angular/core';
import { MapDataService } from '../services/map-data.service';
import { GoogleMap } from '@angular/google-maps';

interface Marker {
  title: string;
  category: string;
  price?: number;
  rating?: number;
  description: string;
  image?: string;
  position: { lat: number, lng: number };
  types?: string[];
  tooltipContent?: string;
}

@Component({
  selector: 'app-explore-map',
  templateUrl: './explore-map.component.html',
  styleUrl: './explore-map.component.css'
})
export class ExploreMapComponent {

  @ViewChild(GoogleMap) googleMap!: GoogleMap; // Reference to GoogleMap component
  mapInstance!: google.maps.Map;
  center: google.maps.LatLngLiteral = { lat: 48.8566, lng: 2.3522 };
  zoom = 12;
  markers: Marker[] = [];
  filteredMarkers: Marker[] = [];
  selectedCategory: string = '';
  googleMarkers: google.maps.Marker[] = []
  selectedMarker: Marker | null = null;
  infoWindowOpen: boolean = false;
  searchQuery: string = '';
  minRating: number | null = null;
  maxRating: number | null = null;
  infoWindowInstance!: google.maps.InfoWindow;
  expandedMarkerId: string | null = null;

  constructor(private mapDataService: MapDataService) { }

  ngOnInit(): void {
    this.loadMarkers();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.googleMap?.googleMap) {
        this.mapInstance = this.googleMap.googleMap;
        this.infoWindowInstance = new google.maps.InfoWindow();
        this.addMarkersToMap();

        document.addEventListener('click', (event) => {
          const target = event.target as HTMLElement;
          if (target && target.classList.contains('more-info-btn')) {
            const title = target.getAttribute('data-title');
            if (title) {
              const selectedMarker = this.markers.find(m => m.title === title);
              if (selectedMarker) {
                this.displayMoreInfo(selectedMarker);
              }
            }
          }
        });
      } else {
        console.error("Google Map instance could not be initialized.");
      }
    }, 1000);
  }

  displayMoreInfo(marker: Marker) {
    this.selectedMarker = marker;
    if (marker?.title) {
      const query = encodeURIComponent(marker.title);
      const googleSearchUrl = `https://www.google.com/search?q=${query}`;

      window.open(googleSearchUrl, "_blank"); // Opens in a new tab
    }
  }

  loadMarkers(): void {
    this.mapDataService.getMarkers().subscribe((data) => {
      this.markers = this.processMarkers(data);
      this.filterMarkers();
      if (this.markers.length > 0) {
        this.center = this.markers[0].position;
        this.zoom = 14;
      }
    });
  }

  processMarkers(data: any): Marker[] {
    return data.results.map((place: any) => ({
      position: { lat: place.geometry.location.lat, lng: place.geometry.location.lng },
      title: place.name || 'No name available',
      category: place.types ? place.types[0] : 'Unknown',
      description: place.vicinity || 'No description available',
      image: place.photos?.[0]?.getUrl ? place.photos[0].getUrl() : undefined,
      rating: place.rating || 0,
      types: place.types || [],
      tooltipContent: `
        <div style="max-width: 200px;">
          <h5>${place.name || 'No name available'}</h5>
          <p>${place.vicinity || 'No description available'}</p>
          <p><strong>Rating:</strong> ${place.rating || 'N/A'}</p>
          ${place.photos?.[0]?.getUrl ? `<img src="${place.photos[0].getUrl()}" style="width: 100px; height: auto;"/>` : ''}
          <button id="more-info-btn" class="btn btn-primary btn-sm" data-title="${place.name}">More Info</button>
        </div>`
    }));
  }

  handleMoreInfo(markerId: string): void {
    this.expandedMarkerId = this.expandedMarkerId === markerId ? null : markerId;
  }

  filterMarkers(): void {
    this.filteredMarkers = this.markers.filter(marker => {
      const matchesCategory = this.selectedCategory ? marker.types?.includes(this.selectedCategory) : true;
      const markerTypes = marker.types || [];
      const matchesSearch = this.searchQuery ? marker.title.toLowerCase().includes(this.searchQuery.toLowerCase()) : true;
      const matchesRating = marker.rating !== undefined
        ? (this.minRating === null || marker.rating >= this.minRating) &&
        (this.maxRating === null || marker.rating <= this.maxRating)
        : true;
      return matchesCategory && matchesSearch && matchesRating;
    });
    this.addMarkersToMap();
  }

  addMarkersToMap(): void {
    if (!this.mapInstance) return;

    this.googleMarkers.forEach(marker => marker.setMap(null));
    this.googleMarkers = [];

    this.filteredMarkers.forEach(marker => {
      const googleMarker = new google.maps.Marker({
        position: marker.position,
        map: this.mapInstance,
        title: marker.title
      });
      googleMarker.addListener("click", () => {
        this.openInfoWindow(googleMarker, marker);
      });
      this.googleMarkers.push(googleMarker);
    });
  }

  openInfoWindow(marker: google.maps.Marker, markerData: Marker): void {
    const contentString = markerData.tooltipContent || `
      <div style="max-width: 200px;">
        <h5>${markerData.title}</h5>
        <p>${markerData.description || 'No description available'}</p>
        ${markerData.image ? `<img src="${markerData.image}" style="width: 100px; height: auto;"/>` : ''}
        <button id="more-info-btn" class="btn btn-primary btn-sm">More Info</button>
      </div>
    `;
    this.infoWindowInstance.setContent(contentString);
    this.infoWindowInstance.open(this.mapInstance, marker);
    google.maps.event.addListenerOnce(this.infoWindowInstance, 'domready', () => {
      const moreInfoButton = document.getElementById('more-info-btn');
      if (moreInfoButton) {
        moreInfoButton.addEventListener('click', () => {
          const title = moreInfoButton.getAttribute('data-title');
          if (title) {
            const selectedMarker = this.markers.find(m => m.title === title);
            if (selectedMarker) {
              this.displayMoreInfo(selectedMarker);
            }
          }
        });
      }
    });
  }

}
