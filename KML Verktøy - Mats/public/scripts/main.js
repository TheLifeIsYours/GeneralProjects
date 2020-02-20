window.onload = () => {
    window.kmlStripper = new KMLDateStripper();
    window.leafletMap = new LeafletMap();
}

class KMLDateStripper{
    constructor(){
        this.kmlFile = document.querySelector("#kmlFile");
        this.displayKML = document.querySelector("#displayKML");
        this.stripButton = document.querySelector("#stripDate");
        
        this.kmlFile.ondragover = this.kmlFile.ondragenter = function(evt) {
          evt.preventDefault();
        };
        
        this.kmlFile.addEventListener('drop', (evt) => {
          this.kmlFile.files = evt.dataTransfer.files;

          window.leafletMap.displayKML(this.kmlFile.files[0]);
          evt.preventDefault();
        });

        this.kmlFile.addEventListener('change', () => {
            window.leafletMap.displayKML(this.kmlFile.files[0]);
        })
        
        this.stripButton.addEventListener('click', () => {
            this.uploadFile();
        });
    }
        
    uploadFile(){
        for(let file of kmlFile.files) {
            if(file.name.includes(".kmz")) {
                this.unzipKMZ(file);
            } else {
                let reader = new FileReader();
                
                reader.onload = (e) => {
                    this.stripDate(e.target.result);
                }
                
                reader.readAsBinaryString(file);
            }
        }
    }
        
    async unzipKMZ(kmz) {
        let zip = new JSZip();
    
        let KMZData = await this.readFileAsync(kmlFile.files[0]);
        
        let KMLData = await zip.loadAsync(KMZData)
        .then(async (res) => {
            let kmlData = await res.file("view.kml").async("uint8array");
            return new TextDecoder("utf-8").decode(kmlData);
        });
        
        this.stripDate(KMLData);
    }
    
    stripDate(kmlData) {
        kmlData = kmlData.replace(/(?!<name>\d\d\d\d-\d\d-\d\d) \d\d:\d\d:\d\d(?=<\/name>)/gm, '');
        
        let download = document.createElement('a');
        download.href = `data:text/plain;charset=utf-8,${encodeURIComponent(kmlData)}`;
        download.download = "view.kml";
        download.click();
    }
    
    readFileAsync(file) {
        return new Promise((resolve, reject) => {
            let reader = new FileReader();
        
            reader.onload = (e) => {
                resolve(e.target.result);
            };
        
            reader.onerror = reject;
        
            reader.readAsBinaryString(file);
        })
    }
}

class LeafletMap {
    constructor(parent){
        this.container = document.querySelector('#mapid');
        this.rangeA = document.querySelector("#range_a");

        this.rangeA.addEventListener('change', () => {
            this.updateMarkers();
        });

        this.map = new L.map(this.container).setView([50, -30], 3);
        this.iconsArray = [];

        this.init();
    }

    init(){
        L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 10,
            id: 'mapbox/streets-v11',
            tileSize: 512,
            zoomOffset: -1,
            accessToken: 'pk.eyJ1IjoibWRsLWNyZWF0aW9ucyIsImEiOiJjazZ1MXV4eGYwNHlqM2ZwaGc0OHV3N2ZuIn0.L-eI-yNgEE2HswZqLsSOpQ'
        }).addTo(this.map);

        this.map.on('zoomend', () => {
            this.updateMarkers();
        });
    }

    updateMarkers(){
        let prev = null;
        
        let zoomSensetivity = this._map(this.rangeA.value, this.rangeA.min, this.rangeA.max, 10, 0.00001);
        let overlapDist = this._map(leafletMap.map.getZoom(), -15, 10, zoomSensetivity, 0.0001)

        this.iconsArray.forEach((icon, index) => {
            if(prev != null) {
                let dist = this.dist(icon.options.latlng, prev);

                if(dist < overlapDist && index != (0 || this.iconsArray.length - 1)) {
                    this.toggleMarker(icon, true);
                } else {
                    this.toggleMarker(icon, false);
                }
            }

            prev = icon.options.latlng;
        });
    }

    _map(a, b, c, d, e){
        return ((a-b)/(c-b))*(e-d)+d;
    }

    dist(a, b) {
        return Math.sqrt(Math.pow((a.lat - b.lat), 2) + Math.pow((a.lng - b.lng), 2));
    }
    
    toggleMarker(icon, hide){
        let iconElement = document.querySelector(`#${icon.options.id}`);
        
        if(hide) {
            iconElement.classList.add("hidden");
            return;
        }

        iconElement.classList.remove("hidden");
    }

    async displayKML(kmlFile){
        let kmlData = await window.kmlStripper.readFileAsync(kmlFile);

        let gooseIcon = (feature, latlng) => {
            let icon = L.divIcon({
                className: 'leaflet-goose-icon',
                iconSize: [30, 50],
                html: `<div id="goose-icon-${this.iconsArray.length}"><b>${feature.properties.name}</b></div>`,
                id: "goose-icon-"+this.iconsArray.length,
                latlng: latlng
            });
            console.log(icon);

            this.iconsArray.push(icon);
            return icon;
        }

        var omnivoreStyleHelper = L.geoJSON(null, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {icon: gooseIcon(feature, latlng)});
            }
        });

        omnivore.kml.parse(kmlData, null, omnivoreStyleHelper).addTo(this.map);
        this.updateMarkers();
    }
}
