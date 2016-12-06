# Assign admins to airports
- This is a component of [MagicBox](https://github.com/unicef/magicbox/wiki)
- It requires [latlon_to_admin server](https://github.com/unicef/latlon-to-admin)
- Assigns admin regions to airports
- by querying an api that takes lat/lon and returns an admin.
- Airport is then indexed by elasticsearch

    nohup node add_admins_to_airports.js nohup.out 2>&1&

### TODO
- add curl -XPUT "http://localhost:9200/airports/_settings" -d '{ "index" : { "max_result_window" : 20000 } }'
