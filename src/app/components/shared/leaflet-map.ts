import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// Leaflet global declaration
interface LeafletMarkerInstance {
  setLatLng: (latlng: [number, number]) => void;
  getPopup: () => { setContent: (c: string) => void };
}

declare const L: {
  map: (element: HTMLElement, options?: object) => {
    setView: (center: [number, number], zoom: number) => unknown;
    invalidateSize: () => void;
    remove: () => void;
  };
  tileLayer: (url: string, options?: object) => { addTo: (map: unknown) => void };
  divIcon: (options: object) => unknown;
  marker: (latlng: [number, number], options?: object) => {
    addTo: (map: unknown) => {
      bindPopup: (content: string) => LeafletMarkerInstance;
      setLatLng: (latlng: [number, number]) => void;
      getPopup: () => { setContent: (c: string) => void };
    } & LeafletMarkerInstance;
  };
};

@Component({
  selector: 'app-leaflet-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full rounded-xl overflow-hidden border border-[#E1E2E9] shadow-sm">
      <div #mapContainer [class]="'w-full z-0 ' + heightClass"></div>
      
      @if (!compact) {
        <div class="p-3 bg-white border-t border-[#E1E2E9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div>
            <span class="font-semibold text-[#1A1A1A] block">{{ complexName }}</span>
            <span class="text-[#637381]">{{ address }}</span>
          </div>
          <a 
            [href]="googleMapsUrl" 
            target="_blank" 
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FE5615] text-white font-medium rounded-lg hover:bg-[#e0470b] transition-colors shadow-xs"
          >
            <span class="material-icons text-sm">open_in_new</span>
            Abrir en Google Maps
          </a>
        </div>
      } @else {
        <div class="p-2 bg-white/95 backdrop-blur-xs border-t border-[#E1E2E9] flex items-center justify-between gap-2 text-[10px]">
          <span class="font-bold text-[#1A1A1A] truncate max-w-[200px]">{{ address }}</span>
          <a 
            [href]="googleMapsUrl" 
            target="_blank" 
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 px-2 py-1 bg-[#FE5615] text-white font-bold rounded-md hover:bg-[#e0470b] transition-colors shadow-2xs whitespace-nowrap"
          >
            <span class="material-icons text-[12px]">open_in_new</span>
            Google Maps
          </a>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class LeafletMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  @Input() lat = 20.6736;
  @Input() lng = -103.3440;
  @Input() complexName = 'Conjunto Habitacional';
  @Input() address = 'Dirección del conjunto';
  @Input() heightClass = 'h-52 sm:h-64';
  @Input() compact = false;

  private map: unknown = null;
  private markerInstance: unknown = null;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private maxWaitTimeout: ReturnType<typeof setTimeout> | null = null;
  private resizeTimers: ReturnType<typeof setTimeout>[] = [];
  private isDestroyed = false;

  get googleMapsUrl(): string {
    return `https://www.google.com/maps/search/?api=1&query=${this.lat},${this.lng}`;
  }

  ngAfterViewInit(): void {
    this.ensureLeafletAndInit();
  }

  private ensureLeafletAndInit(): void {
    if (this.isDestroyed) return;
    if (typeof L !== 'undefined') {
      this.initMap();
      return;
    }

    // Try loading or waiting for L script
    this.checkInterval = setInterval(() => {
      if (this.isDestroyed) {
        if (this.checkInterval) clearInterval(this.checkInterval);
        return;
      }
      if (typeof L !== 'undefined') {
        if (this.checkInterval) clearInterval(this.checkInterval);
        this.initMap();
      }
    }, 150);

    // Timeout safety stop after 5s
    this.maxWaitTimeout = setTimeout(() => {
      if (this.checkInterval) clearInterval(this.checkInterval);
    }, 5000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && !this.isDestroyed && (changes['lat'] || changes['lng'])) {
      this.updateMapPosition();
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.maxWaitTimeout) clearTimeout(this.maxWaitTimeout);
    this.resizeTimers.forEach(t => clearTimeout(t));
    this.resizeTimers = [];

    if (this.map) {
      try {
        (this.map as { remove: () => void }).remove();
      } catch {
        // ignore leaflet cleanup error on unmount
      }
      this.map = null;
      this.markerInstance = null;
    }

    if (this.mapContainer?.nativeElement) {
      try {
        delete (this.mapContainer.nativeElement as HTMLDivElement & { _leaflet_id?: unknown })._leaflet_id;
      } catch {
        // ignore cleanup error
      }
    }
  }

  private initMap(): void {
    if (this.isDestroyed) return;
    if (typeof L === 'undefined') return;
    if (this.map) return; // Prevent double init
    if (!this.mapContainer || !this.mapContainer.nativeElement) return;

    const container = this.mapContainer.nativeElement as HTMLDivElement & { _leaflet_id?: unknown };
    if (container._leaflet_id) {
      try {
        delete container._leaflet_id;
      } catch {
        // ignore cleanup error
      }
    }

    try {
      this.map = L.map(container, {
        zoomControl: true,
        scrollWheelZoom: false
      });
      (this.map as { setView: (coords: [number, number], zoom: number) => void }).setView([this.lat, this.lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      const orangeIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="background-color: #FE5615; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <span class="material-icons" style="font-size: 18px;">home_work</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([this.lat, this.lng], { icon: orangeIcon })
        .addTo(this.map);
      marker.bindPopup(`<b>${this.complexName}</b><br>${this.address}`);
      this.markerInstance = marker;

      [100, 300, 600, 1000].forEach(delay => {
        const timer = setTimeout(() => {
          if (!this.isDestroyed && this.map && this.mapContainer?.nativeElement) {
            try {
              (this.map as { invalidateSize: () => void }).invalidateSize();
            } catch {
              // ignore resize error
            }
          }
        }, delay);
        this.resizeTimers.push(timer);
      });
    } catch (err) {
      console.warn('Leaflet initialization warning:', err);
    }
  }

  private updateMapPosition(): void {
    if (!this.map || this.isDestroyed) return;
    try {
      (this.map as { setView: (coords: [number, number], zoom: number) => void }).setView([this.lat, this.lng], 15);
      if (this.markerInstance) {
        const m = this.markerInstance as { setLatLng: (coords: [number, number]) => void; getPopup: () => { setContent: (c: string) => void } };
        m.setLatLng([this.lat, this.lng]);
        m.getPopup().setContent(`<b>${this.complexName}</b><br>${this.address}`);
      }
    } catch {
      // ignore update position error
    }
  }
}
