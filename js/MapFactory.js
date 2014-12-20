angular.module('mapSurvey')
	.factory('MapFactory', [
		function () {

			function makePolygonOptions(editable) {
				return {
					strokeColor: '#000000',
					strokeOpacity: 0.8,
					strokeWeight: 2,
					fillColor: 'BLUE',
					fillOpacity: 0.5,
					editable: editable
				};
			};

			function makeSelectedOptions(editable) {
				return {
					strokeColor: '#000000',
					strokeOpacity: 0.8,
					strokeWeight: 3,
					fillColor: '#FF0000',
					fillOpacity: 0.5,
					editable: editable
				};
			};

			var map = new google.maps.Map(document.getElementById('map-canvas'), {
				zoom: 10,
				center: new google.maps.LatLng(33.2877683, -111.8231692),
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				panControl: false,
				streetViewControl: false,
				mapTypeControl: false,
				zoomControl: true,
				zoomControlOptions: {
					style: google.maps.ZoomControlStyle.SMALL
				},
				scaleControl: false
			});

			var drawingManager = new google.maps.drawing.DrawingManager({
				drawingMode: google.maps.drawing.OverlayType.POLYGON,
				drawingControl: false,
				drawingControlOptions: {
					position: google.maps.ControlPosition.TOP_CENTER,
					drawingModes: []
				},
				polygonOptions: makePolygonOptions(true)
			});

			drawingManager.setMap(map);

			return {
				map: map,
				drawingManager: drawingManager,
				makePolygonOptions: makePolygonOptions,
				makeSelectedOptions: makeSelectedOptions
			};
		}
	]);