// // Get a reference to our posts
// var ref = new Firebase("https://docs-examples.firebaseio.com/web/saving-data/fireblog/posts");

Array.prototype.forEach = function(func){
  for(var i = 0; i < this.length; i++){
    func(this[i], i, this);
  }
};

var bootstrap_alert = (function() {
  return {
    alert: function(aType, header, message){
        $('#alert-bar').append('<div class="alert alert-' + aType + '"><a href="#" class="close" data-dismiss="alert">&times;</a><strong>' + header + '</strong> ' + message + '</div>');
        $('.alert').delay(3000).fadeOut(300);

    },
    warning: function(message){
      this.alert('warning', 'Warning!', message);
    },
    error: function(message){
      this.alert('danger', 'Error!', message);
    },
    success: function(message){
      this.alert('success', '', message);
    }
  }
})();

var app = function(){

  var editable = false;
  var polygons = [];
  var map;
  var drawingManager;
  var firebaseRef = new Firebase("https://map-survey.firebaseio.com")

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

  function coordinatesToPath(coordinates){
    path = [];
    coordinates.forEach(function(coordinate){
      path.push(new google.maps.LatLng(coordinate.lat, coordinate.lng));
    });
    return path;
  }

  function addPolygon(polygon){
    polygon.editable = editable;
    polygon.setMap(null);
    polygon.setMap(map);
    polygons.push(polygon);
  };

  function deletePolygon(polygon){
    polygon.setMap(null);
    polygons.remove(polygon);
  };

  function reset(){
    for (var i = 0; i < polygons.length; i++){
      polygons[i].setMap(null);
    }
    polygons = [];
  };

  function toggleEditable(){
    editable = !editable
    for (var i = 0; i < polygons.length; i++){
      polygons[i].editable = editable;
      polygons[i].setMap(null);
      polygons[i].setMap(map)
    };
  };

  function submit(){
    polygonsToSave = []
    polygons.forEach(function(polygon){
      polygonsToSave.push({
        coordinates: polygonToCoordinates(polygon),
        strokeColor: polygon.strokeColor,
        strokeOpacity: polygon.strokeOpacity,
        strokeWeight: polygon.strokeWeight,
        fillColor: polygon.fillColor,
        fillOpacity: polygon.fillOpacity
      });
    })
    firebaseRef.set({
      polygons: polygonsToSave
    }, function(error){
      if(error){
        bootstrap_alert.error('Unable to save map. Please try again.');
      } else {
        bootstrap_alert.success('Map saved!');
      }
    });
  };

  function removeLast(){
    if (polygons.length === 0){
      return;
    }
    polygon = polygons.pop();
    polygon.setMap(null);
  }

  function firebaseTest(){
    bootstrap_alert.error('Unable to save. Please try again.');
  }

  function loadGoogleMaps(){
    map = new google.maps.Map(document.getElementById('map-canvas'), {
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
  }
  function loadDrawingManager(){
    drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: false,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: []
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
        addPolygon(event.overlay)
      }
    });
  }
  function loadFirebaseData(){
    firebaseRef.on("value", function(snapshot) {
      var data = snapshot.val();
      if (data && data.polygons){
        reset();
        data.polygons.forEach(function(nextPolygon){
          if(polygons.indexOf(nextPolygon) == -1){
            addPolygon(new google.maps.Polygon({
              paths: coordinatesToPath(nextPolygon.coordinates),
              strokeColor: nextPolygon.strokeColor,
              strokeOpacity: nextPolygon.strokeOpacity,
              strokeWeight: nextPolygon.strokeWeight,
              fillColor: nextPolygon.fillColor,
              fillOpacity: nextPolygon.fillOpacity
            }));
          }
        });
      }
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
  }

  function initialize() {
    loadGoogleMaps();
    loadDrawingManager()
    loadFirebaseData();
  };

  return {
    reset: reset,
    toggleEditable: toggleEditable,
    submit: submit,
    deletePolygon: deletePolygon,
    initialize: initialize,
    removeLast: removeLast,
    firebaseTest: firebaseTest
  };
}();

google.maps.event.addDomListener(window, 'load', app.initialize);

app.initialize = null;
