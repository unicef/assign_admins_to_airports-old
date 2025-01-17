var elasticsearch = require('es');
var fs = require('fs');
var config = require('./config');
var airports = JSON.parse(fs.readFileSync('./public/airports.geojson', 'utf8'));
var bluebird = require('bluebird');
var counter = 0;
var options = {
  _index: config.es.index,
  _type: config.es.type
};
var es = elasticsearch(options);

var es_airport = elasticsearch();
main();
function select_best_admin(admins) {
  var admin = admins.filter(function(admin) { return admin.pub_src != 'gadm2-8';}).sort(function(a, b) {
     return b.admin_level - a.admin_level
  })[0];
  if (admin) {
    return admin;
  } else {
    return admins.sort(function(a, b) {
       return b.admin_level - a.admin_level
    })[0];
  }
};

function main() {
  bluebird.map(airports.features, function(airport, i) {
  // console.log(airport.properties.country_code, airport.geometry.coordinates)
    return search_coords(airport, i);
  }, {concurrency: 1});
}

function search_coords(airport, i) {
  counter += 1;
//  console.log(counter, i, airport.properties.country_name, airport.geometry.coordinates);
  console.log(counter, i);
  return new Promise(function(resolve, reject) {
    es.search({
// ElasticSearch 2.x
//      "query": {
//        match_all: {
//        }
//      },
//      "filter": {
//        "geo_shape": {
//          "geometry": {
//            "relation": 'intersects',
//            "shape": {
//              "coordinates": airport.geometry.coordinates,
//              "type": 'point'
//            }
//          }
//        }
//      }
      "query": {
        "geo_shape": {
          "geometry": {
           "relation": "intersects",
           "shape": {
              "type":   "point",
              "coordinates":airport.geometry.coordinates
            }
          } 
        }
      }
    }, function(err, data) {
      if (err) {
        console.log(err);
        resolve();
      } else {
	if (data.hits.hits.length > 0) {
          var admins = data.hits.hits.map(function(admin) { return admin._source.properties;});
          airport.properties.admin_info = select_best_admin(admins);
	  var options_airports = {
	    _index: 'airports',
	    _type: 'airport',
	    refresh: true
	  };
          if (airport.properties.moddate) {
            airport.properties.moddate = new Date(airport.properties.moddate);
          };
          airport.properties.date_until = new Date();
	  es_airport.index(options_airports, airport, function(err, data) {
            if (err) {
	     console.log(err);
             resolve(); 
            }
           setTimeout(function(){resolve();}, 100); 
	  });
	} else {
          console.log('no admin:', airport.properties.country_name, airport.geometry.coordinates);
	  resolve();
        }     
      }
    });
  });
}

