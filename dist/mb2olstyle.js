(function(_g){(function(f){var r=(typeof require==='function'?require:function(name){return {"_":null,"ol/style/style":ol.style.Style,"ol/style/fill":ol.style.Fill,"ol/style/stroke":ol.style.Stroke,"ol/style/icon":ol.style.Icon,"ol/style/text":ol.style.Text,"ol/style/circle":ol.style.Circle}[name];});if (typeof exports==='object'&&typeof module!=='undefined'){module.exports=f(r)}else if(typeof define==='function'&&define.amd){define(["_","ol/style/style","ol/style/fill","ol/style/stroke","ol/style/icon","ol/style/text","ol/style/circle"],f.bind(_g,r))}else{f(r)}})(function(require,define,module,exports){var _m=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /*
                                                                                                                                                                                                                                                                              mapbox-to-ol-style - Create OpenLayers style functions from Mapbox Style objects
                                                                                                                                                                                                                                                                              Copyright 2016-present Boundless Spatial, Inc.
                                                                                                                                                                                                                                                                              License: https://raw.githubusercontent.com/boundlessgeo/mapbox-to-ol-style/master/LICENSE.md
                                                                                                                                                                                                                                                                              */

exports.default = function (olLayer, glStyle, source, resolutions, spriteData, spriteImageUrl, fonts) {
  if (!resolutions) {
    resolutions = [];
    for (var res = 156543.03392804097; resolutions.length < 22; res /= 2) {
      resolutions.push(res);
    }
  }
  if ((typeof glStyle === 'undefined' ? 'undefined' : _typeof(glStyle)) == 'object') {
    // We do not want to modify the original, so we deep-clone it
    glStyle = JSON.stringify(glStyle);
  }
  glStyle = JSON.parse(glStyle);
  if (glStyle.version != 8) {
    throw new Error('glStyle version 8 required.');
  }

  var spriteImage, spriteImgSize;
  if (spriteImageUrl) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      spriteImage = img;
      spriteImgSize = [img.width, img.height];
      olLayer.changed();
    };
    img.src = spriteImageUrl;
  }

  var ctx = document.createElement('CANVAS').getContext('2d');
  var measureCache = {};
  function wrapText(text, font, em) {
    var key = em + ',' + font + ',' + text;
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
        if (ctx.measureText(line + word).width <= width) {
          line += (line ? ' ' : '') + word;
        } else {
          if (line) {
            lines.push(line);
          }
          line = word;
        }
      }
      if (line) {
        lines.push(line);
      }
      measureCache[key] = wrappedText = lines.join('\n');
    }
    return wrappedText;
  }

  var allLayers = glStyle.layers;
  var layersBySourceLayer = {};
  for (var i = 0, ii = allLayers.length; i < ii; ++i) {
    var layer = allLayers[i];
    if (!layer.layout) {
      layer.layout = {};
    }
    resolveRef(layer, glStyle);
    if (typeof source == 'string' && layer.source == source || source.indexOf(layer.id) !== -1) {
      var sourceLayer = layer['source-layer'];
      var layers = layersBySourceLayer[sourceLayer];
      if (!layers) {
        layers = layersBySourceLayer[sourceLayer] = [];
      }
      layers.push({
        layer: layer,
        index: i
      });
      preprocess(layer, fonts);
    }
  }

  var textHalo = new _stroke2.default();
  var textColor = new _fill2.default();

  var iconImageCache = {};

  var styles = [];

  var styleFunction = function styleFunction(feature, resolution) {
    var properties = feature.getProperties();
    var layers = layersBySourceLayer[properties.layer];
    if (!layers) {
      return;
    }
    var zoom = resolutions.indexOf(resolution);
    if (zoom == -1) {
      zoom = getZoomForResolution(resolution, resolutions);
    }
    var type = types[feature.getGeometry().getType()];
    var f = {
      properties: properties,
      type: type
    };
    var stylesLength = -1;
    for (var i = 0, ii = layers.length; i < ii; ++i) {
      var layerData = layers[i];
      var layer = layerData.layer;
      var paint = layer.paint;
      if (paint.visibility === 'none' || 'minzoom' in layer && zoom < layer.minzoom || 'maxzoom' in layer && zoom >= layer.maxzoom) {
        continue;
      }
      if (!layer.filter || layer.filter(f)) {
        var color, opacity, fill, stroke, strokeColor, style;
        var index = layerData.index;
        if (type == 3) {
          if (!('fill-pattern' in paint) && 'fill-color' in paint) {
            opacity = paint['fill-opacity'](zoom, properties);
            color = colorWithOpacity(paint['fill-color'](zoom, properties), opacity);
            if (color) {
              ++stylesLength;
              style = styles[stylesLength];
              if (!style || !style.getFill() || style.getStroke() || style.getText()) {
                style = styles[stylesLength] = new _style2.default({
                  fill: new _fill2.default()
                });
              }
              fill = style.getFill();
              fill.setColor(color);
              style.setZIndex(index);
            }
            if ('fill-outline-color' in paint) {
              strokeColor = colorWithOpacity(paint['fill-outline-color'](zoom, properties), opacity);
            }
            if (strokeColor) {
              ++stylesLength;
              style = styles[stylesLength];
              if (!style || !style.getStroke() || style.getFill() || style.getText()) {
                style = styles[stylesLength] = new _style2.default({
                  stroke: new _stroke2.default()
                });
              }
              stroke = style.getStroke();
              stroke.setLineCap(defaults['line-cap']);
              stroke.setLineJoin(defaults['line-join']);
              stroke.setMiterLimit(defaults['line-miter-limit']);
              stroke.setColor(strokeColor);
              stroke.setWidth(1);
              stroke.setLineDash(null);
              style.setZIndex(index);
            }
          }
        }
        if (type != 1) {
          color = !('line-pattern' in paint) && 'line-color' in paint ? colorWithOpacity(paint['line-color'](zoom, properties), paint['line-opacity'](zoom, properties)) : undefined;
          var width = paint['line-width'](zoom, properties);
          if (color && width > 0) {
            ++stylesLength;
            style = styles[stylesLength];
            if (!style || !style.getStroke() || style.getFill() || style.getText()) {
              style = styles[stylesLength] = new _style2.default({
                stroke: new _stroke2.default()
              });
            }
            stroke = style.getStroke();
            stroke.setLineCap(paint['line-cap'](zoom, properties));
            stroke.setLineJoin(paint['line-join'](zoom, properties));
            stroke.setMiterLimit(paint['line-miter-limit'](zoom, properties));
            stroke.setColor(color);
            stroke.setWidth(width);
            stroke.setLineDash(paint['line-dasharray'] ? paint['line-dasharray'](zoom, properties).map(function (x) {
              return x * width;
            }) : null);
            style.setZIndex(index);
          }
        }

        var hasImage = false;
        var text = null;
        var icon, iconImg, skipLabel;
        if ((type == 1 || type == 2) && 'icon-image' in paint) {
          var iconImage = paint['icon-image'](zoom, properties);
          if (iconImage) {
            icon = fromTemplate(iconImage, properties);
            var styleGeom = undefined;
            if (spriteImage && spriteData && spriteData[icon]) {
              if (type == 2) {
                var geom = feature.getGeometry();
                // ol package and ol-debug.js only
                if (geom.getFlatMidpoint) {
                  var extent = geom.getExtent();
                  var size = Math.sqrt(Math.pow((extent[2] - extent[0]) / resolution, 2), Math.pow((extent[3] - extent[1]) / resolution, 2));
                  if (size > 150) {
                    //FIXME Do not hard-code a size of 150
                    styleGeom = new _point2.default(geom.getFlatMidpoint());
                  }
                }
              }
              if (type !== 2 || styleGeom) {
                ++stylesLength;
                style = styles[stylesLength];
                if (!style || !style.getImage() || style.getFill() || style.getStroke()) {
                  style = styles[stylesLength] = new _style2.default();
                }
                style.setGeometry(styleGeom);
                var iconSize = paint['icon-size'](zoom, properties);
                var iconColor = paint['icon-color'] !== undefined ? paint['icon-color'](zoom, properties) : null;
                var icon_cache_key = icon + '.' + iconSize;
                if (iconColor !== null) {
                  icon_cache_key += '.' + iconColor;
                }
                iconImg = iconImageCache[icon_cache_key];
                if (!iconImg) {
                  var spriteImageData = spriteData[icon];
                  if (iconColor !== null) {
                    // cut out the sprite and color it
                    color = colorWithOpacity(iconColor, 1);
                    var canvas = document.createElement('canvas');
                    canvas.width = spriteImageData.width;
                    canvas.height = spriteImageData.height;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(spriteImage, spriteImageData.x, spriteImageData.y, spriteImageData.width, spriteImageData.height, 0, 0, spriteImageData.width, spriteImageData.height);
                    var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    for (var c = 0, cc = data.data.length; c < cc; c += 4) {
                      data.data[c] = color[0];
                      data.data[c + 1] = color[1];
                      data.data[c + 2] = color[2];
                    }
                    ctx.putImageData(data, 0, 0);
                    iconImg = iconImageCache[icon_cache_key] = new _icon2.default({
                      img: canvas,
                      imgSize: [canvas.width, canvas.height],
                      scale: iconSize / spriteImageData.pixelRatio
                    });
                  } else {
                    iconImg = iconImageCache[icon_cache_key] = new _icon2.default({
                      img: spriteImage,
                      imgSize: spriteImgSize,
                      size: [spriteImageData.width, spriteImageData.height],
                      offset: [spriteImageData.x, spriteImageData.y],
                      scale: iconSize / spriteImageData.pixelRatio
                    });
                  }
                }
                iconImg.setRotation(deg2rad(paint['icon-rotate'](zoom, properties)));
                iconImg.setOpacity(paint['icon-opacity'](zoom, properties));
                style.setImage(iconImg);
                text = style.getText();
                style.setText(undefined);
                style.setZIndex(99999 - index);
                hasImage = true;
                skipLabel = false;
              } else {
                skipLabel = true;
              }
            }
          }
        }

        if (type == 1 && 'circle-radius' in paint) {
          ++stylesLength;
          style = styles[stylesLength];
          if (!style || !style.getImage() || style.getFill() || style.getStroke()) {
            style = styles[stylesLength] = new _style2.default();
          }
          var circleRadius = paint['circle-radius'](zoom, properties);
          var circleStrokeColor = paint['circle-stroke-color'](zoom, properties);
          var circleColor = paint['circle-color'](zoom, properties);
          var circleOpacity = paint['circle-opacity'](zoom, properties);
          var circleStrokeWidth = paint['circle-stroke-width'](zoom, properties);
          var cache_key = circleRadius + '.' + circleStrokeColor + '.' + circleColor + '.' + circleOpacity + '.' + circleStrokeWidth;
          iconImg = iconImageCache[cache_key];
          if (!iconImg) {
            iconImg = new _circle2.default({
              radius: circleRadius,
              stroke: circleStrokeWidth === 0 ? undefined : new _stroke2.default({
                width: circleStrokeWidth,
                color: colorWithOpacity(circleStrokeColor, circleOpacity)
              }),
              fill: new _fill2.default({
                color: colorWithOpacity(circleColor, circleOpacity)
              })
            });
          }
          style.setImage(iconImg);
          text = style.getText();
          style.setText(undefined);
          style.setGeometry(undefined);
          style.setZIndex(99999 - index);
          hasImage = true;
        }

        var label;
        if ('text-field' in paint) {
          var textField = paint['text-field'](zoom, properties);
          label = fromTemplate(textField, properties);
        }
        if (label && !skipLabel) {
          if (!hasImage) {
            ++stylesLength;
            style = styles[stylesLength];
            if (!style || !style.getText() || style.getFill() || style.getStroke()) {
              style = styles[stylesLength] = new _style2.default();
            }
            style.setImage(undefined);
            style.setGeometry(undefined);
          }
          if (!style.getText()) {
            style.setText(text || new _text2.default());
          }
          text = style.getText();
          var textSize = paint['text-size'](zoom, properties);
          var font = (0, _mapboxToCssFont2.default)(fontMap[paint['text-font'](zoom, properties)], textSize);
          var textTransform = paint['text-transform'];
          if (textTransform == 'uppercase') {
            label = label.toUpperCase();
          } else if (textTransform == 'lowercase') {
            label = label.toLowerCase();
          }
          var wrappedLabel = type == 2 ? label : wrapText(label, font, paint['text-max-width'](zoom, properties));
          text.setText(wrappedLabel);
          text.setFont(font);
          text.setRotation(deg2rad(paint['text-rotate'](zoom, properties)));
          var textAnchor = paint['text-anchor'](zoom, properties);
          var placement = hasImage || type == 1 ? 'point' : paint['symbol-placement'](zoom, properties);
          text.setPlacement(placement);
          if (placement == 'point') {
            var textAlign = 'center';
            if (textAnchor.indexOf('left') !== -1) {
              textAlign = 'left';
            } else if (textAnchor.indexOf('right') !== -1) {
              textAlign = 'right';
            }
            text.setTextAlign(textAlign);
          } else {
            text.setTextAlign();
          }
          var textBaseline = 'middle';
          if (textAnchor.indexOf('bottom') == 0) {
            textBaseline = 'bottom';
          } else if (textAnchor.indexOf('top') == 0) {
            textBaseline = 'top';
          }
          text.setTextBaseline(textBaseline);
          var textOffset = paint['text-offset'](zoom, properties);
          text.setOffsetX(textOffset[0] * textSize);
          text.setOffsetY(textOffset[1] * textSize);
          opacity = paint['text-opacity'](zoom, properties);
          textColor.setColor(colorWithOpacity(paint['text-color'](zoom, properties), opacity));
          text.setFill(textColor);
          var haloColor = colorWithOpacity(paint['text-halo-color'](zoom, properties), opacity);
          if (haloColor) {
            textHalo.setColor(haloColor);
            textHalo.setWidth(paint['text-halo-width'](zoom, properties));
            text.setStroke(textHalo);
          } else {
            text.setStroke(undefined);
          }
          style.setZIndex(99999 - index);
        }
      }
    }

    if (stylesLength > -1) {
      styles.length = stylesLength + 1;
      return styles;
    }
  };

  olLayer.setStyle(styleFunction);
  return styleFunction;
};

var _style = require('ol/style/style');

var _style2 = _interopRequireDefault(_style);

var _fill = require('ol/style/fill');

var _fill2 = _interopRequireDefault(_fill);

var _stroke = require('ol/style/stroke');

var _stroke2 = _interopRequireDefault(_stroke);

var _icon = require('ol/style/icon');

var _icon2 = _interopRequireDefault(_icon);

var _text = require('ol/style/text');

var _text2 = _interopRequireDefault(_text);

var _circle = require('ol/style/circle');

var _circle2 = _interopRequireDefault(_circle);

var _point = require('ol/geom/point');

var _point2 = _interopRequireDefault(_point);

var _function = require('@mapbox/mapbox-gl-style-spec/function');

var _function2 = _interopRequireDefault(_function);

var _feature_filter = require('@mapbox/mapbox-gl-style-spec/feature_filter');

var _feature_filter2 = _interopRequireDefault(_feature_filter);

var _mapboxToCssFont = require('mapbox-to-css-font');

var _mapboxToCssFont2 = _interopRequireDefault(_mapboxToCssFont);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var functions = {
  interpolated: ['line-miter-limit', 'fill-opacity', 'line-opacity', 'line-width', 'text-halo-width', 'text-max-width', 'text-offset', 'text-opacity', 'text-rotate', 'text-size', 'icon-opacity', 'icon-rotate', 'icon-size', 'icon-color', 'circle-radius', 'circle-opacity', 'circle-stroke-width', 'circle-color', 'circle-stroke-color', 'text-halo-color', 'text-color', 'line-color', 'fill-outline-color', 'fill-color'],
  'piecewise-constant': ['icon-image', 'line-cap', 'line-join', 'line-dasharray', 'symbol-placement', 'text-anchor', 'text-field', 'text-font']
};

var defaults = {
  'fill-opacity': 1,
  'line-cap': 'butt',
  'line-join': 'miter',
  'line-miter-limit': 2,
  'line-opacity': 1,
  'line-width': 1,
  'symbol-placement': 'point',
  'text-anchor': 'center',
  'text-color': '#000000',
  'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
  'text-halo-color': 'rgba(0, 0, 0, 0)',
  'text-halo-width': 0,
  'text-max-width': 10,
  'text-offset': [0, 0],
  'text-opacity': 1,
  'text-rotate': 0,
  'text-size': 16,
  'icon-opacity': 1,
  'icon-rotate': 0,
  'icon-size': 1,
  'circle-color': '#000000',
  'circle-stroke-color': '#000000',
  'circle-opacity': 1,
  'circle-stroke-width': 0
};

var types = {
  'Point': 1,
  'MultiPoint': 1,
  'LineString': 2,
  'MultiLineString': 2,
  'Polygon': 3,
  'MultiPolygon': 3
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
    if (!(property in layer.paint)) {
      layer.paint[property] = layer.layout[property];
    }
  }
}

function convertToFunctions(properties, type) {
  for (var i = 0, ii = functions[type].length; i < ii; ++i) {
    var property = functions[type][i];
    if (property in properties) {
      var value = properties[property];
      properties[property] = (0, _function2.default)(value, {
        function: type,
        type: property.indexOf('color') !== -1 ? 'color' : undefined
      });
    }
  }
}

var fontMap = {};

function chooseFont(fonts, availableFonts) {
  if (availableFonts) {
    var font, i, ii;
    if (!Array.isArray(fonts)) {
      var stops = fonts.stops;
      if (stops) {
        for (i = 0, ii = stops.length; i < ii; ++i) {
          chooseFont(stops[i][1], availableFonts);
        }
      }
      return;
    }
    if (!fontMap[fonts]) {
      for (i = 0, ii = fonts.length; i < ii; ++i) {
        font = fonts[i];
        if (availableFonts.indexOf(font) >= -1) {
          fontMap[fonts] = font;
          break;
        }
      }
      if (!fontMap[fonts]) {
        // fallback font
        fontMap[fonts] = fonts[fonts.length - 1];
      }
    }
  } else {
    fontMap[fonts] = fonts[0];
  }
}

function preprocess(layer, fonts) {
  if (!layer.paint) {
    layer.paint = {};
  }
  if (!layer.ref) {
    applyLayoutToPaint(layer);
  }
  applyDefaults(layer.paint);
  if (layer.paint['text-field']) {
    chooseFont(layer.paint['text-font'], fonts);
  }
  if (Array.isArray(layer.filter)) {
    layer.filter = (0, _feature_filter2.default)(layer.filter);
  }
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

function getZoomForResolution(resolution, resolutions) {
  var candidate;
  var i = 0,
      ii = resolutions.length;
  for (; i < ii; ++i) {
    candidate = resolutions[i];
    if (candidate < resolution && i + 1 < ii) {
      var zoomFactor = resolutions[i] / resolutions[i + 1];
      return i + Math.log(resolutions[i] / resolution) / Math.log(zoomFactor);
    }
  }
  return ii - 1;
}

var colorCache = {};
function colorWithOpacity(color, opacity) {
  if (color && opacity !== undefined) {
    var colorData = colorCache[color];
    if (!colorData) {
      colorCache[color] = colorData = {
        color: [color[0] * 255 / color[3], color[1] * 255 / color[3], color[2] * 255 / color[3], color[3]],
        opacity: color[3]
      };
    }
    color = colorData.color;
    color[3] = colorData.opacity * opacity;
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
 * `"type": "geojson"` source and applies it to the specified OpenLayers layer.
 *
 * @param {ol.layer.Vector|ol.layer.VectorTile} olLayer OpenLayers layer.
 * @param {string|Object} glStyle Mapbox Style object.
 * @param {string|Array<string>} source `source` key or an array of layer `id`s
 * from the Mapbox Style object. When a `source` key is provided, all layers for
 * the specified source will be included in the style function. When layer `id`s
 * are provided, they must be from layers that use the same source.
 * @param {Array<number>} [resolutions=[156543.03392804097,
 * 78271.51696402048, 39135.75848201024, 19567.87924100512, 9783.93962050256,
 * 4891.96981025128, 2445.98490512564, 1222.99245256282, 611.49622628141,
 * 305.748113140705, 152.8740565703525, 76.43702828517625, 38.21851414258813,
 * 19.109257071294063, 9.554628535647032, 4.777314267823516, 2.388657133911758,
 * 1.194328566955879, 0.5971642834779395, 0.29858214173896974,
 * 0.14929107086948487, 0.07464553543474244]]
 * Resolutions for mapping resolution to zoom level.
 * @param {Object} [spriteData=undefined] Sprite data from the url specified in
 * the Mapbox Style object's `sprite` property. Only required if a `sprite`
 * property is specified in the Mapbox Style object.
 * @param {Object} [spriteImageUrl=undefined] Sprite image url for the sprite
 * specified in the Mapbox Style object's `sprite` property. Only required if a
 * `sprite` property is specified in the Mapbox Style object.
 * @param {Array<string>} [fonts=undefined] Array of available fonts, using the
 * same font names as the Mapbox Style object. If not provided, the style
 * function will always use the first font from the font array.
 * @return {ol.style.StyleFunction} Style function for use in
 * `ol.layer.Vector` or `ol.layer.VectorTile`.
 */

},{"@mapbox/mapbox-gl-style-spec/feature_filter":27,"@mapbox/mapbox-gl-style-spec/function":28,"mapbox-to-css-font":38,"ol/geom/point":55,"ol/style/circle":"ol/style/circle","ol/style/fill":"ol/style/fill","ol/style/icon":"ol/style/icon","ol/style/stroke":"ol/style/stroke","ol/style/style":"ol/style/style","ol/style/text":"ol/style/text"}],2:[function(require,module,exports){
'use strict'; //      

var ref = require('./types');
var toString = ref.toString;
var ParsingContext = require('./parsing_context');
var EvaluationContext = require('./evaluation_context');
var assert = require('assert');

var CompoundExpression = function CompoundExpression(name, type, evaluate, args) {
    this.name = name;
    this.type = type;
    this._evaluate = evaluate;
    this.args = args;
};

CompoundExpression.prototype.evaluate = function evaluate(ctx) {
    return this._evaluate(ctx, this.args);
};

CompoundExpression.prototype.eachChild = function eachChild(fn) {
    this.args.forEach(fn);
};

CompoundExpression.parse = function parse(args, context) {
    var op = args[0];
    var definition = CompoundExpression.definitions[op];
    if (!definition) {
        return context.error("Unknown expression \"" + op + "\". If you wanted a literal array, use [\"literal\", [...]].", 0);
    }

    // Now check argument types against each signature
    var type = Array.isArray(definition) ? definition[0] : definition.type;

    var availableOverloads = Array.isArray(definition) ? [[definition[1], definition[2]]] : definition.overloads;

    var overloads = availableOverloads.filter(function (ref) {
        var signature = ref[0];

        return !Array.isArray(signature) || // varags
        signature.length === args.length - 1 // correct param count
        ;
    });

    // First parse all the args
    var parsedArgs = [];
    for (var i = 1; i < args.length; i++) {
        var arg = args[i];
        var expected = void 0;
        if (overloads.length === 1) {
            var params = overloads[0][0];
            expected = Array.isArray(params) ? params[i - 1] : params.type;
        }
        var parsed = context.parse(arg, 1 + parsedArgs.length, expected);
        if (!parsed) {
            return null;
        }
        parsedArgs.push(parsed);
    }

    var signatureContext = null;

    for (var i$2 = 0, list = overloads; i$2 < list.length; i$2 += 1) {
        // Use a fresh context for each attempted signature so that, if
        // we eventually succeed, we haven't polluted `context.errors`.
        var ref = list[i$2];
        var params$1 = ref[0];
        var evaluate = ref[1];

        signatureContext = new ParsingContext(context.definitions, context.path, null, context.scope);

        if (Array.isArray(params$1)) {
            if (params$1.length !== parsedArgs.length) {
                signatureContext.error("Expected " + params$1.length + " arguments, but found " + parsedArgs.length + " instead.");
                continue;
            }
        }

        for (var i$1 = 0; i$1 < parsedArgs.length; i$1++) {
            var expected$1 = Array.isArray(params$1) ? params$1[i$1] : params$1.type;
            var arg$1 = parsedArgs[i$1];
            signatureContext.concat(i$1 + 1).checkSubtype(expected$1, arg$1.type);
        }

        if (signatureContext.errors.length === 0) {
            return new CompoundExpression(op, type, evaluate, parsedArgs);
        }
    }

    assert(!signatureContext || signatureContext.errors.length > 0);

    if (overloads.length === 1) {
        context.errors.push.apply(context.errors, signatureContext.errors);
    } else {
        var expected$2 = overloads.length ? overloads : availableOverloads;
        var signatures = expected$2.map(function (ref) {
            var params = ref[0];

            return stringifySignature(params);
        }).join(' | ');
        var actualTypes = parsedArgs.map(function (arg) {
            return toString(arg.type);
        }).join(', ');
        context.error("Expected arguments of type " + signatures + ", but found (" + actualTypes + ") instead.");
    }

    return null;
};

CompoundExpression.register = function register(expressions, definitions) {
    assert(!CompoundExpression.definitions);
    CompoundExpression.definitions = definitions;
    for (var name in definitions) {
        expressions[name] = CompoundExpression;
    }
};

function varargs(type) {
    return { type: type };
}

function stringifySignature(signature) {
    if (Array.isArray(signature)) {
        return "(" + signature.map(toString).join(', ') + ")";
    } else {
        return "(" + toString(signature.type) + "...)";
    }
}

module.exports = {
    CompoundExpression: CompoundExpression,
    varargs: varargs
};

},{"./evaluation_context":17,"./parsing_context":20,"./types":25,"assert":36}],3:[function(require,module,exports){
'use strict'; //      

var ref = require('../types');
var toString = ref.toString;
var array = ref.array;
var ValueType = ref.ValueType;
var StringType = ref.StringType;
var NumberType = ref.NumberType;
var BooleanType = ref.BooleanType;
var checkSubtype = ref.checkSubtype;

var ref$1 = require('../values');
var typeOf = ref$1.typeOf;
var RuntimeError = require('../runtime_error');

var types = {
    string: StringType,
    number: NumberType,
    boolean: BooleanType
};

var ArrayAssertion = function ArrayAssertion(type, input) {
    this.type = type;
    this.input = input;
};

ArrayAssertion.parse = function parse(args, context) {
    if (args.length < 2 || args.length > 4) {
        return context.error("Expected 1, 2, or 3 arguments, but found " + (args.length - 1) + " instead.");
    }

    var itemType;
    var N;
    if (args.length > 2) {
        var type$1 = args[1];
        if (typeof type$1 !== 'string' || !(type$1 in types)) {
            return context.error('The item type argument of "array" must be one of string, number, boolean', 1);
        }
        itemType = types[type$1];
    } else {
        itemType = ValueType;
    }

    if (args.length > 3) {
        if (typeof args[2] !== 'number' || args[2] < 0 || args[2] !== Math.floor(args[2])) {
            return context.error('The length argument to "array" must be a positive integer literal', 2);
        }
        N = args[2];
    }

    var type = array(itemType, N);

    var input = context.parse(args[args.length - 1], args.length - 1, ValueType);
    if (!input) {
        return null;
    }

    return new ArrayAssertion(type, input);
};

ArrayAssertion.prototype.evaluate = function evaluate(ctx) {
    var value = this.input.evaluate(ctx);
    var error = checkSubtype(this.type, typeOf(value));
    if (error) {
        throw new RuntimeError("Expected value to be of type " + toString(this.type) + ", but found " + toString(typeOf(value)) + " instead.");
    }
    return value;
};

ArrayAssertion.prototype.eachChild = function eachChild(fn) {
    fn(this.input);
};

module.exports = ArrayAssertion;

},{"../runtime_error":22,"../types":25,"../values":26}],4:[function(require,module,exports){
'use strict'; //      

var assert = require('assert');
var ref = require('../types');
var ObjectType = ref.ObjectType;
var ValueType = ref.ValueType;
var StringType = ref.StringType;
var NumberType = ref.NumberType;
var BooleanType = ref.BooleanType;

var RuntimeError = require('../runtime_error');
var ref$1 = require('../types');
var checkSubtype = ref$1.checkSubtype;
var toString = ref$1.toString;
var ref$2 = require('../values');
var typeOf = ref$2.typeOf;

var types = {
    string: StringType,
    number: NumberType,
    boolean: BooleanType,
    object: ObjectType
};

var Assertion = function Assertion(type, args) {
    this.type = type;
    this.args = args;
};

Assertion.parse = function parse(args, context) {
    if (args.length < 2) {
        return context.error("Expected at least one argument.");
    }

    var name = args[0];
    assert(types[name], name);

    var type = types[name];

    var parsed = [];
    for (var i = 1; i < args.length; i++) {
        var input = context.parse(args[i], i, ValueType);
        if (!input) {
            return null;
        }
        parsed.push(input);
    }

    return new Assertion(type, parsed);
};

Assertion.prototype.evaluate = function evaluate(ctx) {
    var this$1 = this;

    for (var i = 0; i < this.args.length; i++) {
        var value = this$1.args[i].evaluate(ctx);
        var error = checkSubtype(this$1.type, typeOf(value));
        if (!error) {
            return value;
        } else if (i === this$1.args.length - 1) {
            throw new RuntimeError("Expected value to be of type " + toString(this$1.type) + ", but found " + toString(typeOf(value)) + " instead.");
        }
    }

    assert(false);
    return null;
};

Assertion.prototype.eachChild = function eachChild(fn) {
    this.args.forEach(fn);
};

module.exports = Assertion;

},{"../runtime_error":22,"../types":25,"../values":26,"assert":36}],5:[function(require,module,exports){
'use strict'; //      

var ref = require('../types');
var array = ref.array;
var ValueType = ref.ValueType;
var NumberType = ref.NumberType;

var RuntimeError = require('../runtime_error');

var At = function At(type, index, input) {
    this.type = type;
    this.index = index;
    this.input = input;
};

At.parse = function parse(args, context) {
    if (args.length !== 3) {
        return context.error("Expected 2 arguments, but found " + (args.length - 1) + " instead.");
    }

    var index = context.parse(args[1], 1, NumberType);
    var input = context.parse(args[2], 2, array(context.expectedType || ValueType));

    if (!index || !input) {
        return null;
    }

    var t = input.type;
    return new At(t.itemType, index, input);
};

At.prototype.evaluate = function evaluate(ctx) {
    var index = this.index.evaluate(ctx);
    var array = this.input.evaluate(ctx);

    if (index < 0 || index >= array.length) {
        throw new RuntimeError("Array index out of bounds: " + index + " > " + array.length + ".");
    }

    if (index !== Math.floor(index)) {
        throw new RuntimeError("Array index must be an integer, but found " + index + " instead.");
    }

    return array[index];
};

At.prototype.eachChild = function eachChild(fn) {
    fn(this.index);
    fn(this.input);
};

module.exports = At;

},{"../runtime_error":22,"../types":25}],6:[function(require,module,exports){
'use strict'; //      

var assert = require('assert');
var ref = require('../types');
var BooleanType = ref.BooleanType;

var Case = function Case(type, branches, otherwise) {
    this.type = type;
    this.branches = branches;
    this.otherwise = otherwise;
};

Case.parse = function parse(args, context) {
    if (args.length < 4) {
        return context.error("Expected at least 3 arguments, but found only " + (args.length - 1) + ".");
    }
    if (args.length % 2 !== 0) {
        return context.error("Expected an odd number of arguments.");
    }

    var outputType;
    if (context.expectedType && context.expectedType.kind !== 'value') {
        outputType = context.expectedType;
    }

    var branches = [];
    for (var i = 1; i < args.length - 1; i += 2) {
        var test = context.parse(args[i], i, BooleanType);
        if (!test) {
            return null;
        }

        var result = context.parse(args[i + 1], i + 1, outputType);
        if (!result) {
            return null;
        }

        branches.push([test, result]);

        outputType = outputType || result.type;
    }

    var otherwise = context.parse(args[args.length - 1], args.length - 1, outputType);
    if (!otherwise) {
        return null;
    }

    assert(outputType);
    return new Case(outputType, branches, otherwise);
};

Case.prototype.evaluate = function evaluate(ctx) {
    var this$1 = this;

    for (var i = 0, list = this$1.branches; i < list.length; i += 1) {
        var ref = list[i];
        var test = ref[0];
        var expression = ref[1];

        if (test.evaluate(ctx)) {
            return expression.evaluate(ctx);
        }
    }
    return this.otherwise.evaluate(ctx);
};

Case.prototype.eachChild = function eachChild(fn) {
    var this$1 = this;

    for (var i = 0, list = this$1.branches; i < list.length; i += 1) {
        var ref = list[i];
        var test = ref[0];
        var expression = ref[1];

        fn(test);
        fn(expression);
    }
    fn(this.otherwise);
};

module.exports = Case;

},{"../types":25,"assert":36}],7:[function(require,module,exports){
'use strict'; //      

var assert = require('assert');

var Coalesce = function Coalesce(type, args) {
    this.type = type;
    this.args = args;
};

Coalesce.parse = function parse(args, context) {
    if (args.length < 2) {
        return context.error("Expectected at least one argument.");
    }
    var outputType = null;
    if (context.expectedType && context.expectedType.kind !== 'value') {
        outputType = context.expectedType;
    }
    var parsedArgs = [];
    for (var i = 0, list = args.slice(1); i < list.length; i += 1) {
        var arg = list[i];

        var parsed = context.parse(arg, 1 + parsedArgs.length, outputType);
        if (!parsed) {
            return null;
        }
        outputType = outputType || parsed.type;
        parsedArgs.push(parsed);
    }
    assert(outputType);
    return new Coalesce(outputType, parsedArgs);
};

Coalesce.prototype.evaluate = function evaluate(ctx) {
    var this$1 = this;

    var result = null;
    for (var i = 0, list = this$1.args; i < list.length; i += 1) {
        var arg = list[i];

        result = arg.evaluate(ctx);
        if (result !== null) {
            break;
        }
    }
    return result;
};

Coalesce.prototype.eachChild = function eachChild(fn) {
    this.args.forEach(fn);
};

module.exports = Coalesce;

},{"assert":36}],8:[function(require,module,exports){
'use strict'; //      

var assert = require('assert');
var ref = require('../types');
var ColorType = ref.ColorType;
var ValueType = ref.ValueType;
var NumberType = ref.NumberType;

var ref$1 = require('../values');
var Color = ref$1.Color;
var validateRGBA = ref$1.validateRGBA;
var RuntimeError = require('../runtime_error');

var types = {
    'to-number': NumberType,
    'to-color': ColorType
};

/**
 * Special form for error-coalescing coercion expressions "to-number",
 * "to-color".  Since these coercions can fail at runtime, they accept multiple
 * arguments, only evaluating one at a time until one succeeds.
 *
 * @private
 */
var Coercion = function Coercion(type, args) {
    this.type = type;
    this.args = args;
};

Coercion.parse = function parse(args, context) {
    if (args.length < 2) {
        return context.error("Expected at least one argument.");
    }

    var name = args[0];
    assert(types[name], name);

    var type = types[name];

    var parsed = [];
    for (var i = 1; i < args.length; i++) {
        var input = context.parse(args[i], i, ValueType);
        if (!input) {
            return null;
        }
        parsed.push(input);
    }

    return new Coercion(type, parsed);
};

Coercion.prototype.evaluate = function evaluate(ctx) {
    var this$1 = this;

    if (this.type.kind === 'color') {
        var input;
        var error;
        for (var i = 0, list = this$1.args; i < list.length; i += 1) {
            var arg = list[i];

            input = arg.evaluate(ctx);
            error = null;
            if (typeof input === 'string') {
                var c = ctx.parseColor(input);
                if (c) {
                    return c;
                }
            } else if (Array.isArray(input)) {
                if (input.length < 3 || input.length > 4) {
                    error = "Invalid rbga value " + JSON.stringify(input) + ": expected an array containing either three or four numeric values.";
                } else {
                    error = validateRGBA(input[0], input[1], input[2], input[3]);
                }
                if (!error) {
                    return new Color(input[0] / 255, input[1] / 255, input[2] / 255, input[3]);
                }
            }
        }
        throw new RuntimeError(error || "Could not parse color from value '" + (typeof input === 'string' ? input : JSON.stringify(input)) + "'");
    } else {
        var value = null;
        for (var i$1 = 0, list$1 = this$1.args; i$1 < list$1.length; i$1 += 1) {
            var arg$1 = list$1[i$1];

            value = arg$1.evaluate(ctx);
            if (value === null) {
                continue;
            }
            var num = Number(value);
            if (isNaN(num)) {
                continue;
            }
            return num;
        }
        throw new RuntimeError("Could not convert " + JSON.stringify(value) + " to number.");
    }
};

Coercion.prototype.eachChild = function eachChild(fn) {
    this.args.forEach(fn);
};

module.exports = Coercion;

},{"../runtime_error":22,"../types":25,"../values":26,"assert":36}],9:[function(require,module,exports){
'use strict'; //      


var Curve = function Curve() {};

Curve.parse = function parse(args, context) {
    var interpolation = args[1];
    var input = args[2];
    var rest = args.slice(3);
    if (interpolation[0] === "step") {
        return context.error("\"curve\" has been replaced by \"step\" and \"interpolate\". Replace this expression with " + JSON.stringify(["step", input].concat(rest)), 0);
    } else {
        return context.error("\"curve\" has been replaced by \"step\" and \"interpolate\". Replace this expression with " + JSON.stringify(["interpolate", interpolation, input].concat(rest)), 0);
    }
};

Curve.prototype.evaluate = function evaluate() {};
Curve.prototype.eachChild = function eachChild() {};

module.exports = Curve;

},{}],10:[function(require,module,exports){
'use strict'; //      

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var ref = require('../types');
var NullType = ref.NullType;
var NumberType = ref.NumberType;
var StringType = ref.StringType;
var BooleanType = ref.BooleanType;
var ColorType = ref.ColorType;
var ObjectType = ref.ObjectType;
var ValueType = ref.ValueType;
var ErrorType = ref.ErrorType;
var array = ref.array;
var toString = ref.toString;

var ref$1 = require('../values');
var typeOf = ref$1.typeOf;
var Color = ref$1.Color;
var validateRGBA = ref$1.validateRGBA;
var ref$2 = require('../compound_expression');
var CompoundExpression = ref$2.CompoundExpression;
var varargs = ref$2.varargs;
var RuntimeError = require('../runtime_error');
var Let = require('./let');
var Var = require('./var');
var Literal = require('./literal');
var Assertion = require('./assertion');
var ArrayAssertion = require('./array');
var Coercion = require('./coercion');
var At = require('./at');
var Match = require('./match');
var Case = require('./case');
var Curve = require('./curve');
var Step = require('./step');
var Interpolate = require('./interpolate');
var Coalesce = require('./coalesce');

var expressions = {
    // special forms
    'let': Let,
    'var': Var,
    'literal': Literal,
    'string': Assertion,
    'number': Assertion,
    'boolean': Assertion,
    'object': Assertion,
    'array': ArrayAssertion,
    'to-number': Coercion,
    'to-color': Coercion,
    'at': At,
    'case': Case,
    'match': Match,
    'coalesce': Coalesce,
    'curve': Curve,
    'step': Step,
    'interpolate': Interpolate
};

function rgba(ctx, ref) {
    var r = ref[0];
    var g = ref[1];
    var b = ref[2];
    var a = ref[3];

    r = r.evaluate(ctx);
    g = g.evaluate(ctx);
    b = b.evaluate(ctx);
    a = a && a.evaluate(ctx);
    var error = validateRGBA(r, g, b, a);
    if (error) {
        throw new RuntimeError(error);
    }
    return new Color(r / 255, g / 255, b / 255, a);
}

function has(key, obj) {
    return key in obj;
}

function get(key, obj) {
    var v = obj[key];
    return typeof v === 'undefined' ? null : v;
}

function length(ctx, ref) {
    var v = ref[0];

    return v.evaluate(ctx).length;
}

function eq(ctx, ref) {
    var a = ref[0];
    var b = ref[1];
    return a.evaluate(ctx) === b.evaluate(ctx);
}
function ne(ctx, ref) {
    var a = ref[0];
    var b = ref[1];
    return a.evaluate(ctx) !== b.evaluate(ctx);
}
function lt(ctx, ref) {
    var a = ref[0];
    var b = ref[1];
    return a.evaluate(ctx) < b.evaluate(ctx);
}
function gt(ctx, ref) {
    var a = ref[0];
    var b = ref[1];
    return a.evaluate(ctx) > b.evaluate(ctx);
}
function lteq(ctx, ref) {
    var a = ref[0];
    var b = ref[1];
    return a.evaluate(ctx) <= b.evaluate(ctx);
}
function gteq(ctx, ref) {
    var a = ref[0];
    var b = ref[1];
    return a.evaluate(ctx) >= b.evaluate(ctx);
}

CompoundExpression.register(expressions, {
    'error': [ErrorType, [StringType], function (ctx, ref) {
        var v = ref[0];
        throw new RuntimeError(v.evaluate(ctx));
    }],
    'typeof': [StringType, [ValueType], function (ctx, ref) {
        var v = ref[0];

        return toString(typeOf(v.evaluate(ctx)));
    }],
    'to-string': [StringType, [ValueType], function (ctx, ref) {
        var v = ref[0];

        v = v.evaluate(ctx);
        var type = typeof v === 'undefined' ? 'undefined' : _typeof(v);
        if (v === null || type === 'string' || type === 'number' || type === 'boolean') {
            return String(v);
        } else if (v instanceof Color) {
            return "rgba(" + v.r * 255 + "," + v.g * 255 + "," + v.b * 255 + "," + v.a + ")";
        } else {
            return JSON.stringify(v);
        }
    }],
    'to-boolean': [BooleanType, [ValueType], function (ctx, ref) {
        var v = ref[0];

        return Boolean(v.evaluate(ctx));
    }],
    'to-rgba': [array(NumberType, 4), [ColorType], function (ctx, ref) {
        var v = ref[0];

        var ref$1 = v.evaluate(ctx);
        var r = ref$1.r;
        var g = ref$1.g;
        var b = ref$1.b;
        var a = ref$1.a;
        return [r, g, b, a];
    }],
    'rgb': [ColorType, [NumberType, NumberType, NumberType], rgba],
    'rgba': [ColorType, [NumberType, NumberType, NumberType, NumberType], rgba],
    'length': {
        type: NumberType,
        overloads: [[[StringType], length], [[array(ValueType)], length]]
    },
    'has': {
        type: BooleanType,
        overloads: [[[StringType], function (ctx, ref) {
            var key = ref[0];

            return has(key.evaluate(ctx), ctx.properties());
        }], [[StringType, ObjectType], function (ctx, ref) {
            var key = ref[0];
            var obj = ref[1];

            return has(key.evaluate(ctx), obj.evaluate(ctx));
        }]]
    },
    'get': {
        type: ValueType,
        overloads: [[[StringType], function (ctx, ref) {
            var key = ref[0];

            return get(key.evaluate(ctx), ctx.properties());
        }], [[StringType, ObjectType], function (ctx, ref) {
            var key = ref[0];
            var obj = ref[1];

            return get(key.evaluate(ctx), obj.evaluate(ctx));
        }]]
    },
    'properties': [ObjectType, [], function (ctx) {
        return ctx.properties();
    }],
    'geometry-type': [StringType, [], function (ctx) {
        return ctx.geometryType();
    }],
    'id': [ValueType, [], function (ctx) {
        return ctx.id();
    }],
    'zoom': [NumberType, [], function (ctx) {
        return ctx.globals.zoom;
    }],
    'heatmap-density': [NumberType, [], function (ctx) {
        return ctx.globals.heatmapDensity || 0;
    }],
    '+': [NumberType, varargs(NumberType), function (ctx, args) {
        var result = 0;
        for (var i = 0, list = args; i < list.length; i += 1) {
            var arg = list[i];

            result += arg.evaluate(ctx);
        }
        return result;
    }],
    '*': [NumberType, varargs(NumberType), function (ctx, args) {
        var result = 1;
        for (var i = 0, list = args; i < list.length; i += 1) {
            var arg = list[i];

            result *= arg.evaluate(ctx);
        }
        return result;
    }],
    '-': {
        type: NumberType,
        overloads: [[[NumberType, NumberType], function (ctx, ref) {
            var a = ref[0];
            var b = ref[1];

            return a.evaluate(ctx) - b.evaluate(ctx);
        }], [[NumberType], function (ctx, ref) {
            var a = ref[0];

            return -a.evaluate(ctx);
        }]]
    },
    '/': [NumberType, [NumberType, NumberType], function (ctx, ref) {
        var a = ref[0];
        var b = ref[1];

        return a.evaluate(ctx) / b.evaluate(ctx);
    }],
    '%': [NumberType, [NumberType, NumberType], function (ctx, ref) {
        var a = ref[0];
        var b = ref[1];

        return a.evaluate(ctx) % b.evaluate(ctx);
    }],
    'ln2': [NumberType, [], function () {
        return Math.LN2;
    }],
    'pi': [NumberType, [], function () {
        return Math.PI;
    }],
    'e': [NumberType, [], function () {
        return Math.E;
    }],
    '^': [NumberType, [NumberType, NumberType], function (ctx, ref) {
        var b = ref[0];
        var e = ref[1];

        return Math.pow(b.evaluate(ctx), e.evaluate(ctx));
    }],
    'sqrt': [NumberType, [NumberType], function (ctx, ref) {
        var x = ref[0];

        return Math.sqrt(x.evaluate(ctx));
    }],
    'log10': [NumberType, [NumberType], function (ctx, ref) {
        var n = ref[0];

        return Math.log10(n.evaluate(ctx));
    }],
    'ln': [NumberType, [NumberType], function (ctx, ref) {
        var n = ref[0];

        return Math.log(n.evaluate(ctx));
    }],
    'log2': [NumberType, [NumberType], function (ctx, ref) {
        var n = ref[0];

        return Math.log2(n.evaluate(ctx));
    }],
    'sin': [NumberType, [NumberType], function (ctx, ref) {
        var n = ref[0];

        return Math.sin(n.evaluate(ctx));
    }],
    'cos': [NumberType, [NumberType], function (ctx, ref) {
        var n = ref[0];

        return Math.cos(n.evaluate(ctx));
    }],
    'tan': [NumberType, [NumberType], function (ctx, ref) {
        var n = ref[0];

        return Math.tan(n.evaluate(ctx));
    }],
    'asin': [NumberType, [NumberType], function (ctx, ref) {
        var n = ref[0];

        return Math.asin(n.evaluate(ctx));
    }],
    'acos': [NumberType, [NumberType], function (ctx, ref) {
        var n = ref[0];

        return Math.acos(n.evaluate(ctx));
    }],
    'atan': [NumberType, [NumberType], function (ctx, ref) {
        var n = ref[0];

        return Math.atan(n.evaluate(ctx));
    }],
    'min': [NumberType, varargs(NumberType), function (ctx, args) {
        return Math.min.apply(Math, args.map(function (arg) {
            return arg.evaluate(ctx);
        }));
    }],
    'max': [NumberType, varargs(NumberType), function (ctx, args) {
        return Math.max.apply(Math, args.map(function (arg) {
            return arg.evaluate(ctx);
        }));
    }],
    '==': {
        type: BooleanType,
        overloads: [[[NumberType, NumberType], eq], [[StringType, StringType], eq], [[BooleanType, BooleanType], eq], [[NullType, NullType], eq]]
    },
    '!=': {
        type: BooleanType,
        overloads: [[[NumberType, NumberType], ne], [[StringType, StringType], ne], [[BooleanType, BooleanType], ne], [[NullType, NullType], ne]]
    },
    '>': {
        type: BooleanType,
        overloads: [[[NumberType, NumberType], gt], [[StringType, StringType], gt]]
    },
    '<': {
        type: BooleanType,
        overloads: [[[NumberType, NumberType], lt], [[StringType, StringType], lt]]
    },
    '>=': {
        type: BooleanType,
        overloads: [[[NumberType, NumberType], gteq], [[StringType, StringType], gteq]]
    },
    '<=': {
        type: BooleanType,
        overloads: [[[NumberType, NumberType], lteq], [[StringType, StringType], lteq]]
    },
    'all': {
        type: BooleanType,
        overloads: [[[BooleanType, BooleanType], function (ctx, ref) {
            var a = ref[0];
            var b = ref[1];

            return a.evaluate(ctx) && b.evaluate(ctx);
        }], [varargs(BooleanType), function (ctx, args) {
            for (var i = 0, list = args; i < list.length; i += 1) {
                var arg = list[i];

                if (!arg.evaluate(ctx)) {
                    return false;
                }
            }
            return true;
        }]]
    },
    'any': {
        type: BooleanType,
        overloads: [[[BooleanType, BooleanType], function (ctx, ref) {
            var a = ref[0];
            var b = ref[1];

            return a.evaluate(ctx) || b.evaluate(ctx);
        }], [varargs(BooleanType), function (ctx, args) {
            for (var i = 0, list = args; i < list.length; i += 1) {
                var arg = list[i];

                if (arg.evaluate(ctx)) {
                    return true;
                }
            }
            return false;
        }]]
    },
    '!': [BooleanType, [BooleanType], function (ctx, ref) {
        var b = ref[0];

        return !b.evaluate(ctx);
    }],
    'upcase': [StringType, [StringType], function (ctx, ref) {
        var s = ref[0];

        return s.evaluate(ctx).toUpperCase();
    }],
    'downcase': [StringType, [StringType], function (ctx, ref) {
        var s = ref[0];

        return s.evaluate(ctx).toLowerCase();
    }],
    'concat': [StringType, varargs(StringType), function (ctx, args) {
        return args.map(function (arg) {
            return arg.evaluate(ctx);
        }).join('');
    }]
});

module.exports = expressions;

},{"../compound_expression":2,"../runtime_error":22,"../types":25,"../values":26,"./array":3,"./assertion":4,"./at":5,"./case":6,"./coalesce":7,"./coercion":8,"./curve":9,"./interpolate":11,"./let":12,"./literal":13,"./match":14,"./step":15,"./var":16}],11:[function(require,module,exports){
'use strict'; //      

var UnitBezier = require('@mapbox/unitbezier');
var interpolate = require('../../util/interpolate');
var ref = require('../types');
var toString = ref.toString;
var NumberType = ref.NumberType;
var ref$1 = require("../stops");
var findStopLessThanOrEqualTo = ref$1.findStopLessThanOrEqualTo;

var Interpolate = function Interpolate(type, interpolation, input, stops) {
    var this$1 = this;

    this.type = type;
    this.interpolation = interpolation;
    this.input = input;

    this.labels = [];
    this.outputs = [];
    for (var i = 0, list = stops; i < list.length; i += 1) {
        var ref = list[i];
        var label = ref[0];
        var expression = ref[1];

        this$1.labels.push(label);
        this$1.outputs.push(expression);
    }
};

Interpolate.interpolationFactor = function interpolationFactor(interpolation, input, lower, upper) {
    var t = 0;
    if (interpolation.name === 'exponential') {
        t = exponentialInterpolation(input, interpolation.base, lower, upper);
    } else if (interpolation.name === 'linear') {
        t = exponentialInterpolation(input, 1, lower, upper);
    } else if (interpolation.name === 'cubic-bezier') {
        var c = interpolation.controlPoints;
        var ub = new UnitBezier(c[0], c[1], c[2], c[3]);
        t = ub.solve(exponentialInterpolation(input, 1, lower, upper));
    }
    return t;
};

Interpolate.parse = function parse(args, context) {
    var interpolation = args[1];
    var input = args[2];
    var rest = args.slice(3);

    if (!Array.isArray(interpolation) || interpolation.length === 0) {
        return context.error("Expected an interpolation type expression.", 1);
    }

    if (interpolation[0] === 'linear') {
        interpolation = { name: 'linear' };
    } else if (interpolation[0] === 'exponential') {
        var base = interpolation[1];
        if (typeof base !== 'number') {
            return context.error("Exponential interpolation requires a numeric base.", 1, 1);
        }
        interpolation = {
            name: 'exponential',
            base: base
        };
    } else if (interpolation[0] === 'cubic-bezier') {
        var controlPoints = interpolation.slice(1);
        if (controlPoints.length !== 4 || controlPoints.some(function (t) {
            return typeof t !== 'number' || t < 0 || t > 1;
        })) {
            return context.error('Cubic bezier interpolation requires four numeric arguments with values between 0 and 1.', 1);
        }

        interpolation = {
            name: 'cubic-bezier',
            controlPoints: controlPoints
        };
    } else {
        return context.error("Unknown interpolation type " + String(interpolation[0]), 1, 0);
    }

    if (args.length - 1 < 4) {
        return context.error("Expected at least 4 arguments, but found only " + (args.length - 1) + ".");
    }

    if ((args.length - 1) % 2 !== 0) {
        return context.error("Expected an even number of arguments.");
    }

    input = context.parse(input, 2, NumberType);
    if (!input) {
        return null;
    }

    var stops = [];

    var outputType = null;
    if (context.expectedType && context.expectedType.kind !== 'value') {
        outputType = context.expectedType;
    }

    for (var i = 0; i < rest.length; i += 2) {
        var label = rest[i];
        var value = rest[i + 1];

        var labelKey = i + 3;
        var valueKey = i + 4;

        if (typeof label !== 'number') {
            return context.error('Input/output pairs for "interpolate" expressions must be defined using literal numeric values (not computed expressions) for the input values.', labelKey);
        }

        if (stops.length && stops[stops.length - 1][0] >= label) {
            return context.error('Input/output pairs for "interpolate" expressions must be arranged with input values in strictly ascending order.', labelKey);
        }

        var parsed = context.parse(value, valueKey, outputType);
        if (!parsed) {
            return null;
        }
        outputType = outputType || parsed.type;
        stops.push([label, parsed]);
    }

    if (outputType.kind !== 'number' && outputType.kind !== 'color' && !(outputType.kind === 'array' && outputType.itemType.kind === 'number' && typeof outputType.N === 'number')) {
        return context.error("Type " + toString(outputType) + " is not interpolatable.");
    }

    return new Interpolate(outputType, interpolation, input, stops);
};

Interpolate.prototype.evaluate = function evaluate(ctx) {
    var labels = this.labels;
    var outputs = this.outputs;

    if (labels.length === 1) {
        return outputs[0].evaluate(ctx);
    }

    var value = this.input.evaluate(ctx);
    if (value <= labels[0]) {
        return outputs[0].evaluate(ctx);
    }

    var stopCount = labels.length;
    if (value >= labels[stopCount - 1]) {
        return outputs[stopCount - 1].evaluate(ctx);
    }

    var index = findStopLessThanOrEqualTo(labels, value);
    var lower = labels[index];
    var upper = labels[index + 1];
    var t = Interpolate.interpolationFactor(this.interpolation, value, lower, upper);

    var outputLower = outputs[index].evaluate(ctx);
    var outputUpper = outputs[index + 1].evaluate(ctx);

    return interpolate[this.type.kind.toLowerCase()](outputLower, outputUpper, t);
};

Interpolate.prototype.eachChild = function eachChild(fn) {
    var this$1 = this;

    fn(this.input);
    for (var i = 0, list = this$1.outputs; i < list.length; i += 1) {
        var expression = list[i];

        fn(expression);
    }
};

/**
 * Returns a ratio that can be used to interpolate between exponential function
 * stops.
 * How it works: Two consecutive stop values define a (scaled and shifted) exponential function `f(x) = a * base^x + b`, where `base` is the user-specified base,
 * and `a` and `b` are constants affording sufficient degrees of freedom to fit
 * the function to the given stops.
 *
 * Here's a bit of algebra that lets us compute `f(x)` directly from the stop
 * values without explicitly solving for `a` and `b`:
 *
 * First stop value: `f(x0) = y0 = a * base^x0 + b`
 * Second stop value: `f(x1) = y1 = a * base^x1 + b`
 * => `y1 - y0 = a(base^x1 - base^x0)`
 * => `a = (y1 - y0)/(base^x1 - base^x0)`
 *
 * Desired value: `f(x) = y = a * base^x + b`
 * => `f(x) = y0 + a * (base^x - base^x0)`
 *
 * From the above, we can replace the `a` in `a * (base^x - base^x0)` and do a
 * little algebra:
 * ```
 * a * (base^x - base^x0) = (y1 - y0)/(base^x1 - base^x0) * (base^x - base^x0)
 *                     = (y1 - y0) * (base^x - base^x0) / (base^x1 - base^x0)
 * ```
 *
 * If we let `(base^x - base^x0) / (base^x1 base^x0)`, then we have
 * `f(x) = y0 + (y1 - y0) * ratio`.  In other words, `ratio` may be treated as
 * an interpolation factor between the two stops' output values.
 *
 * (Note: a slightly different form for `ratio`,
 * `(base^(x-x0) - 1) / (base^(x1-x0) - 1) `, is equivalent, but requires fewer
 * expensive `Math.pow()` operations.)
 *
 * @private
*/
function exponentialInterpolation(input, base, lowerValue, upperValue) {
    var difference = upperValue - lowerValue;
    var progress = input - lowerValue;

    if (difference === 0) {
        return 0;
    } else if (base === 1) {
        return progress / difference;
    } else {
        return (Math.pow(base, progress) - 1) / (Math.pow(base, difference) - 1);
    }
}

module.exports = Interpolate;

},{"../../util/interpolate":33,"../stops":24,"../types":25,"@mapbox/unitbezier":35}],12:[function(require,module,exports){
'use strict'; //      


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var Let = function Let(bindings, result) {
    this.type = result.type;
    this.bindings = [].concat(bindings);
    this.result = result;
};

Let.prototype.evaluate = function evaluate(ctx) {
    ctx.pushScope(this.bindings);
    var result = this.result.evaluate(ctx);
    ctx.popScope();
    return result;
};

Let.prototype.eachChild = function eachChild(fn) {
    var this$1 = this;

    for (var i = 0, list = this$1.bindings; i < list.length; i += 1) {
        var binding = list[i];

        fn(binding[1]);
    }
    fn(this.result);
};

Let.parse = function parse(args, context) {
    if (args.length < 4) {
        return context.error("Expected at least 3 arguments, but found " + (args.length - 1) + " instead.");
    }

    var bindings = [];
    for (var i = 1; i < args.length - 1; i += 2) {
        var name = args[i];

        if (typeof name !== 'string') {
            return context.error("Expected string, but found " + (typeof name === "undefined" ? "undefined" : _typeof(name)) + " instead.", i);
        }

        if (/[^a-zA-Z0-9_]/.test(name)) {
            return context.error("Variable names must contain only alphanumeric characters or '_'.", i);
        }

        var value = context.parse(args[i + 1], i + 1);
        if (!value) {
            return null;
        }

        bindings.push([name, value]);
    }

    var result = context.parse(args[args.length - 1], args.length - 1, undefined, bindings);
    if (!result) {
        return null;
    }

    return new Let(bindings, result);
};

module.exports = Let;

},{}],13:[function(require,module,exports){
'use strict'; //      

var ref = require('../values');
var isValue = ref.isValue;
var typeOf = ref.typeOf;

var Literal = function Literal(type, value) {
    this.type = type;
    this.value = value;
};

Literal.parse = function parse(args, context) {
    if (args.length !== 2) {
        return context.error("'literal' expression requires exactly one argument, but found " + (args.length - 1) + " instead.");
    }

    if (!isValue(args[1])) {
        return context.error("invalid value");
    }

    var value = args[1];
    var type = typeOf(value);

    // special case: infer the item type if possible for zero-length arrays
    var expected = context.expectedType;
    if (type.kind === 'array' && type.N === 0 && expected && expected.kind === 'array' && (typeof expected.N !== 'number' || expected.N === 0)) {
        type = expected;
    }

    return new Literal(type, value);
};

Literal.prototype.evaluate = function evaluate() {
    return this.value;
};

Literal.prototype.eachChild = function eachChild() {};

module.exports = Literal;

},{"../values":26}],14:[function(require,module,exports){
'use strict'; //      

var assert = require('assert');
var ref = require('../values');
var typeOf = ref.typeOf;

// Map input label values to output expression index


var Match = function Match(inputType, outputType, input, cases, outputs, otherwise) {
    this.inputType = inputType;
    this.type = outputType;
    this.input = input;
    this.cases = cases;
    this.outputs = outputs;
    this.otherwise = otherwise;
};

Match.parse = function parse(args, context) {
    if (args.length < 5) {
        return context.error("Expected at least 4 arguments, but found only " + (args.length - 1) + ".");
    }
    if (args.length % 2 !== 1) {
        return context.error("Expected an even number of arguments.");
    }

    var inputType;
    var outputType;
    if (context.expectedType && context.expectedType.kind !== 'value') {
        outputType = context.expectedType;
    }
    var cases = {};
    var outputs = [];
    for (var i = 2; i < args.length - 1; i += 2) {
        var labels = args[i];
        var value = args[i + 1];

        if (!Array.isArray(labels)) {
            labels = [labels];
        }

        var labelContext = context.concat(i);
        if (labels.length === 0) {
            return labelContext.error('Expected at least one branch label.');
        }

        for (var i$1 = 0, list = labels; i$1 < list.length; i$1 += 1) {
            var label = list[i$1];

            if (typeof label !== 'number' && typeof label !== 'string') {
                return labelContext.error("Branch labels must be numbers or strings.");
            } else if (typeof label === 'number' && Math.abs(label) > Number.MAX_SAFE_INTEGER) {
                return labelContext.error("Branch labels must be integers no larger than " + Number.MAX_SAFE_INTEGER + ".");
            } else if (typeof label === 'number' && Math.floor(label) !== label) {
                return labelContext.error("Numeric branch labels must be integer values.");
            } else if (!inputType) {
                inputType = typeOf(label);
            } else if (labelContext.checkSubtype(inputType, typeOf(label))) {
                return null;
            }

            if (typeof cases[String(label)] !== 'undefined') {
                return labelContext.error('Branch labels must be unique.');
            }

            cases[String(label)] = outputs.length;
        }

        var result = context.parse(value, i, outputType);
        if (!result) {
            return null;
        }
        outputType = outputType || result.type;
        outputs.push(result);
    }

    var input = context.parse(args[1], 1, inputType);
    if (!input) {
        return null;
    }

    var otherwise = context.parse(args[args.length - 1], args.length - 1, outputType);
    if (!otherwise) {
        return null;
    }

    assert(inputType && outputType);
    return new Match(inputType, outputType, input, cases, outputs, otherwise);
};

Match.prototype.evaluate = function evaluate(ctx) {
    var input = this.input.evaluate(ctx);
    return (this.outputs[this.cases[input]] || this.otherwise).evaluate(ctx);
};

Match.prototype.eachChild = function eachChild(fn) {
    fn(this.input);
    this.outputs.forEach(fn);
    fn(this.otherwise);
};

module.exports = Match;

},{"../values":26,"assert":36}],15:[function(require,module,exports){
'use strict'; //      

var ref = require('../types');
var NumberType = ref.NumberType;
var ref$1 = require("../stops");
var findStopLessThanOrEqualTo = ref$1.findStopLessThanOrEqualTo;

var Step = function Step(type, input, stops) {
    var this$1 = this;

    this.type = type;
    this.input = input;

    this.labels = [];
    this.outputs = [];
    for (var i = 0, list = stops; i < list.length; i += 1) {
        var ref = list[i];
        var label = ref[0];
        var expression = ref[1];

        this$1.labels.push(label);
        this$1.outputs.push(expression);
    }
};

Step.parse = function parse(args, context) {
    var input = args[1];
    var rest = args.slice(2);

    if (args.length - 1 < 4) {
        return context.error("Expected at least 4 arguments, but found only " + (args.length - 1) + ".");
    }

    if ((args.length - 1) % 2 !== 0) {
        return context.error("Expected an even number of arguments.");
    }

    input = context.parse(input, 1, NumberType);
    if (!input) {
        return null;
    }

    var stops = [];

    var outputType = null;
    if (context.expectedType && context.expectedType.kind !== 'value') {
        outputType = context.expectedType;
    }

    rest.unshift(-Infinity);

    for (var i = 0; i < rest.length; i += 2) {
        var label = rest[i];
        var value = rest[i + 1];

        var labelKey = i + 1;
        var valueKey = i + 2;

        if (typeof label !== 'number') {
            return context.error('Input/output pairs for "step" expressions must be defined using literal numeric values (not computed expressions) for the input values.', labelKey);
        }

        if (stops.length && stops[stops.length - 1][0] >= label) {
            return context.error('Input/output pairs for "step" expressions must be arranged with input values in strictly ascending order.', labelKey);
        }

        var parsed = context.parse(value, valueKey, outputType);
        if (!parsed) {
            return null;
        }
        outputType = outputType || parsed.type;
        stops.push([label, parsed]);
    }

    return new Step(outputType, input, stops);
};

Step.prototype.evaluate = function evaluate(ctx) {
    var labels = this.labels;
    var outputs = this.outputs;

    if (labels.length === 1) {
        return outputs[0].evaluate(ctx);
    }

    var value = this.input.evaluate(ctx);
    if (value <= labels[0]) {
        return outputs[0].evaluate(ctx);
    }

    var stopCount = labels.length;
    if (value >= labels[stopCount - 1]) {
        return outputs[stopCount - 1].evaluate(ctx);
    }

    var index = findStopLessThanOrEqualTo(labels, value);
    return outputs[index].evaluate(ctx);
};

Step.prototype.eachChild = function eachChild(fn) {
    var this$1 = this;

    fn(this.input);
    for (var i = 0, list = this$1.outputs; i < list.length; i += 1) {
        var expression = list[i];

        fn(expression);
    }
};

module.exports = Step;

},{"../stops":24,"../types":25}],16:[function(require,module,exports){
'use strict'; //      


var Var = function Var(name, type) {
    this.type = type;
    this.name = name;
};

Var.parse = function parse(args, context) {
    if (args.length !== 2 || typeof args[1] !== 'string') {
        return context.error("'var' expression requires exactly one string literal argument.");
    }

    var name = args[1];
    if (!context.scope.has(name)) {
        return context.error("Unknown variable \"" + name + "\". Make sure \"" + name + "\" has been bound in an enclosing \"let\" expression before using it.", 1);
    }

    return new Var(name, context.scope.get(name).type);
};

Var.prototype.evaluate = function evaluate(ctx) {
    return ctx.scope.get(this.name).evaluate(ctx);
};

Var.prototype.eachChild = function eachChild() {};

module.exports = Var;

},{}],17:[function(require,module,exports){
'use strict'; //      

var assert = require('assert');
var Scope = require('./scope');
var ref = require('./values');
var Color = ref.Color;

var geometryTypes = ['Unknown', 'Point', 'LineString', 'Polygon'];

var EvaluationContext = function EvaluationContext() {
    this.scope = new Scope();
    this._parseColorCache = {};
};

EvaluationContext.prototype.id = function id() {
    return this.feature && 'id' in this.feature ? this.feature.id : null;
};

EvaluationContext.prototype.geometryType = function geometryType() {
    return this.feature ? typeof this.feature.type === 'number' ? geometryTypes[this.feature.type] : this.feature.type : null;
};

EvaluationContext.prototype.properties = function properties() {
    return this.feature && this.feature.properties || {};
};

EvaluationContext.prototype.pushScope = function pushScope(bindings) {
    this.scope = this.scope.concat(bindings);
};

EvaluationContext.prototype.popScope = function popScope() {
    assert(this.scope.parent);
    this.scope = this.scope.parent;
};

EvaluationContext.prototype.parseColor = function parseColor(input) {
    var cached = this._parseColorCache[input];
    if (!cached) {
        cached = this._parseColorCache[input] = Color.parse(input);
    }
    return cached;
};

module.exports = EvaluationContext;

},{"./scope":23,"./values":26,"assert":36}],18:[function(require,module,exports){
'use strict'; //      

var assert = require('assert');
var ParsingError = require('./parsing_error');
var ParsingContext = require('./parsing_context');
var EvaluationContext = require('./evaluation_context');
var ref = require('./compound_expression');
var CompoundExpression = ref.CompoundExpression;
var Step = require('./definitions/step');
var Interpolate = require('./definitions/interpolate');
var Coalesce = require('./definitions/coalesce');
var Let = require('./definitions/let');
var definitions = require('./definitions');
var isConstant = require('./is_constant');
var RuntimeError = require('./runtime_error');
var ref$1 = require('../util/result');
var success = ref$1.success;
var error = ref$1.error;

function isExpression(expression) {
    return Array.isArray(expression) && expression.length > 0 && typeof expression[0] === 'string' && expression[0] in definitions;
}

/**
 * Parse and typecheck the given style spec JSON expression.  If
 * options.defaultValue is provided, then the resulting StyleExpression's
 * `evaluate()` method will handle errors by logging a warning (once per
 * message) and returning the default value.  Otherwise, it will throw
 * evaluation errors.
 *
 * @private
 */
function createExpression(expression, propertySpec, options) {
    if (options === void 0) options = {};

    var parser = new ParsingContext(definitions, [], getExpectedType(propertySpec));
    var parsed = parser.parse(expression);
    if (!parsed) {
        assert(parser.errors.length > 0);
        return error(parser.errors);
    }

    var evaluator = new EvaluationContext();

    var evaluate;
    if (options.handleErrors === false) {
        evaluate = function evaluate(globals, feature) {
            evaluator.globals = globals;
            evaluator.feature = feature;
            return parsed.evaluate(evaluator);
        };
    } else {
        var warningHistory = {};
        var defaultValue = getDefaultValue(propertySpec);
        var enumValues;
        if (propertySpec.type === 'enum') {
            enumValues = propertySpec.values;
        }
        evaluate = function evaluate(globals, feature) {
            evaluator.globals = globals;
            evaluator.feature = feature;
            try {
                var val = parsed.evaluate(evaluator);
                if (val === null || val === undefined) {
                    return defaultValue;
                }
                if (enumValues && !(val in enumValues)) {
                    throw new RuntimeError("Expected value to be one of " + Object.keys(enumValues).map(function (v) {
                        return JSON.stringify(v);
                    }).join(', ') + ", but found " + JSON.stringify(val) + " instead.");
                }
                return val;
            } catch (e) {
                if (!warningHistory[e.message]) {
                    warningHistory[e.message] = true;
                    if (typeof console !== 'undefined') {
                        console.warn(e.message);
                    }
                }
                return defaultValue;
            }
        };
    }

    return success({ evaluate: evaluate, parsed: parsed });
}

function createPropertyExpression(expression, propertySpec, options) {
    if (options === void 0) options = {};

    expression = createExpression(expression, propertySpec, options);
    if (expression.result === 'error') {
        return expression;
    }

    var ref = expression.value;
    var evaluate = ref.evaluate;
    var parsed = ref.parsed;

    var isFeatureConstant = isConstant.isFeatureConstant(parsed);
    if (!isFeatureConstant && !propertySpec['property-function']) {
        return error([new ParsingError('', 'property expressions not supported')]);
    }

    var isZoomConstant = isConstant.isGlobalPropertyConstant(parsed, ['zoom']);
    if (!isZoomConstant && propertySpec['zoom-function'] === false) {
        return error([new ParsingError('', 'zoom expressions not supported')]);
    }

    var zoomCurve = findZoomCurve(parsed);
    if (!zoomCurve && !isZoomConstant) {
        return error([new ParsingError('', '"zoom" expression may only be used as input to a top-level "step" or "interpolate" expression.')]);
    } else if (zoomCurve instanceof ParsingError) {
        return error([zoomCurve]);
    } else if (zoomCurve instanceof Interpolate && propertySpec['function'] === 'piecewise-constant') {
        return error([new ParsingError('', '"interpolate" expressions cannot be used with this property')]);
    }

    if (!zoomCurve) {
        return success(isFeatureConstant ? { kind: 'constant', parsed: parsed, evaluate: evaluate } : { kind: 'source', parsed: parsed, evaluate: evaluate });
    }

    var interpolationFactor = zoomCurve instanceof Interpolate ? Interpolate.interpolationFactor.bind(undefined, zoomCurve.interpolation) : function () {
        return 0;
    };
    var zoomStops = zoomCurve.labels;

    return success(isFeatureConstant ? { kind: 'camera', parsed: parsed, evaluate: evaluate, interpolationFactor: interpolationFactor, zoomStops: zoomStops } : { kind: 'composite', parsed: parsed, evaluate: evaluate, interpolationFactor: interpolationFactor, zoomStops: zoomStops });
}

module.exports = {
    isExpression: isExpression,
    createExpression: createExpression,
    createPropertyExpression: createPropertyExpression
};

// Zoom-dependent expressions may only use ["zoom"] as the input to a top-level "step" or "interpolate"
// expression (collectively referred to as a "curve"). The curve may be wrapped in one or more "let" or
// "coalesce" expressions.
function findZoomCurve(expression) {
    var result = null;
    if (expression instanceof Let) {
        result = findZoomCurve(expression.result);
    } else if (expression instanceof Coalesce) {
        for (var i = 0, list = expression.args; i < list.length; i += 1) {
            var arg = list[i];

            result = findZoomCurve(arg);
            if (result) {
                break;
            }
        }
    } else if ((expression instanceof Step || expression instanceof Interpolate) && expression.input instanceof CompoundExpression && expression.input.name === 'zoom') {

        result = expression;
    }

    if (result instanceof ParsingError) {
        return result;
    }

    expression.eachChild(function (child) {
        var childResult = findZoomCurve(child);
        if (childResult instanceof ParsingError) {
            result = childResult;
        } else if (!result && childResult) {
            result = new ParsingError('', '"zoom" expression may only be used as input to a top-level "step" or "interpolate" expression.');
        } else if (result && childResult && result !== childResult) {
            result = new ParsingError('', 'Only one zoom-based "step" or "interpolate" subexpression may be used in an expression.');
        }
    });

    return result;
}

var ref$2 = require('./types');
var ColorType = ref$2.ColorType;
var StringType = ref$2.StringType;
var NumberType = ref$2.NumberType;
var BooleanType = ref$2.BooleanType;
var ValueType = ref$2.ValueType;
var array = ref$2.array;

function getExpectedType(spec) {
    var types = {
        color: ColorType,
        string: StringType,
        number: NumberType,
        enum: StringType,
        boolean: BooleanType
    };

    if (spec.type === 'array') {
        return array(types[spec.value] || ValueType, spec.length);
    }

    return types[spec.type] || null;
}

var ref$3 = require('../function');
var isFunction = ref$3.isFunction;
var ref$4 = require('./values');
var Color = ref$4.Color;

function getDefaultValue(spec) {
    if (spec.type === 'color' && isFunction(spec.default)) {
        // Special case for heatmap-color: it uses the 'default:' to define a
        // default color ramp, but createExpression expects a simple value to fall
        // back to in case of runtime errors
        return new Color(0, 0, 0, 0);
    } else if (spec.type === 'color') {
        return Color.parse(spec.default) || null;
    } else if (spec.default === undefined) {
        return null;
    } else {
        return spec.default;
    }
}

},{"../function":28,"../util/result":34,"./compound_expression":2,"./definitions":10,"./definitions/coalesce":7,"./definitions/interpolate":11,"./definitions/let":12,"./definitions/step":15,"./evaluation_context":17,"./is_constant":19,"./parsing_context":20,"./parsing_error":21,"./runtime_error":22,"./types":25,"./values":26,"assert":36}],19:[function(require,module,exports){
'use strict'; //      

var ref = require('./compound_expression');
var CompoundExpression = ref.CompoundExpression;

function isFeatureConstant(e) {
    if (e instanceof CompoundExpression) {
        if (e.name === 'get' && e.args.length === 1) {
            return false;
        } else if (e.name === 'has' && e.args.length === 1) {
            return false;
        } else if (e.name === 'properties' || e.name === 'geometry-type' || e.name === 'id') {
            return false;
        }
    }

    var result = true;
    e.eachChild(function (arg) {
        if (result && !isFeatureConstant(arg)) {
            result = false;
        }
    });
    return result;
}

function isGlobalPropertyConstant(e, properties) {
    if (e instanceof CompoundExpression && properties.indexOf(e.name) >= 0) {
        return false;
    }
    var result = true;
    e.eachChild(function (arg) {
        if (result && !isGlobalPropertyConstant(arg, properties)) {
            result = false;
        }
    });
    return result;
}

module.exports = {
    isFeatureConstant: isFeatureConstant,
    isGlobalPropertyConstant: isGlobalPropertyConstant
};

},{"./compound_expression":2}],20:[function(require,module,exports){
'use strict'; //      

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var Scope = require('./scope');
var ref = require('./types');
var checkSubtype = ref.checkSubtype;
var ParsingError = require('./parsing_error');
var Literal = require('./definitions/literal');

/**
 * State associated parsing at a given point in an expression tree.
 * @private
 */
var ParsingContext = function ParsingContext(definitions, path, expectedType, scope, errors) {
    if (path === void 0) path = [];
    if (scope === void 0) scope = new Scope();
    if (errors === void 0) errors = [];

    this.definitions = definitions;
    this.path = path;
    this.key = path.map(function (part) {
        return "[" + part + "]";
    }).join('');
    this.scope = scope;
    this.errors = errors;
    this.expectedType = expectedType;
};

ParsingContext.prototype.parse = function parse(expr, index, expectedType, bindings) {
    var context = this;
    if (index) {
        context = context.concat(index, expectedType, bindings);
    }

    if (expr === null || typeof expr === 'string' || typeof expr === 'boolean' || typeof expr === 'number') {
        expr = ['literal', expr];
    }

    if (Array.isArray(expr)) {
        if (expr.length === 0) {
            return context.error("Expected an array with at least one element. If you wanted a literal array, use [\"literal\", []].");
        }

        var op = expr[0];
        if (typeof op !== 'string') {
            context.error("Expression name must be a string, but found " + (typeof op === 'undefined' ? 'undefined' : _typeof(op)) + " instead. If you wanted a literal array, use [\"literal\", [...]].", 0);
            return null;
        }

        var Expr = context.definitions[op];
        if (Expr) {
            var parsed = Expr.parse(expr, context);
            if (!parsed) {
                return null;
            }
            var expected = context.expectedType;
            var actual = parsed.type;
            if (expected) {
                // When we expect a number, string, or boolean but have a
                // Value, wrap it in a refining assertion, and when we expect
                // a Color but have a String or Value, wrap it in "to-color"
                // coercion.
                var canAssert = expected.kind === 'string' || expected.kind === 'number' || expected.kind === 'boolean';

                if (canAssert && actual.kind === 'value') {
                    var Assertion = require('./definitions/assertion');
                    parsed = new Assertion(expected, [parsed]);
                } else if (expected.kind === 'color' && (actual.kind === 'value' || actual.kind === 'string')) {
                    var Coercion = require('./definitions/coercion');
                    parsed = new Coercion(expected, [parsed]);
                }

                if (context.checkSubtype(expected, parsed.type)) {
                    return null;
                }
            }

            // If an expression's arguments are all literals, we can evaluate
            // it immediately and replace it with a literal value in the
            // parsed/compiled result.
            if (!(parsed instanceof Literal) && isConstant(parsed)) {
                var ec = new (require('./evaluation_context'))();
                try {
                    parsed = new Literal(parsed.type, parsed.evaluate(ec));
                } catch (e) {
                    context.error(e.message);
                    return null;
                }
            }

            return parsed;
        }

        return context.error("Unknown expression \"" + op + "\". If you wanted a literal array, use [\"literal\", [...]].", 0);
    } else if (typeof expr === 'undefined') {
        return context.error("'undefined' value invalid. Use null instead.");
    } else if ((typeof expr === 'undefined' ? 'undefined' : _typeof(expr)) === 'object') {
        return context.error("Bare objects invalid. Use [\"literal\", {...}] instead.");
    } else {
        return context.error("Expected an array, but found " + (typeof expr === 'undefined' ? 'undefined' : _typeof(expr)) + " instead.");
    }
};

/**
 * Returns a copy of this context suitable for parsing the subexpression at
 * index `index`, optionally appending to 'let' binding map.
 *
 * Note that `errors` property, intended for collecting errors while
 * parsing, is copied by reference rather than cloned.
 * @private
 */
ParsingContext.prototype.concat = function concat(index, expectedType, bindings) {
    var path = typeof index === 'number' ? this.path.concat(index) : this.path;
    var scope = bindings ? this.scope.concat(bindings) : this.scope;
    return new ParsingContext(this.definitions, path, expectedType || null, scope, this.errors);
};

/**
 * Push a parsing (or type checking) error into the `this.errors`
 * @param error The message
 * @param keys Optionally specify the source of the error at a child
 * of the current expression at `this.key`.
 * @private
 */
ParsingContext.prototype.error = function error(error$1) {
    var keys = [],
        len = arguments.length - 1;
    while (len-- > 0) {
        keys[len] = arguments[len + 1];
    }var key = "" + this.key + keys.map(function (k) {
        return "[" + k + "]";
    }).join('');
    this.errors.push(new ParsingError(key, error$1));
};

/**
 * Returns null if `t` is a subtype of `expected`; otherwise returns an
 * error message and also pushes it to `this.errors`.
 */
ParsingContext.prototype.checkSubtype = function checkSubtype$1(expected, t) {
    var error = checkSubtype(expected, t);
    if (error) {
        this.error(error);
    }
    return error;
};

module.exports = ParsingContext;

function isConstant(expression) {
    // requires within function body to workaround circular dependency
    var ref = require('./compound_expression');
    var CompoundExpression = ref.CompoundExpression;
    var ref$1 = require('./is_constant');
    var isGlobalPropertyConstant = ref$1.isGlobalPropertyConstant;
    var isFeatureConstant = ref$1.isFeatureConstant;
    var Var = require('./definitions/var');

    if (expression instanceof Var) {
        return false;
    } else if (expression instanceof CompoundExpression && expression.name === 'error') {
        return false;
    }

    var literalArgs = true;
    expression.eachChild(function (arg) {
        if (!(arg instanceof Literal)) {
            literalArgs = false;
        }
    });
    if (!literalArgs) {
        return false;
    }

    return isFeatureConstant(expression) && isGlobalPropertyConstant(expression, ['zoom', 'heatmap-density']);
}

},{"./compound_expression":2,"./definitions/assertion":4,"./definitions/coercion":8,"./definitions/literal":13,"./definitions/var":16,"./evaluation_context":17,"./is_constant":19,"./parsing_error":21,"./scope":23,"./types":25}],21:[function(require,module,exports){
'use strict'; //      

var ParsingError = function (Error) {
    function ParsingError(key, message) {
        Error.call(this, message);
        this.message = message;
        this.key = key;
    }

    if (Error) ParsingError.__proto__ = Error;
    ParsingError.prototype = Object.create(Error && Error.prototype);
    ParsingError.prototype.constructor = ParsingError;

    return ParsingError;
}(Error);

module.exports = ParsingError;

},{}],22:[function(require,module,exports){
'use strict'; //      

var RuntimeError = function RuntimeError(message) {
    this.name = 'ExpressionEvaluationError';
    this.message = message;
};

RuntimeError.prototype.toJSON = function toJSON() {
    return this.message;
};

module.exports = RuntimeError;

},{}],23:[function(require,module,exports){
'use strict'; //      


/**
 * Tracks `let` bindings during expression parsing.
 * @private
 */

var Scope = function Scope(parent, bindings) {
    var this$1 = this;
    if (bindings === void 0) bindings = [];

    this.parent = parent;
    this.bindings = {};
    for (var i = 0, list = bindings; i < list.length; i += 1) {
        var ref = list[i];
        var name = ref[0];
        var expression = ref[1];

        this$1.bindings[name] = expression;
    }
};

Scope.prototype.concat = function concat(bindings) {
    return new Scope(this, bindings);
};

Scope.prototype.get = function get(name) {
    if (this.bindings[name]) {
        return this.bindings[name];
    }
    if (this.parent) {
        return this.parent.get(name);
    }
    throw new Error(name + " not found in scope.");
};

Scope.prototype.has = function has(name) {
    if (this.bindings[name]) {
        return true;
    }
    return this.parent ? this.parent.has(name) : false;
};

module.exports = Scope;

},{}],24:[function(require,module,exports){
'use strict'; //      


/**
 * Returns the index of the last stop <= input, or 0 if it doesn't exist.
 * @private
 */

function findStopLessThanOrEqualTo(stops, input) {
    var n = stops.length;
    var lowerIndex = 0;
    var upperIndex = n - 1;
    var currentIndex = 0;
    var currentValue, upperValue;

    while (lowerIndex <= upperIndex) {
        currentIndex = Math.floor((lowerIndex + upperIndex) / 2);
        currentValue = stops[currentIndex];
        upperValue = stops[currentIndex + 1];
        if (input === currentValue || input > currentValue && input < upperValue) {
            // Search complete
            return currentIndex;
        } else if (currentValue < input) {
            lowerIndex = currentIndex + 1;
        } else if (currentValue > input) {
            upperIndex = currentIndex - 1;
        }
    }

    return Math.max(currentIndex - 1, 0);
}

module.exports = { findStopLessThanOrEqualTo: findStopLessThanOrEqualTo };

},{}],25:[function(require,module,exports){
'use strict'; //      


var NullType = { kind: 'null' };
var NumberType = { kind: 'number' };
var StringType = { kind: 'string' };
var BooleanType = { kind: 'boolean' };
var ColorType = { kind: 'color' };
var ObjectType = { kind: 'object' };
var ValueType = { kind: 'value' };
var ErrorType = { kind: 'error' };

function array(itemType, N) {
    return {
        kind: 'array',
        itemType: itemType,
        N: N
    };
}

function toString(type) {
    if (type.kind === 'array') {
        var itemType = toString(type.itemType);
        return typeof type.N === 'number' ? "array<" + itemType + ", " + type.N + ">" : type.itemType.kind === 'value' ? 'array' : "array<" + itemType + ">";
    } else {
        return type.kind;
    }
}

var valueMemberTypes = [NullType, NumberType, StringType, BooleanType, ColorType, ObjectType, array(ValueType)];

/**
 * Returns null if `t` is a subtype of `expected`; otherwise returns an
 * error message.
 * @private
 */
function checkSubtype(expected, t) {
    if (t.kind === 'error') {
        // Error is a subtype of every type
        return null;
    } else if (expected.kind === 'array') {
        if (t.kind === 'array' && !checkSubtype(expected.itemType, t.itemType) && (typeof expected.N !== 'number' || expected.N === t.N)) {
            return null;
        }
    } else if (expected.kind === t.kind) {
        return null;
    } else if (expected.kind === 'value') {
        for (var i = 0, list = valueMemberTypes; i < list.length; i += 1) {
            var memberType = list[i];

            if (!checkSubtype(memberType, t)) {
                return null;
            }
        }
    }

    return "Expected " + toString(expected) + " but found " + toString(t) + " instead.";
}

module.exports = {
    NullType: NullType,
    NumberType: NumberType,
    StringType: StringType,
    BooleanType: BooleanType,
    ColorType: ColorType,
    ObjectType: ObjectType,
    ValueType: ValueType,
    array: array,
    ErrorType: ErrorType,
    toString: toString,
    checkSubtype: checkSubtype
};

},{}],26:[function(require,module,exports){
'use strict'; //      

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var assert = require('assert');
var Color = require('../util/color');

var ref = require('./types');
var NullType = ref.NullType;
var NumberType = ref.NumberType;
var StringType = ref.StringType;
var BooleanType = ref.BooleanType;
var ColorType = ref.ColorType;
var ObjectType = ref.ObjectType;
var ValueType = ref.ValueType;
var array = ref.array;

function validateRGBA(r, g, b, a) {
    if (!(typeof r === 'number' && r >= 0 && r <= 255 && typeof g === 'number' && g >= 0 && g <= 255 && typeof b === 'number' && b >= 0 && b <= 255)) {
        var value = typeof a === 'number' ? [r, g, b, a] : [r, g, b];
        return "Invalid rgba value [" + value.join(', ') + "]: 'r', 'g', and 'b' must be between 0 and 255.";
    }

    if (!(typeof a === 'undefined' || typeof a === 'number' && a >= 0 && a <= 1)) {
        return "Invalid rgba value [" + [r, g, b, a].join(', ') + "]: 'a' must be between 0 and 1.";
    }

    return null;
}

function isValue(mixed) {
    if (mixed === null) {
        return true;
    } else if (typeof mixed === 'string') {
        return true;
    } else if (typeof mixed === 'boolean') {
        return true;
    } else if (typeof mixed === 'number') {
        return true;
    } else if (mixed instanceof Color) {
        return true;
    } else if (Array.isArray(mixed)) {
        for (var i = 0, list = mixed; i < list.length; i += 1) {
            var item = list[i];

            if (!isValue(item)) {
                return false;
            }
        }
        return true;
    } else if ((typeof mixed === 'undefined' ? 'undefined' : _typeof(mixed)) === 'object') {
        for (var key in mixed) {
            if (!isValue(mixed[key])) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
}

function typeOf(value) {
    if (value === null) {
        return NullType;
    } else if (typeof value === 'string') {
        return StringType;
    } else if (typeof value === 'boolean') {
        return BooleanType;
    } else if (typeof value === 'number') {
        return NumberType;
    } else if (value instanceof Color) {
        return ColorType;
    } else if (Array.isArray(value)) {
        var length = value.length;
        var itemType;

        for (var i = 0, list = value; i < list.length; i += 1) {
            var item = list[i];

            var t = typeOf(item);
            if (!itemType) {
                itemType = t;
            } else if (itemType === t) {
                continue;
            } else {
                itemType = ValueType;
                break;
            }
        }

        return array(itemType || ValueType, length);
    } else {
        assert((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object');
        return ObjectType;
    }
}

module.exports = {
    Color: Color,
    validateRGBA: validateRGBA,
    isValue: isValue,
    typeOf: typeOf
};

},{"../util/color":29,"./types":25,"assert":36}],27:[function(require,module,exports){
'use strict'; //      

var ref = require('../expression');
var createExpression = ref.createExpression;

module.exports = createFilter;
module.exports.isExpressionFilter = isExpressionFilter;

function isExpressionFilter(filter) {
    if (!Array.isArray(filter) || filter.length === 0) {
        return false;
    }
    switch (filter[0]) {
        case 'has':
            return filter.length >= 2 && filter[1] !== '$id' && filter[1] !== '$type';

        case 'in':
        case '!in':
        case '!has':
        case 'none':
            return false;

        case '==':
        case '!=':
        case '>':
        case '>=':
        case '<':
        case '<=':
            return filter.length === 3 && (Array.isArray(filter[1]) || Array.isArray(filter[2]));

        case 'any':
        case 'all':
            for (var i = 0, list = filter.slice(1); i < list.length; i += 1) {
                var f = list[i];

                if (!isExpressionFilter(f) && typeof f !== 'boolean') {
                    return false;
                }
            }
            return true;

        default:
            return true;
    }
}

var types = ['Unknown', 'Point', 'LineString', 'Polygon'];

var filterSpec = {
    'type': 'boolean',
    'default': false,
    'function': true,
    'property-function': true,
    'zoom-function': true
};

/**
 * Given a filter expressed as nested arrays, return a new function
 * that evaluates whether a given feature (with a .properties or .tags property)
 * passes its test.
 *
 * @private
 * @param {Array} filter mapbox gl filter
 * @returns {Function} filter-evaluating function
 */
function createFilter(filter) {
    if (!filter) {
        return function () {
            return true;
        };
    }

    if (!isExpressionFilter(filter)) {
        return new Function('g', 'f', "var p = (f && f.properties || {}); return " + compile(filter));
    }

    var compiled = createExpression(filter, filterSpec);
    if (compiled.result === 'error') {
        throw new Error(compiled.value.map(function (err) {
            return err.key + ": " + err.message;
        }).join(', '));
    } else {
        return compiled.value.evaluate;
    }
}

function compile(filter) {
    if (!filter) {
        return 'true';
    }
    var op = filter[0];
    if (filter.length <= 1) {
        return op === 'any' ? 'false' : 'true';
    }
    var str = op === '==' ? compileComparisonOp(filter[1], filter[2], '===', false) : op === '!=' ? compileComparisonOp(filter[1], filter[2], '!==', false) : op === '<' || op === '>' || op === '<=' || op === '>=' ? compileComparisonOp(filter[1], filter[2], op, true) : op === 'any' ? compileLogicalOp(filter.slice(1), '||') : op === 'all' ? compileLogicalOp(filter.slice(1), '&&') : op === 'none' ? compileNegation(compileLogicalOp(filter.slice(1), '||')) : op === 'in' ? compileInOp(filter[1], filter.slice(2)) : op === '!in' ? compileNegation(compileInOp(filter[1], filter.slice(2))) : op === 'has' ? compileHasOp(filter[1]) : op === '!has' ? compileNegation(compileHasOp(filter[1])) : 'true';
    return "(" + str + ")";
}

function compilePropertyReference(property) {
    var ref = property === '$type' ? 'f.type' : property === '$id' ? 'f.id' : "p[" + JSON.stringify(property) + "]";
    return ref;
}

function compileComparisonOp(property, value, op, checkType) {
    var left = compilePropertyReference(property);
    var right = property === '$type' ? types.indexOf(value) : JSON.stringify(value);
    return (checkType ? "typeof " + left + "=== typeof " + right + "&&" : '') + left + op + right;
}

function compileLogicalOp(expressions, op) {
    return expressions.map(compile).join(op);
}

function compileInOp(property, values) {
    if (property === '$type') {
        values = values.map(function (value) {
            return types.indexOf(value);
        });
    }
    var left = JSON.stringify(values.sort(compare));
    var right = compilePropertyReference(property);

    if (values.length <= 200) {
        return left + ".indexOf(" + right + ") !== -1";
    }

    return "" + ('function(v, a, i, j) {' + 'while (i <= j) { var m = (i + j) >> 1;' + '    if (a[m] === v) return true; if (a[m] > v) j = m - 1; else i = m + 1;' + '}' + 'return false; }(') + right + ", " + left + ",0," + (values.length - 1) + ")";
}

function compileHasOp(property) {
    return property === '$id' ? '"id" in f' : JSON.stringify(property) + " in p";
}

function compileNegation(expression) {
    return "!(" + expression + ")";
}

// Comparison function to sort numbers and strings
function compare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

},{"../expression":18}],28:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var colorSpaces = require('../util/color_spaces');
var Color = require('../util/color');
var extend = require('../util/extend');
var getType = require('../util/get_type');
var interpolate = require('../util/interpolate');
var Interpolate = require('../expression/definitions/interpolate');

function isFunction(value) {
    return (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && value !== null && !Array.isArray(value);
}

function identityFunction(x) {
    return x;
}

function createFunction(parameters, propertySpec) {
    var isColor = propertySpec.type === 'color';
    var zoomAndFeatureDependent = parameters.stops && _typeof(parameters.stops[0][0]) === 'object';
    var featureDependent = zoomAndFeatureDependent || parameters.property !== undefined;
    var zoomDependent = zoomAndFeatureDependent || !featureDependent;
    var type = parameters.type || (propertySpec.function === 'interpolated' ? 'exponential' : 'interval');

    if (isColor) {
        parameters = extend({}, parameters);

        if (parameters.stops) {
            parameters.stops = parameters.stops.map(function (stop) {
                return [stop[0], Color.parse(stop[1])];
            });
        }

        if (parameters.default) {
            parameters.default = Color.parse(parameters.default);
        } else {
            parameters.default = Color.parse(propertySpec.default);
        }
    }

    var innerFun;
    var hashedStops;
    var categoricalKeyType;
    if (type === 'exponential') {
        innerFun = evaluateExponentialFunction;
    } else if (type === 'interval') {
        innerFun = evaluateIntervalFunction;
    } else if (type === 'categorical') {
        innerFun = evaluateCategoricalFunction;

        // For categorical functions, generate an Object as a hashmap of the stops for fast searching
        hashedStops = Object.create(null);
        for (var i = 0, list = parameters.stops; i < list.length; i += 1) {
            var stop = list[i];

            hashedStops[stop[0]] = stop[1];
        }

        // Infer key type based on first stop key-- used to encforce strict type checking later
        categoricalKeyType = _typeof(parameters.stops[0][0]);
    } else if (type === 'identity') {
        innerFun = evaluateIdentityFunction;
    } else {
        throw new Error("Unknown function type \"" + type + "\"");
    }

    var outputFunction;

    // If we're interpolating colors in a color system other than RGBA,
    // first translate all stop values to that color system, then interpolate
    // arrays as usual. The `outputFunction` option lets us then translate
    // the result of that interpolation back into RGBA.
    if (parameters.colorSpace && parameters.colorSpace !== 'rgb') {
        if (colorSpaces[parameters.colorSpace]) {
            var colorspace = colorSpaces[parameters.colorSpace];
            // Avoid mutating the parameters value
            parameters = JSON.parse(JSON.stringify(parameters));
            for (var s = 0; s < parameters.stops.length; s++) {
                parameters.stops[s] = [parameters.stops[s][0], colorspace.forward(parameters.stops[s][1])];
            }
            outputFunction = colorspace.reverse;
        } else {
            throw new Error("Unknown color space: " + parameters.colorSpace);
        }
    } else {
        outputFunction = identityFunction;
    }

    if (zoomAndFeatureDependent) {
        var featureFunctions = {};
        var zoomStops = [];
        for (var s$1 = 0; s$1 < parameters.stops.length; s$1++) {
            var stop$1 = parameters.stops[s$1];
            var zoom = stop$1[0].zoom;
            if (featureFunctions[zoom] === undefined) {
                featureFunctions[zoom] = {
                    zoom: zoom,
                    type: parameters.type,
                    property: parameters.property,
                    default: parameters.default,
                    stops: []
                };
                zoomStops.push(zoom);
            }
            featureFunctions[zoom].stops.push([stop$1[0].value, stop$1[1]]);
        }

        var featureFunctionStops = [];
        for (var i$1 = 0, list$1 = zoomStops; i$1 < list$1.length; i$1 += 1) {
            var z = list$1[i$1];

            featureFunctionStops.push([featureFunctions[z].zoom, createFunction(featureFunctions[z], propertySpec)]);
        }

        return {
            kind: 'composite',
            interpolationFactor: Interpolate.interpolationFactor.bind(undefined, { name: 'linear' }),
            zoomStops: featureFunctionStops.map(function (s) {
                return s[0];
            }),
            evaluate: function evaluate(ref, properties) {
                var zoom = ref.zoom;

                return outputFunction(evaluateExponentialFunction({
                    stops: featureFunctionStops,
                    base: parameters.base
                }, propertySpec, zoom).evaluate(zoom, properties));
            }
        };
    } else if (zoomDependent) {
        return {
            kind: 'camera',
            interpolationFactor: type === 'exponential' ? Interpolate.interpolationFactor.bind(undefined, { name: 'exponential', base: parameters.base !== undefined ? parameters.base : 1 }) : function () {
                return 0;
            },
            zoomStops: parameters.stops.map(function (s) {
                return s[0];
            }),
            evaluate: function evaluate(ref) {
                var zoom = ref.zoom;

                return outputFunction(innerFun(parameters, propertySpec, zoom, hashedStops, categoricalKeyType));
            }
        };
    } else {
        return {
            kind: 'source',
            evaluate: function evaluate(_, feature) {
                var value = feature && feature.properties ? feature.properties[parameters.property] : undefined;
                if (value === undefined) {
                    return coalesce(parameters.default, propertySpec.default);
                }
                return outputFunction(innerFun(parameters, propertySpec, value, hashedStops, categoricalKeyType));
            }
        };
    }
}

function coalesce(a, b, c) {
    if (a !== undefined) {
        return a;
    }
    if (b !== undefined) {
        return b;
    }
    if (c !== undefined) {
        return c;
    }
}

function evaluateCategoricalFunction(parameters, propertySpec, input, hashedStops, keyType) {
    var evaluated = (typeof input === 'undefined' ? 'undefined' : _typeof(input)) === keyType ? hashedStops[input] : undefined; // Enforce strict typing on input
    return coalesce(evaluated, parameters.default, propertySpec.default);
}

function evaluateIntervalFunction(parameters, propertySpec, input) {
    // Edge cases
    if (getType(input) !== 'number') {
        return coalesce(parameters.default, propertySpec.default);
    }
    var n = parameters.stops.length;
    if (n === 1) {
        return parameters.stops[0][1];
    }
    if (input <= parameters.stops[0][0]) {
        return parameters.stops[0][1];
    }
    if (input >= parameters.stops[n - 1][0]) {
        return parameters.stops[n - 1][1];
    }

    var index = findStopLessThanOrEqualTo(parameters.stops, input);

    return parameters.stops[index][1];
}

function evaluateExponentialFunction(parameters, propertySpec, input) {
    var base = parameters.base !== undefined ? parameters.base : 1;

    // Edge cases
    if (getType(input) !== 'number') {
        return coalesce(parameters.default, propertySpec.default);
    }
    var n = parameters.stops.length;
    if (n === 1) {
        return parameters.stops[0][1];
    }
    if (input <= parameters.stops[0][0]) {
        return parameters.stops[0][1];
    }
    if (input >= parameters.stops[n - 1][0]) {
        return parameters.stops[n - 1][1];
    }

    var index = findStopLessThanOrEqualTo(parameters.stops, input);
    var t = interpolationFactor(input, base, parameters.stops[index][0], parameters.stops[index + 1][0]);

    var outputLower = parameters.stops[index][1];
    var outputUpper = parameters.stops[index + 1][1];
    var interp = interpolate[propertySpec.type] || identityFunction;

    if (typeof outputLower.evaluate === 'function') {
        return {
            evaluate: function evaluate() {
                var args = [],
                    len = arguments.length;
                while (len--) {
                    args[len] = arguments[len];
                }var evaluatedLower = outputLower.evaluate.apply(undefined, args);
                var evaluatedUpper = outputUpper.evaluate.apply(undefined, args);
                // Special case for fill-outline-color, which has no spec default.
                if (evaluatedLower === undefined || evaluatedUpper === undefined) {
                    return undefined;
                }
                return interp(evaluatedLower, evaluatedUpper, t);
            }
        };
    }

    return interp(outputLower, outputUpper, t);
}

function evaluateIdentityFunction(parameters, propertySpec, input) {
    if (propertySpec.type === 'color') {
        input = Color.parse(input);
    } else if (getType(input) !== propertySpec.type && (propertySpec.type !== 'enum' || !propertySpec.values[input])) {
        input = undefined;
    }
    return coalesce(input, parameters.default, propertySpec.default);
}

/**
 * Returns the index of the last stop <= input, or 0 if it doesn't exist.
 *
 * @private
 */
function findStopLessThanOrEqualTo(stops, input) {
    var n = stops.length;
    var lowerIndex = 0;
    var upperIndex = n - 1;
    var currentIndex = 0;
    var currentValue, upperValue;

    while (lowerIndex <= upperIndex) {
        currentIndex = Math.floor((lowerIndex + upperIndex) / 2);
        currentValue = stops[currentIndex][0];
        upperValue = stops[currentIndex + 1][0];
        if (input === currentValue || input > currentValue && input < upperValue) {
            // Search complete
            return currentIndex;
        } else if (currentValue < input) {
            lowerIndex = currentIndex + 1;
        } else if (currentValue > input) {
            upperIndex = currentIndex - 1;
        }
    }

    return Math.max(currentIndex - 1, 0);
}

/**
 * Returns a ratio that can be used to interpolate between exponential function
 * stops.
 *
 * How it works:
 * Two consecutive stop values define a (scaled and shifted) exponential
 * function `f(x) = a * base^x + b`, where `base` is the user-specified base,
 * and `a` and `b` are constants affording sufficient degrees of freedom to fit
 * the function to the given stops.
 *
 * Here's a bit of algebra that lets us compute `f(x)` directly from the stop
 * values without explicitly solving for `a` and `b`:
 *
 * First stop value: `f(x0) = y0 = a * base^x0 + b`
 * Second stop value: `f(x1) = y1 = a * base^x1 + b`
 * => `y1 - y0 = a(base^x1 - base^x0)`
 * => `a = (y1 - y0)/(base^x1 - base^x0)`
 *
 * Desired value: `f(x) = y = a * base^x + b`
 * => `f(x) = y0 + a * (base^x - base^x0)`
 *
 * From the above, we can replace the `a` in `a * (base^x - base^x0)` and do a
 * little algebra:
 * ```
 * a * (base^x - base^x0) = (y1 - y0)/(base^x1 - base^x0) * (base^x - base^x0)
 *                     = (y1 - y0) * (base^x - base^x0) / (base^x1 - base^x0)
 * ```
 *
 * If we let `(base^x - base^x0) / (base^x1 base^x0)`, then we have
 * `f(x) = y0 + (y1 - y0) * ratio`.  In other words, `ratio` may be treated as
 * an interpolation factor between the two stops' output values.
 *
 * (Note: a slightly different form for `ratio`,
 * `(base^(x-x0) - 1) / (base^(x1-x0) - 1) `, is equivalent, but requires fewer
 * expensive `Math.pow()` operations.)
 *
 * @private
 */
function interpolationFactor(input, base, lowerValue, upperValue) {
    var difference = upperValue - lowerValue;
    var progress = input - lowerValue;

    if (difference === 0) {
        return 0;
    } else if (base === 1) {
        return progress / difference;
    } else {
        return (Math.pow(base, progress) - 1) / (Math.pow(base, difference) - 1);
    }
}

module.exports = {
    createFunction: createFunction,
    isFunction: isFunction
};

},{"../expression/definitions/interpolate":11,"../util/color":29,"../util/color_spaces":30,"../util/extend":31,"../util/get_type":32,"../util/interpolate":33}],29:[function(require,module,exports){
'use strict'; //      

var ref = require('csscolorparser');
var parseCSSColor = ref.parseCSSColor;

/**
 * An RGBA color value. All components are in the range [0, 1] and R, B, and G are premultiplied by A.
 * @private
 */
var Color = function Color(r, g, b, a) {
    if (a === void 0) a = 1;

    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
};

Color.parse = function parse(input) {
    if (!input) {
        return undefined;
    }

    if (input instanceof Color) {
        return input;
    }

    if (typeof input !== 'string') {
        return undefined;
    }

    var rgba = parseCSSColor(input);
    if (!rgba) {
        return undefined;
    }

    return new Color(rgba[0] / 255 * rgba[3], rgba[1] / 255 * rgba[3], rgba[2] / 255 * rgba[3], rgba[3]);
};

module.exports = Color;

},{"csscolorparser":37}],30:[function(require,module,exports){
'use strict'; //      

var Color = require('./color');

// Constants
var Xn = 0.950470,
    // D65 standard referent
Yn = 1,
    Zn = 1.088830,
    t0 = 4 / 29,
    t1 = 6 / 29,
    t2 = 3 * t1 * t1,
    t3 = t1 * t1 * t1,
    deg2rad = Math.PI / 180,
    rad2deg = 180 / Math.PI;

// Utilities
function xyz2lab(t) {
    return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
}

function lab2xyz(t) {
    return t > t1 ? t * t * t : t2 * (t - t0);
}

function xyz2rgb(x) {
    return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
}

function rgb2xyz(x) {
    x /= 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

// LAB
function rgbToLab(rgbColor) {
    var b = rgb2xyz(rgbColor.r),
        a = rgb2xyz(rgbColor.g),
        l = rgb2xyz(rgbColor.b),
        x = xyz2lab((0.4124564 * b + 0.3575761 * a + 0.1804375 * l) / Xn),
        y = xyz2lab((0.2126729 * b + 0.7151522 * a + 0.0721750 * l) / Yn),
        z = xyz2lab((0.0193339 * b + 0.1191920 * a + 0.9503041 * l) / Zn);

    return {
        l: 116 * y - 16,
        a: 500 * (x - y),
        b: 200 * (y - z),
        alpha: rgbColor.a
    };
}

function labToRgb(labColor) {
    var y = (labColor.l + 16) / 116,
        x = isNaN(labColor.a) ? y : y + labColor.a / 500,
        z = isNaN(labColor.b) ? y : y - labColor.b / 200;
    y = Yn * lab2xyz(y);
    x = Xn * lab2xyz(x);
    z = Zn * lab2xyz(z);
    return new Color(xyz2rgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z), // D65 -> sRGB
    xyz2rgb(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z), xyz2rgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z), labColor.alpha);
}

// HCL
function rgbToHcl(rgbColor) {
    var ref = rgbToLab(rgbColor);
    var l = ref.l;
    var a = ref.a;
    var b = ref.b;
    var h = Math.atan2(b, a) * rad2deg;
    return {
        h: h < 0 ? h + 360 : h,
        c: Math.sqrt(a * a + b * b),
        l: l,
        alpha: rgbColor.a
    };
}

function hclToRgb(hclColor) {
    var h = hclColor.h * deg2rad,
        c = hclColor.c,
        l = hclColor.l;
    return labToRgb({
        l: l,
        a: Math.cos(h) * c,
        b: Math.sin(h) * c,
        alpha: hclColor.alpha
    });
}

module.exports = {
    lab: {
        forward: rgbToLab,
        reverse: labToRgb
    },
    hcl: {
        forward: rgbToHcl,
        reverse: hclToRgb
    }
};

},{"./color":29}],31:[function(require,module,exports){
'use strict';

module.exports = function (output) {
    var inputs = [],
        len = arguments.length - 1;
    while (len-- > 0) {
        inputs[len] = arguments[len + 1];
    }for (var i = 0, list = inputs; i < list.length; i += 1) {
        var input = list[i];

        for (var k in input) {
            output[k] = input[k];
        }
    }
    return output;
};

},{}],32:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

module.exports = function getType(val) {
    if (val instanceof Number) {
        return 'number';
    } else if (val instanceof String) {
        return 'string';
    } else if (val instanceof Boolean) {
        return 'boolean';
    } else if (Array.isArray(val)) {
        return 'array';
    } else if (val === null) {
        return 'null';
    } else {
        return typeof val === 'undefined' ? 'undefined' : _typeof(val);
    }
};

},{}],33:[function(require,module,exports){
'use strict'; //      

var Color = require('./color');

module.exports = {
    number: number,
    color: color,
    array: array
};

function number(a, b, t) {
    return a * (1 - t) + b * t;
}

function color(from, to, t) {
    return new Color(number(from.r, to.r, t), number(from.g, to.g, t), number(from.b, to.b, t), number(from.a, to.a, t));
}

function array(from, to, t) {
    return from.map(function (d, i) {
        return number(d, to[i], t);
    });
}

},{"./color":29}],34:[function(require,module,exports){
'use strict'; //      

/**
 * A type used for returning and propagating errors. The first element of the union
 * represents success and contains a value, and the second represents an error and
 * contains an error value.
 */

function success(value) {
    return { result: 'success', value: value };
}

function error(value) {
    return { result: 'error', value: value };
}

module.exports = {
    success: success,
    error: error
};

},{}],35:[function(require,module,exports){
'use strict';

/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Ported from Webkit
 * http://svn.webkit.org/repository/webkit/trunk/Source/WebCore/platform/graphics/UnitBezier.h
 */

module.exports = UnitBezier;

function UnitBezier(p1x, p1y, p2x, p2y) {
    // Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
    this.cx = 3.0 * p1x;
    this.bx = 3.0 * (p2x - p1x) - this.cx;
    this.ax = 1.0 - this.cx - this.bx;

    this.cy = 3.0 * p1y;
    this.by = 3.0 * (p2y - p1y) - this.cy;
    this.ay = 1.0 - this.cy - this.by;

    this.p1x = p1x;
    this.p1y = p2y;
    this.p2x = p2x;
    this.p2y = p2y;
}

UnitBezier.prototype.sampleCurveX = function (t) {
    // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
    return ((this.ax * t + this.bx) * t + this.cx) * t;
};

UnitBezier.prototype.sampleCurveY = function (t) {
    return ((this.ay * t + this.by) * t + this.cy) * t;
};

UnitBezier.prototype.sampleCurveDerivativeX = function (t) {
    return (3.0 * this.ax * t + 2.0 * this.bx) * t + this.cx;
};

UnitBezier.prototype.solveCurveX = function (x, epsilon) {
    if (typeof epsilon === 'undefined') epsilon = 1e-6;

    var t0, t1, t2, x2, i;

    // First try a few iterations of Newton's method -- normally very fast.
    for (t2 = x, i = 0; i < 8; i++) {

        x2 = this.sampleCurveX(t2) - x;
        if (Math.abs(x2) < epsilon) return t2;

        var d2 = this.sampleCurveDerivativeX(t2);
        if (Math.abs(d2) < 1e-6) break;

        t2 = t2 - x2 / d2;
    }

    // Fall back to the bisection method for reliability.
    t0 = 0.0;
    t1 = 1.0;
    t2 = x;

    if (t2 < t0) return t0;
    if (t2 > t1) return t1;

    while (t0 < t1) {

        x2 = this.sampleCurveX(t2);
        if (Math.abs(x2 - x) < epsilon) return t2;

        if (x > x2) {
            t0 = t2;
        } else {
            t1 = t2;
        }

        t2 = (t1 - t0) * 0.5 + t0;
    }

    // Failure.
    return t2;
};

UnitBezier.prototype.solve = function (x, epsilon) {
    return this.sampleCurveY(this.solveCurveX(x, epsilon));
};

},{}],36:[function(require,module,exports){
(function (global){
'use strict';

// compare and isBuffer taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
// original notice:

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function compare(a, b) {
  if (a === b) {
    return 0;
  }

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break;
    }
  }

  if (x < y) {
    return -1;
  }
  if (y < x) {
    return 1;
  }
  return 0;
}
function isBuffer(b) {
  if (global.Buffer && typeof global.Buffer.isBuffer === 'function') {
    return global.Buffer.isBuffer(b);
  }
  return !!(b != null && b._isBuffer);
}

// based on node assert, original notice:

// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util/');
var hasOwn = Object.prototype.hasOwnProperty;
var pSlice = Array.prototype.slice;
var functionsHaveNames = function () {
  return function foo() {}.name === 'foo';
}();
function pToString(obj) {
  return Object.prototype.toString.call(obj);
}
function isView(arrbuf) {
  if (isBuffer(arrbuf)) {
    return false;
  }
  if (typeof global.ArrayBuffer !== 'function') {
    return false;
  }
  if (typeof ArrayBuffer.isView === 'function') {
    return ArrayBuffer.isView(arrbuf);
  }
  if (!arrbuf) {
    return false;
  }
  if (arrbuf instanceof DataView) {
    return true;
  }
  if (arrbuf.buffer && arrbuf.buffer instanceof ArrayBuffer) {
    return true;
  }
  return false;
}
// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

var regex = /\s*function\s+([^\(\s]*)\s*/;
// based on https://github.com/ljharb/function.prototype.name/blob/adeeeec8bfcc6068b187d7d9fb3d5bb1d3a30899/implementation.js
function getName(func) {
  if (!util.isFunction(func)) {
    return;
  }
  if (functionsHaveNames) {
    return func.name;
  }
  var str = func.toString();
  var match = str.match(regex);
  return match && match[1];
}
assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  } else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = getName(stackStartFunction);
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function truncate(s, n) {
  if (typeof s === 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}
function inspect(something) {
  if (functionsHaveNames || !util.isFunction(something)) {
    return util.inspect(something);
  }
  var rawname = getName(something);
  var name = rawname ? ': ' + rawname : '';
  return '[Function' + name + ']';
}
function getMessage(self) {
  return truncate(inspect(self.actual), 128) + ' ' + self.operator + ' ' + truncate(inspect(self.expected), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'deepStrictEqual', assert.deepStrictEqual);
  }
};

function _deepEqual(actual, expected, strict, memos) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;
  } else if (isBuffer(actual) && isBuffer(expected)) {
    return compare(actual, expected) === 0;

    // 7.2. If the expected value is a Date object, the actual value is
    // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

    // 7.3 If the expected value is a RegExp object, the actual value is
    // equivalent if it is also a RegExp object with the same source and
    // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source && actual.global === expected.global && actual.multiline === expected.multiline && actual.lastIndex === expected.lastIndex && actual.ignoreCase === expected.ignoreCase;

    // 7.4. Other pairs that do not both pass typeof value == 'object',
    // equivalence is determined by ==.
  } else if ((actual === null || (typeof actual === 'undefined' ? 'undefined' : _typeof(actual)) !== 'object') && (expected === null || (typeof expected === 'undefined' ? 'undefined' : _typeof(expected)) !== 'object')) {
    return strict ? actual === expected : actual == expected;

    // If both values are instances of typed arrays, wrap their underlying
    // ArrayBuffers in a Buffer each to increase performance
    // This optimization requires the arrays to have the same type as checked by
    // Object.prototype.toString (aka pToString). Never perform binary
    // comparisons for Float*Arrays, though, since e.g. +0 === -0 but their
    // bit patterns are not identical.
  } else if (isView(actual) && isView(expected) && pToString(actual) === pToString(expected) && !(actual instanceof Float32Array || actual instanceof Float64Array)) {
    return compare(new Uint8Array(actual.buffer), new Uint8Array(expected.buffer)) === 0;

    // 7.5 For all other Object pairs, including Array objects, equivalence is
    // determined by having the same number of owned properties (as verified
    // with Object.prototype.hasOwnProperty.call), the same set of keys
    // (although not necessarily the same order), equivalent values for every
    // corresponding key, and an identical 'prototype' property. Note: this
    // accounts for both named and indexed properties on Arrays.
  } else if (isBuffer(actual) !== isBuffer(expected)) {
    return false;
  } else {
    memos = memos || { actual: [], expected: [] };

    var actualIndex = memos.actual.indexOf(actual);
    if (actualIndex !== -1) {
      if (actualIndex === memos.expected.indexOf(expected)) {
        return true;
      }
    }

    memos.actual.push(actual);
    memos.expected.push(expected);

    return objEquiv(actual, expected, strict, memos);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b, strict, actualVisitedObjects) {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) return a === b;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  var aIsArgs = isArguments(a);
  var bIsArgs = isArguments(b);
  if (aIsArgs && !bIsArgs || !aIsArgs && bIsArgs) return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b, strict);
  }
  var ka = objectKeys(a);
  var kb = objectKeys(b);
  var key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length !== kb.length) return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] !== kb[i]) return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key], strict, actualVisitedObjects)) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

assert.notDeepStrictEqual = notDeepStrictEqual;
function notDeepStrictEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'notDeepStrictEqual', notDeepStrictEqual);
  }
}

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  }

  try {
    if (actual instanceof expected) {
      return true;
    }
  } catch (e) {
    // Ignore.  The instanceof check doesn't work for arrow functions.
  }

  if (Error.isPrototypeOf(expected)) {
    return false;
  }

  return expected.call({}, actual) === true;
}

function _tryBlock(block) {
  var error;
  try {
    block();
  } catch (e) {
    error = e;
  }
  return error;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof block !== 'function') {
    throw new TypeError('"block" argument must be a function');
  }

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  actual = _tryBlock(block);

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') + (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  var userProvidedMessage = typeof message === 'string';
  var isUnwantedException = !shouldThrow && util.isError(actual);
  var isUnexpectedException = !shouldThrow && actual && !expected;

  if (isUnwantedException && userProvidedMessage && expectedException(actual, expected) || isUnexpectedException) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if (shouldThrow && actual && expected && !expectedException(actual, expected) || !shouldThrow && actual) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function (block, /*optional*/error, /*optional*/message) {
  _throws(true, block, error, message);
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function (block, /*optional*/error, /*optional*/message) {
  _throws(false, block, error, message);
};

assert.ifError = function (err) {
  if (err) throw err;
};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"util/":76}],37:[function(require,module,exports){
"use strict";

// (c) Dean McNamee <dean@gmail.com>, 2012.
//
// https://github.com/deanm/css-color-parser-js
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// http://www.w3.org/TR/css3-color/
var kCSSColorTable = {
  "transparent": [0, 0, 0, 0], "aliceblue": [240, 248, 255, 1],
  "antiquewhite": [250, 235, 215, 1], "aqua": [0, 255, 255, 1],
  "aquamarine": [127, 255, 212, 1], "azure": [240, 255, 255, 1],
  "beige": [245, 245, 220, 1], "bisque": [255, 228, 196, 1],
  "black": [0, 0, 0, 1], "blanchedalmond": [255, 235, 205, 1],
  "blue": [0, 0, 255, 1], "blueviolet": [138, 43, 226, 1],
  "brown": [165, 42, 42, 1], "burlywood": [222, 184, 135, 1],
  "cadetblue": [95, 158, 160, 1], "chartreuse": [127, 255, 0, 1],
  "chocolate": [210, 105, 30, 1], "coral": [255, 127, 80, 1],
  "cornflowerblue": [100, 149, 237, 1], "cornsilk": [255, 248, 220, 1],
  "crimson": [220, 20, 60, 1], "cyan": [0, 255, 255, 1],
  "darkblue": [0, 0, 139, 1], "darkcyan": [0, 139, 139, 1],
  "darkgoldenrod": [184, 134, 11, 1], "darkgray": [169, 169, 169, 1],
  "darkgreen": [0, 100, 0, 1], "darkgrey": [169, 169, 169, 1],
  "darkkhaki": [189, 183, 107, 1], "darkmagenta": [139, 0, 139, 1],
  "darkolivegreen": [85, 107, 47, 1], "darkorange": [255, 140, 0, 1],
  "darkorchid": [153, 50, 204, 1], "darkred": [139, 0, 0, 1],
  "darksalmon": [233, 150, 122, 1], "darkseagreen": [143, 188, 143, 1],
  "darkslateblue": [72, 61, 139, 1], "darkslategray": [47, 79, 79, 1],
  "darkslategrey": [47, 79, 79, 1], "darkturquoise": [0, 206, 209, 1],
  "darkviolet": [148, 0, 211, 1], "deeppink": [255, 20, 147, 1],
  "deepskyblue": [0, 191, 255, 1], "dimgray": [105, 105, 105, 1],
  "dimgrey": [105, 105, 105, 1], "dodgerblue": [30, 144, 255, 1],
  "firebrick": [178, 34, 34, 1], "floralwhite": [255, 250, 240, 1],
  "forestgreen": [34, 139, 34, 1], "fuchsia": [255, 0, 255, 1],
  "gainsboro": [220, 220, 220, 1], "ghostwhite": [248, 248, 255, 1],
  "gold": [255, 215, 0, 1], "goldenrod": [218, 165, 32, 1],
  "gray": [128, 128, 128, 1], "green": [0, 128, 0, 1],
  "greenyellow": [173, 255, 47, 1], "grey": [128, 128, 128, 1],
  "honeydew": [240, 255, 240, 1], "hotpink": [255, 105, 180, 1],
  "indianred": [205, 92, 92, 1], "indigo": [75, 0, 130, 1],
  "ivory": [255, 255, 240, 1], "khaki": [240, 230, 140, 1],
  "lavender": [230, 230, 250, 1], "lavenderblush": [255, 240, 245, 1],
  "lawngreen": [124, 252, 0, 1], "lemonchiffon": [255, 250, 205, 1],
  "lightblue": [173, 216, 230, 1], "lightcoral": [240, 128, 128, 1],
  "lightcyan": [224, 255, 255, 1], "lightgoldenrodyellow": [250, 250, 210, 1],
  "lightgray": [211, 211, 211, 1], "lightgreen": [144, 238, 144, 1],
  "lightgrey": [211, 211, 211, 1], "lightpink": [255, 182, 193, 1],
  "lightsalmon": [255, 160, 122, 1], "lightseagreen": [32, 178, 170, 1],
  "lightskyblue": [135, 206, 250, 1], "lightslategray": [119, 136, 153, 1],
  "lightslategrey": [119, 136, 153, 1], "lightsteelblue": [176, 196, 222, 1],
  "lightyellow": [255, 255, 224, 1], "lime": [0, 255, 0, 1],
  "limegreen": [50, 205, 50, 1], "linen": [250, 240, 230, 1],
  "magenta": [255, 0, 255, 1], "maroon": [128, 0, 0, 1],
  "mediumaquamarine": [102, 205, 170, 1], "mediumblue": [0, 0, 205, 1],
  "mediumorchid": [186, 85, 211, 1], "mediumpurple": [147, 112, 219, 1],
  "mediumseagreen": [60, 179, 113, 1], "mediumslateblue": [123, 104, 238, 1],
  "mediumspringgreen": [0, 250, 154, 1], "mediumturquoise": [72, 209, 204, 1],
  "mediumvioletred": [199, 21, 133, 1], "midnightblue": [25, 25, 112, 1],
  "mintcream": [245, 255, 250, 1], "mistyrose": [255, 228, 225, 1],
  "moccasin": [255, 228, 181, 1], "navajowhite": [255, 222, 173, 1],
  "navy": [0, 0, 128, 1], "oldlace": [253, 245, 230, 1],
  "olive": [128, 128, 0, 1], "olivedrab": [107, 142, 35, 1],
  "orange": [255, 165, 0, 1], "orangered": [255, 69, 0, 1],
  "orchid": [218, 112, 214, 1], "palegoldenrod": [238, 232, 170, 1],
  "palegreen": [152, 251, 152, 1], "paleturquoise": [175, 238, 238, 1],
  "palevioletred": [219, 112, 147, 1], "papayawhip": [255, 239, 213, 1],
  "peachpuff": [255, 218, 185, 1], "peru": [205, 133, 63, 1],
  "pink": [255, 192, 203, 1], "plum": [221, 160, 221, 1],
  "powderblue": [176, 224, 230, 1], "purple": [128, 0, 128, 1],
  "rebeccapurple": [102, 51, 153, 1],
  "red": [255, 0, 0, 1], "rosybrown": [188, 143, 143, 1],
  "royalblue": [65, 105, 225, 1], "saddlebrown": [139, 69, 19, 1],
  "salmon": [250, 128, 114, 1], "sandybrown": [244, 164, 96, 1],
  "seagreen": [46, 139, 87, 1], "seashell": [255, 245, 238, 1],
  "sienna": [160, 82, 45, 1], "silver": [192, 192, 192, 1],
  "skyblue": [135, 206, 235, 1], "slateblue": [106, 90, 205, 1],
  "slategray": [112, 128, 144, 1], "slategrey": [112, 128, 144, 1],
  "snow": [255, 250, 250, 1], "springgreen": [0, 255, 127, 1],
  "steelblue": [70, 130, 180, 1], "tan": [210, 180, 140, 1],
  "teal": [0, 128, 128, 1], "thistle": [216, 191, 216, 1],
  "tomato": [255, 99, 71, 1], "turquoise": [64, 224, 208, 1],
  "violet": [238, 130, 238, 1], "wheat": [245, 222, 179, 1],
  "white": [255, 255, 255, 1], "whitesmoke": [245, 245, 245, 1],
  "yellow": [255, 255, 0, 1], "yellowgreen": [154, 205, 50, 1] };

function clamp_css_byte(i) {
  // Clamp to integer 0 .. 255.
  i = Math.round(i); // Seems to be what Chrome does (vs truncation).
  return i < 0 ? 0 : i > 255 ? 255 : i;
}

function clamp_css_float(f) {
  // Clamp to float 0.0 .. 1.0.
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

function parse_css_int(str) {
  // int or percentage.
  if (str[str.length - 1] === '%') return clamp_css_byte(parseFloat(str) / 100 * 255);
  return clamp_css_byte(parseInt(str));
}

function parse_css_float(str) {
  // float or percentage.
  if (str[str.length - 1] === '%') return clamp_css_float(parseFloat(str) / 100);
  return clamp_css_float(parseFloat(str));
}

function css_hue_to_rgb(m1, m2, h) {
  if (h < 0) h += 1;else if (h > 1) h -= 1;

  if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
  if (h * 2 < 1) return m2;
  if (h * 3 < 2) return m1 + (m2 - m1) * (2 / 3 - h) * 6;
  return m1;
}

function parseCSSColor(css_str) {
  // Remove all whitespace, not compliant, but should just be more accepting.
  var str = css_str.replace(/ /g, '').toLowerCase();

  // Color keywords (and transparent) lookup.
  if (str in kCSSColorTable) return kCSSColorTable[str].slice(); // dup.

  // #abc and #abc123 syntax.
  if (str[0] === '#') {
    if (str.length === 4) {
      var iv = parseInt(str.substr(1), 16); // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xfff)) return null; // Covers NaN.
      return [(iv & 0xf00) >> 4 | (iv & 0xf00) >> 8, iv & 0xf0 | (iv & 0xf0) >> 4, iv & 0xf | (iv & 0xf) << 4, 1];
    } else if (str.length === 7) {
      var iv = parseInt(str.substr(1), 16); // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xffffff)) return null; // Covers NaN.
      return [(iv & 0xff0000) >> 16, (iv & 0xff00) >> 8, iv & 0xff, 1];
    }

    return null;
  }

  var op = str.indexOf('('),
      ep = str.indexOf(')');
  if (op !== -1 && ep + 1 === str.length) {
    var fname = str.substr(0, op);
    var params = str.substr(op + 1, ep - (op + 1)).split(',');
    var alpha = 1; // To allow case fallthrough.
    switch (fname) {
      case 'rgba':
        if (params.length !== 4) return null;
        alpha = parse_css_float(params.pop());
      // Fall through.
      case 'rgb':
        if (params.length !== 3) return null;
        return [parse_css_int(params[0]), parse_css_int(params[1]), parse_css_int(params[2]), alpha];
      case 'hsla':
        if (params.length !== 4) return null;
        alpha = parse_css_float(params.pop());
      // Fall through.
      case 'hsl':
        if (params.length !== 3) return null;
        var h = (parseFloat(params[0]) % 360 + 360) % 360 / 360; // 0 .. 1
        // NOTE(deanm): According to the CSS spec s/l should only be
        // percentages, but we don't bother and let float or percentage.
        var s = parse_css_float(params[1]);
        var l = parse_css_float(params[2]);
        var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
        var m1 = l * 2 - m2;
        return [clamp_css_byte(css_hue_to_rgb(m1, m2, h + 1 / 3) * 255), clamp_css_byte(css_hue_to_rgb(m1, m2, h) * 255), clamp_css_byte(css_hue_to_rgb(m1, m2, h - 1 / 3) * 255), alpha];
      default:
        return null;
    }
  }

  return null;
}

try {
  exports.parseCSSColor = parseCSSColor;
} catch (e) {}

},{}],38:[function(require,module,exports){
'use strict';

var fontWeights = {
  thin: 100,
  hairline: 100,
  'ultra-light': 100,
  'extra-light': 100,
  light: 200,
  book: 300,
  regular: 400,
  normal: 400,
  plain: 400,
  roman: 400,
  standard: 400,
  medium: 500,
  'semi-bold': 600,
  'demi-bold': 600,
  bold: 700,
  heavy: 800,
  black: 800,
  'extra-bold': 800,
  'ultra-black': 900,
  'extra-black': 900,
  'ultra-bold': 900,
  'heavy-black': 900,
  fat: 900,
  poster: 900
};
var sp = ' ';

var fontCache = {};

module.exports = function (font, size) {
  var cssData = fontCache[font];
  if (!cssData) {
    var parts = font.split(' ');
    var maybeWeight = parts[parts.length - 1].toLowerCase();
    var weight = 'normal';
    var style = 'normal';
    if (maybeWeight == 'normal' || maybeWeight == 'italic' || maybeWeight == 'oblique') {
      style = maybeWeight;
      parts.pop();
      maybeWeight = parts[parts.length - 1].toLowerCase();
    }
    for (var w in fontWeights) {
      if (maybeWeight == w || maybeWeight == w.replace('-', '') || maybeWeight == w.replace('-', ' ')) {
        weight = fontWeights[w];
        parts.pop();
        break;
      }
    }
    if (typeof maybeWeight == 'number') {
      weight = maybeWeight;
    }
    var fontFamily = parts.join(' ');
    // CSS font property: font-style font-weight font-size font-family
    cssData = fontCache[font] = [style, weight, fontFamily];
  }
  return cssData[0] + sp + cssData[1] + sp + size + 'px' + sp + cssData[2];
};

},{}],39:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('./index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Error object thrown when an assertion failed. This is an ECMA-262 Error,
 * extended with a `code` property.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error}
 * @constructor
 * @extends {Error}
 * @implements {oli.AssertionError}
 * @param {number} code Error code.
 */
var _ol_AssertionError_ = function _ol_AssertionError_(code) {

  var path = _index2.default.VERSION ? _index2.default.VERSION.split('-')[0] : 'latest';

  /**
   * @type {string}
   */
  this.message = 'Assertion failed. See https://openlayers.org/en/' + path + '/doc/errors/#' + code + ' for details.';

  /**
   * Error code. The meaning of the code can be found on
   * {@link https://openlayers.org/en/latest/doc/errors/} (replace `latest` with
   * the version found in the OpenLayers script's header comment if a version
   * other than the latest is used).
   * @type {number}
   * @api
   */
  this.code = code;

  this.name = 'AssertionError';
};

_index2.default.inherits(_ol_AssertionError_, Error);
exports.default = _ol_AssertionError_;

},{"./index.js":57}],40:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assertionerror = require('./assertionerror.js');

var _assertionerror2 = _interopRequireDefault(_assertionerror);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var _ol_asserts_ = {};

/**
 * @param {*} assertion Assertion we expected to be truthy.
 * @param {number} errorCode Error code.
 */
_ol_asserts_.assert = function (assertion, errorCode) {
  if (!assertion) {
    throw new _assertionerror2.default(errorCode);
  }
};
exports.default = _ol_asserts_;

},{"./assertionerror.js":39}],41:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('./index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Objects that need to clean up after themselves.
 * @constructor
 */
var _ol_Disposable_ = function _ol_Disposable_() {};

/**
 * The object has already been disposed.
 * @type {boolean}
 * @private
 */
_ol_Disposable_.prototype.disposed_ = false;

/**
 * Clean up.
 */
_ol_Disposable_.prototype.dispose = function () {
  if (!this.disposed_) {
    this.disposed_ = true;
    this.disposeInternal();
  }
};

/**
 * Extension point for disposable objects.
 * @protected
 */
_ol_Disposable_.prototype.disposeInternal = _index2.default.nullFunction;
exports.default = _ol_Disposable_;

},{"./index.js":57}],42:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _obj = require('./obj.js');

var _obj2 = _interopRequireDefault(_obj);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var _ol_events_ = {};

/**
 * @param {ol.EventsKey} listenerObj Listener object.
 * @return {ol.EventsListenerFunctionType} Bound listener.
 */
_ol_events_.bindListener_ = function (listenerObj) {
  var boundListener = function boundListener(evt) {
    var listener = listenerObj.listener;
    var bindTo = listenerObj.bindTo || listenerObj.target;
    if (listenerObj.callOnce) {
      _ol_events_.unlistenByKey(listenerObj);
    }
    return listener.call(bindTo, evt);
  };
  listenerObj.boundListener = boundListener;
  return boundListener;
};

/**
 * Finds the matching {@link ol.EventsKey} in the given listener
 * array.
 *
 * @param {!Array<!ol.EventsKey>} listeners Array of listeners.
 * @param {!Function} listener The listener function.
 * @param {Object=} opt_this The `this` value inside the listener.
 * @param {boolean=} opt_setDeleteIndex Set the deleteIndex on the matching
 *     listener, for {@link ol.events.unlistenByKey}.
 * @return {ol.EventsKey|undefined} The matching listener object.
 * @private
 */
_ol_events_.findListener_ = function (listeners, listener, opt_this, opt_setDeleteIndex) {
  var listenerObj;
  for (var i = 0, ii = listeners.length; i < ii; ++i) {
    listenerObj = listeners[i];
    if (listenerObj.listener === listener && listenerObj.bindTo === opt_this) {
      if (opt_setDeleteIndex) {
        listenerObj.deleteIndex = i;
      }
      return listenerObj;
    }
  }
  return undefined;
};

/**
 * @param {ol.EventTargetLike} target Target.
 * @param {string} type Type.
 * @return {Array.<ol.EventsKey>|undefined} Listeners.
 */
_ol_events_.getListeners = function (target, type) {
  var listenerMap = target.ol_lm;
  return listenerMap ? listenerMap[type] : undefined;
};

/**
 * Get the lookup of listeners.  If one does not exist on the target, it is
 * created.
 * @param {ol.EventTargetLike} target Target.
 * @return {!Object.<string, Array.<ol.EventsKey>>} Map of
 *     listeners by event type.
 * @private
 */
_ol_events_.getListenerMap_ = function (target) {
  var listenerMap = target.ol_lm;
  if (!listenerMap) {
    listenerMap = target.ol_lm = {};
  }
  return listenerMap;
};

/**
 * Clean up all listener objects of the given type.  All properties on the
 * listener objects will be removed, and if no listeners remain in the listener
 * map, it will be removed from the target.
 * @param {ol.EventTargetLike} target Target.
 * @param {string} type Type.
 * @private
 */
_ol_events_.removeListeners_ = function (target, type) {
  var listeners = _ol_events_.getListeners(target, type);
  if (listeners) {
    for (var i = 0, ii = listeners.length; i < ii; ++i) {
      target.removeEventListener(type, listeners[i].boundListener);
      _obj2.default.clear(listeners[i]);
    }
    listeners.length = 0;
    var listenerMap = target.ol_lm;
    if (listenerMap) {
      delete listenerMap[type];
      if (Object.keys(listenerMap).length === 0) {
        delete target.ol_lm;
      }
    }
  }
};

/**
 * Registers an event listener on an event target. Inspired by
 * {@link https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html}
 *
 * This function efficiently binds a `listener` to a `this` object, and returns
 * a key for use with {@link ol.events.unlistenByKey}.
 *
 * @param {ol.EventTargetLike} target Event target.
 * @param {string} type Event type.
 * @param {ol.EventsListenerFunctionType} listener Listener.
 * @param {Object=} opt_this Object referenced by the `this` keyword in the
 *     listener. Default is the `target`.
 * @param {boolean=} opt_once If true, add the listener as one-off listener.
 * @return {ol.EventsKey} Unique key for the listener.
 */
_ol_events_.listen = function (target, type, listener, opt_this, opt_once) {
  var listenerMap = _ol_events_.getListenerMap_(target);
  var listeners = listenerMap[type];
  if (!listeners) {
    listeners = listenerMap[type] = [];
  }
  var listenerObj = _ol_events_.findListener_(listeners, listener, opt_this, false);
  if (listenerObj) {
    if (!opt_once) {
      // Turn one-off listener into a permanent one.
      listenerObj.callOnce = false;
    }
  } else {
    listenerObj = /** @type {ol.EventsKey} */{
      bindTo: opt_this,
      callOnce: !!opt_once,
      listener: listener,
      target: target,
      type: type
    };
    target.addEventListener(type, _ol_events_.bindListener_(listenerObj));
    listeners.push(listenerObj);
  }

  return listenerObj;
};

/**
 * Registers a one-off event listener on an event target. Inspired by
 * {@link https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html}
 *
 * This function efficiently binds a `listener` as self-unregistering listener
 * to a `this` object, and returns a key for use with
 * {@link ol.events.unlistenByKey} in case the listener needs to be unregistered
 * before it is called.
 *
 * When {@link ol.events.listen} is called with the same arguments after this
 * function, the self-unregistering listener will be turned into a permanent
 * listener.
 *
 * @param {ol.EventTargetLike} target Event target.
 * @param {string} type Event type.
 * @param {ol.EventsListenerFunctionType} listener Listener.
 * @param {Object=} opt_this Object referenced by the `this` keyword in the
 *     listener. Default is the `target`.
 * @return {ol.EventsKey} Key for unlistenByKey.
 */
_ol_events_.listenOnce = function (target, type, listener, opt_this) {
  return _ol_events_.listen(target, type, listener, opt_this, true);
};

/**
 * Unregisters an event listener on an event target. Inspired by
 * {@link https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html}
 *
 * To return a listener, this function needs to be called with the exact same
 * arguments that were used for a previous {@link ol.events.listen} call.
 *
 * @param {ol.EventTargetLike} target Event target.
 * @param {string} type Event type.
 * @param {ol.EventsListenerFunctionType} listener Listener.
 * @param {Object=} opt_this Object referenced by the `this` keyword in the
 *     listener. Default is the `target`.
 */
_ol_events_.unlisten = function (target, type, listener, opt_this) {
  var listeners = _ol_events_.getListeners(target, type);
  if (listeners) {
    var listenerObj = _ol_events_.findListener_(listeners, listener, opt_this, true);
    if (listenerObj) {
      _ol_events_.unlistenByKey(listenerObj);
    }
  }
};

/**
 * Unregisters event listeners on an event target. Inspired by
 * {@link https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html}
 *
 * The argument passed to this function is the key returned from
 * {@link ol.events.listen} or {@link ol.events.listenOnce}.
 *
 * @param {ol.EventsKey} key The key.
 */
_ol_events_.unlistenByKey = function (key) {
  if (key && key.target) {
    key.target.removeEventListener(key.type, key.boundListener);
    var listeners = _ol_events_.getListeners(key.target, key.type);
    if (listeners) {
      var i = 'deleteIndex' in key ? key.deleteIndex : listeners.indexOf(key);
      if (i !== -1) {
        listeners.splice(i, 1);
      }
      if (listeners.length === 0) {
        _ol_events_.removeListeners_(key.target, key.type);
      }
    }
    _obj2.default.clear(key);
  }
};

/**
 * Unregisters all event listeners on an event target. Inspired by
 * {@link https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html}
 *
 * @param {ol.EventTargetLike} target Target.
 */
_ol_events_.unlistenAll = function (target) {
  var listenerMap = _ol_events_.getListenerMap_(target);
  for (var type in listenerMap) {
    _ol_events_.removeListeners_(target, type);
  }
};
exports.default = _ol_events_;

},{"./obj.js":59}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * @classdesc
 * Stripped down implementation of the W3C DOM Level 2 Event interface.
 * @see {@link https://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-interface}
 *
 * This implementation only provides `type` and `target` properties, and
 * `stopPropagation` and `preventDefault` methods. It is meant as base class
 * for higher level events defined in the library, and works with
 * {@link ol.events.EventTarget}.
 *
 * @constructor
 * @implements {oli.events.Event}
 * @param {string} type Type.
 */
var _ol_events_Event_ = function _ol_events_Event_(type) {

  /**
   * @type {boolean}
   */
  this.propagationStopped;

  /**
   * The event type.
   * @type {string}
   * @api
   */
  this.type = type;

  /**
   * The event target.
   * @type {Object}
   * @api
   */
  this.target = null;
};

/**
 * Stop event propagation.
 * @function
 * @override
 * @api
 */
_ol_events_Event_.prototype.preventDefault =

/**
 * Stop event propagation.
 * @function
 * @override
 * @api
 */
_ol_events_Event_.prototype.stopPropagation = function () {
  this.propagationStopped = true;
};

/**
 * @param {Event|ol.events.Event} evt Event
 */
_ol_events_Event_.stopPropagation = function (evt) {
  evt.stopPropagation();
};

/**
 * @param {Event|ol.events.Event} evt Event
 */
_ol_events_Event_.preventDefault = function (evt) {
  evt.preventDefault();
};
exports.default = _ol_events_Event_;

},{}],44:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('../index.js');

var _index2 = _interopRequireDefault(_index);

var _disposable = require('../disposable.js');

var _disposable2 = _interopRequireDefault(_disposable);

var _events = require('../events.js');

var _events2 = _interopRequireDefault(_events);

var _event = require('../events/event.js');

var _event2 = _interopRequireDefault(_event);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @classdesc
 * A simplified implementation of the W3C DOM Level 2 EventTarget interface.
 * @see {@link https://www.w3.org/TR/2000/REC-DOM-Level-2-Events-20001113/events.html#Events-EventTarget}
 *
 * There are two important simplifications compared to the specification:
 *
 * 1. The handling of `useCapture` in `addEventListener` and
 *    `removeEventListener`. There is no real capture model.
 * 2. The handling of `stopPropagation` and `preventDefault` on `dispatchEvent`.
 *    There is no event target hierarchy. When a listener calls
 *    `stopPropagation` or `preventDefault` on an event object, it means that no
 *    more listeners after this one will be called. Same as when the listener
 *    returns false.
 *
 * @constructor
 * @extends {ol.Disposable}
 */
var _ol_events_EventTarget_ = function _ol_events_EventTarget_() {

  _disposable2.default.call(this);

  /**
   * @private
   * @type {!Object.<string, number>}
   */
  this.pendingRemovals_ = {};

  /**
   * @private
   * @type {!Object.<string, number>}
   */
  this.dispatching_ = {};

  /**
   * @private
   * @type {!Object.<string, Array.<ol.EventsListenerFunctionType>>}
   */
  this.listeners_ = {};
};

_index2.default.inherits(_ol_events_EventTarget_, _disposable2.default);

/**
 * @param {string} type Type.
 * @param {ol.EventsListenerFunctionType} listener Listener.
 */
_ol_events_EventTarget_.prototype.addEventListener = function (type, listener) {
  var listeners = this.listeners_[type];
  if (!listeners) {
    listeners = this.listeners_[type] = [];
  }
  if (listeners.indexOf(listener) === -1) {
    listeners.push(listener);
  }
};

/**
 * @param {{type: string,
 *     target: (EventTarget|ol.events.EventTarget|undefined)}|ol.events.Event|
 *     string} event Event or event type.
 * @return {boolean|undefined} `false` if anyone called preventDefault on the
 *     event object or if any of the listeners returned false.
 */
_ol_events_EventTarget_.prototype.dispatchEvent = function (event) {
  var evt = typeof event === 'string' ? new _event2.default(event) : event;
  var type = evt.type;
  evt.target = this;
  var listeners = this.listeners_[type];
  var propagate;
  if (listeners) {
    if (!(type in this.dispatching_)) {
      this.dispatching_[type] = 0;
      this.pendingRemovals_[type] = 0;
    }
    ++this.dispatching_[type];
    for (var i = 0, ii = listeners.length; i < ii; ++i) {
      if (listeners[i].call(this, evt) === false || evt.propagationStopped) {
        propagate = false;
        break;
      }
    }
    --this.dispatching_[type];
    if (this.dispatching_[type] === 0) {
      var pendingRemovals = this.pendingRemovals_[type];
      delete this.pendingRemovals_[type];
      while (pendingRemovals--) {
        this.removeEventListener(type, _index2.default.nullFunction);
      }
      delete this.dispatching_[type];
    }
    return propagate;
  }
};

/**
 * @inheritDoc
 */
_ol_events_EventTarget_.prototype.disposeInternal = function () {
  _events2.default.unlistenAll(this);
};

/**
 * Get the listeners for a specified event type. Listeners are returned in the
 * order that they will be called in.
 *
 * @param {string} type Type.
 * @return {Array.<ol.EventsListenerFunctionType>} Listeners.
 */
_ol_events_EventTarget_.prototype.getListeners = function (type) {
  return this.listeners_[type];
};

/**
 * @param {string=} opt_type Type. If not provided,
 *     `true` will be returned if this EventTarget has any listeners.
 * @return {boolean} Has listeners.
 */
_ol_events_EventTarget_.prototype.hasListener = function (opt_type) {
  return opt_type ? opt_type in this.listeners_ : Object.keys(this.listeners_).length > 0;
};

/**
 * @param {string} type Type.
 * @param {ol.EventsListenerFunctionType} listener Listener.
 */
_ol_events_EventTarget_.prototype.removeEventListener = function (type, listener) {
  var listeners = this.listeners_[type];
  if (listeners) {
    var index = listeners.indexOf(listener);
    if (type in this.pendingRemovals_) {
      // make listener a no-op, and remove later in #dispatchEvent()
      listeners[index] = _index2.default.nullFunction;
      ++this.pendingRemovals_[type];
    } else {
      listeners.splice(index, 1);
      if (listeners.length === 0) {
        delete this.listeners_[type];
      }
    }
  }
};
exports.default = _ol_events_EventTarget_;

},{"../disposable.js":41,"../events.js":42,"../events/event.js":43,"../index.js":57}],45:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * @enum {string}
 * @const
 */
var _ol_events_EventType_ = {
  /**
   * Generic change event. Triggered when the revision counter is increased.
   * @event ol.events.Event#change
   * @api
   */
  CHANGE: 'change',

  CLEAR: 'clear',
  CLICK: 'click',
  DBLCLICK: 'dblclick',
  DRAGENTER: 'dragenter',
  DRAGOVER: 'dragover',
  DROP: 'drop',
  ERROR: 'error',
  KEYDOWN: 'keydown',
  KEYPRESS: 'keypress',
  LOAD: 'load',
  MOUSEDOWN: 'mousedown',
  MOUSEMOVE: 'mousemove',
  MOUSEOUT: 'mouseout',
  MOUSEUP: 'mouseup',
  MOUSEWHEEL: 'mousewheel',
  MSPOINTERDOWN: 'MSPointerDown',
  RESIZE: 'resize',
  TOUCHSTART: 'touchstart',
  TOUCHMOVE: 'touchmove',
  TOUCHEND: 'touchend',
  WHEEL: 'wheel'
};

exports.default = _ol_events_EventType_;

},{}],46:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _asserts = require('./asserts.js');

var _asserts2 = _interopRequireDefault(_asserts);

var _corner = require('./extent/corner.js');

var _corner2 = _interopRequireDefault(_corner);

var _relationship = require('./extent/relationship.js');

var _relationship2 = _interopRequireDefault(_relationship);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var _ol_extent_ = {};

/**
 * Build an extent that includes all given coordinates.
 *
 * @param {Array.<ol.Coordinate>} coordinates Coordinates.
 * @return {ol.Extent} Bounding extent.
 * @api
 */
_ol_extent_.boundingExtent = function (coordinates) {
  var extent = _ol_extent_.createEmpty();
  for (var i = 0, ii = coordinates.length; i < ii; ++i) {
    _ol_extent_.extendCoordinate(extent, coordinates[i]);
  }
  return extent;
};

/**
 * @param {Array.<number>} xs Xs.
 * @param {Array.<number>} ys Ys.
 * @param {ol.Extent=} opt_extent Destination extent.
 * @private
 * @return {ol.Extent} Extent.
 */
_ol_extent_.boundingExtentXYs_ = function (xs, ys, opt_extent) {
  var minX = Math.min.apply(null, xs);
  var minY = Math.min.apply(null, ys);
  var maxX = Math.max.apply(null, xs);
  var maxY = Math.max.apply(null, ys);
  return _ol_extent_.createOrUpdate(minX, minY, maxX, maxY, opt_extent);
};

/**
 * Return extent increased by the provided value.
 * @param {ol.Extent} extent Extent.
 * @param {number} value The amount by which the extent should be buffered.
 * @param {ol.Extent=} opt_extent Extent.
 * @return {ol.Extent} Extent.
 * @api
 */
_ol_extent_.buffer = function (extent, value, opt_extent) {
  if (opt_extent) {
    opt_extent[0] = extent[0] - value;
    opt_extent[1] = extent[1] - value;
    opt_extent[2] = extent[2] + value;
    opt_extent[3] = extent[3] + value;
    return opt_extent;
  } else {
    return [extent[0] - value, extent[1] - value, extent[2] + value, extent[3] + value];
  }
};

/**
 * Creates a clone of an extent.
 *
 * @param {ol.Extent} extent Extent to clone.
 * @param {ol.Extent=} opt_extent Extent.
 * @return {ol.Extent} The clone.
 */
_ol_extent_.clone = function (extent, opt_extent) {
  if (opt_extent) {
    opt_extent[0] = extent[0];
    opt_extent[1] = extent[1];
    opt_extent[2] = extent[2];
    opt_extent[3] = extent[3];
    return opt_extent;
  } else {
    return extent.slice();
  }
};

/**
 * @param {ol.Extent} extent Extent.
 * @param {number} x X.
 * @param {number} y Y.
 * @return {number} Closest squared distance.
 */
_ol_extent_.closestSquaredDistanceXY = function (extent, x, y) {
  var dx, dy;
  if (x < extent[0]) {
    dx = extent[0] - x;
  } else if (extent[2] < x) {
    dx = x - extent[2];
  } else {
    dx = 0;
  }
  if (y < extent[1]) {
    dy = extent[1] - y;
  } else if (extent[3] < y) {
    dy = y - extent[3];
  } else {
    dy = 0;
  }
  return dx * dx + dy * dy;
};

/**
 * Check if the passed coordinate is contained or on the edge of the extent.
 *
 * @param {ol.Extent} extent Extent.
 * @param {ol.Coordinate} coordinate Coordinate.
 * @return {boolean} The coordinate is contained in the extent.
 * @api
 */
_ol_extent_.containsCoordinate = function (extent, coordinate) {
  return _ol_extent_.containsXY(extent, coordinate[0], coordinate[1]);
};

/**
 * Check if one extent contains another.
 *
 * An extent is deemed contained if it lies completely within the other extent,
 * including if they share one or more edges.
 *
 * @param {ol.Extent} extent1 Extent 1.
 * @param {ol.Extent} extent2 Extent 2.
 * @return {boolean} The second extent is contained by or on the edge of the
 *     first.
 * @api
 */
_ol_extent_.containsExtent = function (extent1, extent2) {
  return extent1[0] <= extent2[0] && extent2[2] <= extent1[2] && extent1[1] <= extent2[1] && extent2[3] <= extent1[3];
};

/**
 * Check if the passed coordinate is contained or on the edge of the extent.
 *
 * @param {ol.Extent} extent Extent.
 * @param {number} x X coordinate.
 * @param {number} y Y coordinate.
 * @return {boolean} The x, y values are contained in the extent.
 * @api
 */
_ol_extent_.containsXY = function (extent, x, y) {
  return extent[0] <= x && x <= extent[2] && extent[1] <= y && y <= extent[3];
};

/**
 * Get the relationship between a coordinate and extent.
 * @param {ol.Extent} extent The extent.
 * @param {ol.Coordinate} coordinate The coordinate.
 * @return {number} The relationship (bitwise compare with
 *     ol.extent.Relationship).
 */
_ol_extent_.coordinateRelationship = function (extent, coordinate) {
  var minX = extent[0];
  var minY = extent[1];
  var maxX = extent[2];
  var maxY = extent[3];
  var x = coordinate[0];
  var y = coordinate[1];
  var relationship = _relationship2.default.UNKNOWN;
  if (x < minX) {
    relationship = relationship | _relationship2.default.LEFT;
  } else if (x > maxX) {
    relationship = relationship | _relationship2.default.RIGHT;
  }
  if (y < minY) {
    relationship = relationship | _relationship2.default.BELOW;
  } else if (y > maxY) {
    relationship = relationship | _relationship2.default.ABOVE;
  }
  if (relationship === _relationship2.default.UNKNOWN) {
    relationship = _relationship2.default.INTERSECTING;
  }
  return relationship;
};

/**
 * Create an empty extent.
 * @return {ol.Extent} Empty extent.
 * @api
 */
_ol_extent_.createEmpty = function () {
  return [Infinity, Infinity, -Infinity, -Infinity];
};

/**
 * Create a new extent or update the provided extent.
 * @param {number} minX Minimum X.
 * @param {number} minY Minimum Y.
 * @param {number} maxX Maximum X.
 * @param {number} maxY Maximum Y.
 * @param {ol.Extent=} opt_extent Destination extent.
 * @return {ol.Extent} Extent.
 */
_ol_extent_.createOrUpdate = function (minX, minY, maxX, maxY, opt_extent) {
  if (opt_extent) {
    opt_extent[0] = minX;
    opt_extent[1] = minY;
    opt_extent[2] = maxX;
    opt_extent[3] = maxY;
    return opt_extent;
  } else {
    return [minX, minY, maxX, maxY];
  }
};

/**
 * Create a new empty extent or make the provided one empty.
 * @param {ol.Extent=} opt_extent Extent.
 * @return {ol.Extent} Extent.
 */
_ol_extent_.createOrUpdateEmpty = function (opt_extent) {
  return _ol_extent_.createOrUpdate(Infinity, Infinity, -Infinity, -Infinity, opt_extent);
};

/**
 * @param {ol.Coordinate} coordinate Coordinate.
 * @param {ol.Extent=} opt_extent Extent.
 * @return {ol.Extent} Extent.
 */
_ol_extent_.createOrUpdateFromCoordinate = function (coordinate, opt_extent) {
  var x = coordinate[0];
  var y = coordinate[1];
  return _ol_extent_.createOrUpdate(x, y, x, y, opt_extent);
};

/**
 * @param {Array.<ol.Coordinate>} coordinates Coordinates.
 * @param {ol.Extent=} opt_extent Extent.
 * @return {ol.Extent} Extent.
 */
_ol_extent_.createOrUpdateFromCoordinates = function (coordinates, opt_extent) {
  var extent = _ol_extent_.createOrUpdateEmpty(opt_extent);
  return _ol_extent_.extendCoordinates(extent, coordinates);
};

/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {number} end End.
 * @param {number} stride Stride.
 * @param {ol.Extent=} opt_extent Extent.
 * @return {ol.Extent} Extent.
 */
_ol_extent_.createOrUpdateFromFlatCoordinates = function (flatCoordinates, offset, end, stride, opt_extent) {
  var extent = _ol_extent_.createOrUpdateEmpty(opt_extent);
  return _ol_extent_.extendFlatCoordinates(extent, flatCoordinates, offset, end, stride);
};

/**
 * @param {Array.<Array.<ol.Coordinate>>} rings Rings.
 * @param {ol.Extent=} opt_extent Extent.
 * @return {ol.Extent} Extent.
 */
_ol_extent_.createOrUpdateFromRings = function (rings, opt_extent) {
  var extent = _ol_extent_.createOrUpdateEmpty(opt_extent);
  return _ol_extent_.extendRings(extent, rings);
};

/**
 * Determine if two extents are equivalent.
 * @param {ol.Extent} extent1 Extent 1.
 * @param {ol.Extent} extent2 Extent 2.
 * @return {boolean} The two extents are equivalent.
 * @api
 */
_ol_extent_.equals = function (extent1, extent2) {
  return extent1[0] == extent2[0] && extent1[2] == extent2[2] && extent1[1] == extent2[1] && extent1[3] == extent2[3];
};

/**
 * Modify an extent to include another extent.
 * @param {ol.Extent} extent1 The extent to be modified.
 * @param {ol.Extent} extent2 The extent that will be included in the first.
 * @return {ol.Extent} A reference to the first (extended) extent.
 * @api
 */
_ol_extent_.extend = function (extent1, extent2) {
  if (extent2[0] < extent1[0]) {
    extent1[0] = extent2[0];
  }
  if (extent2[2] > extent1[2]) {
    extent1[2] = extent2[2];
  }
  if (extent2[1] < extent1[1]) {
    extent1[1] = extent2[1];
  }
  if (extent2[3] > extent1[3]) {
    extent1[3] = extent2[3];
  }
  return extent1;
};

/**
 * @param {ol.Extent} extent Extent.
 * @param {ol.Coordinate} coordinate Coordinate.
 */
_ol_extent_.extendCoordinate = function (extent, coordinate) {
  if (coordinate[0] < extent[0]) {
    extent[0] = coordinate[0];
  }
  if (coordinate[0] > extent[2]) {
    extent[2] = coordinate[0];
  }
  if (coordinate[1] < extent[1]) {
    extent[1] = coordinate[1];
  }
  if (coordinate[1] > extent[3]) {
    extent[3] = coordinate[1];
  }
};

/**
 * @param {ol.Extent} extent Extent.
 * @param {Array.<ol.Coordinate>} coordinates Coordinates.
 * @return {ol.Extent} Extent.
 */
_ol_extent_.extendCoordinates = function (extent, coordinates) {
  var i, ii;
  for (i = 0, ii = coordinates.length; i < ii; ++i) {
    _ol_extent_.extendCoordinate(extent, coordinates[i]);
  }
  return extent;
};

/**
 * @param {ol.Extent} extent Extent.
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {number} end End.
 * @param {number} stride Stride.
 * @return {ol.Extent} Extent.
 */
_ol_extent_.extendFlatCoordinates = function (extent, flatCoordinates, offset, end, stride) {
  for (; offset < end; offset += stride) {
    _ol_extent_.extendXY(extent, flatCoordinates[offset], flatCoordinates[offset + 1]);
  }
  return extent;
};

/**
 * @param {ol.Extent} extent Extent.
 * @param {Array.<Array.<ol.Coordinate>>} rings Rings.
 * @return {ol.Extent} Extent.
 */
_ol_extent_.extendRings = function (extent, rings) {
  var i, ii;
  for (i = 0, ii = rings.length; i < ii; ++i) {
    _ol_extent_.extendCoordinates(extent, rings[i]);
  }
  return extent;
};

/**
 * @param {ol.Extent} extent Extent.
 * @param {number} x X.
 * @param {number} y Y.
 */
_ol_extent_.extendXY = function (extent, x, y) {
  extent[0] = Math.min(extent[0], x);
  extent[1] = Math.min(extent[1], y);
  extent[2] = Math.max(extent[2], x);
  extent[3] = Math.max(extent[3], y);
};

/**
 * This function calls `callback` for each corner of the extent. If the
 * callback returns a truthy value the function returns that value
 * immediately. Otherwise the function returns `false`.
 * @param {ol.Extent} extent Extent.
 * @param {function(this:T, ol.Coordinate): S} callback Callback.
 * @param {T=} opt_this Value to use as `this` when executing `callback`.
 * @return {S|boolean} Value.
 * @template S, T
 */
_ol_extent_.forEachCorner = function (extent, callback, opt_this) {
  var val;
  val = callback.call(opt_this, _ol_extent_.getBottomLeft(extent));
  if (val) {
    return val;
  }
  val = callback.call(opt_this, _ol_extent_.getBottomRight(extent));
  if (val) {
    return val;
  }
  val = callback.call(opt_this, _ol_extent_.getTopRight(extent));
  if (val) {
    return val;
  }
  val = callback.call(opt_this, _ol_extent_.getTopLeft(extent));
  if (val) {
    return val;
  }
  return false;
};

/**
 * Get the size of an extent.
 * @param {ol.Extent} extent Extent.
 * @return {number} Area.
 * @api
 */
_ol_extent_.getArea = function (extent) {
  var area = 0;
  if (!_ol_extent_.isEmpty(extent)) {
    area = _ol_extent_.getWidth(extent) * _ol_extent_.getHeight(extent);
  }
  return area;
};

/**
 * Get the bottom left coordinate of an extent.
 * @param {ol.Extent} extent Extent.
 * @return {ol.Coordinate} Bottom left coordinate.
 * @api
 */
_ol_extent_.getBottomLeft = function (extent) {
  return [extent[0], extent[1]];
};

/**
 * Get the bottom right coordinate of an extent.
 * @param {ol.Extent} extent Extent.
 * @return {ol.Coordinate} Bottom right coordinate.
 * @api
 */
_ol_extent_.getBottomRight = function (extent) {
  return [extent[2], extent[1]];
};

/**
 * Get the center coordinate of an extent.
 * @param {ol.Extent} extent Extent.
 * @return {ol.Coordinate} Center.
 * @api
 */
_ol_extent_.getCenter = function (extent) {
  return [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
};

/**
 * Get a corner coordinate of an extent.
 * @param {ol.Extent} extent Extent.
 * @param {ol.extent.Corner} corner Corner.
 * @return {ol.Coordinate} Corner coordinate.
 */
_ol_extent_.getCorner = function (extent, corner) {
  var coordinate;
  if (corner === _corner2.default.BOTTOM_LEFT) {
    coordinate = _ol_extent_.getBottomLeft(extent);
  } else if (corner === _corner2.default.BOTTOM_RIGHT) {
    coordinate = _ol_extent_.getBottomRight(extent);
  } else if (corner === _corner2.default.TOP_LEFT) {
    coordinate = _ol_extent_.getTopLeft(extent);
  } else if (corner === _corner2.default.TOP_RIGHT) {
    coordinate = _ol_extent_.getTopRight(extent);
  } else {
    _asserts2.default.assert(false, 13); // Invalid corner
  }
  return (/** @type {!ol.Coordinate} */coordinate
  );
};

/**
 * @param {ol.Extent} extent1 Extent 1.
 * @param {ol.Extent} extent2 Extent 2.
 * @return {number} Enlarged area.
 */
_ol_extent_.getEnlargedArea = function (extent1, extent2) {
  var minX = Math.min(extent1[0], extent2[0]);
  var minY = Math.min(extent1[1], extent2[1]);
  var maxX = Math.max(extent1[2], extent2[2]);
  var maxY = Math.max(extent1[3], extent2[3]);
  return (maxX - minX) * (maxY - minY);
};

/**
 * @param {ol.Coordinate} center Center.
 * @param {number} resolution Resolution.
 * @param {number} rotation Rotation.
 * @param {ol.Size} size Size.
 * @param {ol.Extent=} opt_extent Destination extent.
 * @return {ol.Extent} Extent.
 */
_ol_extent_.getForViewAndSize = function (center, resolution, rotation, size, opt_extent) {
  var dx = resolution * size[0] / 2;
  var dy = resolution * size[1] / 2;
  var cosRotation = Math.cos(rotation);
  var sinRotation = Math.sin(rotation);
  var xCos = dx * cosRotation;
  var xSin = dx * sinRotation;
  var yCos = dy * cosRotation;
  var ySin = dy * sinRotation;
  var x = center[0];
  var y = center[1];
  var x0 = x - xCos + ySin;
  var x1 = x - xCos - ySin;
  var x2 = x + xCos - ySin;
  var x3 = x + xCos + ySin;
  var y0 = y - xSin - yCos;
  var y1 = y - xSin + yCos;
  var y2 = y + xSin + yCos;
  var y3 = y + xSin - yCos;
  return _ol_extent_.createOrUpdate(Math.min(x0, x1, x2, x3), Math.min(y0, y1, y2, y3), Math.max(x0, x1, x2, x3), Math.max(y0, y1, y2, y3), opt_extent);
};

/**
 * Get the height of an extent.
 * @param {ol.Extent} extent Extent.
 * @return {number} Height.
 * @api
 */
_ol_extent_.getHeight = function (extent) {
  return extent[3] - extent[1];
};

/**
 * @param {ol.Extent} extent1 Extent 1.
 * @param {ol.Extent} extent2 Extent 2.
 * @return {number} Intersection area.
 */
_ol_extent_.getIntersectionArea = function (extent1, extent2) {
  var intersection = _ol_extent_.getIntersection(extent1, extent2);
  return _ol_extent_.getArea(intersection);
};

/**
 * Get the intersection of two extents.
 * @param {ol.Extent} extent1 Extent 1.
 * @param {ol.Extent} extent2 Extent 2.
 * @param {ol.Extent=} opt_extent Optional extent to populate with intersection.
 * @return {ol.Extent} Intersecting extent.
 * @api
 */
_ol_extent_.getIntersection = function (extent1, extent2, opt_extent) {
  var intersection = opt_extent ? opt_extent : _ol_extent_.createEmpty();
  if (_ol_extent_.intersects(extent1, extent2)) {
    if (extent1[0] > extent2[0]) {
      intersection[0] = extent1[0];
    } else {
      intersection[0] = extent2[0];
    }
    if (extent1[1] > extent2[1]) {
      intersection[1] = extent1[1];
    } else {
      intersection[1] = extent2[1];
    }
    if (extent1[2] < extent2[2]) {
      intersection[2] = extent1[2];
    } else {
      intersection[2] = extent2[2];
    }
    if (extent1[3] < extent2[3]) {
      intersection[3] = extent1[3];
    } else {
      intersection[3] = extent2[3];
    }
  }
  return intersection;
};

/**
 * @param {ol.Extent} extent Extent.
 * @return {number} Margin.
 */
_ol_extent_.getMargin = function (extent) {
  return _ol_extent_.getWidth(extent) + _ol_extent_.getHeight(extent);
};

/**
 * Get the size (width, height) of an extent.
 * @param {ol.Extent} extent The extent.
 * @return {ol.Size} The extent size.
 * @api
 */
_ol_extent_.getSize = function (extent) {
  return [extent[2] - extent[0], extent[3] - extent[1]];
};

/**
 * Get the top left coordinate of an extent.
 * @param {ol.Extent} extent Extent.
 * @return {ol.Coordinate} Top left coordinate.
 * @api
 */
_ol_extent_.getTopLeft = function (extent) {
  return [extent[0], extent[3]];
};

/**
 * Get the top right coordinate of an extent.
 * @param {ol.Extent} extent Extent.
 * @return {ol.Coordinate} Top right coordinate.
 * @api
 */
_ol_extent_.getTopRight = function (extent) {
  return [extent[2], extent[3]];
};

/**
 * Get the width of an extent.
 * @param {ol.Extent} extent Extent.
 * @return {number} Width.
 * @api
 */
_ol_extent_.getWidth = function (extent) {
  return extent[2] - extent[0];
};

/**
 * Determine if one extent intersects another.
 * @param {ol.Extent} extent1 Extent 1.
 * @param {ol.Extent} extent2 Extent.
 * @return {boolean} The two extents intersect.
 * @api
 */
_ol_extent_.intersects = function (extent1, extent2) {
  return extent1[0] <= extent2[2] && extent1[2] >= extent2[0] && extent1[1] <= extent2[3] && extent1[3] >= extent2[1];
};

/**
 * Determine if an extent is empty.
 * @param {ol.Extent} extent Extent.
 * @return {boolean} Is empty.
 * @api
 */
_ol_extent_.isEmpty = function (extent) {
  return extent[2] < extent[0] || extent[3] < extent[1];
};

/**
 * @param {ol.Extent} extent Extent.
 * @param {ol.Extent=} opt_extent Extent.
 * @return {ol.Extent} Extent.
 */
_ol_extent_.returnOrUpdate = function (extent, opt_extent) {
  if (opt_extent) {
    opt_extent[0] = extent[0];
    opt_extent[1] = extent[1];
    opt_extent[2] = extent[2];
    opt_extent[3] = extent[3];
    return opt_extent;
  } else {
    return extent;
  }
};

/**
 * @param {ol.Extent} extent Extent.
 * @param {number} value Value.
 */
_ol_extent_.scaleFromCenter = function (extent, value) {
  var deltaX = (extent[2] - extent[0]) / 2 * (value - 1);
  var deltaY = (extent[3] - extent[1]) / 2 * (value - 1);
  extent[0] -= deltaX;
  extent[2] += deltaX;
  extent[1] -= deltaY;
  extent[3] += deltaY;
};

/**
 * Determine if the segment between two coordinates intersects (crosses,
 * touches, or is contained by) the provided extent.
 * @param {ol.Extent} extent The extent.
 * @param {ol.Coordinate} start Segment start coordinate.
 * @param {ol.Coordinate} end Segment end coordinate.
 * @return {boolean} The segment intersects the extent.
 */
_ol_extent_.intersectsSegment = function (extent, start, end) {
  var intersects = false;
  var startRel = _ol_extent_.coordinateRelationship(extent, start);
  var endRel = _ol_extent_.coordinateRelationship(extent, end);
  if (startRel === _relationship2.default.INTERSECTING || endRel === _relationship2.default.INTERSECTING) {
    intersects = true;
  } else {
    var minX = extent[0];
    var minY = extent[1];
    var maxX = extent[2];
    var maxY = extent[3];
    var startX = start[0];
    var startY = start[1];
    var endX = end[0];
    var endY = end[1];
    var slope = (endY - startY) / (endX - startX);
    var x, y;
    if (!!(endRel & _relationship2.default.ABOVE) && !(startRel & _relationship2.default.ABOVE)) {
      // potentially intersects top
      x = endX - (endY - maxY) / slope;
      intersects = x >= minX && x <= maxX;
    }
    if (!intersects && !!(endRel & _relationship2.default.RIGHT) && !(startRel & _relationship2.default.RIGHT)) {
      // potentially intersects right
      y = endY - (endX - maxX) * slope;
      intersects = y >= minY && y <= maxY;
    }
    if (!intersects && !!(endRel & _relationship2.default.BELOW) && !(startRel & _relationship2.default.BELOW)) {
      // potentially intersects bottom
      x = endX - (endY - minY) / slope;
      intersects = x >= minX && x <= maxX;
    }
    if (!intersects && !!(endRel & _relationship2.default.LEFT) && !(startRel & _relationship2.default.LEFT)) {
      // potentially intersects left
      y = endY - (endX - minX) * slope;
      intersects = y >= minY && y <= maxY;
    }
  }
  return intersects;
};

/**
 * Apply a transform function to the extent.
 * @param {ol.Extent} extent Extent.
 * @param {ol.TransformFunction} transformFn Transform function.  Called with
 * [minX, minY, maxX, maxY] extent coordinates.
 * @param {ol.Extent=} opt_extent Destination extent.
 * @return {ol.Extent} Extent.
 * @api
 */
_ol_extent_.applyTransform = function (extent, transformFn, opt_extent) {
  var coordinates = [extent[0], extent[1], extent[0], extent[3], extent[2], extent[1], extent[2], extent[3]];
  transformFn(coordinates, coordinates, 2);
  var xs = [coordinates[0], coordinates[2], coordinates[4], coordinates[6]];
  var ys = [coordinates[1], coordinates[3], coordinates[5], coordinates[7]];
  return _ol_extent_.boundingExtentXYs_(xs, ys, opt_extent);
};
exports.default = _ol_extent_;

},{"./asserts.js":40,"./extent/corner.js":47,"./extent/relationship.js":48}],47:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Extent corner.
 * @enum {string}
 */
var _ol_extent_Corner_ = {
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right'
};

exports.default = _ol_extent_Corner_;

},{}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Relationship to an extent.
 * @enum {number}
 */
var _ol_extent_Relationship_ = {
  UNKNOWN: 0,
  INTERSECTING: 1,
  ABOVE: 2,
  RIGHT: 4,
  BELOW: 8,
  LEFT: 16
};

exports.default = _ol_extent_Relationship_;

},{}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _ol_functions_ = {};

/**
 * Always returns true.
 * @returns {boolean} true.
 */
_ol_functions_.TRUE = function () {
  return true;
};

/**
 * Always returns false.
 * @returns {boolean} false.
 */
_ol_functions_.FALSE = function () {
  return false;
};
exports.default = _ol_functions_;

},{}],50:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _ol_geom_flat_deflate_ = {};

/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {ol.Coordinate} coordinate Coordinate.
 * @param {number} stride Stride.
 * @return {number} offset Offset.
 */
_ol_geom_flat_deflate_.coordinate = function (flatCoordinates, offset, coordinate, stride) {
  var i, ii;
  for (i = 0, ii = coordinate.length; i < ii; ++i) {
    flatCoordinates[offset++] = coordinate[i];
  }
  return offset;
};

/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {Array.<ol.Coordinate>} coordinates Coordinates.
 * @param {number} stride Stride.
 * @return {number} offset Offset.
 */
_ol_geom_flat_deflate_.coordinates = function (flatCoordinates, offset, coordinates, stride) {
  var i, ii;
  for (i = 0, ii = coordinates.length; i < ii; ++i) {
    var coordinate = coordinates[i];
    var j;
    for (j = 0; j < stride; ++j) {
      flatCoordinates[offset++] = coordinate[j];
    }
  }
  return offset;
};

/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {Array.<Array.<ol.Coordinate>>} coordinatess Coordinatess.
 * @param {number} stride Stride.
 * @param {Array.<number>=} opt_ends Ends.
 * @return {Array.<number>} Ends.
 */
_ol_geom_flat_deflate_.coordinatess = function (flatCoordinates, offset, coordinatess, stride, opt_ends) {
  var ends = opt_ends ? opt_ends : [];
  var i = 0;
  var j, jj;
  for (j = 0, jj = coordinatess.length; j < jj; ++j) {
    var end = _ol_geom_flat_deflate_.coordinates(flatCoordinates, offset, coordinatess[j], stride);
    ends[i++] = end;
    offset = end;
  }
  ends.length = i;
  return ends;
};

/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {Array.<Array.<Array.<ol.Coordinate>>>} coordinatesss Coordinatesss.
 * @param {number} stride Stride.
 * @param {Array.<Array.<number>>=} opt_endss Endss.
 * @return {Array.<Array.<number>>} Endss.
 */
_ol_geom_flat_deflate_.coordinatesss = function (flatCoordinates, offset, coordinatesss, stride, opt_endss) {
  var endss = opt_endss ? opt_endss : [];
  var i = 0;
  var j, jj;
  for (j = 0, jj = coordinatesss.length; j < jj; ++j) {
    var ends = _ol_geom_flat_deflate_.coordinatess(flatCoordinates, offset, coordinatesss[j], stride, endss[i]);
    endss[i++] = ends;
    offset = ends[ends.length - 1];
  }
  endss.length = i;
  return endss;
};
exports.default = _ol_geom_flat_deflate_;

},{}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _ol_geom_flat_transform_ = {};

/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {number} end End.
 * @param {number} stride Stride.
 * @param {ol.Transform} transform Transform.
 * @param {Array.<number>=} opt_dest Destination.
 * @return {Array.<number>} Transformed coordinates.
 */
_ol_geom_flat_transform_.transform2D = function (flatCoordinates, offset, end, stride, transform, opt_dest) {
  var dest = opt_dest ? opt_dest : [];
  var i = 0;
  var j;
  for (j = offset; j < end; j += stride) {
    var x = flatCoordinates[j];
    var y = flatCoordinates[j + 1];
    dest[i++] = transform[0] * x + transform[2] * y + transform[4];
    dest[i++] = transform[1] * x + transform[3] * y + transform[5];
  }
  if (opt_dest && dest.length != i) {
    dest.length = i;
  }
  return dest;
};

/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {number} end End.
 * @param {number} stride Stride.
 * @param {number} angle Angle.
 * @param {Array.<number>} anchor Rotation anchor point.
 * @param {Array.<number>=} opt_dest Destination.
 * @return {Array.<number>} Transformed coordinates.
 */
_ol_geom_flat_transform_.rotate = function (flatCoordinates, offset, end, stride, angle, anchor, opt_dest) {
  var dest = opt_dest ? opt_dest : [];
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  var anchorX = anchor[0];
  var anchorY = anchor[1];
  var i = 0;
  for (var j = offset; j < end; j += stride) {
    var deltaX = flatCoordinates[j] - anchorX;
    var deltaY = flatCoordinates[j + 1] - anchorY;
    dest[i++] = anchorX + deltaX * cos - deltaY * sin;
    dest[i++] = anchorY + deltaX * sin + deltaY * cos;
    for (var k = j + 2; k < j + stride; ++k) {
      dest[i++] = flatCoordinates[k];
    }
  }
  if (opt_dest && dest.length != i) {
    dest.length = i;
  }
  return dest;
};

/**
 * Scale the coordinates.
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {number} end End.
 * @param {number} stride Stride.
 * @param {number} sx Scale factor in the x-direction.
 * @param {number} sy Scale factor in the y-direction.
 * @param {Array.<number>} anchor Scale anchor point.
 * @param {Array.<number>=} opt_dest Destination.
 * @return {Array.<number>} Transformed coordinates.
 */
_ol_geom_flat_transform_.scale = function (flatCoordinates, offset, end, stride, sx, sy, anchor, opt_dest) {
  var dest = opt_dest ? opt_dest : [];
  var anchorX = anchor[0];
  var anchorY = anchor[1];
  var i = 0;
  for (var j = offset; j < end; j += stride) {
    var deltaX = flatCoordinates[j] - anchorX;
    var deltaY = flatCoordinates[j + 1] - anchorY;
    dest[i++] = anchorX + sx * deltaX;
    dest[i++] = anchorY + sy * deltaY;
    for (var k = j + 2; k < j + stride; ++k) {
      dest[i++] = flatCoordinates[k];
    }
  }
  if (opt_dest && dest.length != i) {
    dest.length = i;
  }
  return dest;
};

/**
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @param {number} offset Offset.
 * @param {number} end End.
 * @param {number} stride Stride.
 * @param {number} deltaX Delta X.
 * @param {number} deltaY Delta Y.
 * @param {Array.<number>=} opt_dest Destination.
 * @return {Array.<number>} Transformed coordinates.
 */
_ol_geom_flat_transform_.translate = function (flatCoordinates, offset, end, stride, deltaX, deltaY, opt_dest) {
  var dest = opt_dest ? opt_dest : [];
  var i = 0;
  var j, k;
  for (j = offset; j < end; j += stride) {
    dest[i++] = flatCoordinates[j] + deltaX;
    dest[i++] = flatCoordinates[j + 1] + deltaY;
    for (k = j + 2; k < j + stride; ++k) {
      dest[i++] = flatCoordinates[k];
    }
  }
  if (opt_dest && dest.length != i) {
    dest.length = i;
  }
  return dest;
};
exports.default = _ol_geom_flat_transform_;

},{}],52:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('../index.js');

var _index2 = _interopRequireDefault(_index);

var _object = require('../object.js');

var _object2 = _interopRequireDefault(_object);

var _extent = require('../extent.js');

var _extent2 = _interopRequireDefault(_extent);

var _functions = require('../functions.js');

var _functions2 = _interopRequireDefault(_functions);

var _transform = require('../geom/flat/transform.js');

var _transform2 = _interopRequireDefault(_transform);

var _proj = require('../proj.js');

var _proj2 = _interopRequireDefault(_proj);

var _units = require('../proj/units.js');

var _units2 = _interopRequireDefault(_units);

var _transform3 = require('../transform.js');

var _transform4 = _interopRequireDefault(_transform3);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @classdesc
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Base class for vector geometries.
 *
 * To get notified of changes to the geometry, register a listener for the
 * generic `change` event on your geometry instance.
 *
 * @constructor
 * @abstract
 * @extends {ol.Object}
 * @api
 */
var _ol_geom_Geometry_ = function _ol_geom_Geometry_() {

  _object2.default.call(this);

  /**
   * @private
   * @type {ol.Extent}
   */
  this.extent_ = _extent2.default.createEmpty();

  /**
   * @private
   * @type {number}
   */
  this.extentRevision_ = -1;

  /**
   * @protected
   * @type {Object.<string, ol.geom.Geometry>}
   */
  this.simplifiedGeometryCache = {};

  /**
   * @protected
   * @type {number}
   */
  this.simplifiedGeometryMaxMinSquaredTolerance = 0;

  /**
   * @protected
   * @type {number}
   */
  this.simplifiedGeometryRevision = 0;

  /**
   * @private
   * @type {ol.Transform}
   */
  this.tmpTransform_ = _transform4.default.create();
};

_index2.default.inherits(_ol_geom_Geometry_, _object2.default);

/**
 * Make a complete copy of the geometry.
 * @abstract
 * @return {!ol.geom.Geometry} Clone.
 */
_ol_geom_Geometry_.prototype.clone = function () {};

/**
 * @abstract
 * @param {number} x X.
 * @param {number} y Y.
 * @param {ol.Coordinate} closestPoint Closest point.
 * @param {number} minSquaredDistance Minimum squared distance.
 * @return {number} Minimum squared distance.
 */
_ol_geom_Geometry_.prototype.closestPointXY = function (x, y, closestPoint, minSquaredDistance) {};

/**
 * Return the closest point of the geometry to the passed point as
 * {@link ol.Coordinate coordinate}.
 * @param {ol.Coordinate} point Point.
 * @param {ol.Coordinate=} opt_closestPoint Closest point.
 * @return {ol.Coordinate} Closest point.
 * @api
 */
_ol_geom_Geometry_.prototype.getClosestPoint = function (point, opt_closestPoint) {
  var closestPoint = opt_closestPoint ? opt_closestPoint : [NaN, NaN];
  this.closestPointXY(point[0], point[1], closestPoint, Infinity);
  return closestPoint;
};

/**
 * Returns true if this geometry includes the specified coordinate. If the
 * coordinate is on the boundary of the geometry, returns false.
 * @param {ol.Coordinate} coordinate Coordinate.
 * @return {boolean} Contains coordinate.
 * @api
 */
_ol_geom_Geometry_.prototype.intersectsCoordinate = function (coordinate) {
  return this.containsXY(coordinate[0], coordinate[1]);
};

/**
 * @abstract
 * @param {ol.Extent} extent Extent.
 * @protected
 * @return {ol.Extent} extent Extent.
 */
_ol_geom_Geometry_.prototype.computeExtent = function (extent) {};

/**
 * @param {number} x X.
 * @param {number} y Y.
 * @return {boolean} Contains (x, y).
 */
_ol_geom_Geometry_.prototype.containsXY = _functions2.default.FALSE;

/**
 * Get the extent of the geometry.
 * @param {ol.Extent=} opt_extent Extent.
 * @return {ol.Extent} extent Extent.
 * @api
 */
_ol_geom_Geometry_.prototype.getExtent = function (opt_extent) {
  if (this.extentRevision_ != this.getRevision()) {
    this.extent_ = this.computeExtent(this.extent_);
    this.extentRevision_ = this.getRevision();
  }
  return _extent2.default.returnOrUpdate(this.extent_, opt_extent);
};

/**
 * Rotate the geometry around a given coordinate. This modifies the geometry
 * coordinates in place.
 * @abstract
 * @param {number} angle Rotation angle in radians.
 * @param {ol.Coordinate} anchor The rotation center.
 * @api
 */
_ol_geom_Geometry_.prototype.rotate = function (angle, anchor) {};

/**
 * Scale the geometry (with an optional origin).  This modifies the geometry
 * coordinates in place.
 * @abstract
 * @param {number} sx The scaling factor in the x-direction.
 * @param {number=} opt_sy The scaling factor in the y-direction (defaults to
 *     sx).
 * @param {ol.Coordinate=} opt_anchor The scale origin (defaults to the center
 *     of the geometry extent).
 * @api
 */
_ol_geom_Geometry_.prototype.scale = function (sx, opt_sy, opt_anchor) {};

/**
 * Create a simplified version of this geometry.  For linestrings, this uses
 * the the {@link
 * https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm
 * Douglas Peucker} algorithm.  For polygons, a quantization-based
 * simplification is used to preserve topology.
 * @function
 * @param {number} tolerance The tolerance distance for simplification.
 * @return {ol.geom.Geometry} A new, simplified version of the original
 *     geometry.
 * @api
 */
_ol_geom_Geometry_.prototype.simplify = function (tolerance) {
  return this.getSimplifiedGeometry(tolerance * tolerance);
};

/**
 * Create a simplified version of this geometry using the Douglas Peucker
 * algorithm.
 * @see https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm
 * @abstract
 * @param {number} squaredTolerance Squared tolerance.
 * @return {ol.geom.Geometry} Simplified geometry.
 */
_ol_geom_Geometry_.prototype.getSimplifiedGeometry = function (squaredTolerance) {};

/**
 * Get the type of this geometry.
 * @abstract
 * @return {ol.geom.GeometryType} Geometry type.
 */
_ol_geom_Geometry_.prototype.getType = function () {};

/**
 * Apply a transform function to each coordinate of the geometry.
 * The geometry is modified in place.
 * If you do not want the geometry modified in place, first `clone()` it and
 * then use this function on the clone.
 * @abstract
 * @param {ol.TransformFunction} transformFn Transform.
 */
_ol_geom_Geometry_.prototype.applyTransform = function (transformFn) {};

/**
 * Test if the geometry and the passed extent intersect.
 * @abstract
 * @param {ol.Extent} extent Extent.
 * @return {boolean} `true` if the geometry and the extent intersect.
 */
_ol_geom_Geometry_.prototype.intersectsExtent = function (extent) {};

/**
 * Translate the geometry.  This modifies the geometry coordinates in place.  If
 * instead you want a new geometry, first `clone()` this geometry.
 * @abstract
 * @param {number} deltaX Delta X.
 * @param {number} deltaY Delta Y.
 */
_ol_geom_Geometry_.prototype.translate = function (deltaX, deltaY) {};

/**
 * Transform each coordinate of the geometry from one coordinate reference
 * system to another. The geometry is modified in place.
 * For example, a line will be transformed to a line and a circle to a circle.
 * If you do not want the geometry modified in place, first `clone()` it and
 * then use this function on the clone.
 *
 * @param {ol.ProjectionLike} source The current projection.  Can be a
 *     string identifier or a {@link ol.proj.Projection} object.
 * @param {ol.ProjectionLike} destination The desired projection.  Can be a
 *     string identifier or a {@link ol.proj.Projection} object.
 * @return {ol.geom.Geometry} This geometry.  Note that original geometry is
 *     modified in place.
 * @api
 */
_ol_geom_Geometry_.prototype.transform = function (source, destination) {
  var tmpTransform = this.tmpTransform_;
  source = _proj2.default.get(source);
  var transformFn = source.getUnits() == _units2.default.TILE_PIXELS ? function (inCoordinates, outCoordinates, stride) {
    var pixelExtent = source.getExtent();
    var projectedExtent = source.getWorldExtent();
    var scale = _extent2.default.getHeight(projectedExtent) / _extent2.default.getHeight(pixelExtent);
    _transform4.default.compose(tmpTransform, projectedExtent[0], projectedExtent[3], scale, -scale, 0, 0, 0);
    _transform2.default.transform2D(inCoordinates, 0, inCoordinates.length, stride, tmpTransform, outCoordinates);
    return _proj2.default.getTransform(source, destination)(inCoordinates, outCoordinates, stride);
  } : _proj2.default.getTransform(source, destination);
  this.applyTransform(transformFn);
  return this;
};
exports.default = _ol_geom_Geometry_;

},{"../extent.js":46,"../functions.js":49,"../geom/flat/transform.js":51,"../index.js":57,"../object.js":60,"../proj.js":63,"../proj/units.js":70,"../transform.js":72}],53:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * The coordinate layout for geometries, indicating whether a 3rd or 4th z ('Z')
 * or measure ('M') coordinate is available. Supported values are `'XY'`,
 * `'XYZ'`, `'XYM'`, `'XYZM'`.
 * @enum {string}
 */
var _ol_geom_GeometryLayout_ = {
  XY: 'XY',
  XYZ: 'XYZ',
  XYM: 'XYM',
  XYZM: 'XYZM'
};

exports.default = _ol_geom_GeometryLayout_;

},{}],54:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * The geometry type. One of `'Point'`, `'LineString'`, `'LinearRing'`,
 * `'Polygon'`, `'MultiPoint'`, `'MultiLineString'`, `'MultiPolygon'`,
 * `'GeometryCollection'`, `'Circle'`.
 * @enum {string}
 */
var _ol_geom_GeometryType_ = {
  POINT: 'Point',
  LINE_STRING: 'LineString',
  LINEAR_RING: 'LinearRing',
  POLYGON: 'Polygon',
  MULTI_POINT: 'MultiPoint',
  MULTI_LINE_STRING: 'MultiLineString',
  MULTI_POLYGON: 'MultiPolygon',
  GEOMETRY_COLLECTION: 'GeometryCollection',
  CIRCLE: 'Circle'
};

exports.default = _ol_geom_GeometryType_;

},{}],55:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('../index.js');

var _index2 = _interopRequireDefault(_index);

var _extent = require('../extent.js');

var _extent2 = _interopRequireDefault(_extent);

var _geometrylayout = require('../geom/geometrylayout.js');

var _geometrylayout2 = _interopRequireDefault(_geometrylayout);

var _geometrytype = require('../geom/geometrytype.js');

var _geometrytype2 = _interopRequireDefault(_geometrytype);

var _simplegeometry = require('../geom/simplegeometry.js');

var _simplegeometry2 = _interopRequireDefault(_simplegeometry);

var _deflate = require('../geom/flat/deflate.js');

var _deflate2 = _interopRequireDefault(_deflate);

var _math = require('../math.js');

var _math2 = _interopRequireDefault(_math);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @classdesc
 * Point geometry.
 *
 * @constructor
 * @extends {ol.geom.SimpleGeometry}
 * @param {ol.Coordinate} coordinates Coordinates.
 * @param {ol.geom.GeometryLayout=} opt_layout Layout.
 * @api
 */
var _ol_geom_Point_ = function _ol_geom_Point_(coordinates, opt_layout) {
  _simplegeometry2.default.call(this);
  this.setCoordinates(coordinates, opt_layout);
};

_index2.default.inherits(_ol_geom_Point_, _simplegeometry2.default);

/**
 * Make a complete copy of the geometry.
 * @return {!ol.geom.Point} Clone.
 * @override
 * @api
 */
_ol_geom_Point_.prototype.clone = function () {
  var point = new _ol_geom_Point_(null);
  point.setFlatCoordinates(this.layout, this.flatCoordinates.slice());
  return point;
};

/**
 * @inheritDoc
 */
_ol_geom_Point_.prototype.closestPointXY = function (x, y, closestPoint, minSquaredDistance) {
  var flatCoordinates = this.flatCoordinates;
  var squaredDistance = _math2.default.squaredDistance(x, y, flatCoordinates[0], flatCoordinates[1]);
  if (squaredDistance < minSquaredDistance) {
    var stride = this.stride;
    var i;
    for (i = 0; i < stride; ++i) {
      closestPoint[i] = flatCoordinates[i];
    }
    closestPoint.length = stride;
    return squaredDistance;
  } else {
    return minSquaredDistance;
  }
};

/**
 * Return the coordinate of the point.
 * @return {ol.Coordinate} Coordinates.
 * @override
 * @api
 */
_ol_geom_Point_.prototype.getCoordinates = function () {
  return !this.flatCoordinates ? [] : this.flatCoordinates.slice();
};

/**
 * @inheritDoc
 */
_ol_geom_Point_.prototype.computeExtent = function (extent) {
  return _extent2.default.createOrUpdateFromCoordinate(this.flatCoordinates, extent);
};

/**
 * @inheritDoc
 * @api
 */
_ol_geom_Point_.prototype.getType = function () {
  return _geometrytype2.default.POINT;
};

/**
 * @inheritDoc
 * @api
 */
_ol_geom_Point_.prototype.intersectsExtent = function (extent) {
  return _extent2.default.containsXY(extent, this.flatCoordinates[0], this.flatCoordinates[1]);
};

/**
 * @inheritDoc
 * @api
 */
_ol_geom_Point_.prototype.setCoordinates = function (coordinates, opt_layout) {
  if (!coordinates) {
    this.setFlatCoordinates(_geometrylayout2.default.XY, null);
  } else {
    this.setLayout(opt_layout, coordinates, 0);
    if (!this.flatCoordinates) {
      this.flatCoordinates = [];
    }
    this.flatCoordinates.length = _deflate2.default.coordinate(this.flatCoordinates, 0, coordinates, this.stride);
    this.changed();
  }
};

/**
 * @param {ol.geom.GeometryLayout} layout Layout.
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 */
_ol_geom_Point_.prototype.setFlatCoordinates = function (layout, flatCoordinates) {
  this.setFlatCoordinatesInternal(layout, flatCoordinates);
  this.changed();
};
exports.default = _ol_geom_Point_;

},{"../extent.js":46,"../geom/flat/deflate.js":50,"../geom/geometrylayout.js":53,"../geom/geometrytype.js":54,"../geom/simplegeometry.js":56,"../index.js":57,"../math.js":58}],56:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('../index.js');

var _index2 = _interopRequireDefault(_index);

var _functions = require('../functions.js');

var _functions2 = _interopRequireDefault(_functions);

var _extent = require('../extent.js');

var _extent2 = _interopRequireDefault(_extent);

var _geometry = require('../geom/geometry.js');

var _geometry2 = _interopRequireDefault(_geometry);

var _geometrylayout = require('../geom/geometrylayout.js');

var _geometrylayout2 = _interopRequireDefault(_geometrylayout);

var _transform = require('../geom/flat/transform.js');

var _transform2 = _interopRequireDefault(_transform);

var _obj = require('../obj.js');

var _obj2 = _interopRequireDefault(_obj);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @classdesc
 * Abstract base class; only used for creating subclasses; do not instantiate
 * in apps, as cannot be rendered.
 *
 * @constructor
 * @abstract
 * @extends {ol.geom.Geometry}
 * @api
 */
var _ol_geom_SimpleGeometry_ = function _ol_geom_SimpleGeometry_() {

  _geometry2.default.call(this);

  /**
   * @protected
   * @type {ol.geom.GeometryLayout}
   */
  this.layout = _geometrylayout2.default.XY;

  /**
   * @protected
   * @type {number}
   */
  this.stride = 2;

  /**
   * @protected
   * @type {Array.<number>}
   */
  this.flatCoordinates = null;
};

_index2.default.inherits(_ol_geom_SimpleGeometry_, _geometry2.default);

/**
 * @param {number} stride Stride.
 * @private
 * @return {ol.geom.GeometryLayout} layout Layout.
 */
_ol_geom_SimpleGeometry_.getLayoutForStride_ = function (stride) {
  var layout;
  if (stride == 2) {
    layout = _geometrylayout2.default.XY;
  } else if (stride == 3) {
    layout = _geometrylayout2.default.XYZ;
  } else if (stride == 4) {
    layout = _geometrylayout2.default.XYZM;
  }
  return (/** @type {ol.geom.GeometryLayout} */layout
  );
};

/**
 * @param {ol.geom.GeometryLayout} layout Layout.
 * @return {number} Stride.
 */
_ol_geom_SimpleGeometry_.getStrideForLayout = function (layout) {
  var stride;
  if (layout == _geometrylayout2.default.XY) {
    stride = 2;
  } else if (layout == _geometrylayout2.default.XYZ || layout == _geometrylayout2.default.XYM) {
    stride = 3;
  } else if (layout == _geometrylayout2.default.XYZM) {
    stride = 4;
  }
  return (/** @type {number} */stride
  );
};

/**
 * @inheritDoc
 */
_ol_geom_SimpleGeometry_.prototype.containsXY = _functions2.default.FALSE;

/**
 * @inheritDoc
 */
_ol_geom_SimpleGeometry_.prototype.computeExtent = function (extent) {
  return _extent2.default.createOrUpdateFromFlatCoordinates(this.flatCoordinates, 0, this.flatCoordinates.length, this.stride, extent);
};

/**
 * @abstract
 * @return {Array} Coordinates.
 */
_ol_geom_SimpleGeometry_.prototype.getCoordinates = function () {};

/**
 * Return the first coordinate of the geometry.
 * @return {ol.Coordinate} First coordinate.
 * @api
 */
_ol_geom_SimpleGeometry_.prototype.getFirstCoordinate = function () {
  return this.flatCoordinates.slice(0, this.stride);
};

/**
 * @return {Array.<number>} Flat coordinates.
 */
_ol_geom_SimpleGeometry_.prototype.getFlatCoordinates = function () {
  return this.flatCoordinates;
};

/**
 * Return the last coordinate of the geometry.
 * @return {ol.Coordinate} Last point.
 * @api
 */
_ol_geom_SimpleGeometry_.prototype.getLastCoordinate = function () {
  return this.flatCoordinates.slice(this.flatCoordinates.length - this.stride);
};

/**
 * Return the {@link ol.geom.GeometryLayout layout} of the geometry.
 * @return {ol.geom.GeometryLayout} Layout.
 * @api
 */
_ol_geom_SimpleGeometry_.prototype.getLayout = function () {
  return this.layout;
};

/**
 * @inheritDoc
 */
_ol_geom_SimpleGeometry_.prototype.getSimplifiedGeometry = function (squaredTolerance) {
  if (this.simplifiedGeometryRevision != this.getRevision()) {
    _obj2.default.clear(this.simplifiedGeometryCache);
    this.simplifiedGeometryMaxMinSquaredTolerance = 0;
    this.simplifiedGeometryRevision = this.getRevision();
  }
  // If squaredTolerance is negative or if we know that simplification will not
  // have any effect then just return this.
  if (squaredTolerance < 0 || this.simplifiedGeometryMaxMinSquaredTolerance !== 0 && squaredTolerance <= this.simplifiedGeometryMaxMinSquaredTolerance) {
    return this;
  }
  var key = squaredTolerance.toString();
  if (this.simplifiedGeometryCache.hasOwnProperty(key)) {
    return this.simplifiedGeometryCache[key];
  } else {
    var simplifiedGeometry = this.getSimplifiedGeometryInternal(squaredTolerance);
    var simplifiedFlatCoordinates = simplifiedGeometry.getFlatCoordinates();
    if (simplifiedFlatCoordinates.length < this.flatCoordinates.length) {
      this.simplifiedGeometryCache[key] = simplifiedGeometry;
      return simplifiedGeometry;
    } else {
      // Simplification did not actually remove any coordinates.  We now know
      // that any calls to getSimplifiedGeometry with a squaredTolerance less
      // than or equal to the current squaredTolerance will also not have any
      // effect.  This allows us to short circuit simplification (saving CPU
      // cycles) and prevents the cache of simplified geometries from filling
      // up with useless identical copies of this geometry (saving memory).
      this.simplifiedGeometryMaxMinSquaredTolerance = squaredTolerance;
      return this;
    }
  }
};

/**
 * @param {number} squaredTolerance Squared tolerance.
 * @return {ol.geom.SimpleGeometry} Simplified geometry.
 * @protected
 */
_ol_geom_SimpleGeometry_.prototype.getSimplifiedGeometryInternal = function (squaredTolerance) {
  return this;
};

/**
 * @return {number} Stride.
 */
_ol_geom_SimpleGeometry_.prototype.getStride = function () {
  return this.stride;
};

/**
 * @param {ol.geom.GeometryLayout} layout Layout.
 * @param {Array.<number>} flatCoordinates Flat coordinates.
 * @protected
 */
_ol_geom_SimpleGeometry_.prototype.setFlatCoordinatesInternal = function (layout, flatCoordinates) {
  this.stride = _ol_geom_SimpleGeometry_.getStrideForLayout(layout);
  this.layout = layout;
  this.flatCoordinates = flatCoordinates;
};

/**
 * @abstract
 * @param {Array} coordinates Coordinates.
 * @param {ol.geom.GeometryLayout=} opt_layout Layout.
 */
_ol_geom_SimpleGeometry_.prototype.setCoordinates = function (coordinates, opt_layout) {};

/**
 * @param {ol.geom.GeometryLayout|undefined} layout Layout.
 * @param {Array} coordinates Coordinates.
 * @param {number} nesting Nesting.
 * @protected
 */
_ol_geom_SimpleGeometry_.prototype.setLayout = function (layout, coordinates, nesting) {
  /** @type {number} */
  var stride;
  if (layout) {
    stride = _ol_geom_SimpleGeometry_.getStrideForLayout(layout);
  } else {
    var i;
    for (i = 0; i < nesting; ++i) {
      if (coordinates.length === 0) {
        this.layout = _geometrylayout2.default.XY;
        this.stride = 2;
        return;
      } else {
        coordinates = /** @type {Array} */coordinates[0];
      }
    }
    stride = coordinates.length;
    layout = _ol_geom_SimpleGeometry_.getLayoutForStride_(stride);
  }
  this.layout = layout;
  this.stride = stride;
};

/**
 * @inheritDoc
 * @api
 */
_ol_geom_SimpleGeometry_.prototype.applyTransform = function (transformFn) {
  if (this.flatCoordinates) {
    transformFn(this.flatCoordinates, this.flatCoordinates, this.stride);
    this.changed();
  }
};

/**
 * @inheritDoc
 * @api
 */
_ol_geom_SimpleGeometry_.prototype.rotate = function (angle, anchor) {
  var flatCoordinates = this.getFlatCoordinates();
  if (flatCoordinates) {
    var stride = this.getStride();
    _transform2.default.rotate(flatCoordinates, 0, flatCoordinates.length, stride, angle, anchor, flatCoordinates);
    this.changed();
  }
};

/**
 * @inheritDoc
 * @api
 */
_ol_geom_SimpleGeometry_.prototype.scale = function (sx, opt_sy, opt_anchor) {
  var sy = opt_sy;
  if (sy === undefined) {
    sy = sx;
  }
  var anchor = opt_anchor;
  if (!anchor) {
    anchor = _extent2.default.getCenter(this.getExtent());
  }
  var flatCoordinates = this.getFlatCoordinates();
  if (flatCoordinates) {
    var stride = this.getStride();
    _transform2.default.scale(flatCoordinates, 0, flatCoordinates.length, stride, sx, sy, anchor, flatCoordinates);
    this.changed();
  }
};

/**
 * @inheritDoc
 * @api
 */
_ol_geom_SimpleGeometry_.prototype.translate = function (deltaX, deltaY) {
  var flatCoordinates = this.getFlatCoordinates();
  if (flatCoordinates) {
    var stride = this.getStride();
    _transform2.default.translate(flatCoordinates, 0, flatCoordinates.length, stride, deltaX, deltaY, flatCoordinates);
    this.changed();
  }
};

/**
 * @param {ol.geom.SimpleGeometry} simpleGeometry Simple geometry.
 * @param {ol.Transform} transform Transform.
 * @param {Array.<number>=} opt_dest Destination.
 * @return {Array.<number>} Transformed flat coordinates.
 */
_ol_geom_SimpleGeometry_.transform2D = function (simpleGeometry, transform, opt_dest) {
  var flatCoordinates = simpleGeometry.getFlatCoordinates();
  if (!flatCoordinates) {
    return null;
  } else {
    var stride = simpleGeometry.getStride();
    return _transform2.default.transform2D(flatCoordinates, 0, flatCoordinates.length, stride, transform, opt_dest);
  }
};
exports.default = _ol_geom_SimpleGeometry_;

},{"../extent.js":46,"../functions.js":49,"../geom/flat/transform.js":51,"../geom/geometry.js":52,"../geom/geometrylayout.js":53,"../index.js":57,"../obj.js":59}],57:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _ol_ = {};

/**
 * Constants defined with the define tag cannot be changed in application
 * code, but can be set at compile time.
 * Some reduce the size of the build in advanced compile mode.
 */

/**
 * @define {boolean} Assume touch.  Default is `false`.
 */
_ol_.ASSUME_TOUCH = false;

/**
 * TODO: rename this to something having to do with tile grids
 * see https://github.com/openlayers/openlayers/issues/2076
 * @define {number} Default maximum zoom for default tile grids.
 */
_ol_.DEFAULT_MAX_ZOOM = 42;

/**
 * @define {number} Default min zoom level for the map view.  Default is `0`.
 */
_ol_.DEFAULT_MIN_ZOOM = 0;

/**
 * @define {number} Default maximum allowed threshold  (in pixels) for
 *     reprojection triangulation. Default is `0.5`.
 */
_ol_.DEFAULT_RASTER_REPROJECTION_ERROR_THRESHOLD = 0.5;

/**
 * @define {number} Default tile size.
 */
_ol_.DEFAULT_TILE_SIZE = 256;

/**
 * @define {string} Default WMS version.
 */
_ol_.DEFAULT_WMS_VERSION = '1.3.0';

/**
 * @define {boolean} Enable the Canvas renderer.  Default is `true`. Setting
 *     this to false at compile time in advanced mode removes all code
 *     supporting the Canvas renderer from the build.
 */
_ol_.ENABLE_CANVAS = true;

/**
 * @define {boolean} Enable integration with the Proj4js library.  Default is
 *     `true`.
 */
_ol_.ENABLE_PROJ4JS = true;

/**
 * @define {boolean} Enable automatic reprojection of raster sources. Default is
 *     `true`.
 */
_ol_.ENABLE_RASTER_REPROJECTION = true;

/**
 * @define {boolean} Enable the WebGL renderer.  Default is `true`. Setting
 *     this to false at compile time in advanced mode removes all code
 *     supporting the WebGL renderer from the build.
 */
_ol_.ENABLE_WEBGL = true;

/**
 * @define {boolean} Include debuggable shader sources.  Default is `true`.
 *     This should be set to `false` for production builds (if `ol.ENABLE_WEBGL`
 *     is `true`).
 */
_ol_.DEBUG_WEBGL = true;

/**
 * @define {number} The size in pixels of the first atlas image. Default is
 * `256`.
 */
_ol_.INITIAL_ATLAS_SIZE = 256;

/**
 * @define {number} The maximum size in pixels of atlas images. Default is
 * `-1`, meaning it is not used (and `ol.WEBGL_MAX_TEXTURE_SIZE` is
 * used instead).
 */
_ol_.MAX_ATLAS_SIZE = -1;

/**
 * @define {number} Maximum mouse wheel delta.
 */
_ol_.MOUSEWHEELZOOM_MAXDELTA = 1;

/**
 * @define {number} Maximum width and/or height extent ratio that determines
 * when the overview map should be zoomed out.
 */
_ol_.OVERVIEWMAP_MAX_RATIO = 0.75;

/**
 * @define {number} Minimum width and/or height extent ratio that determines
 * when the overview map should be zoomed in.
 */
_ol_.OVERVIEWMAP_MIN_RATIO = 0.1;

/**
 * @define {number} Maximum number of source tiles for raster reprojection of
 *     a single tile.
 *     If too many source tiles are determined to be loaded to create a single
 *     reprojected tile the browser can become unresponsive or even crash.
 *     This can happen if the developer defines projections improperly and/or
 *     with unlimited extents.
 *     If too many tiles are required, no tiles are loaded and
 *     `ol.TileState.ERROR` state is set. Default is `100`.
 */
_ol_.RASTER_REPROJECTION_MAX_SOURCE_TILES = 100;

/**
 * @define {number} Maximum number of subdivision steps during raster
 *     reprojection triangulation. Prevents high memory usage and large
 *     number of proj4 calls (for certain transformations and areas).
 *     At most `2*(2^this)` triangles are created for each triangulated
 *     extent (tile/image). Default is `10`.
 */
_ol_.RASTER_REPROJECTION_MAX_SUBDIVISION = 10;

/**
 * @define {number} Maximum allowed size of triangle relative to world width.
 *     When transforming corners of world extent between certain projections,
 *     the resulting triangulation seems to have zero error and no subdivision
 *     is performed.
 *     If the triangle width is more than this (relative to world width; 0-1),
 *     subdivison is forced (up to `ol.RASTER_REPROJECTION_MAX_SUBDIVISION`).
 *     Default is `0.25`.
 */
_ol_.RASTER_REPROJECTION_MAX_TRIANGLE_WIDTH = 0.25;

/**
 * @define {number} Tolerance for geometry simplification in device pixels.
 */
_ol_.SIMPLIFY_TOLERANCE = 0.5;

/**
 * @define {number} Texture cache high water mark.
 */
_ol_.WEBGL_TEXTURE_CACHE_HIGH_WATER_MARK = 1024;

/**
 * @define {string} OpenLayers version.
 */
_ol_.VERSION = 'v4.5.0';

/**
 * The maximum supported WebGL texture size in pixels. If WebGL is not
 * supported, the value is set to `undefined`.
 * @const
 * @type {number|undefined}
 */
_ol_.WEBGL_MAX_TEXTURE_SIZE; // value is set in `ol.has`


/**
 * List of supported WebGL extensions.
 * @const
 * @type {Array.<string>}
 */
_ol_.WEBGL_EXTENSIONS; // value is set in `ol.has`


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 *
 *     function ParentClass(a, b) { }
 *     ParentClass.prototype.foo = function(a) { }
 *
 *     function ChildClass(a, b, c) {
 *       // Call parent constructor
 *       ParentClass.call(this, a, b);
 *     }
 *     ol.inherits(ChildClass, ParentClass);
 *
 *     var child = new ChildClass('a', 'b', 'see');
 *     child.foo(); // This works.
 *
 * @param {!Function} childCtor Child constructor.
 * @param {!Function} parentCtor Parent constructor.
 * @function
 * @api
 */
_ol_.inherits = function (childCtor, parentCtor) {
  childCtor.prototype = Object.create(parentCtor.prototype);
  childCtor.prototype.constructor = childCtor;
};

/**
 * A reusable function, used e.g. as a default for callbacks.
 *
 * @return {undefined} Nothing.
 */
_ol_.nullFunction = function () {};

/**
 * Gets a unique ID for an object. This mutates the object so that further calls
 * with the same object as a parameter returns the same value. Unique IDs are generated
 * as a strictly increasing sequence. Adapted from goog.getUid.
 *
 * @param {Object} obj The object to get the unique ID for.
 * @return {number} The unique ID for the object.
 */
_ol_.getUid = function (obj) {
  return obj.ol_uid || (obj.ol_uid = ++_ol_.uidCounter_);
};

/**
 * Counter for getUid.
 * @type {number}
 * @private
 */
_ol_.uidCounter_ = 0;
exports.default = _ol_;

},{}],58:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _asserts = require('./asserts.js');

var _asserts2 = _interopRequireDefault(_asserts);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var _ol_math_ = {};

/**
 * Takes a number and clamps it to within the provided bounds.
 * @param {number} value The input number.
 * @param {number} min The minimum value to return.
 * @param {number} max The maximum value to return.
 * @return {number} The input number if it is within bounds, or the nearest
 *     number within the bounds.
 */
_ol_math_.clamp = function (value, min, max) {
  return Math.min(Math.max(value, min), max);
};

/**
 * Return the hyperbolic cosine of a given number. The method will use the
 * native `Math.cosh` function if it is available, otherwise the hyperbolic
 * cosine will be calculated via the reference implementation of the Mozilla
 * developer network.
 *
 * @param {number} x X.
 * @return {number} Hyperbolic cosine of x.
 */
_ol_math_.cosh = function () {
  // Wrapped in a iife, to save the overhead of checking for the native
  // implementation on every invocation.
  var cosh;
  if ('cosh' in Math) {
    // The environment supports the native Math.cosh function, use it…
    cosh = Math.cosh;
  } else {
    // … else, use the reference implementation of MDN:
    cosh = function cosh(x) {
      var y = Math.exp(x);
      return (y + 1 / y) / 2;
    };
  }
  return cosh;
}();

/**
 * @param {number} x X.
 * @return {number} The smallest power of two greater than or equal to x.
 */
_ol_math_.roundUpToPowerOfTwo = function (x) {
  _asserts2.default.assert(0 < x, 29); // `x` must be greater than `0`
  return Math.pow(2, Math.ceil(Math.log(x) / Math.LN2));
};

/**
 * Returns the square of the closest distance between the point (x, y) and the
 * line segment (x1, y1) to (x2, y2).
 * @param {number} x X.
 * @param {number} y Y.
 * @param {number} x1 X1.
 * @param {number} y1 Y1.
 * @param {number} x2 X2.
 * @param {number} y2 Y2.
 * @return {number} Squared distance.
 */
_ol_math_.squaredSegmentDistance = function (x, y, x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  if (dx !== 0 || dy !== 0) {
    var t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x1 = x2;
      y1 = y2;
    } else if (t > 0) {
      x1 += dx * t;
      y1 += dy * t;
    }
  }
  return _ol_math_.squaredDistance(x, y, x1, y1);
};

/**
 * Returns the square of the distance between the points (x1, y1) and (x2, y2).
 * @param {number} x1 X1.
 * @param {number} y1 Y1.
 * @param {number} x2 X2.
 * @param {number} y2 Y2.
 * @return {number} Squared distance.
 */
_ol_math_.squaredDistance = function (x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  return dx * dx + dy * dy;
};

/**
 * Solves system of linear equations using Gaussian elimination method.
 *
 * @param {Array.<Array.<number>>} mat Augmented matrix (n x n + 1 column)
 *                                     in row-major order.
 * @return {Array.<number>} The resulting vector.
 */
_ol_math_.solveLinearSystem = function (mat) {
  var n = mat.length;

  for (var i = 0; i < n; i++) {
    // Find max in the i-th column (ignoring i - 1 first rows)
    var maxRow = i;
    var maxEl = Math.abs(mat[i][i]);
    for (var r = i + 1; r < n; r++) {
      var absValue = Math.abs(mat[r][i]);
      if (absValue > maxEl) {
        maxEl = absValue;
        maxRow = r;
      }
    }

    if (maxEl === 0) {
      return null; // matrix is singular
    }

    // Swap max row with i-th (current) row
    var tmp = mat[maxRow];
    mat[maxRow] = mat[i];
    mat[i] = tmp;

    // Subtract the i-th row to make all the remaining rows 0 in the i-th column
    for (var j = i + 1; j < n; j++) {
      var coef = -mat[j][i] / mat[i][i];
      for (var k = i; k < n + 1; k++) {
        if (i == k) {
          mat[j][k] = 0;
        } else {
          mat[j][k] += coef * mat[i][k];
        }
      }
    }
  }

  // Solve Ax=b for upper triangular matrix A (mat)
  var x = new Array(n);
  for (var l = n - 1; l >= 0; l--) {
    x[l] = mat[l][n] / mat[l][l];
    for (var m = l - 1; m >= 0; m--) {
      mat[m][n] -= mat[m][l] * x[l];
    }
  }
  return x;
};

/**
 * Converts radians to to degrees.
 *
 * @param {number} angleInRadians Angle in radians.
 * @return {number} Angle in degrees.
 */
_ol_math_.toDegrees = function (angleInRadians) {
  return angleInRadians * 180 / Math.PI;
};

/**
 * Converts degrees to radians.
 *
 * @param {number} angleInDegrees Angle in degrees.
 * @return {number} Angle in radians.
 */
_ol_math_.toRadians = function (angleInDegrees) {
  return angleInDegrees * Math.PI / 180;
};

/**
 * Returns the modulo of a / b, depending on the sign of b.
 *
 * @param {number} a Dividend.
 * @param {number} b Divisor.
 * @return {number} Modulo.
 */
_ol_math_.modulo = function (a, b) {
  var r = a % b;
  return r * b < 0 ? r + b : r;
};

/**
 * Calculates the linearly interpolated value of x between a and b.
 *
 * @param {number} a Number
 * @param {number} b Number
 * @param {number} x Value to be interpolated.
 * @return {number} Interpolated value.
 */
_ol_math_.lerp = function (a, b, x) {
  return a + x * (b - a);
};
exports.default = _ol_math_;

},{"./asserts.js":40}],59:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _ol_obj_ = {};

/**
 * Polyfill for Object.assign().  Assigns enumerable and own properties from
 * one or more source objects to a target object.
 *
 * @see https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 * @param {!Object} target The target object.
 * @param {...Object} var_sources The source object(s).
 * @return {!Object} The modified target object.
 */
_ol_obj_.assign = typeof Object.assign === 'function' ? Object.assign : function (target, var_sources) {
  if (target === undefined || target === null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  var output = Object(target);
  for (var i = 1, ii = arguments.length; i < ii; ++i) {
    var source = arguments[i];
    if (source !== undefined && source !== null) {
      for (var key in source) {
        if (source.hasOwnProperty(key)) {
          output[key] = source[key];
        }
      }
    }
  }
  return output;
};

/**
 * Removes all properties from an object.
 * @param {Object} object The object to clear.
 */
_ol_obj_.clear = function (object) {
  for (var property in object) {
    delete object[property];
  }
};

/**
 * Get an array of property values from an object.
 * @param {Object<K,V>} object The object from which to get the values.
 * @return {!Array<V>} The property values.
 * @template K,V
 */
_ol_obj_.getValues = function (object) {
  var values = [];
  for (var property in object) {
    values.push(object[property]);
  }
  return values;
};

/**
 * Determine if an object has any properties.
 * @param {Object} object The object to check.
 * @return {boolean} The object is empty.
 */
_ol_obj_.isEmpty = function (object) {
  var property;
  for (property in object) {
    return false;
  }
  return !property;
};
exports.default = _ol_obj_;

},{}],60:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('./index.js');

var _index2 = _interopRequireDefault(_index);

var _objecteventtype = require('./objecteventtype.js');

var _objecteventtype2 = _interopRequireDefault(_objecteventtype);

var _observable = require('./observable.js');

var _observable2 = _interopRequireDefault(_observable);

var _event = require('./events/event.js');

var _event2 = _interopRequireDefault(_event);

var _obj = require('./obj.js');

var _obj2 = _interopRequireDefault(_obj);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @classdesc
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Most non-trivial classes inherit from this.
 *
 * This extends {@link ol.Observable} with observable properties, where each
 * property is observable as well as the object as a whole.
 *
 * Classes that inherit from this have pre-defined properties, to which you can
 * add your owns. The pre-defined properties are listed in this documentation as
 * 'Observable Properties', and have their own accessors; for example,
 * {@link ol.Map} has a `target` property, accessed with `getTarget()`  and
 * changed with `setTarget()`. Not all properties are however settable. There
 * are also general-purpose accessors `get()` and `set()`. For example,
 * `get('target')` is equivalent to `getTarget()`.
 *
 * The `set` accessors trigger a change event, and you can monitor this by
 * registering a listener. For example, {@link ol.View} has a `center`
 * property, so `view.on('change:center', function(evt) {...});` would call the
 * function whenever the value of the center property changes. Within the
 * function, `evt.target` would be the view, so `evt.target.getCenter()` would
 * return the new center.
 *
 * You can add your own observable properties with
 * `object.set('prop', 'value')`, and retrieve that with `object.get('prop')`.
 * You can listen for changes on that property value with
 * `object.on('change:prop', listener)`. You can get a list of all
 * properties with {@link ol.Object#getProperties object.getProperties()}.
 *
 * Note that the observable properties are separate from standard JS properties.
 * You can, for example, give your map object a title with
 * `map.title='New title'` and with `map.set('title', 'Another title')`. The
 * first will be a `hasOwnProperty`; the second will appear in
 * `getProperties()`. Only the second is observable.
 *
 * Properties can be deleted by using the unset method. E.g.
 * object.unset('foo').
 *
 * @constructor
 * @extends {ol.Observable}
 * @param {Object.<string, *>=} opt_values An object with key-value pairs.
 * @fires ol.Object.Event
 * @api
 */
var _ol_Object_ = function _ol_Object_(opt_values) {
  _observable2.default.call(this);

  // Call ol.getUid to ensure that the order of objects' ids is the same as
  // the order in which they were created.  This also helps to ensure that
  // object properties are always added in the same order, which helps many
  // JavaScript engines generate faster code.
  _index2.default.getUid(this);

  /**
   * @private
   * @type {!Object.<string, *>}
   */
  this.values_ = {};

  if (opt_values !== undefined) {
    this.setProperties(opt_values);
  }
};

_index2.default.inherits(_ol_Object_, _observable2.default);

/**
 * @private
 * @type {Object.<string, string>}
 */
_ol_Object_.changeEventTypeCache_ = {};

/**
 * @param {string} key Key name.
 * @return {string} Change name.
 */
_ol_Object_.getChangeEventType = function (key) {
  return _ol_Object_.changeEventTypeCache_.hasOwnProperty(key) ? _ol_Object_.changeEventTypeCache_[key] : _ol_Object_.changeEventTypeCache_[key] = 'change:' + key;
};

/**
 * Gets a value.
 * @param {string} key Key name.
 * @return {*} Value.
 * @api
 */
_ol_Object_.prototype.get = function (key) {
  var value;
  if (this.values_.hasOwnProperty(key)) {
    value = this.values_[key];
  }
  return value;
};

/**
 * Get a list of object property names.
 * @return {Array.<string>} List of property names.
 * @api
 */
_ol_Object_.prototype.getKeys = function () {
  return Object.keys(this.values_);
};

/**
 * Get an object of all property names and values.
 * @return {Object.<string, *>} Object.
 * @api
 */
_ol_Object_.prototype.getProperties = function () {
  return _obj2.default.assign({}, this.values_);
};

/**
 * @param {string} key Key name.
 * @param {*} oldValue Old value.
 */
_ol_Object_.prototype.notify = function (key, oldValue) {
  var eventType;
  eventType = _ol_Object_.getChangeEventType(key);
  this.dispatchEvent(new _ol_Object_.Event(eventType, key, oldValue));
  eventType = _objecteventtype2.default.PROPERTYCHANGE;
  this.dispatchEvent(new _ol_Object_.Event(eventType, key, oldValue));
};

/**
 * Sets a value.
 * @param {string} key Key name.
 * @param {*} value Value.
 * @param {boolean=} opt_silent Update without triggering an event.
 * @api
 */
_ol_Object_.prototype.set = function (key, value, opt_silent) {
  if (opt_silent) {
    this.values_[key] = value;
  } else {
    var oldValue = this.values_[key];
    this.values_[key] = value;
    if (oldValue !== value) {
      this.notify(key, oldValue);
    }
  }
};

/**
 * Sets a collection of key-value pairs.  Note that this changes any existing
 * properties and adds new ones (it does not remove any existing properties).
 * @param {Object.<string, *>} values Values.
 * @param {boolean=} opt_silent Update without triggering an event.
 * @api
 */
_ol_Object_.prototype.setProperties = function (values, opt_silent) {
  var key;
  for (key in values) {
    this.set(key, values[key], opt_silent);
  }
};

/**
 * Unsets a property.
 * @param {string} key Key name.
 * @param {boolean=} opt_silent Unset without triggering an event.
 * @api
 */
_ol_Object_.prototype.unset = function (key, opt_silent) {
  if (key in this.values_) {
    var oldValue = this.values_[key];
    delete this.values_[key];
    if (!opt_silent) {
      this.notify(key, oldValue);
    }
  }
};

/**
 * @classdesc
 * Events emitted by {@link ol.Object} instances are instances of this type.
 *
 * @param {string} type The event type.
 * @param {string} key The property name.
 * @param {*} oldValue The old value for `key`.
 * @extends {ol.events.Event}
 * @implements {oli.Object.Event}
 * @constructor
 */
_ol_Object_.Event = function (type, key, oldValue) {
  _event2.default.call(this, type);

  /**
   * The name of the property whose value is changing.
   * @type {string}
   * @api
   */
  this.key = key;

  /**
   * The old value. To get the new value use `e.target.get(e.key)` where
   * `e` is the event object.
   * @type {*}
   * @api
   */
  this.oldValue = oldValue;
};
_index2.default.inherits(_ol_Object_.Event, _event2.default);
exports.default = _ol_Object_;

},{"./events/event.js":43,"./index.js":57,"./obj.js":59,"./objecteventtype.js":61,"./observable.js":62}],61:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * @enum {string}
 */
var _ol_ObjectEventType_ = {
  /**
   * Triggered when a property is changed.
   * @event ol.Object.Event#propertychange
   * @api
   */
  PROPERTYCHANGE: 'propertychange'
};

exports.default = _ol_ObjectEventType_;

},{}],62:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('./index.js');

var _index2 = _interopRequireDefault(_index);

var _events = require('./events.js');

var _events2 = _interopRequireDefault(_events);

var _eventtarget = require('./events/eventtarget.js');

var _eventtarget2 = _interopRequireDefault(_eventtarget);

var _eventtype = require('./events/eventtype.js');

var _eventtype2 = _interopRequireDefault(_eventtype);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @classdesc
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * An event target providing convenient methods for listener registration
 * and unregistration. A generic `change` event is always available through
 * {@link ol.Observable#changed}.
 *
 * @constructor
 * @extends {ol.events.EventTarget}
 * @fires ol.events.Event
 * @struct
 * @api
 */
var _ol_Observable_ = function _ol_Observable_() {

  _eventtarget2.default.call(this);

  /**
   * @private
   * @type {number}
   */
  this.revision_ = 0;
};

_index2.default.inherits(_ol_Observable_, _eventtarget2.default);

/**
 * Removes an event listener using the key returned by `on()` or `once()`.
 * @param {ol.EventsKey|Array.<ol.EventsKey>} key The key returned by `on()`
 *     or `once()` (or an array of keys).
 * @api
 */
_ol_Observable_.unByKey = function (key) {
  if (Array.isArray(key)) {
    for (var i = 0, ii = key.length; i < ii; ++i) {
      _events2.default.unlistenByKey(key[i]);
    }
  } else {
    _events2.default.unlistenByKey( /** @type {ol.EventsKey} */key);
  }
};

/**
 * Increases the revision counter and dispatches a 'change' event.
 * @api
 */
_ol_Observable_.prototype.changed = function () {
  ++this.revision_;
  this.dispatchEvent(_eventtype2.default.CHANGE);
};

/**
 * Dispatches an event and calls all listeners listening for events
 * of this type. The event parameter can either be a string or an
 * Object with a `type` property.
 *
 * @param {{type: string,
 *     target: (EventTarget|ol.events.EventTarget|undefined)}|ol.events.Event|
 *     string} event Event object.
 * @function
 * @api
 */
_ol_Observable_.prototype.dispatchEvent;

/**
 * Get the version number for this object.  Each time the object is modified,
 * its version number will be incremented.
 * @return {number} Revision.
 * @api
 */
_ol_Observable_.prototype.getRevision = function () {
  return this.revision_;
};

/**
 * Listen for a certain type of event.
 * @param {string|Array.<string>} type The event type or array of event types.
 * @param {function(?): ?} listener The listener function.
 * @param {Object=} opt_this The object to use as `this` in `listener`.
 * @return {ol.EventsKey|Array.<ol.EventsKey>} Unique key for the listener. If
 *     called with an array of event types as the first argument, the return
 *     will be an array of keys.
 * @api
 */
_ol_Observable_.prototype.on = function (type, listener, opt_this) {
  if (Array.isArray(type)) {
    var len = type.length;
    var keys = new Array(len);
    for (var i = 0; i < len; ++i) {
      keys[i] = _events2.default.listen(this, type[i], listener, opt_this);
    }
    return keys;
  } else {
    return _events2.default.listen(this, /** @type {string} */type, listener, opt_this);
  }
};

/**
 * Listen once for a certain type of event.
 * @param {string|Array.<string>} type The event type or array of event types.
 * @param {function(?): ?} listener The listener function.
 * @param {Object=} opt_this The object to use as `this` in `listener`.
 * @return {ol.EventsKey|Array.<ol.EventsKey>} Unique key for the listener. If
 *     called with an array of event types as the first argument, the return
 *     will be an array of keys.
 * @api
 */
_ol_Observable_.prototype.once = function (type, listener, opt_this) {
  if (Array.isArray(type)) {
    var len = type.length;
    var keys = new Array(len);
    for (var i = 0; i < len; ++i) {
      keys[i] = _events2.default.listenOnce(this, type[i], listener, opt_this);
    }
    return keys;
  } else {
    return _events2.default.listenOnce(this, /** @type {string} */type, listener, opt_this);
  }
};

/**
 * Unlisten for a certain type of event.
 * @param {string|Array.<string>} type The event type or array of event types.
 * @param {function(?): ?} listener The listener function.
 * @param {Object=} opt_this The object which was used as `this` by the
 * `listener`.
 * @api
 */
_ol_Observable_.prototype.un = function (type, listener, opt_this) {
  if (Array.isArray(type)) {
    for (var i = 0, ii = type.length; i < ii; ++i) {
      _events2.default.unlisten(this, type[i], listener, opt_this);
    }
    return;
  } else {
    _events2.default.unlisten(this, /** @type {string} */type, listener, opt_this);
  }
};
exports.default = _ol_Observable_;

},{"./events.js":42,"./events/eventtarget.js":44,"./events/eventtype.js":45,"./index.js":57}],63:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('./index.js');

var _index2 = _interopRequireDefault(_index);

var _sphere = require('./sphere.js');

var _sphere2 = _interopRequireDefault(_sphere);

var _extent = require('./extent.js');

var _extent2 = _interopRequireDefault(_extent);

var _math = require('./math.js');

var _math2 = _interopRequireDefault(_math);

var _epsg = require('./proj/epsg3857.js');

var _epsg2 = _interopRequireDefault(_epsg);

var _epsg3 = require('./proj/epsg4326.js');

var _epsg4 = _interopRequireDefault(_epsg3);

var _projection = require('./proj/projection.js');

var _projection2 = _interopRequireDefault(_projection);

var _units = require('./proj/units.js');

var _units2 = _interopRequireDefault(_units);

var _proj = require('./proj/proj4.js');

var _proj2 = _interopRequireDefault(_proj);

var _projections = require('./proj/projections.js');

var _projections2 = _interopRequireDefault(_projections);

var _transforms = require('./proj/transforms.js');

var _transforms2 = _interopRequireDefault(_transforms);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var _ol_proj_ = {};

/**
 * Meters per unit lookup table.
 * @const
 * @type {Object.<ol.proj.Units, number>}
 * @api
 */
_ol_proj_.METERS_PER_UNIT = _units2.default.METERS_PER_UNIT;

/**
 * A place to store the mean radius of the Earth.
 * @private
 * @type {ol.Sphere}
 */
_ol_proj_.SPHERE_ = new _sphere2.default(_sphere2.default.DEFAULT_RADIUS);

if (_index2.default.ENABLE_PROJ4JS) {
  /**
   * Register proj4. If not explicitly registered, it will be assumed that
   * proj4js will be loaded in the global namespace. For example in a
   * browserify ES6 environment you could use:
   *
   *     import ol from 'openlayers';
   *     import proj4 from 'proj4';
   *     ol.proj.setProj4(proj4);
   *
   * @param {Proj4} proj4 Proj4.
   * @api
   */
  _ol_proj_.setProj4 = function (proj4) {
    _proj2.default.set(proj4);
  };
}

/**
 * Get the resolution of the point in degrees or distance units.
 * For projections with degrees as the unit this will simply return the
 * provided resolution. For other projections the point resolution is
 * by default estimated by transforming the 'point' pixel to EPSG:4326,
 * measuring its width and height on the normal sphere,
 * and taking the average of the width and height.
 * A custom function can be provided for a specific projection, either
 * by setting the `getPointResolution` option in the
 * {@link ol.proj.Projection} constructor or by using
 * {@link ol.proj.Projection#setGetPointResolution} to change an existing
 * projection object.
 * @param {ol.ProjectionLike} projection The projection.
 * @param {number} resolution Nominal resolution in projection units.
 * @param {ol.Coordinate} point Point to find adjusted resolution at.
 * @param {ol.proj.Units=} opt_units Units to get the point resolution in.
 * Default is the projection's units.
 * @return {number} Point resolution.
 * @api
 */
_ol_proj_.getPointResolution = function (projection, resolution, point, opt_units) {
  projection = _ol_proj_.get(projection);
  var pointResolution;
  var getter = projection.getPointResolutionFunc();
  if (getter) {
    pointResolution = getter(resolution, point);
  } else {
    var units = projection.getUnits();
    if (units == _units2.default.DEGREES && !opt_units || opt_units == _units2.default.DEGREES) {
      pointResolution = resolution;
    } else {
      // Estimate point resolution by transforming the center pixel to EPSG:4326,
      // measuring its width and height on the normal sphere, and taking the
      // average of the width and height.
      var toEPSG4326 = _ol_proj_.getTransformFromProjections(projection, _ol_proj_.get('EPSG:4326'));
      var vertices = [point[0] - resolution / 2, point[1], point[0] + resolution / 2, point[1], point[0], point[1] - resolution / 2, point[0], point[1] + resolution / 2];
      vertices = toEPSG4326(vertices, vertices, 2);
      var width = _ol_proj_.SPHERE_.haversineDistance(vertices.slice(0, 2), vertices.slice(2, 4));
      var height = _ol_proj_.SPHERE_.haversineDistance(vertices.slice(4, 6), vertices.slice(6, 8));
      pointResolution = (width + height) / 2;
      var metersPerUnit = opt_units ? _units2.default.METERS_PER_UNIT[opt_units] : projection.getMetersPerUnit();
      if (metersPerUnit !== undefined) {
        pointResolution /= metersPerUnit;
      }
    }
  }
  return pointResolution;
};

/**
 * Registers transformation functions that don't alter coordinates. Those allow
 * to transform between projections with equal meaning.
 *
 * @param {Array.<ol.proj.Projection>} projections Projections.
 * @api
 */
_ol_proj_.addEquivalentProjections = function (projections) {
  _ol_proj_.addProjections(projections);
  projections.forEach(function (source) {
    projections.forEach(function (destination) {
      if (source !== destination) {
        _transforms2.default.add(source, destination, _ol_proj_.cloneTransform);
      }
    });
  });
};

/**
 * Registers transformation functions to convert coordinates in any projection
 * in projection1 to any projection in projection2.
 *
 * @param {Array.<ol.proj.Projection>} projections1 Projections with equal
 *     meaning.
 * @param {Array.<ol.proj.Projection>} projections2 Projections with equal
 *     meaning.
 * @param {ol.TransformFunction} forwardTransform Transformation from any
 *   projection in projection1 to any projection in projection2.
 * @param {ol.TransformFunction} inverseTransform Transform from any projection
 *   in projection2 to any projection in projection1..
 */
_ol_proj_.addEquivalentTransforms = function (projections1, projections2, forwardTransform, inverseTransform) {
  projections1.forEach(function (projection1) {
    projections2.forEach(function (projection2) {
      _transforms2.default.add(projection1, projection2, forwardTransform);
      _transforms2.default.add(projection2, projection1, inverseTransform);
    });
  });
};

/**
 * Add a Projection object to the list of supported projections that can be
 * looked up by their code.
 *
 * @param {ol.proj.Projection} projection Projection instance.
 * @api
 */
_ol_proj_.addProjection = function (projection) {
  _projections2.default.add(projection.getCode(), projection);
  _transforms2.default.add(projection, projection, _ol_proj_.cloneTransform);
};

/**
 * @param {Array.<ol.proj.Projection>} projections Projections.
 */
_ol_proj_.addProjections = function (projections) {
  projections.forEach(_ol_proj_.addProjection);
};

/**
 * Clear all cached projections and transforms.
 */
_ol_proj_.clearAllProjections = function () {
  _projections2.default.clear();
  _transforms2.default.clear();
};

/**
 * @param {ol.proj.Projection|string|undefined} projection Projection.
 * @param {string} defaultCode Default code.
 * @return {ol.proj.Projection} Projection.
 */
_ol_proj_.createProjection = function (projection, defaultCode) {
  if (!projection) {
    return _ol_proj_.get(defaultCode);
  } else if (typeof projection === 'string') {
    return _ol_proj_.get(projection);
  } else {
    return (/** @type {ol.proj.Projection} */projection
    );
  }
};

/**
 * Registers coordinate transform functions to convert coordinates between the
 * source projection and the destination projection.
 * The forward and inverse functions convert coordinate pairs; this function
 * converts these into the functions used internally which also handle
 * extents and coordinate arrays.
 *
 * @param {ol.ProjectionLike} source Source projection.
 * @param {ol.ProjectionLike} destination Destination projection.
 * @param {function(ol.Coordinate): ol.Coordinate} forward The forward transform
 *     function (that is, from the source projection to the destination
 *     projection) that takes a {@link ol.Coordinate} as argument and returns
 *     the transformed {@link ol.Coordinate}.
 * @param {function(ol.Coordinate): ol.Coordinate} inverse The inverse transform
 *     function (that is, from the destination projection to the source
 *     projection) that takes a {@link ol.Coordinate} as argument and returns
 *     the transformed {@link ol.Coordinate}.
 * @api
 */
_ol_proj_.addCoordinateTransforms = function (source, destination, forward, inverse) {
  var sourceProj = _ol_proj_.get(source);
  var destProj = _ol_proj_.get(destination);
  _transforms2.default.add(sourceProj, destProj, _ol_proj_.createTransformFromCoordinateTransform(forward));
  _transforms2.default.add(destProj, sourceProj, _ol_proj_.createTransformFromCoordinateTransform(inverse));
};

/**
 * Creates a {@link ol.TransformFunction} from a simple 2D coordinate transform
 * function.
 * @param {function(ol.Coordinate): ol.Coordinate} transform Coordinate
 *     transform.
 * @return {ol.TransformFunction} Transform function.
 */
_ol_proj_.createTransformFromCoordinateTransform = function (transform) {
  return (
    /**
     * @param {Array.<number>} input Input.
     * @param {Array.<number>=} opt_output Output.
     * @param {number=} opt_dimension Dimension.
     * @return {Array.<number>} Output.
     */
    function (input, opt_output, opt_dimension) {
      var length = input.length;
      var dimension = opt_dimension !== undefined ? opt_dimension : 2;
      var output = opt_output !== undefined ? opt_output : new Array(length);
      var point, i, j;
      for (i = 0; i < length; i += dimension) {
        point = transform([input[i], input[i + 1]]);
        output[i] = point[0];
        output[i + 1] = point[1];
        for (j = dimension - 1; j >= 2; --j) {
          output[i + j] = input[i + j];
        }
      }
      return output;
    }
  );
};

/**
 * Transforms a coordinate from longitude/latitude to a different projection.
 * @param {ol.Coordinate} coordinate Coordinate as longitude and latitude, i.e.
 *     an array with longitude as 1st and latitude as 2nd element.
 * @param {ol.ProjectionLike=} opt_projection Target projection. The
 *     default is Web Mercator, i.e. 'EPSG:3857'.
 * @return {ol.Coordinate} Coordinate projected to the target projection.
 * @api
 */
_ol_proj_.fromLonLat = function (coordinate, opt_projection) {
  return _ol_proj_.transform(coordinate, 'EPSG:4326', opt_projection !== undefined ? opt_projection : 'EPSG:3857');
};

/**
 * Transforms a coordinate to longitude/latitude.
 * @param {ol.Coordinate} coordinate Projected coordinate.
 * @param {ol.ProjectionLike=} opt_projection Projection of the coordinate.
 *     The default is Web Mercator, i.e. 'EPSG:3857'.
 * @return {ol.Coordinate} Coordinate as longitude and latitude, i.e. an array
 *     with longitude as 1st and latitude as 2nd element.
 * @api
 */
_ol_proj_.toLonLat = function (coordinate, opt_projection) {
  var lonLat = _ol_proj_.transform(coordinate, opt_projection !== undefined ? opt_projection : 'EPSG:3857', 'EPSG:4326');
  var lon = lonLat[0];
  if (lon < -180 || lon > 180) {
    lonLat[0] = _math2.default.modulo(lon + 180, 360) - 180;
  }
  return lonLat;
};

/**
 * Fetches a Projection object for the code specified.
 *
 * @param {ol.ProjectionLike} projectionLike Either a code string which is
 *     a combination of authority and identifier such as "EPSG:4326", or an
 *     existing projection object, or undefined.
 * @return {ol.proj.Projection} Projection object, or null if not in list.
 * @api
 */
_ol_proj_.get = function (projectionLike) {
  var projection = null;
  if (projectionLike instanceof _projection2.default) {
    projection = projectionLike;
  } else if (typeof projectionLike === 'string') {
    var code = projectionLike;
    projection = _projections2.default.get(code);
    if (_index2.default.ENABLE_PROJ4JS && !projection) {
      var proj4js = _proj2.default.get();
      if (typeof proj4js == 'function' && proj4js.defs(code) !== undefined) {
        projection = new _projection2.default({ code: code });
        _ol_proj_.addProjection(projection);
      }
    }
  }
  return projection;
};

/**
 * Checks if two projections are the same, that is every coordinate in one
 * projection does represent the same geographic point as the same coordinate in
 * the other projection.
 *
 * @param {ol.proj.Projection} projection1 Projection 1.
 * @param {ol.proj.Projection} projection2 Projection 2.
 * @return {boolean} Equivalent.
 * @api
 */
_ol_proj_.equivalent = function (projection1, projection2) {
  if (projection1 === projection2) {
    return true;
  }
  var equalUnits = projection1.getUnits() === projection2.getUnits();
  if (projection1.getCode() === projection2.getCode()) {
    return equalUnits;
  } else {
    var transformFn = _ol_proj_.getTransformFromProjections(projection1, projection2);
    return transformFn === _ol_proj_.cloneTransform && equalUnits;
  }
};

/**
 * Given the projection-like objects, searches for a transformation
 * function to convert a coordinates array from the source projection to the
 * destination projection.
 *
 * @param {ol.ProjectionLike} source Source.
 * @param {ol.ProjectionLike} destination Destination.
 * @return {ol.TransformFunction} Transform function.
 * @api
 */
_ol_proj_.getTransform = function (source, destination) {
  var sourceProjection = _ol_proj_.get(source);
  var destinationProjection = _ol_proj_.get(destination);
  return _ol_proj_.getTransformFromProjections(sourceProjection, destinationProjection);
};

/**
 * Searches in the list of transform functions for the function for converting
 * coordinates from the source projection to the destination projection.
 *
 * @param {ol.proj.Projection} sourceProjection Source Projection object.
 * @param {ol.proj.Projection} destinationProjection Destination Projection
 *     object.
 * @return {ol.TransformFunction} Transform function.
 */
_ol_proj_.getTransformFromProjections = function (sourceProjection, destinationProjection) {
  var sourceCode = sourceProjection.getCode();
  var destinationCode = destinationProjection.getCode();
  var transform = _transforms2.default.get(sourceCode, destinationCode);
  if (_index2.default.ENABLE_PROJ4JS && !transform) {
    var proj4js = _proj2.default.get();
    if (typeof proj4js == 'function') {
      var sourceDef = proj4js.defs(sourceCode);
      var destinationDef = proj4js.defs(destinationCode);

      if (sourceDef !== undefined && destinationDef !== undefined) {
        if (sourceDef === destinationDef) {
          _ol_proj_.addEquivalentProjections([destinationProjection, sourceProjection]);
        } else {
          var proj4Transform = proj4js(destinationCode, sourceCode);
          _ol_proj_.addCoordinateTransforms(destinationProjection, sourceProjection, proj4Transform.forward, proj4Transform.inverse);
        }
        transform = _transforms2.default.get(sourceCode, destinationCode);
      }
    }
  }
  if (!transform) {
    transform = _ol_proj_.identityTransform;
  }
  return transform;
};

/**
 * @param {Array.<number>} input Input coordinate array.
 * @param {Array.<number>=} opt_output Output array of coordinate values.
 * @param {number=} opt_dimension Dimension.
 * @return {Array.<number>} Input coordinate array (same array as input).
 */
_ol_proj_.identityTransform = function (input, opt_output, opt_dimension) {
  if (opt_output !== undefined && input !== opt_output) {
    for (var i = 0, ii = input.length; i < ii; ++i) {
      opt_output[i] = input[i];
    }
    input = opt_output;
  }
  return input;
};

/**
 * @param {Array.<number>} input Input coordinate array.
 * @param {Array.<number>=} opt_output Output array of coordinate values.
 * @param {number=} opt_dimension Dimension.
 * @return {Array.<number>} Output coordinate array (new array, same coordinate
 *     values).
 */
_ol_proj_.cloneTransform = function (input, opt_output, opt_dimension) {
  var output;
  if (opt_output !== undefined) {
    for (var i = 0, ii = input.length; i < ii; ++i) {
      opt_output[i] = input[i];
    }
    output = opt_output;
  } else {
    output = input.slice();
  }
  return output;
};

/**
 * Transforms a coordinate from source projection to destination projection.
 * This returns a new coordinate (and does not modify the original).
 *
 * See {@link ol.proj.transformExtent} for extent transformation.
 * See the transform method of {@link ol.geom.Geometry} and its subclasses for
 * geometry transforms.
 *
 * @param {ol.Coordinate} coordinate Coordinate.
 * @param {ol.ProjectionLike} source Source projection-like.
 * @param {ol.ProjectionLike} destination Destination projection-like.
 * @return {ol.Coordinate} Coordinate.
 * @api
 */
_ol_proj_.transform = function (coordinate, source, destination) {
  var transformFn = _ol_proj_.getTransform(source, destination);
  return transformFn(coordinate, undefined, coordinate.length);
};

/**
 * Transforms an extent from source projection to destination projection.  This
 * returns a new extent (and does not modify the original).
 *
 * @param {ol.Extent} extent The extent to transform.
 * @param {ol.ProjectionLike} source Source projection-like.
 * @param {ol.ProjectionLike} destination Destination projection-like.
 * @return {ol.Extent} The transformed extent.
 * @api
 */
_ol_proj_.transformExtent = function (extent, source, destination) {
  var transformFn = _ol_proj_.getTransform(source, destination);
  return _extent2.default.applyTransform(extent, transformFn);
};

/**
 * Transforms the given point to the destination projection.
 *
 * @param {ol.Coordinate} point Point.
 * @param {ol.proj.Projection} sourceProjection Source projection.
 * @param {ol.proj.Projection} destinationProjection Destination projection.
 * @return {ol.Coordinate} Point.
 */
_ol_proj_.transformWithProjections = function (point, sourceProjection, destinationProjection) {
  var transformFn = _ol_proj_.getTransformFromProjections(sourceProjection, destinationProjection);
  return transformFn(point);
};

/**
 * Add transforms to and from EPSG:4326 and EPSG:3857.  This function is called
 * by when this module is executed and should only need to be called again after
 * `ol.proj.clearAllProjections()` is called (e.g. in tests).
 */
_ol_proj_.addCommon = function () {
  // Add transformations that don't alter coordinates to convert within set of
  // projections with equal meaning.
  _ol_proj_.addEquivalentProjections(_epsg2.default.PROJECTIONS);
  _ol_proj_.addEquivalentProjections(_epsg4.default.PROJECTIONS);
  // Add transformations to convert EPSG:4326 like coordinates to EPSG:3857 like
  // coordinates and back.
  _ol_proj_.addEquivalentTransforms(_epsg4.default.PROJECTIONS, _epsg2.default.PROJECTIONS, _epsg2.default.fromEPSG4326, _epsg2.default.toEPSG4326);
};

_ol_proj_.addCommon();
exports.default = _ol_proj_;

},{"./extent.js":46,"./index.js":57,"./math.js":58,"./proj/epsg3857.js":64,"./proj/epsg4326.js":65,"./proj/proj4.js":66,"./proj/projection.js":67,"./proj/projections.js":68,"./proj/transforms.js":69,"./proj/units.js":70,"./sphere.js":71}],64:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('../index.js');

var _index2 = _interopRequireDefault(_index);

var _math = require('../math.js');

var _math2 = _interopRequireDefault(_math);

var _projection = require('../proj/projection.js');

var _projection2 = _interopRequireDefault(_projection);

var _units = require('../proj/units.js');

var _units2 = _interopRequireDefault(_units);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var _ol_proj_EPSG3857_ = {};

/**
 * @classdesc
 * Projection object for web/spherical Mercator (EPSG:3857).
 *
 * @constructor
 * @extends {ol.proj.Projection}
 * @param {string} code Code.
 * @private
 */
_ol_proj_EPSG3857_.Projection_ = function (code) {
  _projection2.default.call(this, {
    code: code,
    units: _units2.default.METERS,
    extent: _ol_proj_EPSG3857_.EXTENT,
    global: true,
    worldExtent: _ol_proj_EPSG3857_.WORLD_EXTENT,
    getPointResolution: function getPointResolution(resolution, point) {
      return resolution / _math2.default.cosh(point[1] / _ol_proj_EPSG3857_.RADIUS);
    }
  });
};
_index2.default.inherits(_ol_proj_EPSG3857_.Projection_, _projection2.default);

/**
 * Radius of WGS84 sphere
 *
 * @const
 * @type {number}
 */
_ol_proj_EPSG3857_.RADIUS = 6378137;

/**
 * @const
 * @type {number}
 */
_ol_proj_EPSG3857_.HALF_SIZE = Math.PI * _ol_proj_EPSG3857_.RADIUS;

/**
 * @const
 * @type {ol.Extent}
 */
_ol_proj_EPSG3857_.EXTENT = [-_ol_proj_EPSG3857_.HALF_SIZE, -_ol_proj_EPSG3857_.HALF_SIZE, _ol_proj_EPSG3857_.HALF_SIZE, _ol_proj_EPSG3857_.HALF_SIZE];

/**
 * @const
 * @type {ol.Extent}
 */
_ol_proj_EPSG3857_.WORLD_EXTENT = [-180, -85, 180, 85];

/**
 * Projections equal to EPSG:3857.
 *
 * @const
 * @type {Array.<ol.proj.Projection>}
 */
_ol_proj_EPSG3857_.PROJECTIONS = [new _ol_proj_EPSG3857_.Projection_('EPSG:3857'), new _ol_proj_EPSG3857_.Projection_('EPSG:102100'), new _ol_proj_EPSG3857_.Projection_('EPSG:102113'), new _ol_proj_EPSG3857_.Projection_('EPSG:900913'), new _ol_proj_EPSG3857_.Projection_('urn:ogc:def:crs:EPSG:6.18:3:3857'), new _ol_proj_EPSG3857_.Projection_('urn:ogc:def:crs:EPSG::3857'), new _ol_proj_EPSG3857_.Projection_('http://www.opengis.net/gml/srs/epsg.xml#3857')];

/**
 * Transformation from EPSG:4326 to EPSG:3857.
 *
 * @param {Array.<number>} input Input array of coordinate values.
 * @param {Array.<number>=} opt_output Output array of coordinate values.
 * @param {number=} opt_dimension Dimension (default is `2`).
 * @return {Array.<number>} Output array of coordinate values.
 */
_ol_proj_EPSG3857_.fromEPSG4326 = function (input, opt_output, opt_dimension) {
  var length = input.length,
      dimension = opt_dimension > 1 ? opt_dimension : 2,
      output = opt_output;
  if (output === undefined) {
    if (dimension > 2) {
      // preserve values beyond second dimension
      output = input.slice();
    } else {
      output = new Array(length);
    }
  }
  var halfSize = _ol_proj_EPSG3857_.HALF_SIZE;
  for (var i = 0; i < length; i += dimension) {
    output[i] = halfSize * input[i] / 180;
    var y = _ol_proj_EPSG3857_.RADIUS * Math.log(Math.tan(Math.PI * (input[i + 1] + 90) / 360));
    if (y > halfSize) {
      y = halfSize;
    } else if (y < -halfSize) {
      y = -halfSize;
    }
    output[i + 1] = y;
  }
  return output;
};

/**
 * Transformation from EPSG:3857 to EPSG:4326.
 *
 * @param {Array.<number>} input Input array of coordinate values.
 * @param {Array.<number>=} opt_output Output array of coordinate values.
 * @param {number=} opt_dimension Dimension (default is `2`).
 * @return {Array.<number>} Output array of coordinate values.
 */
_ol_proj_EPSG3857_.toEPSG4326 = function (input, opt_output, opt_dimension) {
  var length = input.length,
      dimension = opt_dimension > 1 ? opt_dimension : 2,
      output = opt_output;
  if (output === undefined) {
    if (dimension > 2) {
      // preserve values beyond second dimension
      output = input.slice();
    } else {
      output = new Array(length);
    }
  }
  for (var i = 0; i < length; i += dimension) {
    output[i] = 180 * input[i] / _ol_proj_EPSG3857_.HALF_SIZE;
    output[i + 1] = 360 * Math.atan(Math.exp(input[i + 1] / _ol_proj_EPSG3857_.RADIUS)) / Math.PI - 90;
  }
  return output;
};
exports.default = _ol_proj_EPSG3857_;

},{"../index.js":57,"../math.js":58,"../proj/projection.js":67,"../proj/units.js":70}],65:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('../index.js');

var _index2 = _interopRequireDefault(_index);

var _projection = require('../proj/projection.js');

var _projection2 = _interopRequireDefault(_projection);

var _units = require('../proj/units.js');

var _units2 = _interopRequireDefault(_units);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var _ol_proj_EPSG4326_ = {};

/**
 * @classdesc
 * Projection object for WGS84 geographic coordinates (EPSG:4326).
 *
 * Note that OpenLayers does not strictly comply with the EPSG definition.
 * The EPSG registry defines 4326 as a CRS for Latitude,Longitude (y,x).
 * OpenLayers treats EPSG:4326 as a pseudo-projection, with x,y coordinates.
 *
 * @constructor
 * @extends {ol.proj.Projection}
 * @param {string} code Code.
 * @param {string=} opt_axisOrientation Axis orientation.
 * @private
 */
_ol_proj_EPSG4326_.Projection_ = function (code, opt_axisOrientation) {
  _projection2.default.call(this, {
    code: code,
    units: _units2.default.DEGREES,
    extent: _ol_proj_EPSG4326_.EXTENT,
    axisOrientation: opt_axisOrientation,
    global: true,
    metersPerUnit: _ol_proj_EPSG4326_.METERS_PER_UNIT,
    worldExtent: _ol_proj_EPSG4326_.EXTENT
  });
};
_index2.default.inherits(_ol_proj_EPSG4326_.Projection_, _projection2.default);

/**
 * Radius of WGS84 sphere
 *
 * @const
 * @type {number}
 */
_ol_proj_EPSG4326_.RADIUS = 6378137;

/**
 * Extent of the EPSG:4326 projection which is the whole world.
 *
 * @const
 * @type {ol.Extent}
 */
_ol_proj_EPSG4326_.EXTENT = [-180, -90, 180, 90];

/**
 * @const
 * @type {number}
 */
_ol_proj_EPSG4326_.METERS_PER_UNIT = Math.PI * _ol_proj_EPSG4326_.RADIUS / 180;

/**
 * Projections equal to EPSG:4326.
 *
 * @const
 * @type {Array.<ol.proj.Projection>}
 */
_ol_proj_EPSG4326_.PROJECTIONS = [new _ol_proj_EPSG4326_.Projection_('CRS:84'), new _ol_proj_EPSG4326_.Projection_('EPSG:4326', 'neu'), new _ol_proj_EPSG4326_.Projection_('urn:ogc:def:crs:EPSG::4326', 'neu'), new _ol_proj_EPSG4326_.Projection_('urn:ogc:def:crs:EPSG:6.6:4326', 'neu'), new _ol_proj_EPSG4326_.Projection_('urn:ogc:def:crs:OGC:1.3:CRS84'), new _ol_proj_EPSG4326_.Projection_('urn:ogc:def:crs:OGC:2:84'), new _ol_proj_EPSG4326_.Projection_('http://www.opengis.net/gml/srs/epsg.xml#4326', 'neu'), new _ol_proj_EPSG4326_.Projection_('urn:x-ogc:def:crs:EPSG:4326', 'neu')];
exports.default = _ol_proj_EPSG4326_;

},{"../index.js":57,"../proj/projection.js":67,"../proj/units.js":70}],66:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _ol_proj_proj4_ = {};

/**
 * @private
 * @type {Proj4}
 */
_ol_proj_proj4_.cache_ = null;

/**
 * Store the proj4 function.
 * @param {Proj4} proj4 The proj4 function.
 */
_ol_proj_proj4_.set = function (proj4) {
  _ol_proj_proj4_.cache_ = proj4;
};

/**
 * Get proj4.
 * @return {Proj4} The proj4 function set above or available globally.
 */
_ol_proj_proj4_.get = function () {
  return _ol_proj_proj4_.cache_ || window['proj4'];
};
exports.default = _ol_proj_proj4_;

},{}],67:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('../index.js');

var _index2 = _interopRequireDefault(_index);

var _units = require('../proj/units.js');

var _units2 = _interopRequireDefault(_units);

var _proj = require('../proj/proj4.js');

var _proj2 = _interopRequireDefault(_proj);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @classdesc
 * Projection definition class. One of these is created for each projection
 * supported in the application and stored in the {@link ol.proj} namespace.
 * You can use these in applications, but this is not required, as API params
 * and options use {@link ol.ProjectionLike} which means the simple string
 * code will suffice.
 *
 * You can use {@link ol.proj.get} to retrieve the object for a particular
 * projection.
 *
 * The library includes definitions for `EPSG:4326` and `EPSG:3857`, together
 * with the following aliases:
 * * `EPSG:4326`: CRS:84, urn:ogc:def:crs:EPSG:6.6:4326,
 *     urn:ogc:def:crs:OGC:1.3:CRS84, urn:ogc:def:crs:OGC:2:84,
 *     http://www.opengis.net/gml/srs/epsg.xml#4326,
 *     urn:x-ogc:def:crs:EPSG:4326
 * * `EPSG:3857`: EPSG:102100, EPSG:102113, EPSG:900913,
 *     urn:ogc:def:crs:EPSG:6.18:3:3857,
 *     http://www.opengis.net/gml/srs/epsg.xml#3857
 *
 * If you use proj4js, aliases can be added using `proj4.defs()`; see
 * [documentation](https://github.com/proj4js/proj4js). To set an alternative
 * namespace for proj4, use {@link ol.proj.setProj4}.
 *
 * @constructor
 * @param {olx.ProjectionOptions} options Projection options.
 * @struct
 * @api
 */
var _ol_proj_Projection_ = function _ol_proj_Projection_(options) {
  /**
   * @private
   * @type {string}
   */
  this.code_ = options.code;

  /**
   * Units of projected coordinates. When set to `ol.proj.Units.TILE_PIXELS`, a
   * `this.extent_` and `this.worldExtent_` must be configured properly for each
   * tile.
   * @private
   * @type {ol.proj.Units}
   */
  this.units_ = /** @type {ol.proj.Units} */options.units;

  /**
   * Validity extent of the projection in projected coordinates. For projections
   * with `ol.proj.Units.TILE_PIXELS` units, this is the extent of the tile in
   * tile pixel space.
   * @private
   * @type {ol.Extent}
   */
  this.extent_ = options.extent !== undefined ? options.extent : null;

  /**
   * Extent of the world in EPSG:4326. For projections with
   * `ol.proj.Units.TILE_PIXELS` units, this is the extent of the tile in
   * projected coordinate space.
   * @private
   * @type {ol.Extent}
   */
  this.worldExtent_ = options.worldExtent !== undefined ? options.worldExtent : null;

  /**
   * @private
   * @type {string}
   */
  this.axisOrientation_ = options.axisOrientation !== undefined ? options.axisOrientation : 'enu';

  /**
   * @private
   * @type {boolean}
   */
  this.global_ = options.global !== undefined ? options.global : false;

  /**
   * @private
   * @type {boolean}
   */
  this.canWrapX_ = !!(this.global_ && this.extent_);

  /**
   * @private
   * @type {function(number, ol.Coordinate):number|undefined}
   */
  this.getPointResolutionFunc_ = options.getPointResolution;

  /**
   * @private
   * @type {ol.tilegrid.TileGrid}
   */
  this.defaultTileGrid_ = null;

  /**
   * @private
   * @type {number|undefined}
   */
  this.metersPerUnit_ = options.metersPerUnit;

  var code = options.code;
  if (_index2.default.ENABLE_PROJ4JS) {
    var proj4js = _proj2.default.get();
    if (typeof proj4js == 'function') {
      var def = proj4js.defs(code);
      if (def !== undefined) {
        if (def.axis !== undefined && options.axisOrientation === undefined) {
          this.axisOrientation_ = def.axis;
        }
        if (options.metersPerUnit === undefined) {
          this.metersPerUnit_ = def.to_meter;
        }
        if (options.units === undefined) {
          this.units_ = def.units;
        }
      }
    }
  }
};

/**
 * @return {boolean} The projection is suitable for wrapping the x-axis
 */
_ol_proj_Projection_.prototype.canWrapX = function () {
  return this.canWrapX_;
};

/**
 * Get the code for this projection, e.g. 'EPSG:4326'.
 * @return {string} Code.
 * @api
 */
_ol_proj_Projection_.prototype.getCode = function () {
  return this.code_;
};

/**
 * Get the validity extent for this projection.
 * @return {ol.Extent} Extent.
 * @api
 */
_ol_proj_Projection_.prototype.getExtent = function () {
  return this.extent_;
};

/**
 * Get the units of this projection.
 * @return {ol.proj.Units} Units.
 * @api
 */
_ol_proj_Projection_.prototype.getUnits = function () {
  return this.units_;
};

/**
 * Get the amount of meters per unit of this projection.  If the projection is
 * not configured with `metersPerUnit` or a units identifier, the return is
 * `undefined`.
 * @return {number|undefined} Meters.
 * @api
 */
_ol_proj_Projection_.prototype.getMetersPerUnit = function () {
  return this.metersPerUnit_ || _units2.default.METERS_PER_UNIT[this.units_];
};

/**
 * Get the world extent for this projection.
 * @return {ol.Extent} Extent.
 * @api
 */
_ol_proj_Projection_.prototype.getWorldExtent = function () {
  return this.worldExtent_;
};

/**
 * Get the axis orientation of this projection.
 * Example values are:
 * enu - the default easting, northing, elevation.
 * neu - northing, easting, up - useful for "lat/long" geographic coordinates,
 *     or south orientated transverse mercator.
 * wnu - westing, northing, up - some planetary coordinate systems have
 *     "west positive" coordinate systems
 * @return {string} Axis orientation.
 */
_ol_proj_Projection_.prototype.getAxisOrientation = function () {
  return this.axisOrientation_;
};

/**
 * Is this projection a global projection which spans the whole world?
 * @return {boolean} Whether the projection is global.
 * @api
 */
_ol_proj_Projection_.prototype.isGlobal = function () {
  return this.global_;
};

/**
* Set if the projection is a global projection which spans the whole world
* @param {boolean} global Whether the projection is global.
* @api
*/
_ol_proj_Projection_.prototype.setGlobal = function (global) {
  this.global_ = global;
  this.canWrapX_ = !!(global && this.extent_);
};

/**
 * @return {ol.tilegrid.TileGrid} The default tile grid.
 */
_ol_proj_Projection_.prototype.getDefaultTileGrid = function () {
  return this.defaultTileGrid_;
};

/**
 * @param {ol.tilegrid.TileGrid} tileGrid The default tile grid.
 */
_ol_proj_Projection_.prototype.setDefaultTileGrid = function (tileGrid) {
  this.defaultTileGrid_ = tileGrid;
};

/**
 * Set the validity extent for this projection.
 * @param {ol.Extent} extent Extent.
 * @api
 */
_ol_proj_Projection_.prototype.setExtent = function (extent) {
  this.extent_ = extent;
  this.canWrapX_ = !!(this.global_ && extent);
};

/**
 * Set the world extent for this projection.
 * @param {ol.Extent} worldExtent World extent
 *     [minlon, minlat, maxlon, maxlat].
 * @api
 */
_ol_proj_Projection_.prototype.setWorldExtent = function (worldExtent) {
  this.worldExtent_ = worldExtent;
};

/**
 * Set the getPointResolution function (see {@link ol.proj#getPointResolution}
 * for this projection.
 * @param {function(number, ol.Coordinate):number} func Function
 * @api
 */
_ol_proj_Projection_.prototype.setGetPointResolution = function (func) {
  this.getPointResolutionFunc_ = func;
};

/**
 * Get the custom point resolution function for this projection (if set).
 * @return {function(number, ol.Coordinate):number|undefined} The custom point
 * resolution function (if set).
 */
_ol_proj_Projection_.prototype.getPointResolutionFunc = function () {
  return this.getPointResolutionFunc_;
};
exports.default = _ol_proj_Projection_;

},{"../index.js":57,"../proj/proj4.js":66,"../proj/units.js":70}],68:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _ol_proj_projections_ = {};

/**
 * @private
 * @type {Object.<string, ol.proj.Projection>}
 */
_ol_proj_projections_.cache_ = {};

/**
 * Clear the projections cache.
 */
_ol_proj_projections_.clear = function () {
  _ol_proj_projections_.cache_ = {};
};

/**
 * Get a cached projection by code.
 * @param {string} code The code for the projection.
 * @return {ol.proj.Projection} The projection (if cached).
 */
_ol_proj_projections_.get = function (code) {
  var projections = _ol_proj_projections_.cache_;
  return projections[code] || null;
};

/**
 * Add a projection to the cache.
 * @param {string} code The projection code.
 * @param {ol.proj.Projection} projection The projection to cache.
 */
_ol_proj_projections_.add = function (code, projection) {
  var projections = _ol_proj_projections_.cache_;
  projections[code] = projection;
};
exports.default = _ol_proj_projections_;

},{}],69:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _obj = require('../obj.js');

var _obj2 = _interopRequireDefault(_obj);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var _ol_proj_transforms_ = {};

/**
 * @private
 * @type {Object.<string, Object.<string, ol.TransformFunction>>}
 */
_ol_proj_transforms_.cache_ = {};

/**
 * Clear the transform cache.
 */
_ol_proj_transforms_.clear = function () {
  _ol_proj_transforms_.cache_ = {};
};

/**
 * Registers a conversion function to convert coordinates from the source
 * projection to the destination projection.
 *
 * @param {ol.proj.Projection} source Source.
 * @param {ol.proj.Projection} destination Destination.
 * @param {ol.TransformFunction} transformFn Transform.
 */
_ol_proj_transforms_.add = function (source, destination, transformFn) {
  var sourceCode = source.getCode();
  var destinationCode = destination.getCode();
  var transforms = _ol_proj_transforms_.cache_;
  if (!(sourceCode in transforms)) {
    transforms[sourceCode] = {};
  }
  transforms[sourceCode][destinationCode] = transformFn;
};

/**
 * Unregisters the conversion function to convert coordinates from the source
 * projection to the destination projection.  This method is used to clean up
 * cached transforms during testing.
 *
 * @param {ol.proj.Projection} source Source projection.
 * @param {ol.proj.Projection} destination Destination projection.
 * @return {ol.TransformFunction} transformFn The unregistered transform.
 */
_ol_proj_transforms_.remove = function (source, destination) {
  var sourceCode = source.getCode();
  var destinationCode = destination.getCode();
  var transforms = _ol_proj_transforms_.cache_;
  var transform = transforms[sourceCode][destinationCode];
  delete transforms[sourceCode][destinationCode];
  if (_obj2.default.isEmpty(transforms[sourceCode])) {
    delete transforms[sourceCode];
  }
  return transform;
};

/**
 * Get a transform given a source code and a destination code.
 * @param {string} sourceCode The code for the source projection.
 * @param {string} destinationCode The code for the destination projection.
 * @return {ol.TransformFunction|undefined} The transform function (if found).
 */
_ol_proj_transforms_.get = function (sourceCode, destinationCode) {
  var transform;
  var transforms = _ol_proj_transforms_.cache_;
  if (sourceCode in transforms && destinationCode in transforms[sourceCode]) {
    transform = transforms[sourceCode][destinationCode];
  }
  return transform;
};
exports.default = _ol_proj_transforms_;

},{"../obj.js":59}],70:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Projection units: `'degrees'`, `'ft'`, `'m'`, `'pixels'`, `'tile-pixels'` or
 * `'us-ft'`.
 * @enum {string}
 */
var _ol_proj_Units_ = {
  DEGREES: 'degrees',
  FEET: 'ft',
  METERS: 'm',
  PIXELS: 'pixels',
  TILE_PIXELS: 'tile-pixels',
  USFEET: 'us-ft'
};

/**
 * Meters per unit lookup table.
 * @const
 * @type {Object.<ol.proj.Units, number>}
 * @api
 */
_ol_proj_Units_.METERS_PER_UNIT = {};
// use the radius of the Normal sphere
_ol_proj_Units_.METERS_PER_UNIT[_ol_proj_Units_.DEGREES] = 2 * Math.PI * 6370997 / 360;
_ol_proj_Units_.METERS_PER_UNIT[_ol_proj_Units_.FEET] = 0.3048;
_ol_proj_Units_.METERS_PER_UNIT[_ol_proj_Units_.METERS] = 1;
_ol_proj_Units_.METERS_PER_UNIT[_ol_proj_Units_.USFEET] = 1200 / 3937;
exports.default = _ol_proj_Units_;

},{}],71:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _math = require('./math.js');

var _math2 = _interopRequireDefault(_math);

var _geometrytype = require('./geom/geometrytype.js');

var _geometrytype2 = _interopRequireDefault(_geometrytype);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @classdesc
 * Class to create objects that can be used with {@link
 * ol.geom.Polygon.circular}.
 *
 * For example to create a sphere whose radius is equal to the semi-major
 * axis of the WGS84 ellipsoid:
 *
 * ```js
 * var wgs84Sphere= new ol.Sphere(6378137);
 * ```
 *
 * @constructor
 * @param {number} radius Radius.
 * @api
 */
/**
 * @license
 * Latitude/longitude spherical geodesy formulae taken from
 * http://www.movable-type.co.uk/scripts/latlong.html
 * Licensed under CC-BY-3.0.
 */

var _ol_Sphere_ = function _ol_Sphere_(radius) {

  /**
   * @type {number}
   */
  this.radius = radius;
};

/**
 * Returns the geodesic area for a list of coordinates.
 *
 * [Reference](https://trs-new.jpl.nasa.gov/handle/2014/40409)
 * Robert. G. Chamberlain and William H. Duquette, "Some Algorithms for
 * Polygons on a Sphere", JPL Publication 07-03, Jet Propulsion
 * Laboratory, Pasadena, CA, June 2007
 *
 * @param {Array.<ol.Coordinate>} coordinates List of coordinates of a linear
 * ring. If the ring is oriented clockwise, the area will be positive,
 * otherwise it will be negative.
 * @return {number} Area.
 * @api
 */
_ol_Sphere_.prototype.geodesicArea = function (coordinates) {
  return _ol_Sphere_.getArea_(coordinates, this.radius);
};

/**
 * Returns the distance from c1 to c2 using the haversine formula.
 *
 * @param {ol.Coordinate} c1 Coordinate 1.
 * @param {ol.Coordinate} c2 Coordinate 2.
 * @return {number} Haversine distance.
 * @api
 */
_ol_Sphere_.prototype.haversineDistance = function (c1, c2) {
  return _ol_Sphere_.getDistance_(c1, c2, this.radius);
};

/**
 * Returns the coordinate at the given distance and bearing from `c1`.
 *
 * @param {ol.Coordinate} c1 The origin point (`[lon, lat]` in degrees).
 * @param {number} distance The great-circle distance between the origin
 *     point and the target point.
 * @param {number} bearing The bearing (in radians).
 * @return {ol.Coordinate} The target point.
 */
_ol_Sphere_.prototype.offset = function (c1, distance, bearing) {
  var lat1 = _math2.default.toRadians(c1[1]);
  var lon1 = _math2.default.toRadians(c1[0]);
  var dByR = distance / this.radius;
  var lat = Math.asin(Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearing));
  var lon = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat1), Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat));
  return [_math2.default.toDegrees(lon), _math2.default.toDegrees(lat)];
};

/**
 * The mean Earth radius (1/3 * (2a + b)) for the WGS84 ellipsoid.
 * https://en.wikipedia.org/wiki/Earth_radius#Mean_radius
 * @type {number}
 */
_ol_Sphere_.DEFAULT_RADIUS = 6371008.8;

/**
 * Get the spherical length of a geometry.  This length is the sum of the
 * great circle distances between coordinates.  For polygons, the length is
 * the sum of all rings.  For points, the length is zero.  For multi-part
 * geometries, the length is the sum of the length of each part.
 * @param {ol.geom.Geometry} geometry A geometry.
 * @param {olx.SphereMetricOptions=} opt_options Options for the length
 *     calculation.  By default, geometries are assumed to be in 'EPSG:3857'.
 *     You can change this by providing a `projection` option.
 * @return {number} The spherical length (in meters).
 * @api
 */
_ol_Sphere_.getLength = function (geometry, opt_options) {
  var options = opt_options || {};
  var radius = options.radius || _ol_Sphere_.DEFAULT_RADIUS;
  var projection = options.projection || 'EPSG:3857';
  geometry = geometry.clone().transform(projection, 'EPSG:4326');
  var type = geometry.getType();
  var length = 0;
  var coordinates, coords, i, ii, j, jj;
  switch (type) {
    case _geometrytype2.default.POINT:
    case _geometrytype2.default.MULTI_POINT:
      {
        break;
      }
    case _geometrytype2.default.LINE_STRING:
    case _geometrytype2.default.LINEAR_RING:
      {
        coordinates = /** @type {ol.geom.SimpleGeometry} */geometry.getCoordinates();
        length = _ol_Sphere_.getLength_(coordinates, radius);
        break;
      }
    case _geometrytype2.default.MULTI_LINE_STRING:
    case _geometrytype2.default.POLYGON:
      {
        coordinates = /** @type {ol.geom.SimpleGeometry} */geometry.getCoordinates();
        for (i = 0, ii = coordinates.length; i < ii; ++i) {
          length += _ol_Sphere_.getLength_(coordinates[i], radius);
        }
        break;
      }
    case _geometrytype2.default.MULTI_POLYGON:
      {
        coordinates = /** @type {ol.geom.SimpleGeometry} */geometry.getCoordinates();
        for (i = 0, ii = coordinates.length; i < ii; ++i) {
          coords = coordinates[i];
          for (j = 0, jj = coords.length; j < jj; ++j) {
            length += _ol_Sphere_.getLength_(coords[j], radius);
          }
        }
        break;
      }
    case _geometrytype2.default.GEOMETRY_COLLECTION:
      {
        var geometries = /** @type {ol.geom.GeometryCollection} */geometry.getGeometries();
        for (i = 0, ii = geometries.length; i < ii; ++i) {
          length += _ol_Sphere_.getLength(geometries[i], opt_options);
        }
        break;
      }
    default:
      {
        throw new Error('Unsupported geometry type: ' + type);
      }
  }
  return length;
};

/**
 * Get the cumulative great circle length of linestring coordinates (geographic).
 * @param {Array} coordinates Linestring coordinates.
 * @param {number} radius The sphere radius to use.
 * @return {number} The length (in meters).
 */
_ol_Sphere_.getLength_ = function (coordinates, radius) {
  var length = 0;
  for (var i = 0, ii = coordinates.length; i < ii - 1; ++i) {
    length += _ol_Sphere_.getDistance_(coordinates[i], coordinates[i + 1], radius);
  }
  return length;
};

/**
 * Get the great circle distance between two geographic coordinates.
 * @param {Array} c1 Starting coordinate.
 * @param {Array} c2 Ending coordinate.
 * @param {number} radius The sphere radius to use.
 * @return {number} The great circle distance between the points (in meters).
 */
_ol_Sphere_.getDistance_ = function (c1, c2, radius) {
  var lat1 = _math2.default.toRadians(c1[1]);
  var lat2 = _math2.default.toRadians(c2[1]);
  var deltaLatBy2 = (lat2 - lat1) / 2;
  var deltaLonBy2 = _math2.default.toRadians(c2[0] - c1[0]) / 2;
  var a = Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) + Math.sin(deltaLonBy2) * Math.sin(deltaLonBy2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Get the spherical area of a geometry.  This is the area (in meters) assuming
 * that polygon edges are segments of great circles on a sphere.
 * @param {ol.geom.Geometry} geometry A geometry.
 * @param {olx.SphereMetricOptions=} opt_options Options for the area
 *     calculation.  By default, geometries are assumed to be in 'EPSG:3857'.
 *     You can change this by providing a `projection` option.
 * @return {number} The spherical area (in square meters).
 * @api
 */
_ol_Sphere_.getArea = function (geometry, opt_options) {
  var options = opt_options || {};
  var radius = options.radius || _ol_Sphere_.DEFAULT_RADIUS;
  var projection = options.projection || 'EPSG:3857';
  geometry = geometry.clone().transform(projection, 'EPSG:4326');
  var type = geometry.getType();
  var area = 0;
  var coordinates, coords, i, ii, j, jj;
  switch (type) {
    case _geometrytype2.default.POINT:
    case _geometrytype2.default.MULTI_POINT:
    case _geometrytype2.default.LINE_STRING:
    case _geometrytype2.default.MULTI_LINE_STRING:
    case _geometrytype2.default.LINEAR_RING:
      {
        break;
      }
    case _geometrytype2.default.POLYGON:
      {
        coordinates = /** @type {ol.geom.Polygon} */geometry.getCoordinates();
        area = Math.abs(_ol_Sphere_.getArea_(coordinates[0], radius));
        for (i = 1, ii = coordinates.length; i < ii; ++i) {
          area -= Math.abs(_ol_Sphere_.getArea_(coordinates[i], radius));
        }
        break;
      }
    case _geometrytype2.default.MULTI_POLYGON:
      {
        coordinates = /** @type {ol.geom.SimpleGeometry} */geometry.getCoordinates();
        for (i = 0, ii = coordinates.length; i < ii; ++i) {
          coords = coordinates[i];
          area += Math.abs(_ol_Sphere_.getArea_(coords[0], radius));
          for (j = 1, jj = coords.length; j < jj; ++j) {
            area -= Math.abs(_ol_Sphere_.getArea_(coords[j], radius));
          }
        }
        break;
      }
    case _geometrytype2.default.GEOMETRY_COLLECTION:
      {
        var geometries = /** @type {ol.geom.GeometryCollection} */geometry.getGeometries();
        for (i = 0, ii = geometries.length; i < ii; ++i) {
          area += _ol_Sphere_.getArea(geometries[i], opt_options);
        }
        break;
      }
    default:
      {
        throw new Error('Unsupported geometry type: ' + type);
      }
  }
  return area;
};

/**
 * Returns the spherical area for a list of coordinates.
 *
 * [Reference](https://trs-new.jpl.nasa.gov/handle/2014/40409)
 * Robert. G. Chamberlain and William H. Duquette, "Some Algorithms for
 * Polygons on a Sphere", JPL Publication 07-03, Jet Propulsion
 * Laboratory, Pasadena, CA, June 2007
 *
 * @param {Array.<ol.Coordinate>} coordinates List of coordinates of a linear
 * ring. If the ring is oriented clockwise, the area will be positive,
 * otherwise it will be negative.
 * @param {number} radius The sphere radius.
 * @return {number} Area (in square meters).
 */
_ol_Sphere_.getArea_ = function (coordinates, radius) {
  var area = 0,
      len = coordinates.length;
  var x1 = coordinates[len - 1][0];
  var y1 = coordinates[len - 1][1];
  for (var i = 0; i < len; i++) {
    var x2 = coordinates[i][0],
        y2 = coordinates[i][1];
    area += _math2.default.toRadians(x2 - x1) * (2 + Math.sin(_math2.default.toRadians(y1)) + Math.sin(_math2.default.toRadians(y2)));
    x1 = x2;
    y1 = y2;
  }
  return area * radius * radius / 2.0;
};
exports.default = _ol_Sphere_;

},{"./geom/geometrytype.js":54,"./math.js":58}],72:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _asserts = require('./asserts.js');

var _asserts2 = _interopRequireDefault(_asserts);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var _ol_transform_ = {};

/**
 * Collection of affine 2d transformation functions. The functions work on an
 * array of 6 elements. The element order is compatible with the [SVGMatrix
 * interface](https://developer.mozilla.org/en-US/docs/Web/API/SVGMatrix) and is
 * a subset (elements a to f) of a 3x3 martrix:
 * ```
 * [ a c e ]
 * [ b d f ]
 * [ 0 0 1 ]
 * ```
 */

/**
 * @private
 * @type {ol.Transform}
 */
_ol_transform_.tmp_ = new Array(6);

/**
 * Create an identity transform.
 * @return {!ol.Transform} Identity transform.
 */
_ol_transform_.create = function () {
  return [1, 0, 0, 1, 0, 0];
};

/**
 * Resets the given transform to an identity transform.
 * @param {!ol.Transform} transform Transform.
 * @return {!ol.Transform} Transform.
 */
_ol_transform_.reset = function (transform) {
  return _ol_transform_.set(transform, 1, 0, 0, 1, 0, 0);
};

/**
 * Multiply the underlying matrices of two transforms and return the result in
 * the first transform.
 * @param {!ol.Transform} transform1 Transform parameters of matrix 1.
 * @param {!ol.Transform} transform2 Transform parameters of matrix 2.
 * @return {!ol.Transform} transform1 multiplied with transform2.
 */
_ol_transform_.multiply = function (transform1, transform2) {
  var a1 = transform1[0];
  var b1 = transform1[1];
  var c1 = transform1[2];
  var d1 = transform1[3];
  var e1 = transform1[4];
  var f1 = transform1[5];
  var a2 = transform2[0];
  var b2 = transform2[1];
  var c2 = transform2[2];
  var d2 = transform2[3];
  var e2 = transform2[4];
  var f2 = transform2[5];

  transform1[0] = a1 * a2 + c1 * b2;
  transform1[1] = b1 * a2 + d1 * b2;
  transform1[2] = a1 * c2 + c1 * d2;
  transform1[3] = b1 * c2 + d1 * d2;
  transform1[4] = a1 * e2 + c1 * f2 + e1;
  transform1[5] = b1 * e2 + d1 * f2 + f1;

  return transform1;
};

/**
 * Set the transform components a-f on a given transform.
 * @param {!ol.Transform} transform Transform.
 * @param {number} a The a component of the transform.
 * @param {number} b The b component of the transform.
 * @param {number} c The c component of the transform.
 * @param {number} d The d component of the transform.
 * @param {number} e The e component of the transform.
 * @param {number} f The f component of the transform.
 * @return {!ol.Transform} Matrix with transform applied.
 */
_ol_transform_.set = function (transform, a, b, c, d, e, f) {
  transform[0] = a;
  transform[1] = b;
  transform[2] = c;
  transform[3] = d;
  transform[4] = e;
  transform[5] = f;
  return transform;
};

/**
 * Set transform on one matrix from another matrix.
 * @param {!ol.Transform} transform1 Matrix to set transform to.
 * @param {!ol.Transform} transform2 Matrix to set transform from.
 * @return {!ol.Transform} transform1 with transform from transform2 applied.
 */
_ol_transform_.setFromArray = function (transform1, transform2) {
  transform1[0] = transform2[0];
  transform1[1] = transform2[1];
  transform1[2] = transform2[2];
  transform1[3] = transform2[3];
  transform1[4] = transform2[4];
  transform1[5] = transform2[5];
  return transform1;
};

/**
 * Transforms the given coordinate with the given transform returning the
 * resulting, transformed coordinate. The coordinate will be modified in-place.
 *
 * @param {ol.Transform} transform The transformation.
 * @param {ol.Coordinate|ol.Pixel} coordinate The coordinate to transform.
 * @return {ol.Coordinate|ol.Pixel} return coordinate so that operations can be
 *     chained together.
 */
_ol_transform_.apply = function (transform, coordinate) {
  var x = coordinate[0],
      y = coordinate[1];
  coordinate[0] = transform[0] * x + transform[2] * y + transform[4];
  coordinate[1] = transform[1] * x + transform[3] * y + transform[5];
  return coordinate;
};

/**
 * Applies rotation to the given transform.
 * @param {!ol.Transform} transform Transform.
 * @param {number} angle Angle in radians.
 * @return {!ol.Transform} The rotated transform.
 */
_ol_transform_.rotate = function (transform, angle) {
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  return _ol_transform_.multiply(transform, _ol_transform_.set(_ol_transform_.tmp_, cos, sin, -sin, cos, 0, 0));
};

/**
 * Applies scale to a given transform.
 * @param {!ol.Transform} transform Transform.
 * @param {number} x Scale factor x.
 * @param {number} y Scale factor y.
 * @return {!ol.Transform} The scaled transform.
 */
_ol_transform_.scale = function (transform, x, y) {
  return _ol_transform_.multiply(transform, _ol_transform_.set(_ol_transform_.tmp_, x, 0, 0, y, 0, 0));
};

/**
 * Applies translation to the given transform.
 * @param {!ol.Transform} transform Transform.
 * @param {number} dx Translation x.
 * @param {number} dy Translation y.
 * @return {!ol.Transform} The translated transform.
 */
_ol_transform_.translate = function (transform, dx, dy) {
  return _ol_transform_.multiply(transform, _ol_transform_.set(_ol_transform_.tmp_, 1, 0, 0, 1, dx, dy));
};

/**
 * Creates a composite transform given an initial translation, scale, rotation, and
 * final translation (in that order only, not commutative).
 * @param {!ol.Transform} transform The transform (will be modified in place).
 * @param {number} dx1 Initial translation x.
 * @param {number} dy1 Initial translation y.
 * @param {number} sx Scale factor x.
 * @param {number} sy Scale factor y.
 * @param {number} angle Rotation (in counter-clockwise radians).
 * @param {number} dx2 Final translation x.
 * @param {number} dy2 Final translation y.
 * @return {!ol.Transform} The composite transform.
 */
_ol_transform_.compose = function (transform, dx1, dy1, sx, sy, angle, dx2, dy2) {
  var sin = Math.sin(angle);
  var cos = Math.cos(angle);
  transform[0] = sx * cos;
  transform[1] = sy * sin;
  transform[2] = -sx * sin;
  transform[3] = sy * cos;
  transform[4] = dx2 * sx * cos - dy2 * sx * sin + dx1;
  transform[5] = dx2 * sy * sin + dy2 * sy * cos + dy1;
  return transform;
};

/**
 * Invert the given transform.
 * @param {!ol.Transform} transform Transform.
 * @return {!ol.Transform} Inverse of the transform.
 */
_ol_transform_.invert = function (transform) {
  var det = _ol_transform_.determinant(transform);
  _asserts2.default.assert(det !== 0, 32); // Transformation matrix cannot be inverted

  var a = transform[0];
  var b = transform[1];
  var c = transform[2];
  var d = transform[3];
  var e = transform[4];
  var f = transform[5];

  transform[0] = d / det;
  transform[1] = -b / det;
  transform[2] = -c / det;
  transform[3] = a / det;
  transform[4] = (c * f - d * e) / det;
  transform[5] = -(a * f - b * e) / det;

  return transform;
};

/**
 * Returns the determinant of the given matrix.
 * @param {!ol.Transform} mat Matrix.
 * @return {number} Determinant.
 */
_ol_transform_.determinant = function (mat) {
  return mat[0] * mat[3] - mat[1] * mat[2];
};
exports.default = _ol_transform_;

},{"./asserts.js":40}],73:[function(require,module,exports){
'use strict';

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout() {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
})();
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch (e) {
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch (e) {
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }
}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e) {
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e) {
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }
}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while (len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) {
    return [];
};

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () {
    return '/';
};
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function () {
    return 0;
};

},{}],74:[function(require,module,exports){
'use strict';

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function TempCtor() {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  };
}

},{}],75:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

module.exports = function isBuffer(arg) {
  return arg && (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object' && typeof arg.copy === 'function' && typeof arg.fill === 'function' && typeof arg.readUInt8 === 'function';
};

},{}],76:[function(require,module,exports){
(function (process,global){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function (f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function (x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s':
        return String(args[i++]);
      case '%d':
        return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};

// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function (fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function () {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};

var debugs = {};
var debugEnviron;
exports.debuglog = function (set) {
  if (isUndefined(debugEnviron)) debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function () {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function () {};
    }
  }
  return debugs[set];
};

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;

// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold': [1, 22],
  'italic': [3, 23],
  'underline': [4, 24],
  'inverse': [7, 27],
  'white': [37, 39],
  'grey': [90, 39],
  'black': [30, 39],
  'blue': [34, 39],
  'cyan': [36, 39],
  'green': [32, 39],
  'magenta': [35, 39],
  'red': [31, 39],
  'yellow': [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};

function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\x1B[' + inspect.colors[style][0] + 'm' + str + '\x1B[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}

function stylizeNoColor(str, styleType) {
  return str;
}

function arrayToHash(array) {
  var hash = {};

  array.forEach(function (val, idx) {
    hash[val] = true;
  });

  return hash;
}

function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect && value && isFunction(value.inspect) &&
  // Filter out the util module, it's inspect function is special
  value.inspect !== exports.inspect &&
  // Also filter out any prototype objects using the circular check.
  !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value) && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '',
      array = false,
      braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function (key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}

function formatPrimitive(ctx, value) {
  if (isUndefined(value)) return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '').replace(/'/g, "\\'").replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value)) return ctx.stylize('' + value, 'number');
  if (isBoolean(value)) return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value)) return ctx.stylize('null', 'null');
}

function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}

function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function (key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
    }
  });
  return output;
}

function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function (line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function (line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}

function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function (prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] + (base === '' ? '' : base + '\n ') + ' ' + output.join(',\n  ') + ' ' + braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) && (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null || typeof arg === 'boolean' || typeof arg === 'number' || typeof arg === 'string' || (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'symbol' || // ES6 symbol
  typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function () {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};

/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function (origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":75,"_process":73,"inherits":74}]},{},[1]);
var _r=_m(1);_g.mb2olstyle=_r;return _r;})})(typeof window!=='undefined'?window:(typeof global!=='undefined'?global:(typeof self!=='undefined'?self:this)));mb2olstyle=mb2olstyle.default
