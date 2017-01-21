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

fetch('data/states.json').then(function(response) {
  response.json().then(function(glStyle) {
    layer.setStyle(mb2olstyle(glStyle, 'states'));
    map.addLayer(layer);
  });
});
