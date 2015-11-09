/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// shortcuts
var $ = (selector) => document.querySelector(selector);
var $all = (selector) => document.querySelectorAll(selector);

window.addEventListener('load', function () {
  var _versions; // {channel: [versions (sorted)], ...}
  var _dash = []; // ordered list of plots for your dash

  Telemetry.init(() => {

    // versions are static across the session, so stash 'em
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

    $('#compare').addEventListener('change', () =>
      $('#sensible-compare').disabled = !$('#compare').selectedOptions[0].value);

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
      evoVersions: $('#evo-radio').checked ? $('#evo-versions').value : 0,
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
    // unlike the other update*(), this one ought only to be called once

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

        $('#metrics').dispatchEvent(new Event('change'));
        $('#compare').dispatchEvent(new Event('change'));
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
      BASE_URL + 'wrapper/telemetry-wrapper.css';

    const EXTERNAL_JS = '' +
      'https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js;' +
      'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js;' +
      BASE_URL + 'new-pipeline/lib/metricsgraphics.js;' +
      BASE_URL + 'new-pipeline/lib/d3pie.min.js;' +
      BASE_URL + 'v2/telemetry.js;' +
      BASE_URL + 'wrapper/telemetry-wrapper.js';

    const HTML = '' +
`<!-- To customize your generated dashboard, edit the styles in the CSS window.
   - To share or export your dashboard, first click 'Save' to solidify this pen.
   - Then, you can share the url for collaboration or hit 'Export' to grab the
   - sources so you can self-host.
 -->
`;

    const CSS = '' +
`body {
  display: flex;
  flex-flow: row wrap;
}
.graph-container {
  width: 45vw;
}
.graph-title {
  text-decoration: underline;
}
`;

    const JS = '' +
`var plots = ${JSON.stringify(_dash, null, '  ')};
window.addEventListener('load', () => {
  for (plot of plots) {
    TelemetryWrapper.go(plot, document.body);
  }
});
`;
    var postData = {
      title: 'Generated Dashboard',
      editors: '111',
      css: CSS,
      html: HTML,
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
