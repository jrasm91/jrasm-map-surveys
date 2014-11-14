var drawingManager;
var map;

function initialize() {
	polygons = []

	var mapOptions = {
		zoom: 10,
		center: new google.maps.LatLng(33.2877683, -111.8231692),
		mapTypeId: google.maps.MapTypeId.ROADMAP 
	};

	map = new google.maps.Map(document.getElementById('map-canvas'),
		mapOptions);

	drawingManager = new google.maps.drawing.DrawingManager({
		drawingMode: google.maps.drawing.OverlayType.POLYGON,
		drawingControl: true,
		drawingControlOptions: {
			position: google.maps.ControlPosition.TOP_CENTER,
			drawingModes: [
			google.maps.drawing.OverlayType.POLYGON
			]
		},
		polygonOptions: {
			strokeColor: '#000000',
			strokeOpacity: 0.8,
			strokeWeight: 2,
			fillColor: '#FF0000',
			fillOpacity: 0.5,
			editable: true
		}
	});
	drawingManager.setMap(map);

	google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {
		if (event.type == google.maps.drawing.OverlayType.POLYGON) {
			polygons.push(event.overlay);
		}
	});


}

function button_click(){
	// polygons.forEach(function(element){
	// 	element.editable = false;
	// })
	for(var i = 0; i < polygons.length; i++){
		polygons[i].setMap(null);
		polygons[i].editable = !polygons[i].editable;
		polygons[i].setMap(map);
	}
	// drawingManager.setMap(null);
}





google.maps.event.addDomListener(window, 'load', initialize);
