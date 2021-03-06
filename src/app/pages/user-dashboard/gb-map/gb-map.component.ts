import { Component, OnInit } from '@angular/core';
import {
  latLng,
  tileLayer,
  polyline,
  Polyline,
  LeafletMouseEvent,
  LatLng, circle,
} from 'leaflet';
import {GbService, Gbs} from '../../../@core/backend/common/services/gb.service';
import {CsvDataService} from '../../../@core/utils/csvdata.service';
import {UserStore} from '../../../@core/stores/user.store';

@Component({
  selector: 'ngx-gb-map',
  templateUrl: './gb-map.component.html',
  styleUrls: ['./gb-map.component.scss'],
})
export class GbMapComponent implements OnInit {
  // Map settings
  options = {
    layers: [
      tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 21, attribution: '...' }),
    ],
    zoom: 19,
    center: latLng(38.586298044283105, -121.35166610449501),
  };

  // Layers of Gb Paths
  gbPaths: IGbPaths = {};

  // Returns all the gb paths as an array instead of object for use in the leaflet map
  get getGbPathsAsArray(): Polyline[] {
    return Object.values(this.gbPaths);
  }

  editMode: boolean = false; // edit mode (new line)
  addMode: boolean = false; // add mode (add points to existing line)
  gbs: Gbs; // all of users gbs initialized in on init
  public selectedGb: string = 'gb1'; // username of which gb is selected
  public objectKeys = Object.keys;
  userIsAdmin: boolean;

  constructor(
      private gbService: GbService,
      private csvDataService: CsvDataService,
      private userStore: UserStore,
  ) { }

  ngOnInit() {
    // Get all the users gbs
    this.gbService.gbs.subscribe(v => {
      if (Object.keys(v).length !== 0) {
        this.gbs = v;
        // Initialize all the gb layers
        for (const gbsKey in this.gbs) {
          this.gbs[this.selectedGb].dataStreams.position.data.subscribe(a => {
            this.gbPaths[this.gbs[this.selectedGb].username + '-location'] = circle([a.latitude, a.longitude],
                {radius: 5, color: this.gbs[this.selectedGb].color});
          });
          // this.gbPaths[gbsKey] = polyline([[38.586114, -121.351503 + (Math.random() / 5000)],
          // [38.586216, -121.351503]],
          //     {color: this.gbs[gbsKey].color});
        }
      } else {
        this.gbs = undefined;
      }
    });

    this.userIsAdmin = (this.userStore.getUser().role === 'admin');
  }

  public handleBadgeClick(selectedGb: string) {
    this.selectedGb = selectedGb;
  }

  /**
   * Download the current path as a csv file with lat and lng columns
   */
  public downloadCsv() {
    const latLongdata: LatLng[] = this.gbPaths[this.selectedGb].getLatLngs() as LatLng[];
    this.csvDataService.exportToCsv(this.selectedGb + '-points.csv', latLongdata);
  }

  public buttonStatus(mode: boolean) {
    return (mode ? 'success' : 'danger');
  }

  public toggleEditMode() { this.editMode = !this.editMode; }

  public toggleAddMode() { this.addMode = !this.addMode; }

  private firstSelected: LatLng;
  private secondSelected: LatLng;

  // Handle click event for the map
  public handleClick(event: LeafletMouseEvent) {
    // If edit mode, add the path to existing path
    if (this.editMode) {
      this.gbPaths[this.selectedGb].addLatLng(event.latlng);
    // Else create a new addmode
    } else if (this.addMode) {
      this.addPolyLne(event.latlng);
    }
  }

  /**
   * Add a new polyline for the current selected gb
   * @param latlng
   */
  private addPolyLne(latlng: LatLng) {
    // If there's no first point selected, create it
    if (!this.firstSelected) {
      this.firstSelected = latlng;
    // Otherwise add the second point, add it to the polyline layers, clear the selected, and toggle add mode3
    } else if (this.firstSelected && !this.secondSelected) {
      this.secondSelected = latlng;
      this.gbPaths[this.selectedGb] = polyline([this.firstSelected, this.secondSelected]);
      this.firstSelected = undefined;
      this.secondSelected = undefined;
      this.toggleAddMode();
    }
  }

  /**
   * Sends the current CSV LatLong Data to the Gb
   */
  public sendCsvToGb() {
    this.gbs[this.selectedGb].pubToGbActionStream('csv', this.gbPaths[this.selectedGb].getLatLngs() as LatLng[]);
  }

  public existingLine(gb: string): boolean {
    return gb in this.gbPaths;
  }

  public clearPath(gb: string) {
    delete this.gbPaths[gb];
  }

  public userSelect(selectedGb: string) {
    this.selectedGb = selectedGb;
  }

  public sendAction() {
    // console.log(this.selectedGb);
  }

}

interface IGbPaths {
  [key: string]: any;
}
