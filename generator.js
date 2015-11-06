/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* not sure if I still need this
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
*/

var $ = (selector) => document.querySelector(selector);
var $all = (selector) => document.querySelectorAll(selector);

window.addEventListener('load', function () {
  var _versions; // {channel: [versions (sorted)], ...}
  var _dash = []; // ordered list of plots for your dash

  Telemetry.init(() => {
    // why don't I put this in a Promise? Because this way looks cleaner

    // versions are static across the session, so keep 'em
    _versions = {};
    Telemetry.getVersions()
      .sort()
      .reverse()
      .map(versionString => {
        var [channel, version] = versionString.split('/');
        if (!_versions[channel]) {
          _versions[channel] = [version];
        } else {
          _versions[channel].push(version);
        }
      });

    // why do I register these in here? Because their handlers need T.init
    $('#channel').addEventListener('change', updateVersions);
    $('#version').addEventListener('change', updateMetricsAndCompares);
    updateChannels();
    updateVersions();
    updateMetricsAndCompares();

    $('#add').addEventListener('click', addPlotToDash);

  });

  function addPlotToDash() {
    var plotParams = {
      channel: $('#channel').selectedOptions[0].value,
      version: $('#version').selectedOptions[0].value,
      metric: $('#metric').value,
      useSubmissionDate: $('#use-submission-date').checked,
      sanitize: $('#sanitize').checked,
      trim: $('#trim').checked,
      compare: $('#compare').selectedOptions[0].value,
      sensibleCompare: $('#sensible-compare').checked,
      evoVersions: $('#evo-versions').value,
    };

    _dash.push(plotParams);

    var tr = document.createElement('tr');
    Object.keys(plotParams) // better hope it preserved order
      .forEach(param => {
        var td = document.createElement('td');
        td.textContent = plotParams[param];
        tr.appendChild(td);
      });
    $('.dashboard-plots-body').appendChild(tr);

    // now that the dash spec has a plot, user can generate a dash
    $('#generate').removeAttribute('disabled');

    updatePostData();
  }

  function updateChannels() {
    // unlike the other update*, this one ought only to be called once

    Object.keys(_versions)
      .forEach(channel => {
        createOption($('#channel'), channel, channel, channel == 'nightly');
      });
  }

  function updateVersions() {
    removeAllChildren($('#version'));

    _versions[$('#channel').selectedOptions[0].value]
      .forEach(version => createOption($('#version'), version));
  }

  function updateMetricsAndCompares() {
    removeAllChildren($('#metrics'));
    removeAllChildren($('#compare'));

    Telemetry.getFilterOptions(
      $('#channel').selectedOptions[0].value,
      $('#version').selectedOptions[0].value,
      filterOptions => {
        createOption($('#compare'), '', 'None');
        filterOptions['metric']
          .forEach(metric => createOption($('#metrics'), metric));
        Object.keys(filterOptions)
          .forEach(filterName => createOption($('#compare'), filterName));
      });
  }

  function createOption(parent, value, text = value, selected = false) {
    var option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    option.selected = selected;
    parent.appendChild(option);
  }

  function removeAllChildren(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function updatePostData() {
    // TODO: change over to t.m.o when everything's pushed
    const BASE_URL = 'http://chutten.github.io/telemetry-dashboard/';

    const EXTERNAL_CSS = '' +
      BASE_URL + 'new-pipeline/style/metricsgraphics.css;' +
      BASE_URL + 'new-pipeline/style/telemetry-wrapper.css';

    const EXTERNAL_JS = '' +
      'https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js;' +
      'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js;' +
      BASE_URL + 'new-pipeline/lib/metricsgraphics.js;' +
      BASE_URL + 'new-pipeline/lib/d3pie.min.js;' +
      BASE_URL + 'v2/telemetry.js;' +
      BASE_URL + 'new-pipeline/src/telemetry-wrapper.js';

    const JS = `
var plots = ${JSON.stringify(_dash)};
window.addEventListener('load', () => {
  for (plot of plots) {
    TelemetryWrapper.go(plot, document.body);
  }
});
`;
    var postData = {
      title: 'Generated Dashboard',
      editors: '111',
      js: JS,
      head: "<meta name='viewport' content='width=device-width'>",
      css_external: EXTERNAL_CSS,
      js_external: EXTERNAL_JS,
    };

    // Need to escape quotes carefully in the post data
    var postString = JSON.stringify(postData)
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    $('#post-data').value = postString
  }

});
