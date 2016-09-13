var azure = require('azure-storage');
var config = require('./config');
var docdb = require('./lib/docdb_query');
var polygons = require('./lib/polygons');
var blob_account = config.blob.storage_account;
var blob_container_name = config.blob.container;
var blob_storage_key = config.blob.key1;
var jsts = require('jsts');
var geojsonReader = new jsts.io.GeoJSONReader();

var blobSvc = azure.createBlobService(blob_account, blob_storage_key);

/**
 * Fetch list of countries geojson objects stored in blob.
 * Then loop through each country and match airport to admin
 * Then terminate.
 */
function main() {
  fetch_blob_names(blob_container_name).then(function(list) {
    download_blobs_get_airports_by_admin(list);
  });
}

// Start here!
main();

/**
 * Iterate through country names
 * download geojson from blob
 * get all airports for country
 * loop through airports and find the admins they belong to
 * then update airport in documentdb.
 * @param{string} list - list of country names
 * @return{Promise} Fulfilled when documents are saved.
 */
function download_blobs_get_airports_by_admin(list) {
  var newValues = [];
  return list.reduce(function(memo, value) {
    return memo.then(function() {
      return dl_blob_and_group_airports(blob_container_name, value);
    }).then(function(newValue) {
      newValues.push(newValue);
    });
  }, Promise.resolve(null)).then(function() {
    return newValues;
  });
}

/**
 * Loop through country names
 * download geojson from blob
 * get all airports for country
 * loop through airports and find the admins they belong to
 * then update airport in documentdb.
 * @param{string} blob_container_name - blob container name
 * @param{string} country_name - country name
 * @return{Promise} Fulfilled when documents are saved.
 */
function dl_blob_and_group_airports(blob_container_name, country_name) {
  // Admin level is noted in blob file name, i.e. 'AFG_1.geojson'
  var admin_level = country_name.match(/\d/)[0];
  return new Promise(function(resolve, reject) {
    blobSvc.getBlobToText(blob_container_name, country_name, function(err, data) {
      if (err) {}
      if (data !== 'undefined') {
        var country_admins = JSON.parse(data);
        if (country_admins) {
          get_airports_and_match_admin(country_admins, admin_level)
          .then(function(airports) {
            update_airports(airports)
            .then(function() {
              resolve();
            });
          });
        }
      }
    });
  });
}

/**
 * Iterate through airports that have been updated with admin info
 * persist that data to the airports docdb collection
 * @param{array} airports - array of airports
 * @return{Promise} Fulfilled when documents are saved.
 */
function update_airports(airports) {
  return new Promise(function(resolve, reject) {
    var newValues = [];
    return airports.reduce(function(memo, value) {
      return memo.then(function() {
        return docdb.update_airport(value);
      }).then(function(newValue) {
        newValues.push(newValue);
      });
    }, Promise.resolve(null)).then(function() {
      resolve();
      return newValues;
    });
  });
}

/**
 * Need to match airport with an admin by searching
 * its coordinates in admin geojson.
 * Convert admin geo features to jsts polygons
 * @param{string} country_admins - Feature collection of country's admins
 * @param{string} admin_level - admin level of country admins
 * @return{array} airports after airports have admin info added to object
 */
function get_airports_and_match_admin(country_admins, admin_level) {
  return new Promise(function(resolve, reject) {
    docdb.fetch_airports_per_country(country_admins)
    .then(function(airports) {
      var jstsPolygons = polygons.get_jsts_polygons(country_admins);

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
      resolve(airports);
    });
  });
}

/**
 * Get airports per country
 * Iterate through airports, match them to admins, and update them in docdb
 * @param{string} blob_container_name - Feature collection of country's admins
 * @return{Promise} Fulfilled promise with array of country blob names.
 */
function fetch_blob_names(blob_container_name) {
  return new Promise(function(resolve, reject) {
    blobSvc.listBlobsSegmented(blob_container_name, null, function(err, result, response) {
      if (!err) {
        resolve(result.entries.map(entry => entry.name));
      } else {
        // logger.log('error', {error: err});
      }
    });
  });
}
