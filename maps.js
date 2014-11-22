var PolygonManager;
var FirebaseManager;

var initialize = function(){
  
  initPolygonManager();
  initFirebaseManager();

  FirebaseManager.loginAnonymously();
};


var initPolygonManager = function(){
  var editable = false;
  var polygons = [];

  function polygonToCoordinates(polygon){
    var coordinates = [];
    polygon.getPath().forEach(function(coordinate){
      coordinates.push({
        lat: coordinate.lat(),
        lng: coordinate.lng()
      });
    });
    return coordinates;
  };

  PolygonManager = {
    getSavablePolygons: function(){
      var savablePolygons = [];
      polygons.forEach(function(polygon){
        savablePolygons.push({
          coordinates: polygonToCoordinates(polygon),
          strokeColor: polygon.strokeColor,
          strokeOpacity: polygon.strokeOpacity,
          strokeWeight: polygon.strokeWeight,
          fillColor: polygon.fillColor,
          fillOpacity: polygon.fillOpacity
        })
      });
      return savablePolygons;
    },
    loadPolygons: function(newPolygons){
      newPolygons.forEach(function(polygon){
        this.addPolygon(new google.maps.Polygon({
          paths: coordinatesToPath(polygon.coordinates),
          strokeColor: polygon.strokeColor,
          strokeOpacity: polygon.strokeOpacity,
          strokeWeight: polygon.strokeWeight,
          fillColor: polygon.fillColor,
          fillOpacity: polygon.fillOpacity
        }));
      });
    },
    
}

    savePolygons: function(polygons){
      var data = {};
      data[auth.uid] = {
        polygons: polygons
      };
      firebaseRef.update(data, function(error){
        if(error){
          NotificationManager.error('Unable to save map. Check connectivity.');
        } else {
          NotificationManager.success('Map saved!');
        }
      });
    }
  }
};