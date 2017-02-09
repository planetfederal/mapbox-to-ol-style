import should from 'should/as-function';
import getStyleFunction from '../';
import states from '../example/data/states.json';
import Feature from 'ol/feature';
import Polygon from 'ol/geom/polygon';

describe('mapbox-to-ol-style', function() {

  describe('getStyleFunction', function() {

    var feature;
    beforeEach(function() {
      feature = new Feature(new Polygon([[[-1, -1], [-1, 1], [1, 1], [1, -1], [-1, -1]]]));
    });

    it('creates a style function with all layers of a source', function() {
      var style = getStyleFunction(states, 'states');
      should(style).be.a.Function();
      feature.set('PERSONS', 2000000);
      should(style(feature, 1)).be.an.Array();
      feature.set('PERSONS', 4000000);
      should(style(feature, 1)).be.an.Array();
      feature.set('PERSONS', 6000000);
      should(style(feature, 1)).be.an.Array();
    });

    it('creates a style function with some layers of a source', function() {
      var style = getStyleFunction(states, ['population_lt_2m']);
      should(style).be.a.Function;
      feature.set('PERSONS', 2000000);
      should(style(feature, 1)).be.an.Array();
      feature.set('PERSONS', 4000000);
      should(style(feature, 1)).be.undefined();
      feature.set('PERSONS', 6000000);
      should(style(feature, 1)).be.undefined();
    });

  });

});
