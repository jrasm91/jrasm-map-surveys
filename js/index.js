Array.prototype.forEach = function(func){
  for(var i = 0; i < this.length; i++){
    func(this[i], i, this);
  }
};

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

Array.prototype.removeAt = function(index){
  this.splice(index, 1);
}

var map;
var drawingManager;
var NotificationManager;
var PolygonManager;
var FirebaseManager;

var initialize = function(){
  initNotificationManager();
  initGoogleMaps();
  initPolygonManager();
  initFirebaseManager();
  initBindings();

  FirebaseManager.loginAnonymously();
};

var initNotificationManager = function(){
  NotificationManager = {
    notify: function(alertType, header, message){
      $('#alert-bar').append('<div class="alert alert-' + alertType + '"><a href="#" class="close" data-dismiss="alert">&times;</a><strong>' + header + '</strong> ' + message + '</div>');
      $('.alert').delay(3000).fadeOut(300);
    },
    warning: function(message){
      this.notify('warning', 'Warning!', message);
    },
    error: function(message){
      this.notify('danger', 'Error!', message);
    },
    success: function(message){
      this.notify('success', '', message);
    }
  };
};

var initGoogleMaps = function(){
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

  drawingManager.setMap(this.map);

  google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {
    if (event.type == google.maps.drawing.OverlayType.POLYGON) {
      PolygonManager.addPolygon(event.overlay);
    }
  });
};

var initPolygonManager = function(){
  var editable = false;
  var polygons = [];

  function coordinatesToPath(coordinates){
    path = [];
    coordinates.forEach(function(coordinate){
      path.push(new google.maps.LatLng(coordinate.lat, coordinate.lng));
    });
    return path;
  };
  
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
    isEditable: function(){
      return editable;
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
    addPolygon: function(polygon){
      polygon.editable = editable;
      polygon.setMap(null);
      polygon.setMap(map);
      polygons.push(polygon);
      $('#delete-list').append('<li class="text-right delete-boundry"><a href="#"><span class="pull-left">Boundry #' + polygons.length + '</span><span class="glyphicon glyphicon-remove pull-right"></span></a></li>');
      $('.delete-boundry').hover(function(){
        var index = $(this).text().split('#')[1] - 1;
        polygons.forEach(function(polygon, i){
          if(i !== index){
            polygon.setMap(null);
          } else {
            polygon.setMap(map);
          }
        })
      });
      $('.delete-boundry').click(function(){
        var index = $(this).text().split('#')[1] - 1;
        PolygonManager.deletePolygon(polygons[index]);
      });
    },
    deletePolygon: function(polygon){
      polygon.setMap(null);
      polygons.remove(polygon);
    },
    deleteAllPolygons: function(){
      polygons.forEach(function(polygon){
        polygon.setMap(null);
      });
      polygons = [];
    },
    toggleEdit: function(){
      editable = !editable;
      polygons.forEach(function(polygon){
        polygon.editable = editable;
        polygon.setMap(null);
        polygon.setMap(map);
      });
      drawingManager.setDrawingMode(editable? null: google.maps.drawing.OverlayType.POLYGON);
    }
  };
}

var initFirebaseManager = function(){
  var firebaseRef = new Firebase("https://map-survey.firebaseio.com");
  var auth;
  FirebaseManager = {
    loginAnonymously: function(){
      firebaseRef.authAnonymously(function(error, authData) {
        if (error) {
          NotificationManager.warning('Unable to authenticate');
        } else {
          auth = authData;
          NotificationManager.success('Authenticated!');
          firebaseRef.on("value", function(snapshot) {
            var data = snapshot.val();
            if (data && data.polygons){
              PolygonManager.deleteAllPolygons();
              PolygonManager.loadPolygons(data.polygons);
            }
          }, function (errorObject) {
            NotificationManager.error('Unable to load data. Check connectivity.');
            console.log(errorObject);
          });
        }
      });
    },
    loginWithEmail: function(){
      firebaseRef.authWithPassword({
        email    : "test@map-survey.firebase.com",
        password : "test123"
      }, function(error, authData) {
        if (error === null) {
          NotificationManager.success('SU Authentication');
          auth = authData;
          PolygonManager.deleteAllPolygons();
          var data = snapshot.val();
          var dataList = [];
          for (var sessionId in data) {
            if (sessionId.split(':')[0] === 'simplelogin'){
              console.log('ignoring..');
              continue;
            } else if (data.hasOwnProperty(sessionId)) {
              dataList.push(data[sessionId]);
            }
          }
          dataList.forEach(function(data){
            if (data && data.polygons){
              PolygonManager.loadPolygons(data.polygons);
            }
          });
          NotificationManager.success('Data Loaded');
        } else {
          NotificationManager.error('Denied SU Authentication');
        }
      });
    },
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


var initBindings = function(){
  var bindings = {
    showAll: function(){

    },
    submit: function(){
      FirebaseManager.savePolygons(PolygonManager.getSavablePolygons());
    },
    delete: function(){

    },
    undo: function(){

    },
    redo: function(){

    },
    reset: function(){
      PolygonManager.deleteAllPolygons();
    },
    toggleEdit: function(){
      PolygonManager.toggleEdit();
      $('#edit-btn').text(PolygonManager.isEditable()? 'Drag':'Edit');
    }
  };

  $('#undo-btn').click(bindings.undo);
  $('#reset-btn').click(bindings.reset);
  $('#submit-btn').click(bindings.submit);
  $('#edit-btn').click(bindings.toggleEdit);
  
  $('.delete-boundry').hover(function(){
    console.log('hover');
  });


}

google.maps.event.addDomListener(window, 'load', initialize);