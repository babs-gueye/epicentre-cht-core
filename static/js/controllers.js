var inboxControllers = angular.module('inboxControllers', ['ngSanitize']);

var baseUrl = $('html').data('base-url');

inboxControllers.filter('relativeDate', function () {
  return function (date) {
    if (!date) { 
      return ''; 
    }

    var m = moment(date);

    return '<span title="' + m.format('HH:mm, Do MMM YYYY') + '">' + m.fromNow() + '</span>';
  };
});

inboxControllers.directive('mmSender', function() {
  return {
    restrict: 'E',
    scope: { message: '=' },
    templateUrl: baseUrl + '/static/js/templates/sender.html'
  };
});

inboxControllers.controller('MessageCtrl', 
  ['$scope', 'Facility', 'Settings', 
  function ($scope, Facility, Settings) {

 
  $scope.forms = [];
  $scope.selected = undefined;
  $scope.loading = true;
  $scope.appending = false;
  $scope.messages = [];
  $scope.facilities = Facility.query();

  $scope.filterType = 'message';
  $scope.filterForms = [];
  $scope.filterFacilities = [];
  $scope.filterValid = true;
  $scope.filterDate = {
    from: moment().subtract('months', 1).valueOf(),
    to: moment().valueOf()
  };

  Settings.query(function(res) {
    if (res.settings && res.settings.forms) {
      var forms = res.settings.forms;
      for (key in forms) {
        var form = forms[key];
        $scope.forms.push({
          name: form.meta.label.en,
          code: form.meta.code
        });
      }
    }
  });

  $scope.setMessage = function(id) {
    $scope.selected = undefined;
    if (id) {
      $scope.messages.forEach(function(message) {
        if (message._id === id) {
          $scope.selected = message;
        }
      });
    }
  };

  var _findMessage = function(id) {
    for (var i = 0; i < $scope.messages.length; i++) {
      if (id === $scope.messages[i]._id) {
        return $scope.messages[i];
      }
    }
  }

  $scope.update = function(updated) {
    for (var i = 0; i < updated.length; i++) {
      var newMsg = updated[i];
      var oldMsg = _findMessage(newMsg._id);
      if (oldMsg && newMsg._rev !== oldMsg._rev) {
        for (prop in newMsg) {
          oldMsg[prop] = newMsg[prop];
        }
      } else {
        $scope.messages.push(newMsg);
      }
    }
    $scope.loading = false;
    $scope.appending = false;
  };

  var _setFilterString = function() {

    var formatDate = function(date) {
      return moment(date).format('YYYY-MM-DD');
    };

    var filters = [];

    // increment end date so it's inclusive
    var to = new Date($scope.filterDate.to.valueOf());
    to.setDate(to.getDate() + 1);

    filters.push(
      'reported_date<date>:[' + 
      formatDate($scope.filterDate.from) + ' TO ' + formatDate(to) + 
      ']'
    );

    if ($scope.filterType === 'message') {
      filters.push('-form:[* TO *]');
    } else {
      if ($scope.filterForms.length) {
        var formCodes = [];
        $scope.filterForms.forEach(function(form) {
          formCodes.push(form.code);
        });
        filters.push('form:(' + formCodes.join(' OR ') + ')');
      } else {
        filters.push('form:[* TO *]');
      }
    }

    if ($scope.filterValid === true) {
      filters.push('errors<int>:0');
    } else if ($scope.filterValid === false) {
      filters.push('NOT errors<int>:0');
    }

    if ($scope.filterFacilities.length) {
      filters.push('clinic:(' + $scope.filterFacilities.join(' OR ') + ')');
    }

    $('#advanced').val(filters.join(' AND '));
  };

  _setFilterString();

  $scope.advancedFilter = function(options) {
    var options = options || {};
    if (!options.silent) {
      $scope.loading = true;
    }
    if (options.skip) {
      $scope.appending = true;
      options.skip = $scope.messages.length;
    } else {
      $scope.messages = [];
    }
    $('body').trigger('updateMessages', options);
  };

  $scope.filter = function(options) {
    _setFilterString();
    $scope.advancedFilter(options);
  };

  $scope.setFilterType = function(filterType) {
    $scope.filterType = filterType;
    $scope.filter();
  };

  $scope.setFilterForms = function(filterForms) {
    $scope.filterForms = filterForms;
    $scope.filter();
  };

  $scope.setFilterFacilities = function(facilityIds) {
    $scope.filterFacilities = facilityIds;
    $scope.filter();
  };

  $scope.setFilterValid = function(filterValid) {
    $scope.filterValid = filterValid;
    $scope.filter();
  };

  $scope.setFilterDateFrom = function(date) {
    $scope.filterDate.from = date;
    $scope.filter();
  };

  $scope.setFilterDateTo = function(date) {
    $scope.filterDate.to = date;
    $scope.filter();
  };

}]);