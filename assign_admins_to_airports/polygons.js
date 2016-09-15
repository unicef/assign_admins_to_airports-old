var jsts = require('jsts');
var geojsonReader = new jsts.io.GeoJSONReader();

/**
 * Need to match airport with an admin by searching
 * its coordinates in admin geojson.
 * Convert admin geo features to jsts polygons
 * Iterate through airports, match them to admins, and update them in docdb
 * @param{string} country_admins - Feature collection of country's admins
 * @return{array} array - array of jsts polygons
 */
exports.get_jsts_polygons = function(country_admins) {
  var polygons = country_admins.features.map(function(n) {
    return n.geometry;
  });
  return polygons.map(function(polygon, index) {
    var jstsPolygon = geojsonReader.read({
      type: polygon.type,
      coordinates: polygon.coordinates
    });
    jstsPolygon.__index = index;
    return jstsPolygon;
  });
};

/**
 * Need to match airport with an admin by searching
 * its coordinates in admin geojson.
 * Convert admin geo features to jsts polygons
 * Iterate through airports, match them to admins, and update them in docdb
 * @param{string} country_admins - Feature collection of country's admins
 * @param{string} airports - array of airports per country
 * @param{string} admin_level - level of admin
 * @return{array} airports - array of airports per country
 */
exports.match_airport_to_admin = function(country_admins, airports, admin_level) {
  var jstsPolygons = this.get_jsts_polygons(country_admins);
  airports.forEach(function(e) {
    var point = {
      type: 'Point',
      coordinates: e.geometry.coordinates
    };
    var jstsPoint = geojsonReader.read(point);
    var match = jstsPolygons.filter(function(jstsPolygon) {
      return jstsPoint.within(jstsPolygon);
    });
    if (match.length > 0) {
      if (admin_level === '1') {
        e.properties.admin_1_info = country_admins.features[match[0].__index].properties;
      } else {
        e.properties.admin_2_info = country_admins.features[match[0].__index].properties;
      }
    }
  });
  return airports;
};
