// ==UserScript==
// @name         WME ClickSaver
// @namespace    https://greasyfork.org/users/45389
// @version      2018.04.12.001
// @description  Various UI changes to make editing faster and easier.
// @author       MapOMatic
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @license      GNU GPLv3
// @connect      google.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

/* global GM_info */
/* global W */
/* global Node */
/* global I18n */

(function() {
    function main(argsObject) {
        //'use strict';

        var _debugLevel = 0;
        var _roadTypeDropDownSelector = 'select[name="roadType"]';
        var _elevationDropDownSelector = 'select[name="level"]';
        var _routingTypeDropDownSelector = 'select[name="routingRoadType"]';
        var _parkingSpacesDropDownSelector = 'select[name="estimatedNumberOfSpots"]';
        var _parkingCostDropDownSelector = 'select[name="costType"]';
        var _alertUpdate = false;
        var _settings = {};
        var _settingsStoreName = 'clicksaver_settings';
        var _lastScriptVersion;
        var _trans;  // Translation object
        var _scriptVersionChanges = [
            argsObject.scriptName,
            'v' + argsObject.scriptVersion,
            '',
            'What\'s New',
            '------------------------------',
            '' // Add important changes here and set _alertUpdate=true
        ].join('\n');
        var _roadTypes = {
            St:{val:1, wmeColor:'#ffffeb', svColor:'#ffffff', category:'streets', visible:true},
            PS:{val:2, wmeColor:'#f0ea58', svColor:'#cba12e', category:'streets', visible:true},
            mH:{val:7, wmeColor:'#69bf88', svColor:'#ece589', category:'highways', visible:true},
            MH:{val:6, wmeColor:'#45b8d1', svColor:'#c13040', category:'highways', visible:true},
            Fw:{val:3, wmeColor:'#c577d2', svColor:'#387fb8', category:'highways', visible:false},
            Rmp:{val:4, wmeColor:'#b3bfb3', svColor:'#58c53b', category:'highways', visible:false},
            OR:{val:8, wmeColor:'#867342', svColor:'#82614a', category:'otherDrivable', visible:false},
            PLR:{val:20, wmeColor:'#ababab', svColor:'#2282ab', category:'otherDrivable', visible:true},
            PR:{val:17, wmeColor:'#beba6c', svColor:'#00ffb3', category:'otherDrivable', visible:true},
            Fer:{val:15, wmeColor:'#d7d8f8', svColor:'#ff8000', category:'otherDrivable', visible:false},
            WT:{val:5, wmeColor:'#b0a790', svColor:'#00ff00', category:'nonDrivable', visible:false},
            PB:{val:10, wmeColor:'#9a9a9a', svColor:'#0000ff', category:'nonDrivable', visible:false},
            Sw:{val:16, wmeColor:'#999999', svColor:'#b700ff', category:'nonDrivable', visible:false},
            RR:{val:18, wmeColor:'#c62925', svColor:'#ffffff', category:'nonDrivable', visible:false},
            RT:{val:19, wmeColor:'#ffffff', svColor:'#00ff00', category:'nonDrivable', visible:false}
        };
        var _directions = { twoWay: {val:3}, oneWayAB: {val:1}, oneWayBA: {val:2}, unknown: {val:0} };

        var UpdateObject,
            AddOrGetCity,
            AddOrGetStreet,
            MultiAction;

        function log(message, level) {
            if (message && level <= _debugLevel) {
                console.log('ClickSaver: ' + message);
            }
        }

        function isChecked(checkboxId) {
            return $('#' + checkboxId).is(':checked');
        }

        function setChecked(checkboxId, checked) {
            $('#' + checkboxId).prop('checked', checked);
        }
        function loadSettingsFromStorage() {
            var loadedSettings = $.parseJSON(localStorage.getItem(_settingsStoreName));
            var defaultSettings = {
                lastVersion: null,
                roadButtons: true,
                roadTypeButtons: ['St','PS','mH','MH','Fw','Rmp','PLR','PR'],
                lockButtons: true,
                elevationButtons: true,
                directionButtons: true,
                routingTypeButtons: true,
                parkingCostButtons: true,
                parkingSpacesButtons: true,
                inlineRoadTypeCheckboxes: true,
                hideAvgSpeedCameras: true,
                inlineParkingCheckboxes: true,
                setNewPLRStreetToNone: true,
                setNewPLRCity: true,
                useOldRoadColors: false
            };
            _settings = loadedSettings ? loadedSettings : defaultSettings;
            for (var prop in defaultSettings) {
                if (!_settings.hasOwnProperty(prop)) {
                    _settings[prop] = defaultSettings[prop];
                }
            }

            setChecked('csRoadTypeButtonsCheckBox', _settings.roadButtons);
            if (_settings.roadTypeButtons) {
                for (var roadTypeAbbr1 in _roadTypes) {
                    setChecked('cs' + roadTypeAbbr1 + 'CheckBox', _settings.roadTypeButtons.indexOf(roadTypeAbbr1) !== -1);
                }
            }
            if (_settings.roadButtons) {
                $('.csRoadTypeButtonsCheckBoxContainer').show();
            } else {
                $('.csRoadTypeButtonsCheckBoxContainer').hide();
            }
            setChecked('csLockButtonsCheckBox', _settings.lockButtons);
            setChecked('csElevationButtonsCheckBox', _settings.elevationButtons);
            setChecked('csDirectionButtonsCheckBox', _settings.directionButtons);
            setChecked('csParkingSpacesButtonsCheckBox', _settings.parkingSpacesButtons);
            setChecked('csParkingCostButtonsCheckBox', _settings.parkingCostButtons);
            setChecked('csRoutingTypeCheckBox', _settings.routingTypeButtons);
            setChecked('csInlineRoadTypesCheckBox', _settings.inlineRoadTypeCheckboxes);
            setChecked('csHideAvgSpeedCamerasCheckBox', _settings.hideAvgSpeedCameras);
            setChecked('csInlineParkingBoxesCheckBox', _settings.inlineParkingCheckboxes);
            setChecked('csClearNewPLRCheckBox', _settings.setNewPLRStreetToNone);
            setChecked('csUseOldRoadColorsCheckBox', _settings.useOldRoadColors);
            setChecked('csSetNewPLRCityCheckBox', _settings.setNewPLRCity);
        }

        function saveSettingsToStorage() {
            if (localStorage) {
                var settings = {
                    lastVersion: argsObject.scriptVersion,
                    roadButtons: _settings.roadButtons,
                    lockButtons: _settings.lockButtons,
                    elevationButtons: _settings.elevationButtons,
                    directionButtons: _settings.directionButtons,
                    parkingCostButtons: _settings.parkingCostButtons,
                    parkingSpacesButtons: _settings.parkingSpacesButtons,
                    inlineRoadTypeCheckboxes: _settings.inlineRoadTypeCheckboxes,
                    inlineParkingCheckboxes: _settings.inlineParkingCheckboxes,
                    hideAvgSpeedCameras: _settings.hideAvgSpeedCameras,
                    setNewPLRStreetToNone: _settings.setNewPLRStreetToNone,
                    useOldRoadColors: _settings.useOldRoadColors,
                    setNewPLRCity: _settings.setNewPLRCity
                };
                settings.roadTypeButtons = [];
                for (var roadTypeAbbr in _roadTypes) {
                    if(_settings.roadTypeButtons.indexOf(roadTypeAbbr) !== -1) { settings.roadTypeButtons.push(roadTypeAbbr); }
                }
                localStorage.setItem(_settingsStoreName, JSON.stringify(settings));
                log('Settings saved', 1);
            }
        }

        function getConnectedSegmentIDs(segmentID) {
            var IDs = [];
            var segment = W.model.segments.get(segmentID);
            [W.model.nodes.get(segment.attributes.fromNodeID), W.model.nodes.get(segment.attributes.toNodeID)].forEach(function(node) {
                if (node) {
                    node.attributes.segIDs.forEach(function(segID) {
                        if (segID !== segmentID) { IDs.push(segID); }
                    });
                }
            });
            return IDs;
        }

        function getFirstConnectedStateID(startSegment) {
            var stateID = null;
            var nonMatches = [];
            var segmentIDsToSearch = [startSegment.attributes.id];
            while (stateID === null && segmentIDsToSearch.length > 0) {
                var startSegmentID = segmentIDsToSearch.pop();
                startSegment = W.model.segments.get(startSegmentID);
                var connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
                for (var i=0;i<connectedSegmentIDs.length;i++) {
                    var streetID = W.model.segments.get(connectedSegmentIDs[i]).attributes.primaryStreetID;
                    if (streetID !== null && typeof(streetID) !== 'undefined') {
                        var cityID = W.model.streets.get(streetID).cityID;
                        stateID = W.model.cities.get(cityID).attributes.stateID;
                        break;
                    }
                }

                if (stateID === null) {
                    nonMatches.push(startSegmentID);
                    connectedSegmentIDs.forEach(function(segmentID) {
                        if (nonMatches.indexOf(segmentID) === -1 && segmentIDsToSearch.indexOf(segmentID) === -1) {
                            segmentIDsToSearch.push(segmentID);
                        }
                    });
                } else {
                    return stateID;
                }
            }
            return null;
        }

        function getFirstConnectedCityID(startSegment) {
            var cityID = null;
            var nonMatches = [];
            var segmentIDsToSearch = [startSegment.attributes.id];
            while (cityID === null && segmentIDsToSearch.length > 0) {
                var startSegmentID = segmentIDsToSearch.pop();
                startSegment = W.model.segments.get(startSegmentID);
                var connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
                for (var i=0;i<connectedSegmentIDs.length;i++) {
                    var streetID = W.model.segments.get(connectedSegmentIDs[i]).attributes.primaryStreetID;
                    if (streetID !== null && typeof(streetID) !== 'undefined') {
                        cityID = W.model.streets.get(streetID).cityID;
                        break;
                    }
                }

                if (cityID === null) {
                    nonMatches.push(startSegmentID);
                    connectedSegmentIDs.forEach(function(segmentID) {
                        if (nonMatches.indexOf(segmentID) === -1 && segmentIDsToSearch.indexOf(segmentID) === -1) {
                            segmentIDsToSearch.push(segmentID);
                        }
                    });
                } else {
                    return cityID;
                }
            }
            return null;
        }

        function getEmptyCity(stateID) {
            var emptyCity = null;
            W.model.cities.getObjectArray().forEach(function(city) {
                if (city.attributes.stateID === stateID && city.attributes.isEmpty) {
                    emptyCity = city;
                }
            });
            return emptyCity;
        }
        function getCity(cityID) {
            var cities = W.model.cities.getByIds([cityID]);
            if (cities.length > 0) {
                return cities[0];
            } else {
                return null;
            }
        }

        function setStreetAndCity () {
            var segments = W.selectionManager.getSelectedFeatures();
            var setCity = isChecked('csSetNewPLRCityCheckBox');
            if (segments.length === 0 || segments[0].model.type !== 'segment') {
                return;
            }

            segments.forEach(function(segment) {
                var segModel = segment.model;
                if (segModel.attributes.primaryStreetID === null) {
                    var stateID = getFirstConnectedStateID(segment.model);
                    if (stateID) {
                        var state = W.model.states.get(stateID);
                        var country = W.model.countries.get(state.countryID);

                        var m_action = new MultiAction();
                        var cityToSet;
                        m_action.setModel(W.model);
                        if (setCity) cityToSet = getCity(getFirstConnectedCityID(segment.model));
                        if (!cityToSet) cityToSet = getEmptyCity(state.id);
                        if (!cityToSet) {
                            var addCityAction = new AddOrGetCity(state, country, "", true);
                            m_action.doSubAction(addCityAction);
                            cityToSet = getEmptyCity(state.id);
                        }
                        var newStreet = {isEmpty:true, cityID:cityToSet.attributes.id};
                        var emptyStreet = W.model.streets.getByAttributes(newStreet)[0];
                        if (!emptyStreet) {
                            var addStreetAction = new AddOrGetStreet("", cityToSet, true);
                            m_action.doSubAction(addStreetAction);
                            emptyStreet = W.model.streets.getByAttributes(newStreet)[0];
                        }
                        var action3 = new UpdateObject(segModel, {primaryStreetID: emptyStreet.id});
                        m_action.doSubAction(action3);
                        W.model.actionManager.add(m_action);
                    }
                }
            });
        }

        function onRoadTypeButtonClick(roadTypeAbbr) {
            $(_roadTypeDropDownSelector).val(_roadTypes[roadTypeAbbr].val).change();
            if (roadTypeAbbr === 'PLR' && isChecked('csClearNewPLRCheckBox') && require) {
                setStreetAndCity();
            }
        }

        function addRoadTypeButtons() {
            var $dropDown = $(_roadTypeDropDownSelector);
            $('#csRoadTypeButtonsContainer').remove();
            var $container = $('<div>',{id:'csRoadTypeButtonsContainer',class:'rth-btn-container'});
            var $street = $('<div>', {id:'csStreetButtonContainer',class:'cs-rt-btn-container'});
            var $highway = $('<div>', {id:'csHighwayButtonContainer',class:'cs-rt-btn-container'});
            var $otherDrivable = $('<div>', {id:'csOtherDrivableButtonContainer',class:'cs-rt-btn-container'});
            var $nonDrivable = $('<div>', {id:'csNonDrivableButtonContainer',class:'cs-rt-btn-container'});
            var divs = {streets:$street, highways:$highway, otherDrivable:$otherDrivable, nonDrivable:$nonDrivable};
            for (var roadTypeKey in _roadTypes) {
                if (_settings.roadTypeButtons.indexOf(roadTypeKey) !== -1) {
                    var roadType = _roadTypes[roadTypeKey];
                    var $div = divs[roadType.category];
                    $div.append(
                        $('<div>', {class:'btn btn-rth btn-rth-' + roadTypeKey + ($dropDown.attr('disabled') ? ' disabled' : '') + ' btn-positive',title:_trans.roadTypeButtons[roadTypeKey].title})
                        .text(_trans.roadTypeButtons[roadTypeKey].text)
                        .prop('checked', roadType.visible)
                        .data('key', roadTypeKey)
                        .click(function() { onRoadTypeButtonClick($(this).data('key')); })
                    );
                }
            }
            $container.append($street).append($highway).append($otherDrivable).append($nonDrivable);
            $dropDown.before($container);
        }

        function addRoutingTypeButtons() {
            var $dropDown = $(_routingTypeDropDownSelector);
            if ($dropDown.length > 0) {
                var options = $dropDown.children();
                if (options.length === 3) {
                    var buttonInfos = [
                        ['-1', options[0].value, options[0].text],
                        [options[1].text, options[1].value, ''],
                        ['+1', options[2].value, options[2].text]
                    ];
                    $('#csRoutingTypeContainer').remove();
                    var $form = $('<div>', {id:"csRoutingTypeContainer",style:"height:30px;padding-top:0px"});
                    for (var i=0; i<buttonInfos.length; i++) {
                        var btnInfo = buttonInfos[i];
                        var $input = $('<input>', {type:"radio", name:"routingRoadType", id:"routingRoadType" + i, value:btnInfo[1]})
                        .click(function() {
                            $(_routingTypeDropDownSelector).val($(this).attr('value')).change();
                            //hideAvgSpeedCameras();
                        });
                        if (String(btnInfo[1]) === String($dropDown.val())) $input.prop('checked', 'true');
                        $form.append(
                            $('<div class="controls-container" style="float: left; margin-right: 10px;margin-left:0px">').append(
                                $input,
                                $('<label>', {for:'routingRoadType' + i, style:"padding-left: 20px;", title:btnInfo[2]}).text(btnInfo[0])
                            )
                        );

                    }

                    $dropDown.before($form);
                    $dropDown.hide();
                }
            }
        }

        function isPLA(item) {
            return (item.model.type === "venue") &&  item.model.attributes.categories.indexOf('PARKING_LOT') > -1;
        }

        function addParkingSpacesButtons() {
            var $dropDown = $(_parkingSpacesDropDownSelector);
            var selItems = W.selectionManager.getSelectedFeatures();
            var item = selItems[0];
            var attr = item.model.attributes;

            // If it's not a PLA, exit.
            if (!isPLA(item)) return;

            $('#csParkingSpacesContainer').remove();
            var $div = $('<div>',{id:'csParkingSpacesContainer'});
            var dropdownDisabled = $dropDown.attr('disabled') === 'disabled';
            var optionNodes = $(_parkingSpacesDropDownSelector + ' option');
            var optionValues = [];
            for (i=0; i<optionNodes.length; i++) {
                var $option = $(optionNodes[i]);
                var text = $option.text();
                var selected = $option.val() === $dropDown.val();
                $div.append(
                    $('<div>', {
                        class:'btn waze-btn waze-btn-white' + (selected ? ' waze-btn-blue':'') + (dropdownDisabled ? ' disabled' : ''),
                        style: 'margin-bottom: 5px; height: 22px; padding: 2px 8px 0px 8px; margin-right: 3px;'
                    })
                    .text(text)
                    .data('val',$option.val())
                    .hover(function() {})
                    .click(function() {
                        if(!dropdownDisabled) {
                            $(_parkingSpacesDropDownSelector).val($(this).data('val')).change();
                            addParkingSpacesButtons();
                        }
                    })
                );
            }

            $dropDown.before($div);
            $dropDown.hide();
        }

        function addParkingCostButtons() {
            var $dropDown = $(_parkingCostDropDownSelector);
            var selItems = W.selectionManager.getSelectedFeatures();
            var item = selItems[0];
            var attr = item.model.attributes;

            // If it's not a PLA, exit.
            if (!isPLA(item)) return;

            $('#csParkingCostContainer').remove();
            var $div = $('<div>',{id:'csParkingCostContainer'});
            var dropdownDisabled = $dropDown.attr('disabled') === 'disabled';
            var optionNodes = $(_parkingCostDropDownSelector + ' option');
            var optionValues = [];
            for (i=0; i<optionNodes.length; i++) {
                var $option = $(optionNodes[i]);
                var text = $option.text();
                var selected = $option.val() === $dropDown.val();
                $div.append(
                    $('<div>', {
                        class:'btn waze-btn waze-btn-white' + (selected ? ' waze-btn-blue':'') + (dropdownDisabled ? ' disabled' : ''),
                        style: 'margin-bottom: 5px; height: 22px; padding: 2px 8px 0px 8px; margin-right: 4px;'
                    })
                    .text(text !== '' ? text : '?')
                    .data('val',$option.val())
                    .hover(function() {})
                    .click(function() {
                        if(!dropdownDisabled) {
                            $(_parkingCostDropDownSelector).val($(this).data('val')).change();
                            addParkingCostButtons();
                        }
                    })
                );
            }

            $dropDown.before($div);
            $dropDown.hide();
        }

        function addElevationButtons() {
            var id = 'csElevationButtonsContainer';
            if ($('#' + id).length===0) {
                var $dropDown = $(_elevationDropDownSelector);
                var baseClass = 'btn waze-btn waze-btn-white' + ($dropDown.attr('disabled') ? ' disabled' : '');
                var style = 'height: 20px;padding-left: 8px;padding-right: 8px;margin-right: 4px;padding-top: 1px;';
                var $div = $('<div>', {id:id, style:'margin-bottom: 5px;'}).append(
                    $('<div>',{class:baseClass, style:style}).text('-').click(function() {
                        var level = parseInt($(_elevationDropDownSelector).val());
                        if (level > -5) { $(_elevationDropDownSelector).val(level - 1).change(); }
                    })
                ).append(
                    $('<div>',{class:baseClass, style:style}).text(_trans.groundButtonText)
                    .click(function() {
                        var level = parseInt($(_elevationDropDownSelector).val());
                        if (level !== 0) { $(_elevationDropDownSelector).val(0).change(); }
                    })
                ).append(
                    $('<div>',{class:baseClass, style:style}).text('+').click(function() {
                        var level = parseInt($(_elevationDropDownSelector).val());
                        if (level < 9) { $(_elevationDropDownSelector).val(level + 1).change(); }
                    })
                );
                $dropDown.css({display:'inline-block',width:'120px',marginRight:'10px'});
                $dropDown.before($div);
                $dropDown.detach();
                $div.prepend($dropDown);
            }
        }

        function showScriptInfoAlert() {
            /* Check version and alert on update */
            if (_alertUpdate && argsObject.scriptVersion !== _lastScriptVersion) {
                alert(_scriptVersionChanges);
            }
        }

        function shadeColor2(color, percent) {
            var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
            return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
        }

        function buildRoadTypeButtonCss() {
            var lines = [];
            var useOldColors = _settings.useOldRoadColors;
            for (var roadTypeAbbr in _roadTypes) {
                var roadType = _roadTypes[roadTypeAbbr];
                var bgColor = useOldColors ? roadType.svColor : roadType.wmeColor;
                var output = '.rth-btn-container .btn-rth-' + roadTypeAbbr + ' {background-color:' + bgColor + ';box-shadow:0 2px ' + shadeColor2(bgColor, -0.5) + ';border-color:' + shadeColor2(bgColor,-0.15) + ';}';
                output += ' .rth-btn-container .btn-rth-' + roadTypeAbbr + ':hover {background-color:' + shadeColor2(bgColor,0.2) + '}';
                lines.push(output);
            }
            return lines.join(' ');
        }

        function injectCss() {
            var css =  [
                // Road type button formatting
                '.csRoadTypeButtonsCheckBoxContainer {margin-left:15px;}',
                '.rth-btn-container {margin-bottom:5px;}',
                '.rth-btn-container .btn-rth {font-size:11px;line-height:20px;color:black;padding:0px 4px;height:20px;margin-right:2px;border-style:solid;border-width:1px;}',
                buildRoadTypeButtonCss(),
                '.btn.btn-rth:active {box-shadow:none;transform:translateY(2px)}',
                'div .cs-rt-btn-container {float:left; margin: 0px 5px 5px 0px;}',
                '#sidepanel-clicksaver .controls-container {padding:0px;}',

                // Lock button formatting
                '.btn-lh {cursor:pointer;padding:1px 6px;height:22px;border:solid 1px #c1c1c1;margin-right:3px;}',
                '.btn.btn-lh.btn-lh-selected {background-color:#6999ae;color:white}',
                '.btn.btn-lh.btn-lh-selected:hover {color:white}',
                '.btn.btn-lh.disabled {color:#909090;background-color:#f7f7f7;}',
                '.btn.btn-lh.btn-lh-selected.disabled {color:white;background-color:#6999ae;}',
                '.cs-group-label {font-size: 11px; width: 100%; font-family: Poppins, sans-serif; text-transform: uppercase; font-weight: 700; color: #354148; margin-bottom: 6px;}'
            ].join(' ');
            $('<style type="text/css">' + css + '</style>').appendTo('head');
        }

        function inlineRoadTypeCheckboxes() {
            // TODO - move styling to css.
            var $div = $('<div>',{style:'font-size:11px;display:inline-block;'});
            ['tollRoadCheck','unpavedCheckbox','tunnelCheckbox','headlightsCheckbox','nearbyHOVCheckbox'].forEach(function(id) {
                $('label[for="' + id + '"]').css({paddingLeft:'20px'});
                $('#' + id).parent().css({float:'left',marginRight:'4px'}).detach().appendTo($div);
            });
            $(_roadTypeDropDownSelector).after($div);
        }

        function inlineParkingCheckboxes() {
            var css = {display: 'inline-block', marginRight: '5px'};
            var $div = $('<div>');
            $('i.parkingType-tooltip').after($div);
            $('div.parking-type-option').appendTo($div).css(css);

            $div = $('<div>');
            $('div.payment-checkbox').parent().append($div);
            $('div.payment-checkbox').appendTo($div).css(css);
        }

        function hideAvgSpeedCameras() {
            $('#fwdSpeedCameraCheckbox').closest('.form-group').hide();
            $('#revSpeedCameraCheckbox').closest('.form-group').hide();
        }

        function onModeChanged(model, modeId, context) {
            if(!modeId || modeId === 1) {
                initUserPanel();
                loadSettingsFromStorage();
            }
        }

        function createSettingRadio(settingName, groupName, groupLabel, buttonMetas) {
            var $container = $('<div>',{class:'controls-container'});
            $('<input>', {type:'checkbox', class:'csSettingsCheckBox', id:groupName, 'data-setting-name':groupName}).appendTo($container);
            $('<label>', {for:groupName}).text(groupLabel).css({marginRight:'10px'}).appendTo($container);
            buttonMetas.forEach(function(meta) {
                var $input = $('<input>', {type:'radio', class:'csSettingsCheckBox', name:groupName, id:meta.id, 'data-setting-name':groupName}).css({marginLeft:'5px'}).appendTo($container);
                var $label = $('<label>', {for:meta.id}).text(meta.labelText).appendTo($container);
            });
            return $container;
        }

        function createSettingsCheckbox(id, settingName, labelText, titleText, divCss, labelCss, optionalAttributes) {
            var $container = $('<div>',{class:'controls-container'});
            var $input = $('<input>', {type:'checkbox',class:'csSettingsCheckBox',name:id, id:id, 'data-setting-name':settingName}).appendTo($container);
            var $label = $('<label>', {for:id}).text(labelText).appendTo($container);
            if (divCss) $container.css(divCss);
            if (labelCss) $label.css(labelCss);
            if (titleText) $container.attr({title:titleText});
            if (optionalAttributes) $input.attr(optionalAttributes);
            return $container;
        }

        function initUserPanel() {
            var $roadTypesDiv = $('<div>', {class:'csRoadTypeButtonsCheckBoxContainer'});
            $roadTypesDiv.append( createSettingsCheckbox('csUseOldRoadColorsCheckBox', 'useOldRoadColors', _trans.prefs.useOldRoadColors) );
            for (var roadTypeAbbr in _roadTypes) {
                var roadType = _roadTypes[roadTypeAbbr];
                var id = 'cs' + roadTypeAbbr + 'CheckBox';
                $roadTypesDiv.append( createSettingsCheckbox(id, 'roadType', roadType.title, null, null, null, {'data-road-type':roadTypeAbbr}) );
                if (roadTypeAbbr === 'PLR') {
                    $roadTypesDiv.append(
                        createSettingsCheckbox('csClearNewPLRCheckBox', 'setNewPLRStreetToNone', _trans.prefs.setStreetCityToNone,
                                               _trans.prefs.setStreetCityToNone_Title,
                                               {paddingLeft:'20px', display:'inline', marginRight:'4px'}, {fontStyle:'italic'}),
                        createSettingsCheckbox('csSetNewPLRCityCheckBox', 'setNewPLRCity', _trans.prefs.setCityToConnectedSegCity,
                                               '', {paddingLeft:'30px', marginRight:'4px'}, {fontStyle:'italic'})
                        //$('<select style="height:24px;" disabled><option>None</option><option>Closest Segmet</option></select>')
                    );
                }
            }

            var $tab = $('<li>',{title:argsObject.scriptName}).append(
                $('<a>', {'data-toggle':'tab', href:'#sidepanel-clicksaver'}).append($('<span>').text('CS'))
            );

            var $panel = $('<div>', {class:'tab-pane', id:'sidepanel-clicksaver'})
            .append(
                $('<div>',  {class:'side-panel-section>'}).append(
                    $('<div>', {style: 'margin-bottom:8px;'}).append(
                        $('<div>', {class:'form-group'}).append(
                            $('<label>', {class:"cs-group-label"}).text(_trans.prefs.dropdownHelperGroup),
                            $('<div>').append( createSettingsCheckbox('csRoadTypeButtonsCheckBox', 'roadButtons', _trans.prefs.roadTypeButtons) ).append( $roadTypesDiv ),
                            createSettingsCheckbox('csRoutingTypeCheckBox', 'routingTypeButtons', _trans.prefs.routingTypeButtons),
                            createSettingsCheckbox('csElevationButtonsCheckBox', 'elevationButtons', _trans.prefs.elevationButtons),
                            createSettingsCheckbox('csParkingCostButtonsCheckBox', 'parkingCostButtons', _trans.prefs.parkingCostButtons),
                            createSettingsCheckbox('csParkingSpacesButtonsCheckBox', 'parkingSpacesButtons', _trans.prefs.parkingSpacesButtons)
                        ),
                        $('<label>', {class:"cs-group-label"}).text(_trans.prefs.spaceSaversGroup),
                        $('<div>', {style:'margin-bottom:8px;'}).append(
                            createSettingsCheckbox('csInlineRoadTypesCheckBox', 'inlineRoadTypeCheckboxes', _trans.prefs.inlineRoadType),
                            createSettingsCheckbox('csHideAvgSpeedCamerasCheckBox', 'hideAvgSpeedCameras', _trans.prefs.avgSpeedCameras),
                            createSettingsCheckbox('csInlineParkingBoxesCheckBox', 'inlineParkingCheckboxes', _trans.prefs.inlineParkingStuff)
                        )
                    )
                )
            );

            $panel.append(
                $('<div>',{style:'margin-top:20px;font-size:10px;color:#999999;'})
                .append($('<div>').text('version ' + argsObject.scriptVersion + (argsObject.scriptName.toLowerCase().indexOf('beta') > -1 ? ' beta' : '')))
                .append( $('<div>').append( $('<a>',{href:'https://www.waze.com/forum/viewtopic.php?f=819&t=199894', target:'__blank'}).text(_trans.prefs.discussionForumLinkText) ) )
            );

            $('#user-tabs > .nav-tabs').append($tab);
            $('#user-info > .flex-parent > .tab-content').append($panel);

            // Add change events
            $('#csRoadTypeButtonsCheckBox').change(function() {
                if(this.checked) {
                    $('.csRoadTypeButtonsCheckBoxContainer').show();
                } else {
                    $('.csRoadTypeButtonsCheckBoxContainer').hide();
                }
                saveSettingsToStorage();
            });
            $('.csSettingsCheckBox').change(function() {
                var checked = this.checked;
                var settingName = $(this).data('setting-name');
                if (settingName === 'roadType') {
                    var roadType = $(this).data('road-type');
                    var array = _settings.roadTypeButtons;
                    var index = array.indexOf(roadType);
                    if(checked && index === -1) {
                        array.push(roadType);
                    } else if (!checked && index !== -1) {
                        array.splice(index, 1);
                    }
                } else {
                    _settings[settingName] = checked;
                }
                saveSettingsToStorage();
            });
        }

        function updateControls() {
            if($(_roadTypeDropDownSelector).length>0) {
                if(isChecked('csRoadTypeButtonsCheckBox')) addRoadTypeButtons();
                if(isChecked('csHideAvgSpeedCamerasCheckBox')) hideAvgSpeedCameras();
                if(isChecked('csInlineRoadTypesCheckBox')) inlineRoadTypeCheckboxes();
            }
            if($(_parkingCostDropDownSelector).length>0 && isChecked('csInlineParkingBoxesCheckBox')) {
                inlineParkingCheckboxes();
            }
            if($(_routingTypeDropDownSelector && isChecked('csRoutingTypeCheckBox')).length>0) {
                addRoutingTypeButtons();
            }
            if ($(_elevationDropDownSelector).length>0 && isChecked('csElevationButtonsCheckBox')) {
                addElevationButtons();
            }
            if ($(_parkingSpacesDropDownSelector).length>0 && isChecked('csParkingSpacesButtonsCheckBox')) {
                addParkingSpacesButtons();  // TODO - add option setting
            }
            if ($(_parkingCostDropDownSelector).length>0 && isChecked('csParkingCostButtonsCheckBox')) {
                addParkingCostButtons();  // TODO - add option setting
            }
        }

        function replaceWord(target, searchWord, replaceWithWord) {
            return target.replace(new RegExp('\\b' + searchWord + '\\b','g'), replaceWithWord);
        }

        function titleCase(word) {
            return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
        }
        function mcCase(word) {
            return word.charAt(0).toUpperCase() + word.charAt(1).toLowerCase() + word.charAt(2).toUpperCase() + word.substring(3).toLowerCase();
        }
        function upperCase(word) {
            return word.toUpperCase();
        }

        function processSubstring(target, substringRegex, processFunction) {
            var substrings = target.match(substringRegex);
            if (substrings) {
                for (var idx=0; idx<substrings.length; idx++) {
                    var substring = substrings[idx];
                    var newSubstring = processFunction(substring);
                    target = replaceWord(target, substring, newSubstring);
                }
            }
            return target;
        }

        function onPaste(e) {
            var targetNode = e.target;
            if (targetNode.name === 'streetName' ||
                targetNode.className.indexOf('street-name') > -1) {

                // Get the text that's being pasted.
                var pastedText = e.clipboardData.getData('text/plain');

                // If pasting text in ALL CAPS...
                if (/^[^a-z]*$/.test(pastedText)) {
                    [
                        // Title case all words first.
                        [/\b[a-zA-Z]+(?:'S)?\b/g, titleCase],

                        // Then process special cases.
                        [/\bMC\w+\b/ig, mcCase],  // e.g. McCaulley
                        [/\b(?:I|US|SH|SR|CH|CR|CS|PR|PS)\s*-?\s*\d+\w*\b/ig, upperCase], // e.g. US-25, US25
                        [/\b(?:AL|AK|AS|AZ|AR|CA|CO|CT|DE|DC|FM|FL|GA|GU|HI|ID|IL|IN|IA|KS|KY|LA|ME|MH|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|MP|OH|OK|OR|PW|PA|PR|RI|SC|SD|TN|TX|UT|VT|VI|VA|WA|WV|WI|WY)\s*-?\s*\d+\w*\b/ig, upperCase], // e.g. WV-52
                        [/\b(?:NE|NW|SE|SW)\b/ig, upperCase]
                    ].forEach(function(item) {
                        pastedText = processSubstring(pastedText,item[0],item[1]);
                    });

                    // Insert new text in the focused node.
                    document.execCommand("insertText", false, pastedText);

                    // Prevent the default paste behavior.
                    e.preventDefault();
                    return false;
                }
            }
            return true;
        }

        function getTranslationObject() {
            if (argsObject.useDefaultTranslation) {
                return DEFAULT_TRANSLATION;
            } else {
                var locale = I18n.currentLocale().toLowerCase();
                if (!argsObject.translations.hasOwnProperty(locale)) {
                    locale = 'en-us';
                }
                return argsObject.translations[locale];
            }
        }

        function init() {
            // 2018-04-12 (mapomatic) This is only needed until the latest WME beta is pushed to production.
            // **************************************************
            if (!W.selectionManager.getSelectedFeatures) {
                W.selectionManager.getSelectedFeatures = W.selectionManager.getSelectedItems;
            }
            // **************************************************

            _trans = getTranslationObject();
            for (var rtName in _roadTypes) {
                _roadTypes[rtName].title = _trans.roadTypeButtons[rtName].title;
                _roadTypes[rtName].text = _trans.roadTypeButtons[rtName].text;
            }
            for (var d in _directions) {
                _directions[d].text = _trans.directionButtons[d].text;
                _directions[d].title = _trans.directionButtons[d].title;
            }

            document.addEventListener("paste", onPaste);
            _lastScriptVersion = localStorage.getItem('wmeClickSaver_lastVersion');
            localStorage.setItem('wmeClickSaver_lastVersion', argsObject.scriptVersion);
            showScriptInfoAlert();
            // check for changes in the edit-panel
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        var addedNode = mutation.addedNodes[i];

                        if (addedNode.nodeType === Node.ELEMENT_NODE) {
                            if(addedNode.querySelector(_roadTypeDropDownSelector)) {
                                if(isChecked('csRoadTypeButtonsCheckBox')) addRoadTypeButtons();
                                if(isChecked('csHideAvgSpeedCamerasCheckBox')) hideAvgSpeedCameras();
                                if(isChecked('csInlineRoadTypesCheckBox')) inlineRoadTypeCheckboxes();
                            }
                            if(addedNode.querySelector(_parkingCostDropDownSelector) && isChecked('csInlineParkingBoxesCheckBox')) {
                                inlineParkingCheckboxes();
                            }
                            if(addedNode.querySelector(_routingTypeDropDownSelector) && isChecked('csRoutingTypeCheckBox')) {
                                addRoutingTypeButtons();
                            }
                            if (addedNode.querySelector(_elevationDropDownSelector) && isChecked('csElevationButtonsCheckBox')) {
                                addElevationButtons();
                            }
                            if (addedNode.querySelector(_parkingSpacesDropDownSelector) && isChecked('csParkingSpacesButtonsCheckBox')) {
                                addParkingSpacesButtons();  // TODO - add option setting
                            }
                            if (addedNode.querySelector(_parkingCostDropDownSelector) && isChecked('csParkingCostButtonsCheckBox')) {
                                addParkingCostButtons();  // TODO - add option setting
                            }
                        }
                    }
                });
            });
            observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
            initUserPanel();
            loadSettingsFromStorage();
            injectCss();
            W.app.modeController.model.bind('change:mode', onModeChanged);
            W.prefs.on("change:isImperial", function() {initUserPanel();loadSettingsFromStorage();});
            updateControls();   // In case of PL w/ segments selected.
            W.selectionManager.events.register("selectionchanged", null, updateControls);

            if (typeof(require) !== "undefined") {
                UpdateObject = require("Waze/Action/UpdateObject");
                AddOrGetCity = require("Waze/Action/AddOrGetCity");
                AddOrGetStreet = require("Waze/Action/AddOrGetStreet");
                MultiAction = require("Waze/Action/MultiAction");
            }
            log('Initialized', 1);
        }

        function bootstrap() {
            if (window.require && W && W.loginManager &&
                W.loginManager.events.register &&
                W.map && W.loginManager.isLoggedIn()) {
                log('Initializing...', 1);
                init();
            } else {
                log('Bootstrap failed. Trying again...', 1);
                setTimeout(function () {
                    bootstrap();
                }, 250);
            }
        }

        var DEFAULT_TRANSLATION = {
            "roadTypeButtons":{
                "St":{"title":"Street","text":"St"},
                "PS":{"title":"Primary Street","text":"PS"},
                "mH":{"title":"Minor Highway","text":"mH"},
                "MH":{"title":"Major Highway","text":"MH"},
                "Fw":{"title":"Freeway","text":"Fw"},
                "Rmp":{"title":"Ramp","text":"Rmp"},
                "OR":{"title":"Off-road / Not Maintained","text":"OR"},
                "PLR":{"title":"Parking Lot Road","text":"PLR"},
                "PR":{"title":"Private Road","text":"PR"},
                "Fer":{"title":"Ferry","text":"Fer"},
                "WT":{"title":"Walking Trail (non-drivable)","text":"WT"},
                "PB":{"title":"Pedestrian Boardwalk (non-drivable)","text":"PB"},
                "Sw":{"title":"Stairway (non-drivable)","text":"Sw"},
                "RR":{"title":"Railroad (non-drivable)","text":"RR"},
                "RT":{"title":"Runway/Taxiway (non-drivable)","text":"RT"}
            },
            "directionButtons":{
                "twoWay":{"title":"Two way","text":"Two way"},
                "oneWayAB":{"title":"One way (A → B)","text":"A → B"},
                "oneWayBA":{"title":"One way (B → A)","text":"B → A"},
                "unknown":{"title":"Unknown","text":"?"}
            },
            "groundButtonText":"Ground",
            "autoLockButtonText":"Auto",
            "multiLockLevelWarning":"Multiple lock levels selected!",
            "prefs":{
                "dropdownHelperGroup":"DROPDOWN HELPERS",
                "roadTypeButtons":"Add road type buttons",
                "useOldRoadColors":"Use old road colors (requires refresh)",
                "setStreetCityToNone":"Set Street/City to None (new PLR only)",
                "setStreetCityToNone_Title":"NOTE: Only works if connected directly or indirectly to a segment with State/Country already set.",
                "setCityToConnectedSegCity":"Set City to connected segment's City",
                "routingTypeButtons":"Add routing type buttons",
                "elevationButtons":"Add elevation buttons",
                "parkingCostButtons":"Add PLA cost buttons",
                "parkingSpacesButtons":"Add PLA estimated spaces buttons",
                "spaceSaversGroup":"SPACE SAVERS",
                "inlineRoadType":"Inline road type checkboxes",
                "avgSpeedCameras":"Hide Avg Speed Cameras",
                "inlineParkingStuff":"Inline parking/payment type checkboxes",
                "discussionForumLinkText":"Discussion Forum"
            }
        };

        log('Bootstrap...', 1);
        bootstrap();

        //---------------------------------------------------------------------------------------------
        // ==UserScript==
        // @name         WMEQuickAltDel
        // @namespace    http://tampermonkey.net/
        // @version      0.0.2
        // @description  try to take over the world!
        // @author       Jonathan Angliss (modifications by MapOMatic)
        // @include      /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/.*$/
        // @grant        none
        // ==/UserScript==

        (function() {
            'use strict';

            var UpdateObject;

            function WMEaltStreet_Remove( elemClicked ) {
                var altID = parseInt($(elemClicked.currentTarget).data('id'));
                var selectedObjs = W.selectionManager.getSelectedFeatures();
                selectedObjs.forEach(function(element) {
                    if (element.model.type === 'segment') {
                        var segment = element.model;
                        if (segment.attributes.streetIDs.indexOf(altID) !== -1) {
                            var newStreets = [];
                            segment.attributes.streetIDs.forEach(function(sID) {
                                if (altID !== sID) {
                                    newStreets.push(sID);
                                }
                            });
                            var sUpdate = new UpdateObject(segment, {streetIDs: newStreets});
                            W.model.actionManager.add(sUpdate);
                            updateAltStreetCtrls();
                        }
                    }
                });
            }

            function bootstrap_WMEQuickAltDel() {
                if (window.require && W && W.loginManager &&
                    W.loginManager.events.register &&
                    W.map && W.loginManager.isLoggedIn()) {
                    init_WMEQuickAltDel();
                } else {
                    setTimeout(function () {
                        bootstrap_WMEQuickAltDel();
                    }, 250);
                }
            }

            function init_WMEQuickAltDel() {
                W.selectionManager.events.register("selectionchanged", null, updateAltStreetCtrls);
                W.model.actionManager.events.register("afterundoaction",null, updateAltStreetCtrls);
                W.model.actionManager.events.register("hasActions",null, function(){setTimeout(updateAltStreetCtrls, 250);});
                W.model.actionManager.events.register("noActions",null, function(){setTimeout(updateAltStreetCtrls, 250);});
                W.model.actionManager.events.register("afteraction",null, updateAltStreetCtrls);

                if (typeof(require) !== "undefined") {
                    UpdateObject = require("Waze/Action/UpdateObject");
                }

                var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if ($(mutation.target).hasClass('preview')) updateAltStreetCtrls();
                    });
                });
                observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
            }

            function updateAltStreetCtrls() {
                if (W.selectionManager.getSelectedFeatures().length > 0) {
                    var selItems = W.selectionManager.getSelectedFeatures();
                    if (selItems.length > 0 && selItems[0].model.type === 'segment') {
                        var $idElements = $('.add-alt-street-form .alt-street');
                        var $liElements = $('li.alt-street');
                        for (var i = 0; i < $idElements.length; i++) {
                            var $idElem = $idElements.eq(i);
                            var $liElem = $liElements.eq(i);
                            if($liElem.find('i').length === 0){//prevent duplicate entries
                                $liElem.append(
                                    $('<i>', {class:'fa fa-times-circle'}).css({cursor:'pointer'}).data('id', $idElem.data('id')).click(WMEaltStreet_Remove)
                                );
                            }
                        }
                    }
                }
            }

            bootstrap_WMEQuickAltDel();
        })();
    }

    function injectMain(argsObject) {
        var scriptElem = document.createElement("script");
        scriptElem.textContent = '(function(){' + main.toString() + "\n main(" + JSON.stringify(argsObject).replace("'","\\'") + ")})();";
        scriptElem.setAttribute("type", "application/javascript");
        document.body.appendChild(scriptElem);
    }

    function setValue(object, path, value) {
        var pathParts = path.split('.');
        for (var i = 0; i < pathParts.length - 1; i++) {
            var pathPart = pathParts[i];
            if (pathPart in object) {
                object = object[pathPart];
            } else {
                object[pathPart] = {};
                object = object[pathPart];
            }
        }
        object[pathParts[pathParts.length - 1]] = value;
    }

    function convertTranslationsArrayToObject(arrayIn) {
        var translations = {};
        var iRow, iCol;
        var languages = arrayIn[0].map(function(lang) { return lang.toLowerCase(); });
        for (iCol=1; iCol<languages.length; iCol++) {
            translations[languages[iCol]] = {};
        }
        for (iRow=1; iRow<arrayIn.length; iRow++) {
            var row = arrayIn[iRow];
            var propertyPath = row[0];
            for (iCol=1; iCol<row.length; iCol++) {
                setValue(translations[languages[iCol]], propertyPath, row[iCol]);
            }
        }
        return translations;
    }

    GM_xmlhttpRequest({
        url: 'https://docs.google.com/spreadsheets/d/aaa1ZlE9yhNncP9iZrPzFFa-FCtYuK58wNOEcmKqng4sH1M/pub?gid=0&single=true&output=tsv',
        method: 'GET',
        overrideMimeType: 'text/csv',
        onload: function(res) {
            var args;
            if (res.status === 200) {
                var translationsArray = res.responseText.split(/\r?\n/).map(function(t) { return t.split(/\t/); });
                args = { scriptName: GM_info.script.name, scriptVersion: GM_info.script.version, translations: convertTranslationsArrayToObject(translationsArray) };
            } else {
                args = { scriptName: GM_info.script.name, scriptVersion: GM_info.script.version, useDefaultTranslation: true };
            }
            injectMain(args);
        },
        onerror: function() {
            injectMain({ scriptName: GM_info.script.name, scriptVersion: GM_info.script.version, useDefaultTranslation: true });
        }
    });

})();
