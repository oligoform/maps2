/**
 * Create a MapOptions object which can be assigned to the Map object of Google
 *
 * @param settings
 * @constructor
 */
function MapOptions(settings) {
	this.zoom = parseInt(settings.zoom);
	this.panControl = settings.panControl;
	this.zoomControl = settings.zoomControl;
	this.mapTypeControl = settings.mapTypeControl;
	this.scaleControl = settings.scaleControl;
	this.streetViewControl = settings.streetViewControl;
	this.overviewMapControl = settings.overviewMapControl;
	this.scrollwheel = settings.activateScrollWheel;
	if (settings.styles) {
		this.styles = eval(settings.styles);
	}
	this.setMapTypeId(settings.mapTypeId);
}

/**
 * Create CircleOptions which can be assigned to the Circle object of Google
 *
 * @param map
 * @param centerPosition
 * @param poiCollection
 * @constructor
 */
function CircleOptions(map, centerPosition, poiCollection) {
	this.map = map;
	this.center = centerPosition;
	this.radius = poiCollection.radius;
	this.strokeColor = poiCollection.strokeColor;
	this.strokeOpacity = poiCollection.strokeOpacity;
	this.strokeWeight = poiCollection.strokeWeight;
	this.fillColor = poiCollection.fillColor;
	this.fillOpacity = poiCollection.fillOpacity;
}

/**
 * Create PolygonOptions which can be assigned to the Polygon object of Google
 *
 * @param paths
 * @param poiCollection
 * @constructor
 */
function PolygonOptions(paths, poiCollection) {
	this.paths = paths;
	this.strokeColor = poiCollection.strokeColor;
	this.strokeOpacity = poiCollection.strokeOpacity;
	this.strokeWeight = poiCollection.strokeWeight;
	this.fillColor = poiCollection.fillColor;
	this.fillOpacity = poiCollection.fillOpacity;
}

/**
 * Create PolylineOptions which can be assigned to the Polyline object of Google
 *
 * @param paths
 * @param poiCollection
 * @constructor
 */
function PolylineOptions(paths, poiCollection) {
	this.path = paths;
	this.strokeColor = poiCollection.strokeColor;
	this.strokeOpacity = poiCollection.strokeOpacity;
	this.strokeWeight = poiCollection.strokeWeight;
}

/**
 * Instead of using eval() I decided to create a switch construct
 * which is more save
 *
 * @param mapTypeId
 */
MapOptions.prototype.setMapTypeId = function(mapTypeId) {
	switch (mapTypeId) {
		case "google.maps.MapTypeId.HYBRID":
		case "hybrid":
			this.mapTypeId = google.maps.MapTypeId.HYBRID;
			break;
		case "google.maps.MapTypeId.ROADMAP":
		case "roadmap":
			this.mapTypeId = google.maps.MapTypeId.ROADMAP;
			break;
		case "google.maps.MapTypeId.SATELLITE":
		case "satellite":
			this.mapTypeId = google.maps.MapTypeId.SATELLITE;
			break;
		case "google.maps.MapTypeId.TERRAIN":
		case "terrain":
			this.mapTypeId = google.maps.MapTypeId.TERRAIN;
			break;
	}
};

/**
 * Initialize a Google Map
 *
 * @param $element
 * @param environment contains settings, current PageId, extConf and current tt_content record
 * @constructor
 */
function Maps2($element, environment) {
	this.markers = {};
	this.bounds = new google.maps.LatLngBounds();
	this.infoWindow = new google.maps.InfoWindow();
	this.$element = $element.css({
		height: environment.settings.mapHeight,
		width: environment.settings.mapWidth
	});
	this.poiCollections = this.$element.data("pois");
	this.editable = this.$element.hasClass("editMarker");

	this.createMap(environment);

	if (typeof this.poiCollections == "undefined" || jQuery.isEmptyObject(this.poiCollections)) {
		// Plugin: CityMap
		var lat = this.$element.data("latitude");
		var lng = this.$element.data("longitude");
		if (lat && lng) {
			this.createMarkerByLatLng(lat, lng);
			this.map.setCenter(new google.maps.LatLng(lat, lng));
			this.map.setZoom(15);
		} else {
			// Fallback
			this.map.setCenter(new google.maps.LatLng(environment.extConf.defaultLatitude, environment.extConf.defaultLongitude));
		}
	} else {
		// normal case
		this.createPointByCollectionType(environment);
		if (this.countObjectProperties(this.markers) > 1) {
			this.showSwitchableCategories(environment);
		}
		if (this.poiCollections.length > 1) {
			this.map.fitBounds(this.bounds);
		} else {
			this.map.setCenter(new google.maps.LatLng(this.poiCollections[0].latitude, this.poiCollections[0].longitude));
		}
	}
}

/**
 * Create Map
 *
 * @param environment
 */
Maps2.prototype.createMap = function(environment) {
	this.map = new google.maps.Map(
		this.$element.get(0),
		new MapOptions(environment.settings)
	);
};

/**
 * Group Categories
 *
 * @param environment
 */
Maps2.prototype.groupCategories = function(environment) {
	var groupedCategories = {};
	var categoryUid = "0";
	for (var x = 0; x < this.poiCollections.length; x++) {
		for (var y = 0; y < this.poiCollections[x].categories.length; y++) {
			categoryUid = String(this.poiCollections[x].categories[y].uid);
			if (this.inList(environment.settings.categories, categoryUid) > -1 && !groupedCategories.hasOwnProperty(categoryUid)) {
				groupedCategories[categoryUid] = this.poiCollections[x].categories[y];
			}
		}
	}
	return groupedCategories;
};

/**
 * Show switchable categories
 *
 * @param environment
 */
Maps2.prototype.showSwitchableCategories = function(environment) {
	var categories = this.groupCategories(environment);
	var $form = jQuery("<form>")
		.addClass("txMaps2Form")
		.attr("id", "txMaps2Form-" + environment.contentRecord.uid);

	// Add checkbox for category
	for (var categoryUid in categories) {
		if (categories.hasOwnProperty(categoryUid)) {
			$form.append(this.getCheckbox(categories[categoryUid]));
			$form.find("#checkCategory_" + categoryUid).after(jQuery("<span />")
				.addClass("map-category")
				.text(categories[categoryUid].title));
		}
	}
	// create form
	var markers = this.markers;
	$form.find("input").on("click", function() {
		var isChecked = jQuery(this).is(":checked");
		var categoryUid = jQuery(this).val();
		if (markers.hasOwnProperty(categoryUid)) {
			for (var i = 0; i < markers[categoryUid].length; i++) {
				markers[categoryUid][i].setVisible(isChecked);
			}
		}
	});
	this.$element.after($form);

};

/**
 * Get Checkbox for Category
 *
 * @param category
 */
Maps2.prototype.getCheckbox = function(category) {
	return jQuery("<div />")
		.addClass("form-group").append(
			jQuery("<div />")
				.addClass("checkbox").append(
				jQuery("<label />").append(
					jQuery("<input />")
						.attr({
							type: "checkbox",
							class: "checkCategory",
							id: "checkCategory_" + category.uid,
							checked: "checked",
							value: category.uid
						})
				)
			)
		);
};

/**
 * Count Object properties
 *
 * @param obj
 */
Maps2.prototype.countObjectProperties = function(obj) {
	var count = 0;
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			count++;
		}
	}
	return count;
};

/**
 * Create Point by CollectionType
 *
 * @param environment
 */
Maps2.prototype.createPointByCollectionType = function(environment) {
	for (var i = 0; i < this.poiCollections.length; i++) {
		if (this.poiCollections[i].strokeColor == "") {
			this.poiCollections[i].strokeColor = environment.extConf.strokeColor;
		}
		if (this.poiCollections[i].strokeOpacity == "") {
			this.poiCollections[i].strokeOpacity = environment.extConf.strokeOpacity;
		}
		if (this.poiCollections[i].strokeWeight == "") {
			this.poiCollections[i].strokeWeight = environment.extConf.strokeWeight;
		}
		if (this.poiCollections[i].fillColor == "") {
			this.poiCollections[i].fillColor = environment.extConf.fillColor;
		}
		if (this.poiCollections[i].fillOpacity == "") {
			this.poiCollections[i].fillOpacity = environment.extConf.fillOpacity;
		}
		switch (this.poiCollections[i].collectionType) {
			case "Point":
				this.createMarker(this.poiCollections[i], environment);
				break;
			case "Area":
				this.createArea(this.poiCollections[i], environment.extConf);
				break;
			case "Route":
				this.createRoute(this.poiCollections[i], environment.extConf);
				break;
			case "Radius":
				this.createRadius(this.poiCollections[i], environment.extConf);
				break;
		}
	}
};

/**
 * Create Marker with InfoWindow
 *
 * @param poiCollection
 * @param environment
 */
Maps2.prototype.createMarker = function(poiCollection, environment) {
	var categoryUid = "0";
	var marker = new google.maps.Marker({
		position: new google.maps.LatLng(poiCollection.latitude, poiCollection.longitude),
		map: this.map
	});
	marker.setDraggable(this.editable);
	for (var i = 0; i < poiCollection.categories.length; i++) {
		categoryUid = poiCollection.categories[i].uid;
		//if (this.inList(environment.settings.categories, categoryUid) > -1) {
			if (!this.markers.hasOwnProperty(categoryUid)) {
				this.markers[categoryUid] = [];
			}
			// assign first category icon to marker
			if (i === 0 && poiCollection.categories[i].markerIcon != "") {
				var icon = {
					url: poiCollection.categories[i].markerIcon,
					scaledSize: new google.maps.Size(25, 40),
					anchor: new google.maps.Point(13, 40)
				};
				marker.setIcon(icon);
			}
			this.markers[categoryUid].push(marker);
		//}
	}
	this.bounds.extend(marker.position);

	// we need these both vars to be set global. So that we can access them in Listener
	var infoWindow = this.infoWindow;
	var map = this.map;

	if (this.editable) {
		this.addEditListeners(this.$element, marker, poiCollection, environment);
	} else {
		google.maps.event.addListener(marker, "click", function() {
			infoWindow.close();
			infoWindow.setContent(poiCollection.infoWindowContent);
			infoWindow.open(map, marker);
		});
	}
};

/**
 * Check for item in list
 * Check if an item exists in a comma-separated list of items.
 *
 * @param list
 * @param item
 */
Maps2.prototype.inList = function(list, item) {
	var catSearch = ',' + list + ',';
	item = ',' + item + ',';
	return catSearch.search(item);
};

/**
 * Create Marker with InfoWindow
 *
 * @param latitude
 * @param longitude
 */
Maps2.prototype.createMarkerByLatLng = function(latitude, longitude) {
	var marker = new google.maps.Marker({
		position: new google.maps.LatLng(latitude, longitude),
		map: this.map
	});
	this.bounds.extend(marker.position);
};

/**
 * Create Area
 *
 * @param poiCollection
 */
Maps2.prototype.createArea = function(poiCollection) {
	var latLng;
	var paths = [];
	for (var i = 0; i < poiCollection.pois.length; i++) {
		latLng = new google.maps.LatLng(poiCollection.pois[i].latitude, poiCollection.pois[i].longitude);
		this.bounds.extend(latLng);
		paths.push(latLng);
	}

	if (paths.length == 0) {
		paths.push(this.mapPosition);
	} else {
		var area = new google.maps.Polygon(new PolygonOptions(paths, poiCollection));
		area.setMap(this.map);
	}
};

/**
 * Create Route
 *
 * @param poiCollection
 */
Maps2.prototype.createRoute = function(poiCollection) {
	var latLng;
	var paths = [];
	for (var i = 0; i < poiCollection.pois.length; i++) {
		latLng = new google.maps.LatLng(poiCollection.pois[i].latitude, poiCollection.pois[i].longitude);
		this.bounds.extend(latLng);
		paths.push(latLng);
	}

	if (paths.length == 0) {
		paths.push(this.mapPosition);
	} else {
		var route = new google.maps.Polyline(new PolylineOptions(paths, poiCollection));
		route.setMap(this.map);
	}
};

/**
 * Create Radius
 *
 * @param poiCollection
 */
Maps2.prototype.createRadius = function(poiCollection) {
	var circle = new google.maps.Circle(
		new CircleOptions(
			this.map,
			new google.maps.LatLng(poiCollection.latitude, poiCollection.longitude),
			poiCollection
		)
	);
	this.bounds.union(circle.getBounds());
};

/**
 * Add Edit Listeners
 * This will only work for Markers (Point)
 *
 * @param $mapContainer
 * @param marker
 * @param poiCollection
 * @param environment
 */
Maps2.prototype.addEditListeners = function($mapContainer, marker, poiCollection, environment) {
	// update fields and marker while dragging
	google.maps.event.addListener(marker, 'dragend', function() {
		var lat = marker.getPosition().lat().toFixed(6);
		var lng = marker.getPosition().lng().toFixed(6);
		$mapContainer.prevAll("input.latitude-" + environment.contentRecord.uid).val(lat);
		$mapContainer.prevAll("input.longitude-" + environment.contentRecord.uid).val(lng);
	});

	// update fields and marker when clicking on the map
	google.maps.event.addListener(this.map, 'click', function(event) {
		marker.setPosition(event.latLng);
		$mapContainer.prevAll("input.latitude-" + environment.contentRecord.uid).val(event.latLng.lat().toFixed(6));
		$mapContainer.prevAll("input.longitude-" + environment.contentRecord.uid).val(event.latLng.lng().toFixed(6));
	});
};

/**
 * This function will be called by the &callback argument of the Google Maps API library
 */
function initMap() {
	var $element;
	var environment;
	jQuery(".maps2").each(function() {
		$element = jQuery(this);
		// override environment with settings of override
		var environment = $element.data("environment");
		var override = $element.data("override");
		environment = jQuery.extend(true, environment, override);
		new Maps2($element, environment);
	});
}
