// Copyright 2019 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Directive for warning_loader.
 */

require('domain/utilities/url-interpolation.service.ts');
require('services/alerts.service.ts');

angular.module('oppia').directive('warningLoader', [
  'UrlInterpolationService',
  function(UrlInterpolationService) {
    return {
      restrict: 'E',
      scope: {},
      bindToController: {},
      templateUrl: UrlInterpolationService.getDirectiveTemplateUrl(
        '/base-components/warning-loader.directive.html'),
      controllerAs: '$ctrl',
      controller: ['AlertsService',
        function(AlertsService) {
          var ctrl = this;
          ctrl.AlertsService = AlertsService;
        }
      ]
    };
  }
]);