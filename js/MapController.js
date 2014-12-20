angular.module('mapSurvey')
	.controller('MapController', ['MapFactory', '$scope', '$http', '$location',
		function (MapFactory, $scope, $http, $location) {

			var ctrlAlias = this;

			ctrlAlias.isEditMode = false;
			ctrlAlias.isLocked = false;
			ctrlAlias.isAlreadySubmitted = false;
			ctrlAlias.isSubmitted = false;
			ctrlAlias.polygonMap = {};
			ctrlAlias.addedIds = [];
			ctrlAlias.deletedIds = [];

			var url = $location.absUrl();
			if (!(url && url.indexOf('?survey=') != -1 && url.split('?')[1].split('=')[1])) {
				ctrlAlias.isLocked = true;
				ctrlAlias.isAlreadySubmitted = true;
				return;
			}

			var ref = new Firebase('https://map-survey.firebaseio.com/surveys/' + url.split('?')[1].split('=')[1]);
			ref.authAnonymously(function (error, authData) {
				if (error) {
					return;
				}
				ref.once('value', function (snapshot) {
					if (snapshot.val()) {
						ctrlAlias.isLocked = true;
						ctrlAlias.isAlreadySubmitted = true;
						$scope.$apply();
						return;
					}
				});
			});

			google.maps.event.addListener(MapFactory.drawingManager, 'overlaycomplete', function (event) {
				if (event.type == google.maps.drawing.OverlayType.POLYGON) {
					addPolygon(event.overlay, nextUID());
				}
			});

			addPolygon = function (polygon, uid) {
				polygon.setOptions(MapFactory.makePolygonOptions(ctrlAlias.isEditMode));
				polygon.setMap(MapFactory.map);
				ctrlAlias.polygonMap[uid] = polygon;
				ctrlAlias.addedIds.push(uid);
				$scope.$apply();
			}

			function nextUID() {
				var d = new Date().getTime();
				var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
					var r = (d + Math.random() * 16) % 16 | 0;
					d = Math.floor(d / 16);
					return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
				});
				return uuid;
			}

			ctrlAlias.isUndoDeletable = function () {
				return ctrlAlias.deletedIds.length > 0;
			}

			ctrlAlias.isDeletable = function () {
				return ctrlAlias.addedIds.length > 0;
			}

			ctrlAlias.toggleEdit = function () {
				ctrlAlias.isEditMode = !ctrlAlias.isEditMode;
				angular.forEach(ctrlAlias.addedIds, function (uid) {
					ctrlAlias.polygonMap[uid].setOptions({
						editable: ctrlAlias.isEditMode
					});
				});
				MapFactory.drawingManager.setDrawingMode(ctrlAlias.isEditMode ? null : google.maps.drawing.OverlayType.POLYGON);
			};

			ctrlAlias.selectPolygon = function (uid) {
				ctrlAlias.polygonMap[uid].setOptions(MapFactory.makeSelectedOptions(ctrlAlias.isEditMode));
			};

			ctrlAlias.unselectPolygon = function (uid) {
				ctrlAlias.polygonMap[uid].setOptions(MapFactory.makePolygonOptions(ctrlAlias.isEditMode));
			};

			ctrlAlias.deletePolygon = function (uid) {
				ctrlAlias.addedIds.remove(uid);
				ctrlAlias.deletedIds.push(uid);
				ctrlAlias.polygonMap[uid].setMap(null);
			};

			ctrlAlias.undoDeletePolygon = function () {
				if (ctrlAlias.deletedIds.length > 0) {
					var deletedId = ctrlAlias.deletedIds.pop();
					ctrlAlias.addedIds.push(deletedId);
					ctrlAlias.polygonMap[deletedId].setOptions(MapFactory.makePolygonOptions(ctrlAlias.isEditMode));
					ctrlAlias.polygonMap[deletedId].setMap(MapFactory.map);
				}
			};

			ctrlAlias.clearPolygons = function () {
				while (ctrlAlias.addedIds.length > 0) {
					ctrlAlias.deletePolygon(ctrlAlias.addedIds[0]);
				}
			};

			ctrlAlias.submit = function () {
				ref.authAnonymously(function (error, authData) {
					if (error) {
						return;
					}
					var polygons = [];
					for (var i = 0; i < ctrlAlias.addedIds.length; i++) {
						var uid = ctrlAlias.addedIds[i];
						var polygon = ctrlAlias.polygonMap[uid];
						path = [];
						polygon.getPath().forEach(function (item) {
							path.push({
								lat: item.lat(),
								lng: item.lng()
							});
						});
						polygons.push({
							uid: uid,
							path: path
						});
					}
					ref.set({
						polygons: polygons
					}, function (error) {
						if (error) {
							return;
						}
						ctrlAlias.isLocked = true;
						ctrlAlias.isSubmitted = true;
						$scope.$apply();
					});
				});
			}
		}
	]);