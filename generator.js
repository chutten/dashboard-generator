/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var params = {};
var start = 1; // skip leading '?'
while (start < window.location.search.length) {
  var end = window.location.search.indexOf('&', start);
  if (end == -1) {
    end = window.location.search.length;
  }
  var [name, value] = window.location.search.substring(start, end).split('=');
  params[name] = value;
  start = end + 1;
}
console.log(params);

const E10S_HISTOGRAMS = [
  'SIMPLE_MEASURES_FIRSTPAINT',
  'SIMPLE_MEASURES_SHUTDOWNDURATION',
  'FX_TAB_ANIM_ANY_FRAME_INTERVAL_MS',
  'FX_TAB_ANIM_OPEN_PREVIEW_FRAME_INTERVAL_MS',
  // 'FX_REFRESH_DRIVER_FRAME_DELAY_MS', // TODO: this one doesn't exist?
  'EVENTLOOP_UI_LAG_EXP_MS',
  // TODO: how does one get gecko_hangs_per_minute?
  'SUBPROCESS_ABNORMAL_ABORT',
  'FX_PAGE_LOAD_MS',
  'SLOW_SCRIPT_NOTICE_COUNT',
  'FX_NEW_WINDOW_MS',
  'GC_MS',
  'GC_MAX_PAUSE_MS',
  'GC_MARK_MS',
  'GC_SWEEP_MS',
  'GC_MARK_ROOTS_MS',
  'GC_MARK_GRAY_MS',
  'GC_SLICE_MS',
  'GC_SCC_SWEEP_TOTAL_MS',
  'GC_SCC_SWEEP_MAX_PAUSE_MS',
  'CYCLE_COLLECTOR',
  'CYCLE_COLLECTOR_WORKER',
  'CYCLE_COLLECTOR_FULL',
  'CYCLE_COLLECTOR_MAX_PAUSE',
  'CYCLE_COLLECTOR_TIME_BETWEEN',
];

const BASE_URL = 'http://chutten.github.io/telemetry-dashboard/new-pipeline/';
// TODO: when &bare=true hits gh-pages, use the following instead:
// const BASE_URL = 'http://telemetry.mozilla.org/new-pipeline/';
const DIST_OPTIONS = {
  compare: 'e10sEnabled',
  cumulative: 0,
  max_channel_version: 'nightly%252F44', // TODO: parameterize this from query
  measure: '',
  min_channel_version: 'null',
  product: 'Firefox',
  sanitize: 1,
  trim: 1,
  bare: true,
};

const EVO_OPTIONS = {
  max_channel_version: 'nightly%252F44', // TODO: parameterize
  measure: '',
  min_channel_version: 'nightly%252F44', // ditto
  product: 'Firefox',
  sanitize: '1',
  trim: '1',
  bare: true,
};

var applyOptionsToUrl = function (url, options, measure) {
  for (name in options) {
    var value = options[name];
    if (name == 'measure') {
      value = measure;
    }
    url += name + '=' + value + '&';
  }
  return url.slice(0, -1);
};

window.addEventListener('load', function () {

  var explanationEl = document.createElement('p');
  explanationEl.className = 'explanation';
  explanationEl.textContent = 'Loading ' + E10S_HISTOGRAMS.length + ' (times 2) histograms. Please be patient.';
  document.body.appendChild(explanationEl);

  var measuresContainerEl = document.createElement('div');
  measuresContainerEl.className = 'measures-container';
  document.body.appendChild(measuresContainerEl);

  for (histogram of E10S_HISTOGRAMS) {
    var measureEl = document.createElement('div');
    var headerEl = document.createElement('h2');
    var distEl = document.createElement('iframe');
    var evoEl = document.createElement('iframe');

    headerEl.textContent = histogram;
    headerEl.className = 'measure-header';
    measureEl.appendChild(headerEl);

    var distUrl = BASE_URL + 'dist.html#!';
    distEl.src = applyOptionsToUrl(distUrl, DIST_OPTIONS, histogram);
    distEl.className = 'dist-frame';
    measureEl.appendChild(distEl);

    var evoUrl = BASE_URL + 'evo.html#!';
    evoEl.src = applyOptionsToUrl(evoUrl, EVO_OPTIONS, histogram);
    evoEl.className = 'evo-frame';
    measureEl.appendChild(evoEl);

    measureEl.className = 'measure';
    measureEl.measure = histogram; // in case we need it later
    measuresContainerEl.appendChild(measureEl);
  }
});
