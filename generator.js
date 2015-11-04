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

window.addEventListener('load', function () {

  for (histogram of E10S_HISTOGRAMS) {
    var twParams = $.extend({metric: histogram, compare: 'e10sEnabled'}, params);
    TelemetryWrapper.go(twParams, document.body);
  }
});
