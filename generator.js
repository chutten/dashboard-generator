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
    $('#version').addEventListener('change', updateMetricsAndComparesAndAppsAndOS);
    updateChannels();
    updateVersions();
    updateMetricsAndComparesAndAppsAndOS();
    updateE10s();

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
      filters: undefined,
    };

    // now to add the filters
    if ($('#show-filters').checked) {
      var filters = {};
      if ($('#application').selectedOptions[0].value) {
        filters.application = $('#application').selectedOptions[0].value;
      }
      if ($('#os').selectedOptions[0].value) {
        filters.os = $('#os').selectedOptions[0].value;
      }
      var e10sFilters = E10S_OPTIONS[$('#e10s').selectedOptions[0].value];
      if (e10sFilters) {
        for (var filterName in e10sFilters) {
          filters[filterName] = e10sFilters[filterName];
        }
      }
      plotParams.filters = filters;
    }

    _dash.push(plotParams);

    // put the params in the table so there are no surprises for the user
    var tr = document.createElement('tr');
    Object.keys(plotParams) // better hope it preserved order
      .forEach(param => {
        var td = document.createElement('td');
        if (typeof plotParams[param] == 'object') {
          td.textContent = JSON.stringify(plotParams[param]);
        } else if (param == 'version' && !plotParams[param]) {
          td.textContent = '-Latest-';
        } else {
          td.textContent = plotParams[param];
        }
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

  const E10S_OPTIONS = {
    'E10s Both Processes': {e10sEnabled: true},
    'E10s Parent-only': {e10sEnabled: true, child: false},
    'E10s Child-only': {e10sEnabled: true, child: true},
    'Single Process': {e10sEnabled: false, child: false},
  };
  function updateE10s() {
    // well, okay, this one only ought to be called once, too

    createOption($('#e10s'), '');
    for (op in E10S_OPTIONS) {
      createOption($('#e10s'), op);
    }
  }

  function updateVersions() {
    removeAllChildren($('#version'));

    createOption($('#version'), '', '-Latest-');
    _versions[$('#channel').selectedOptions[0].value]
      .forEach(version => createOption($('#version'), version));
  }

  function updateMetricsAndComparesAndAppsAndOS() {
    removeAllChildren($('#metrics'));
    removeAllChildren($('#compare'));
    removeAllChildren($('#application'));
    removeAllChildren($('#os'));

    var channel = $('#channel').selectedOptions[0].value;
    var version = $('#version').selectedOptions[0].value;
    if (!version) {
      version = _versions[channel][0];
    }

    Telemetry.getFilterOptions(
      channel,
      version,
      filterOptions => {

        filterOptions['metric']
          .forEach(metric => createOption($('#metrics'), metric));

        createOption($('#compare'), '', 'None');
        Object.keys(filterOptions)
          .forEach(filterName => createOption($('#compare'), filterName));

        // Only use the Uppercased app names, as they are the relevant ones
        createOption($('#application'), '');
        filterOptions['application']
          .filter(appName =>
            appName[0] == appName[0].toUpperCase() && isNaN(appName[0] * 1))
          .forEach(appName => createOption($('#application'), appName));

        // OS has only three useful families: Windows, Linux, OSX
        // so as long as they're all in filterOptions, they all get displayed
        createOption($('#os'), '');
        var OSes = {
          'Darwin': 'OSX',
          'Linux': 'Linux',
          'Windows_NT': 'Windows',
        };
        for (var family in OSes) {
          if (filterOptions['os'].some(osName => osName.startsWith(family))) {
            createOption($('#os'), family, OSes[family]);
          }
        }

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
