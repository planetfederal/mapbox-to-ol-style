var layer = new ol.layer.Vector({
  source: new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: 'data/states.geojson'
  })
});
var map = new ol.Map({
  target: 'map',
  view: new ol.View({
    center: [-13603186.115192635, 6785744.563386],
    zoom: 2
  })
});

var client = new XMLHttpRequest();
client.open('GET', 'data/states.json');
client.onload = function() {
  var glStyle = JSON.parse(client.responseText);
  mb2olstyle(layer, glStyle, 'states');
  map.addLayer(layer);
};
client.send();
