/*
mapbox-to-ol-style - Create OpenLayers style functions from Mapbox Style objects
Copyright 2016-present Boundless Spatial, Inc.
License: https://raw.githubusercontent.com/boundlessgeo/ol-mapbox-gl-style/master/LICENSE.md
*/

import Style from 'ol/style/style';
import Fill from 'ol/style/fill';
import Stroke from 'ol/style/stroke';
import Icon from 'ol/style/icon';
import Circle from 'ol/style/circle';
import Text from 'ol/style/text';
import glfun from 'mapbox-gl-style-spec/lib/function';
import mb2css from 'mapbox-to-css-font';

var functions = {
  interpolated: [
    'line-miter-limit',
    'fill-opacity',
    'line-opacity',
    'line-width',
    'text-halo-width',
    'text-max-width',
    'text-offset',
    'text-size',
    'icon-opacity',
    'icon-rotate',
    'icon-size',
    'circle-radius'
  ],
  'piecewise-constant': [
    'fill-color',
    'fill-outline-color',
    'icon-image',
    'line-cap',
    'line-color',
    'line-join',
    'line-dasharray',
    'text-anchor',
    'text-color',
    'text-field',
    'text-font',
    'text-halo-color',
    'circle-color',
    'circle-stroke-color'
  ]
};

var defaults = {
  'fill-opacity': 1,
  'line-cap': 'butt',
  'line-join': 'miter',
  'line-miter-limit': 2,
  'line-opacity': 1,
  'line-width': 1,
  'text-anchor': 'center',
  'text-color': '#000000',
  'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
  'text-halo-color': 'rgba(0, 0, 0, 0)',
  'text-halo-width': 0,
  'text-max-width': 10,
  'text-offset': [0, 0],
  'text-size': 16,
  'icon-opacity': 1,
  'icon-rotate': 0,
  'icon-size': 1,
  'circle-color' : '#000000',
  'circle-stroke-color' : '#000000'
};

function applyDefaults(properties) {
  for (var property in defaults) {
    if (!(property in properties)) {
      properties[property] = defaults[property];
    }
  }
}

function applyLayoutToPaint(layer) {
  for (var property in layer.layout) {
    if (!layer.paint[property]) {
      layer.paint[property] = layer.layout[property];
    }
  }
}

function convertToFunctions(properties, type) {
  for (var i = 0, ii = functions[type].length; i < ii; ++i) {
    var property = functions[type][i];
    if (property in properties) {
      properties[property] = glfun[type](properties[property]);
    }
  }
}

function preprocess(layer, onChange) {
  if (!layer.paint) {
    layer.paint = {};
  }
  if (!layer.ref) {
    applyLayoutToPaint(layer);
  }
  applyDefaults(layer.paint);
  convertToFunctions(layer.paint, 'interpolated');
  convertToFunctions(layer.paint, 'piecewise-constant');
}

function resolveRef(layer, glStyleObj) {
  if (layer.ref) {
    var layers = glStyleObj.layers;
    for (var i = 0, ii = layers.length; i < ii; ++i) {
      var refLayer = layers[i];
      if (refLayer.id == layer.ref) {
        layer.type = refLayer.type;
        layer.source = refLayer.source;
        layer['source-layer'] = refLayer['source-layer'];
        layer.minzoom = refLayer.minzoom;
        layer.maxzoom = refLayer.maxzoom;
        layer.filter = refLayer.filter;
        layer.layout = refLayer.layout;
        return;
      }
    }
  }
}

function evaluate(filterObj, properties) {
  var type = filterObj[0];
  var i, ii;
  if (type == '==') {
    return properties[filterObj[1]] === filterObj[2];
  } else if (type == '!=') {
    return properties[filterObj[1]] !== filterObj[2];
  } else if (type == '>') {
    return properties[filterObj[1]] > filterObj[2];
  } else if (type == '<') {
    return properties[filterObj[1]] < filterObj[2];
  } else if (type == '>=') {
    return properties[filterObj[1]] >= filterObj[2];
  } else if (type == '<=') {
    return properties[filterObj[1]] <= filterObj[2];
  } else if (type == 'in' || type == '!in') {
    var result = false;
    var property = properties[filterObj[1]];
    for (i = 2, ii = filterObj.length; i < ii; ++i) {
      result = result || property == filterObj[i];
    }
    return type == 'in' ? result : !result;
  } else if (type == 'all') {
    for (i = 1, ii = filterObj.length; i < ii; ++i) {
      if (!evaluate(filterObj[i], properties)) {
        return false;
      }
    }
    return true;
  } else if (type == 'any') {
    for (i = 1, ii = filterObj.length; i < ii; ++i) {
      if (evaluate(filterObj[i], properties)) {
        return true;
      }
    }
    return false;
  } else if (type == 'none') {
    for (i = 1, ii = filterObj.length; i < ii; ++i) {
      if (evaluate(filterObj[i], properties)) {
        return false;
      }
    }
    return true;
  }
}

function getZoomForResolution(resolution, resolutions) {
  var candidate;
  var i = 0, ii = resolutions.length;
  for (; i < ii; ++i) {
    candidate = resolutions[i];
    if (candidate < resolution && i + 1 < ii) {
      var zoomFactor = resolutions[i] / resolutions[i + 1];
      return i + Math.log(resolutions[i] / resolution) / Math.log(zoomFactor);
    }
  }
  return ii - 1;
}

var colorElement = document.createElement('div');
var colorRegEx = /^rgba?\((.*)\)$/;
var colorCache = {};

function colorWithOpacity(color, opacity) {
  if (color && opacity !== undefined) {
    var colorData = colorCache[color];
    if (!colorData) {
      colorElement.style.color = color;
      document.body.appendChild(colorElement);
      var colorString = getComputedStyle(colorElement).getPropertyValue('color');
      document.body.removeChild(colorElement);
      colorData = colorString.match(colorRegEx)[1].split(',').map(Number);
      colorCache[color] = colorData;
    }
    color = colorData.slice();
    color[3] = color.length > 3 ? color[3] * opacity : opacity;
    if (color[3] === 0) {
      color = undefined;
    }
  }
  return color;
}

function deg2rad(degrees) {
  return degrees * Math.PI / 180;
}

var templateRegEx = /^(.*)\{(.*)\}(.*)$/;

function fromTemplate(text, properties) {
  var parts = text.match(templateRegEx);
  if (parts) {
    var value = properties[parts[2]] || '';
    return parts[1] + value + parts[3];
  } else {
    return text;
  }
}

/**
 * Creates a style function from the `glStyle` object for all layers that use
 * the specified `source`, which needs to be a `"type": "vector"` or
 * `"type": "geojson"` source.
 *
 * @param {string|Object} glStyle Mapbox Style object.
 * @param {string} source `source` key from the Mapbox Style object.
 * @param {Array<number>|undefined} [resolutions=[156543.03392804097,
 * 78271.51696402048, 39135.75848201024, 19567.87924100512, 9783.93962050256,
 * 4891.96981025128, 2445.98490512564, 1222.99245256282, 611.49622628141,
 * 305.748113140705, 152.8740565703525, 76.43702828517625, 38.21851414258813,
 * 19.109257071294063, 9.554628535647032, 4.777314267823516, 2.388657133911758,
 * 1.194328566955879, 0.5971642834779395, 0.29858214173896974,
 * 0.14929107086948487, 0.07464553543474244]]
 * Resolutions for mapping resolution to zoom level. For tile layers, this can
 * be `layer.getSource().getTileGrid().getResolutions()`.
 * @param {Object} spriteData Sprite data from the url specified in the Mapbox
 * Style object's `sprite` property. Only required if a `sprite` property is
 * specified in the Mapbox Style object.
 * @param {Object} spriteImageUrl Sprite image url for the sprite specified in
 * the Mapbox Style object's `sprite` property. Only required if a `sprite`
 * property is specified in the Mapbox Style object.
 * @return {ol.style.StyleFunction} Style function for use in
 * `ol.layer.Vector` or `ol.layer.VectorTile`.
 */
export default function(glStyle, source, resolutions, spriteData, spriteImageUrl) {
  if (!resolutions) {
    resolutions = [];
    for (var res = 156543.03392804097; resolutions.length < 22; res /= 2) {
      resolutions.push(res);
    }
  }
  if (typeof glStyle == 'object') {
    // We do not want to modify the original, so we deep-clone it
    glStyle = JSON.stringify(glStyle);
  }
  glStyle = JSON.parse(glStyle);
  if (glStyle.version != 8) {
    throw new Error('glStyle version 8 required.');
  }

  var ctx = document.createElement('CANVAS').getContext('2d');
  var measureCache = {};
  function wrapText(text, font, em) {
    var key = em + font + text;
    var wrappedText = measureCache[key];
    if (!wrappedText) {
      ctx.font = font;
      var oneEm = ctx.measureText('M').width;
      var width = oneEm * em;
      var words = text.split(' ');
      var line = '';
      var lines = [];
      for (var i = 0, ii = words.length; i < ii; ++i) {
        var word = words[i];
        if ((ctx.measureText(line + word).width <= width)) {
          line += (line ? ' ' : '') + word;
        } else {
          lines.push(line);
          line = word;
        }
      }
      if (line) {
        lines.push(line);
      }
      wrappedText = measureCache[key] = lines.join('\n');
    }
    return wrappedText;
  }

  var allLayers = glStyle.layers;
  var layers = [];
  for (var i = 0, ii = allLayers.length; i < ii; ++i) {
    var layer = allLayers[i];
    if (!layer.layout) {
      layer.layout = {};
    }
    resolveRef(layer, glStyle);
    if (layer.source == source) {
      layers.push(layer);
      preprocess(layer);
    }
  }

  var textHalo = new Stroke();
  var textColor = new Fill();

  var iconImageCache = {};

  var styles = [];

  return function(feature, resolution) {
    var zoom = resolutions.indexOf(resolution);
    if (zoom == -1) {
      zoom = getZoomForResolution(resolution, resolutions);
    }
    var properties = feature.getProperties();
    properties['$type'] = feature.getGeometry().getType().replace('Multi', '');
    var stylesLength = -1;
    for (var i = 0, ii = layers.length; i < ii; ++i) {
      var layer = layers[i];
      if ((layer['source-layer'] && layer['source-layer'] != properties.layer) ||
          ('minzoom' in layer && zoom < layer.minzoom) ||
          ('maxzoom' in layer && zoom >= layer.maxzoom)) {
        continue;
      }
      if (!layer.filter || evaluate(layer.filter, properties)) {
        var color, opacity, fill, stroke, strokeColor, style, text;
        var paint = layer.paint;
        var type = properties['$type'];
        if (type == 'Polygon') {
          if (!('fill-pattern' in paint) && 'fill-color' in paint) {
            opacity = paint['fill-opacity'](zoom);
            color = colorWithOpacity(paint['fill-color'](zoom), opacity);
            if (color) {
              ++stylesLength;
              style = styles[stylesLength];
              if (!style || !style.getFill() || style.getStroke() || style.getText()) {
                style = styles[stylesLength] = new Style({
                  fill: new Fill()
                });
              }
              fill = style.getFill();
              fill.setColor(color);
              style.setZIndex(i);
            }
            if ('fill-outline-color' in paint) {
              strokeColor = colorWithOpacity(paint['fill-outline-color'](zoom), opacity);
            }
            if (strokeColor) {
              ++stylesLength;
              style = styles[stylesLength];
              if (!style || !style.getStroke() || style.getFill() || style.getText()) {
                style = styles[stylesLength] = new Style({
                  stroke: new Stroke()
                });
              }
              stroke = style.getStroke();
              stroke.setLineCap(defaults['line-cap']);
              stroke.setLineJoin(defaults['line-join']);
              stroke.setMiterLimit(defaults['line-miter-limit']);
              stroke.setColor(strokeColor);
              stroke.setWidth(1);
              stroke.setLineDash(null);
              style.setZIndex(i);
            }
          }
        }
        if (type != 'Point') {
          if (!('line-pattern' in paint) && 'line-color' in paint) {
            color = colorWithOpacity(
                paint['line-color'](zoom), paint['line-opacity'](zoom));
          }
          var width = paint['line-width'](zoom);
          if (color && width > 0) {
            ++stylesLength;
            style = styles[stylesLength];
            if (!style || !style.getStroke() || style.getFill() || style.getText()) {
              style = styles[stylesLength] = new Style({
                stroke: new Stroke()
              });
            }
            stroke = style.getStroke();
            stroke.setLineCap(paint['line-cap'](zoom));
            stroke.setLineJoin(paint['line-join'](zoom));
            stroke.setMiterLimit(paint['line-miter-limit'](zoom));
            stroke.setColor(color);
            stroke.setWidth(width);
            stroke.setLineDash(paint['line-dasharray'] ?
                paint['line-dasharray'](zoom).map(function(x) {
                  return x * width;
                }) : null);
            style.setZIndex(i);
          }
        }

        var icon;
        if (type == 'Point' && 'icon-image' in paint) {
          ++stylesLength;
          var iconImage = paint['icon-image'](zoom);
          icon = fromTemplate(iconImage, properties);
          style = iconImageCache[icon];
          if (!style && spriteData && spriteImageUrl) {
            var spriteImageData = spriteData[icon];
            style = iconImageCache[icon] = new Style({
              image: new Icon({
                src: spriteImageUrl,
                size: [spriteImageData.width, spriteImageData.height],
                offset: [spriteImageData.x, spriteImageData.y],
                scale: paint['icon-size'](zoom) / spriteImageData.pixelRatio
              })
            });
          }
          if (style) {
            var iconImg = style.getImage();
            iconImg.setRotation(deg2rad(paint['icon-rotate'](zoom)));
            iconImg.setOpacity(paint['icon-opacity'](zoom));
            style.setZIndex(i);
            styles[stylesLength] = style;
          }
        }

        if (type == 'Point' && 'circle-radius' in paint) {
          ++stylesLength;
          var cache_key = paint['circle-radius'](zoom) + '.' +
            paint['circle-stroke-color'](zoom) + '.' +
            paint['circle-color'](zoom);
          style = iconImageCache[cache_key];
          if (!style) {
            style = new Style({
              image: new Circle({
                radius: paint['circle-radius'](zoom),
                stroke: new Stroke({
                  color: colorWithOpacity(paint['circle-stroke-color'](zoom), opacity)
                }),
                fill: new Fill({
                  color: colorWithOpacity(paint['circle-color'](zoom), opacity)
                })
              })
            });
          }
          style.setZIndex(i);
          styles[stylesLength] = style;
        }

        var label;
        if ('text-field' in paint) {
          var textField = paint['text-field'](zoom);
          label = fromTemplate(textField, properties);
        }
        // TODO Add LineString handling as soon as it's supporte in OpenLayers
        if (label && type !== 'LineString') {
          ++stylesLength;
          style = styles[stylesLength];
          if (!style || !style.getText() || style.getFill() || style.getStroke()) {
            style = styles[stylesLength] = new Style({
              text: new Text({
                text: '',
                fill: textColor
              })
            });
          }
          text = style.getText();
          var textSize = paint['text-size'](zoom);
          var font = mb2css(paint['text-font'](zoom)[0], textSize);
          var textTransform = paint['text-transform'];
          if (textTransform == 'uppercase') {
            label = label.toUpperCase();
          } else if (textTransform == 'lowercase') {
            label = label.toLowerCase();
          }
          var wrappedLabel = wrapText(label, font, paint['text-max-width'](zoom));
          text.setText(wrappedLabel);
          text.setFont(font);
          var offset = paint['text-offset'](zoom);
          var yOffset = offset[1] * textSize + (wrappedLabel.split('\n').length - 1) * textSize;
          var anchor = paint['text-anchor'](zoom);
          if (anchor.indexOf('top') == 0) {
            yOffset += 0.5 * textSize;
          } else if (anchor.indexOf('bottom') == 0) {
            yOffset -= 0.5 * textSize;
          }
          text.setOffsetX(offset[0] * textSize);
          text.setOffsetY(yOffset);
          text.getFill().setColor(paint['text-color'](zoom));
          if (paint['text-halo-width']) {
            textHalo.setWidth(paint['text-halo-width'](zoom));
            textHalo.setColor(paint['text-halo-color'](zoom));
            text.setStroke(textHalo);
          } else {
            text.setStroke(undefined);
          }
          style.setZIndex(i);
        }
      }
    }

    if (stylesLength > -1) {
      styles.length = stylesLength + 1;
      return styles;
    }
  };
}
