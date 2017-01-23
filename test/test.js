import should from 'should/as-function';
import getStyleFunction from '../';
import states from '../example/data/states.json';

describe('mapbox-to-ol-style', function() {

  describe('getStyleFunction', function() {
    it('creates a style function', function() {
      var style = getStyleFunction(states, 'states');
      should(style).be.a.Function;
    });
  });

});
