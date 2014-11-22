Array.prototype.remove = function() {
	var what, a = arguments, L = a.length, ax;
	while (L && this.length) {
		what = a[--L];
		while ((ax = this.indexOf(what)) !== -1) {
			this.splice(ax, 1);
		}
	}
	return this;
};

var app = angular.module('mapSurvey', []);

app.config(['$locationProvider', function($locationProvider) {
	$locationProvider.html5Mode({
		enabled: true,
		requireBase: false
	});
}]);

app.controller('MainController', ['$scope', '$location', 'GoogleMaps', 'PolygonOptions', 'NotificationManager', 'FirebaseManager', function($scope, $location, GoogleMaps, PolygonOptions, NotificationManager, FirebaseManager){

	var editable = false;
	var polygons = {};
	var polygonsAdded = [];
	var polygonsDeleted = [];
	var url = $location.absUrl();
	var isSaving = false;

	if(url && url.indexOf('?token=') != -1){
		var token = url.split('?')[1].split('=')[1];
		FirebaseManager.loginWithToken(token, loadPolygons, loginStatus);
		$location.url($location.path());
	}

	function loginStatus(err, uid){
		if(err){
			NotificationManager.error('Unable to connect to server...');
		} else {
			NotificationManager.success('Authenticated!');
		}
	};

	function loadPolygons(data){
		if(isSaving){
			isSaving = false;
			return;
		}
		polygons = {};
		polygonsAdded = []
		polygonsDeleted = [];
		var data = data.val();
		var newPolygons = data == null? [] : data.polygons;
		for(var uid in newPolygons){
			var polygon = newPolygons[uid]
			addPolygon(new google.maps.Polygon({
				paths: polygon.path,
				strokeColor: polygon.strokeColor,
				strokeOpacity: polygon.strokeOpacity,
				strokeWeight: polygon.strokeWeight,
				fillColor: polygon.fillColor,
				fillOpacity: polygon.fillOpacity
			}), uid);
		}

		$scope.$apply();
		
	}

	google.maps.event.addListener(GoogleMaps.drawingManager, 'overlaycomplete', function(event) {
		if (event.type == google.maps.drawing.OverlayType.POLYGON) {
			var polygon = event.overlay;
			var uid = GoogleMaps.nextShapeId();
			addPolygon(polygon, uid);
		}
	});

	function addPolygon(polygon, uid){
		polygon.setOptions({
			editable: editable
		});
		polygon.setMap(GoogleMaps.map);
		polygons[uid] = polygon;
		polygonsAdded.push(uid);
	}

	this.getAddedPolygons = function(){
		return polygonsAdded;
	}

	this.isEditable = function(){
		return editable;
	};

	this.isDeleteActive = function(){
		return polygonsAdded.length > 0;
	};

	this.isUndoDeleteActive = function(){
		return polygonsDeleted.length > 0;
	};

	this.toggleEdit = function(){
		editable = !editable;
		angular.forEach(polygonsAdded, function(uid){
			polygons[uid].setOptions({
				editable: editable
			});
		});
		GoogleMaps.drawingManager.setDrawingMode(editable? null: google.maps.drawing.OverlayType.POLYGON);
	};

	this.submit = function(){
		isSaving = true;
		function getSimplePath(mvcArray){
			path = [];
			mvcArray.forEach(function(item){
				path.push({
					lat: item.lat(),
					lng: item.lng()
				});
			});
			return path;
		};
		var polygonsToSave = {};
		angular.forEach(polygonsAdded, function(uid){
			var polygon = polygons[uid];
			polygonsToSave[uid] = {
				path: getSimplePath(polygon.getPath()),
				strokeColor: polygon.strokeColor,
				strokeOpacity: polygon.strokeOpacity,
				strokeWeight: polygon.strokeWeight,
				fillColor: polygon.fillColor,
				fillOpacity: polygon.fillOpacity,
				uid: uid
			};
		});
		FirebaseManager.saveData(polygonsToSave, function(err){
			if(err){
				NotificationManager.error('Unable to save data!');
			} else {
				NotificationManager.success('Map Saved!');
			}
		});
	};

	this.polygonDelete = function(uid){
		polygons[uid].setMap(null);
		polygonsAdded.remove(uid);
		polygonsDeleted.push(uid);
	}

	this.polygonDeleteAll = function(){
		while(polygonsAdded.length > 0){
			this.polygonDelete(polygonsAdded[0]);
		}
		NotificationManager.success('Map cleared!');
	};

	this.polygonUndoDelete = function(){
		if(polygonsDeleted.length > 0){
			var uid = polygonsDeleted.pop();
			polygons[uid].setOptions(PolygonOptions.createDefaultOptions(editable));
			polygons[uid].setMap(GoogleMaps.map);
			polygonsAdded.push(uid);
		}
	};

	this.polygonSelected = function(uid){
		polygons[uid].setOptions(PolygonOptions.createSelectedOptions(editable));
	};

	this.polygonUnselected = function(uid){
		polygons[uid].setOptions(PolygonOptions.createDefaultOptions(editable));
	};

}]);

app.factory('FirebaseManager', [function(){
	var firebaseRef = new Firebase("https://map-survey.firebaseio.com");
	var authUID = null;

	function isLoggedInWith(authType){
		firebaseRef.unauth();
		var authData = firebaseRef.getAuth();
		if(authData && authData.uid && authData.uid.indexOf(authType) != -1){
			authUID = authData.uid;
			console.log('already logged in...');
			return true;
		} else {
			return false;
		}
	};

	return {
		loginWithToken: function(AUTH_TOKEN, onDataLoad, callback){
			if(isLoggedInWith('token')){
				firebaseRef.unauth();
			} 
			firebaseRef.authWithCustomToken(AUTH_TOKEN, function(error, authData) {
				if (error) {
					callback(error);
				} else {
					authUID = authData.uid;
					firebaseRef = new Firebase('https://map-survey.firebaseio.com/' + authUID);
					firebaseRef.on("value", onDataLoad);
					callback(null, authUID);
					console.log('Authenticated successfully: ' + authUID);
				}
			});
		},
		saveData: function(polygons, callback){
			firebaseRef.update({
				polygons: polygons
			}, callback);
		}
	}
}]);

app.factory('NotificationManager', [function(){
	var notify = function(alertType, header, message){
		$('#alert-bar').append('<div class="alert alert-' + alertType + '"></a><strong>' + header + '</strong> ' + message + '</div>');
		$('.alert').delay(3000).fadeOut(300);
	};

	return {
		warning: function(message){
			notify('warning', 'Warning!', message);
		},
		error: function(message){
			notify('danger', 'Error!', message);
		},
		success: function(message){
			notify('success', '', message);
		}
	}
}]);

app.factory('PolygonOptions', [function(){
	var polygonsOptions = {
		strokeColor: '#000000',
		strokeOpacity: 0.8,
		strokeWeight: 2,
		fillColor: 'BLUE',
		fillOpacity: 0.5,
		editable: true
	};
	var deleteOptions = {
		strokeColor: '#000000',
		strokeOpacity: 0.8,
		strokeWeight: 3,
		fillColor: '#FF0000',
		fillOpacity: 0.5,
		editable: true
	};

	return {
		polygonsOptions: polygonsOptions,
		deleteOptions: deleteOptions,
		createDefaultOptions: function(editable){
			var newOptions = Object.create(polygonsOptions);
			newOptions.editable = editable;
			return newOptions;
		},
		createSelectedOptions: function(editable){
			var newOptions = Object.create(deleteOptions);
			newOptions.editable = editable;
			return newOptions;
		}
	};
}]);

app.factory('GoogleMaps', ['PolygonOptions', function(PolygonOptions) {

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
		polygonOptions: PolygonOptions.polygonsOptions
	});

	drawingManager.setMap(map);

	function nextShapeId(){
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x3|0x8)).toString(16);
		});
		return uuid;
	}

	return {
		map: map,
		drawingManager: drawingManager,
		nextShapeId: nextShapeId
	};
}]);