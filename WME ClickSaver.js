// ==UserScript==
// @name            WME ClickSaver (beta)
// @namespace       https://greasyfork.org/users/45389
// @version         2019.01.23.001
// @description     Various UI changes to make editing faster and easier.
// @author          MapOMatic
// @include         /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @license         GNU GPLv3
// @connect         sheets.googleapis.com
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// @grant           GM_xmlhttpRequest
// ==/UserScript==

/* global GM_info */
/* global W */
/* global Node */
/* global I18n */
/* global OL */
/* global $ */
/* global document */
/* global MutationObserver */
/* global localStorage */
/* global confirm */
/* global alert */
/* global atob */

/* eslint-disable global-require */
const TRANSLATIONS_URL = 'https://sheets.googleapis.com/v4/spreadsheets/1ZlE9yhNncP9iZrPzFFa-FCtYuK58wNOEcmKqng4sH1M/values/ClickSaver';
const API_KEY = 'YTJWNVBVRkplbUZUZVVGMFl6aFVjMjVOTW0wNU5GaG5kVE40TUZoNWJVZEhWbU5rUjNacVdtdFlWUT09';
const DEC = s => atob(atob(s));
// This function is injected into the page.
function main(argsObject) {
    /* eslint-disable object-curly-newline */
    const DEBUG_LEVEL = 0;
    const ROAD_TYPE_DROPDOWN_SELECTOR = 'select[name="roadType"]';
    const ELEVATION_DROPDOWN_SELECTOR = '.side-panel-section select[name="level"]';
    const ROUTING_TYPE_DROPDOWN_SELECTOR = 'select[name="routingRoadType"]';
    const PARKING_SPACES_DROPDOWN_SELECTOR = 'select[name="estimatedNumberOfSpots"]';
    const PARKING_COST_DROPDOWN_SELECTOR = 'select[name="costType"]';
    const ALERT_UPDATE = false;
    const SETTINGS_STORE_NAME = 'clicksaver_settings';
    const SCRIPT_VERSION_CHANGES = [
        argsObject.scriptName,
        `v${argsObject.scriptVersion}`,
        '',
        'What\'s New',
        '------------------------------',
        '' // Add important changes here and set ALERT_UPDATE=true
    ].join('\n');
    const DEFAULT_TRANSLATION = {
        roadTypeButtons: {
            St: { title: 'Street', text: 'St' },
            PS: { title: 'Primary Street', text: 'PS' },
            mH: { title: 'Minor Highway', text: 'mH' },
            MH: { title: 'Major Highway', text: 'MH' },
            Fw: { title: 'Freeway', text: 'Fw' },
            Rmp: { title: 'Ramp', text: 'Rmp' },
            OR: { title: 'Off-road / Not Maintained', text: 'OR' },
            PLR: { title: 'Parking Lot Road', text: 'PLR' },
            PR: { title: 'Private Road', text: 'PR' },
            Fer: { title: 'Ferry', text: 'Fer' },
            WT: { title: 'Walking Trail', text: 'WT' },
            PB: { title: 'Pedestrian Boardwalk', text: 'PB' },
            Sw: { title: 'Stairway', text: 'Sw' },
            RR: { title: 'Railroad (non-drivable)', text: 'RR' },
            RT: { title: 'Runway/Taxiway (non-drivable)', text: 'RT' },
            Pw: { title: 'Passageway', text: 'Pw' }
        },
        directionButtons: {
            twoWay: { title: 'Two way', text: 'Two way' },
            oneWayAB: { title: 'One way (A → B)', text: 'A → B' },
            oneWayBA: { title: 'One way (B → A)', text: 'B → A' },
            unknown: { title: 'Unknown', text: '?' }
        },
        groundButtonText: 'Ground',
        autoLockButtonText: 'Auto',
        multiLockLevelWarning: 'Multiple lock levels selected!',
        prefs: {
            dropdownHelperGroup: 'DROPDOWN HELPERS',
            roadTypeButtons: 'Add road type buttons',
            useOldRoadColors: 'Use old road colors (requires refresh)',
            setStreetCityToNone: 'Set Street/City to None (new seg\'s only)',
            setStreetCityToNone_Title: 'NOTE: Only works if connected directly or indirectly'
                + ' to a segment with State / Country already set.',
            setCityToConnectedSegCity: 'Set City to connected segment\'s City',
            routingTypeButtons: 'Add routing type buttons',
            elevationButtons: 'Add elevation buttons',
            parkingCostButtons: 'Add PLA cost buttons',
            parkingSpacesButtons: 'Add PLA estimated spaces buttons',
            spaceSaversGroup: 'SPACE SAVERS',
            inlineRoadType: 'Inline road type checkboxes',
            avgSpeedCameras: 'Hide Avg Speed Cameras',
            inlineParkingStuff: 'Inline parking/payment type checkboxes',
            discussionForumLinkText: 'Discussion Forum'
        }
    };
    const ROAD_TYPES = {
        St: { val: 1, wmeColor: '#ffffeb', svColor: '#ffffff', category: 'streets', visible: true },
        PS: { val: 2, wmeColor: '#f0ea58', svColor: '#cba12e', category: 'streets', visible: true },
        Pw: { val: 22, wmeColor: '#beba6c', svColor: '#beba6c', category: 'streets', visible: false },
        mH: { val: 7, wmeColor: '#69bf88', svColor: '#ece589', category: 'highways', visible: true },
        MH: { val: 6, wmeColor: '#45b8d1', svColor: '#c13040', category: 'highways', visible: true },
        Fw: { val: 3, wmeColor: '#c577d2', svColor: '#387fb8', category: 'highways', visible: false },
        Rmp: { val: 4, wmeColor: '#b3bfb3', svColor: '#58c53b', category: 'highways', visible: false },
        OR: { val: 8, wmeColor: '#867342', svColor: '#82614a', category: 'otherDrivable', visible: false },
        PLR: { val: 20, wmeColor: '#ababab', svColor: '#2282ab', category: 'otherDrivable', visible: true },
        PR: { val: 17, wmeColor: '#beba6c', svColor: '#00ffb3', category: 'otherDrivable', visible: true },
        Fer: { val: 15, wmeColor: '#d7d8f8', svColor: '#ff8000', category: 'otherDrivable', visible: false },
        RR: { val: 18, wmeColor: '#c62925', svColor: '#ffffff', category: 'nonDrivable', visible: false },
        RT: { val: 19, wmeColor: '#ffffff', svColor: '#00ff00', category: 'nonDrivable', visible: false },
        WT: { val: 5, wmeColor: '#b0a790', svColor: '#00ff00', category: 'pedestrian', visible: false },
        PB: { val: 10, wmeColor: '#9a9a9a', svColor: '#0000ff', category: 'pedestrian', visible: false },
        Sw: { val: 16, wmeColor: '#999999', svColor: '#b700ff', category: 'pedestrian', visible: false }
    };
    const DIRECTIONS = { twoWay: { val: 3 }, oneWayAB: { val: 1 }, oneWayBA: { val: 2 }, unknown: { val: 0 } };
    /* eslint-enable object-curly-newline */
    let _settings = {};
    let _lastScriptVersion;
    let _trans; // Translation object

    const UpdateObject = require('Waze/Action/UpdateObject');
    const UpdateFeatureAddress = require('Waze/Action/UpdateFeatureAddress');
    const MultiAction = require('Waze/Action/MultiAction');
    const AddSeg = require('Waze/Action/AddSegment');
    const Segment = require('Waze/Feature/Vector/Segment');
    const DelSeg = require('Waze/Action/DeleteSegment');

    function log(message, level) {
        if (message && level <= DEBUG_LEVEL) {
            console.log('ClickSaver:', message);
        }
    }

    function isChecked(checkboxId) {
        return $(`#${checkboxId}`).is(':checked');
    }

    function setChecked(checkboxId, checked) {
        $(`#${checkboxId}`).prop('checked', checked);
    }
    function loadSettingsFromStorage() {
        const loadedSettings = $.parseJSON(localStorage.getItem(SETTINGS_STORE_NAME));
        const defaultSettings = {
            lastVersion: null,
            roadButtons: true,
            roadTypeButtons: ['St', 'PS', 'mH', 'MH', 'Fw', 'Rmp', 'PLR', 'PR'],
            lockButtons: true,
            elevationButtons: true,
            directionButtons: true,
            routingTypeButtons: true,
            parkingCostButtons: true,
            parkingSpacesButtons: true,
            setNewPLRStreetToNone: true,
            setNewPLRCity: true,
            setNewPRStreetToNone: false,
            setNewPRCity: false,
            addAltCityButton: true,
            addSwapPedestrianButton: false,
            useOldRoadColors: false,
            warnOnPedestrianTypeSwap: true
        };
        _settings = loadedSettings || defaultSettings;
        Object.keys(defaultSettings).forEach(prop => {
            if (!_settings.hasOwnProperty(prop)) {
                _settings[prop] = defaultSettings[prop];
            }
        });

        setChecked('csRoadTypeButtonsCheckBox', _settings.roadButtons);
        if (_settings.roadTypeButtons) {
            Object.keys(ROAD_TYPES).forEach(roadTypeAbbr1 => {
                setChecked(`cs${roadTypeAbbr1}CheckBox`, _settings.roadTypeButtons.indexOf(roadTypeAbbr1) !== -1);
            });
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
        setChecked('csClearNewPLRCheckBox', _settings.setNewPLRStreetToNone);
        setChecked('csClearNewPRCheckBox', _settings.setNewPRStreetToNone);
        setChecked('csUseOldRoadColorsCheckBox', _settings.useOldRoadColors);
        setChecked('csSetNewPLRCityCheckBox', _settings.setNewPLRCity);
        setChecked('csSetNewPRCityCheckBox', _settings.setNewPRCity);
        setChecked('csAddAltCityButtonCheckBox', _settings.addAltCityButton);
        setChecked('csAddSwapPedestrianButtonCheckBox', _settings.addSwapPedestrianButton);
    }

    function saveSettingsToStorage() {
        if (localStorage) {
            const settings = {
                lastVersion: argsObject.scriptVersion,
                roadButtons: _settings.roadButtons,
                lockButtons: _settings.lockButtons,
                elevationButtons: _settings.elevationButtons,
                directionButtons: _settings.directionButtons,
                parkingCostButtons: _settings.parkingCostButtons,
                parkingSpacesButtons: _settings.parkingSpacesButtons,
                setNewPLRStreetToNone: _settings.setNewPLRStreetToNone,
                setNewPRStreetToNone: _settings.setNewPRStreetToNone,
                useOldRoadColors: _settings.useOldRoadColors,
                setNewPLRCity: _settings.setNewPLRCity,
                setNewPRCity: _settings.setNewPRCity,
                addAltCityButton: _settings.addAltCityButton,
                addSwapPedestrianButton: _settings.addSwapPedestrianButton,
                warnOnPedestrianTypeSwap: _settings.warnOnPedestrianTypeSwap
            };
            settings.roadTypeButtons = [];
            Object.keys(ROAD_TYPES).forEach(roadTypeAbbr => {
                if (_settings.roadTypeButtons.indexOf(roadTypeAbbr) !== -1) {
                    settings.roadTypeButtons.push(roadTypeAbbr);
                }
            });
            localStorage.setItem(SETTINGS_STORE_NAME, JSON.stringify(settings));
            log('Settings saved', 1);
        }
    }

    function isPedestrianTypeSegment(segment) {
        return [5, 10, 16].indexOf(segment.attributes.roadType) > -1;
    }

    function getConnectedSegmentIDs(segmentID) {
        const IDs = [];
        const segment = W.model.segments.getObjectById(segmentID);
        [
            W.model.nodes.getObjectById(segment.attributes.fromNodeID),
            W.model.nodes.getObjectById(segment.attributes.toNodeID)
        ].forEach(node => {
            if (node) {
                node.attributes.segIDs.forEach(segID => {
                    if (segID !== segmentID) { IDs.push(segID); }
                });
            }
        });
        return IDs;
    }

    function getFirstConnectedStateID(startSegment) {
        let stateID = null;
        const nonMatches = [];
        const segmentIDsToSearch = [startSegment.attributes.id];
        while (stateID === null && segmentIDsToSearch.length > 0) {
            const startSegmentID = segmentIDsToSearch.pop();
            startSegment = W.model.segments.getObjectById(startSegmentID);
            const connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
            for (let i = 0; i < connectedSegmentIDs.length; i++) {
                const streetID = W.model.segments.getObjectById(connectedSegmentIDs[i]).attributes.primaryStreetID;
                if (streetID !== null && typeof (streetID) !== 'undefined') {
                    const { cityID } = W.model.streets.getObjectById(streetID);
                    ({ stateID } = W.model.cities.getObjectById(cityID).attributes);
                    break;
                }
            }

            if (stateID === null) {
                nonMatches.push(startSegmentID);
                connectedSegmentIDs.forEach(segmentID => {
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
        let cityID = null;
        const nonMatches = [];
        const segmentIDsToSearch = [startSegment.attributes.id];
        while (cityID === null && segmentIDsToSearch.length > 0) {
            const startSegmentID = segmentIDsToSearch.pop();
            startSegment = W.model.segments.getObjectById(startSegmentID);
            const connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
            for (let i = 0; i < connectedSegmentIDs.length; i++) {
                const { primaryStreetID } = W.model.segments.getObjectById(connectedSegmentIDs[i]).attributes;
                if (primaryStreetID !== null && typeof (primaryStreetID) !== 'undefined') {
                    ({ cityID } = W.model.streets.getObjectById(primaryStreetID));
                    break;
                }
            }

            if (cityID === null) {
                nonMatches.push(startSegmentID);
                connectedSegmentIDs.forEach(segmentID => {
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

    function setStreetAndCity(setCity) {
        const segments = W.selectionManager.getSelectedFeatures();
        if (segments.length === 0 || segments[0].model.type !== 'segment') {
            return;
        }

        const mAction = new MultiAction();
        mAction.setModel(W.model);
        segments.forEach(segment => {
            const segModel = segment.model;
            if (segModel.attributes.primaryStreetID === null) {
                const stateID = getFirstConnectedStateID(segment.model);
                if (stateID) {
                    let cityToSet;
                    if (setCity) cityToSet = W.model.cities.getObjectById(getFirstConnectedCityID(segment.model));
                    const cityName = cityToSet ? cityToSet.attributes.name : '';
                    const { countryID } = W.model.states.getObjectById(stateID);
                    const action = new UpdateFeatureAddress(segModel, {
                        countryID, stateID, cityName, emptyStreet: true
                    }, { streetIDField: 'primaryStreetID' });
                    mAction.doSubAction(action);
                }
            }
        });
        const count = mAction.subActions.length;
        if (count) {
            mAction._description = `Updated address on ${count} segment${count > 1 ? 's' : ''}`;
            W.model.actionManager.add(mAction);
        }
    }

    function onAddAltCityButtonClick() {
        $('.full-address').click();
        $('.add-alt-street-btn').click();
        $('.alt-street-block input.street-name').val($('input.street-name').first().val()).blur().change();
        if ($('input.alt-address.empty-city').is(':checked')) $('input.alt-address.empty-city').click();
        $('.alt-street-block input.city-name').last().val('').focus();
    }

    function onRoadTypeButtonClick(roadTypeAbbr) {
        $(ROAD_TYPE_DROPDOWN_SELECTOR).val(ROAD_TYPES[roadTypeAbbr].val).change();
        if (roadTypeAbbr === 'PLR' && isChecked('csClearNewPLRCheckBox') && require) {
            setStreetAndCity(isChecked('csSetNewPLRCityCheckBox'));
        } else if (roadTypeAbbr === 'PR' && isChecked('csClearNewPRCheckBox') && require) {
            setStreetAndCity(isChecked('csSetNewPRCityCheckBox'));
        }
    }

    function filterAddressElem() {
        return $(this).text() === 'Address';
    }

    function addRoadTypeButtons() {
        const seg = W.selectionManager.getSelectedFeatures()[0].model;
        if (seg.type !== 'segment') return;
        const isPed = isPedestrianTypeSegment(seg);
        const $dropDown = $(ROAD_TYPE_DROPDOWN_SELECTOR);
        $('#csRoadTypeButtonsContainer').remove();
        const $container = $('<div>', { id: 'csRoadTypeButtonsContainer', class: 'rth-btn-container' });
        const $street = $('<div>', { id: 'csStreetButtonContainer', class: 'cs-rt-btn-container' });
        const $highway = $('<div>', { id: 'csHighwayButtonContainer', class: 'cs-rt-btn-container' });
        const $otherDrivable = $('<div>', { id: 'csOtherDrivableButtonContainer', class: 'cs-rt-btn-container' });
        const $nonDrivable = $('<div>', { id: 'csNonDrivableButtonContainer', class: 'cs-rt-btn-container' });
        const $pedestrian = $('<div>', { id: 'csPedestrianButtonContainer', class: 'cs-rt-btn-container' });
        const divs = {
            streets: $street,
            highways: $highway,
            otherDrivable: $otherDrivable,
            nonDrivable: $nonDrivable,
            pedestrian: $pedestrian
        };
        Object.keys(ROAD_TYPES).forEach(roadTypeKey => {
            if (_settings.roadTypeButtons.indexOf(roadTypeKey) !== -1) {
                const roadType = ROAD_TYPES[roadTypeKey];
                if ((roadType.category === 'pedestrian' && isPed) || (roadType.category !== 'pedestrian' && !isPed)) {
                    const $div = divs[roadType.category];
                    $div.append(
                        $('<div>', {
                            class: `btn btn-rth btn-rth-${roadTypeKey}${$dropDown.attr('disabled')
                                ? ' disabled'
                                : ''} btn-positive`,
                            title: _trans.roadTypeButtons[roadTypeKey].title
                        })
                            .text(_trans.roadTypeButtons[roadTypeKey].text)
                            .prop('checked', roadType.visible)
                            .data('key', roadTypeKey)
                            // TODO: change onRoadTypeButtonClick hander to work with element rather than data
                            .click(function rtbClick() { onRoadTypeButtonClick($(this).data('key')); })
                    );
                }
            }
        });
        if (isPed) {
            $container.append($pedestrian);
        } else {
            $container.append($street).append($highway).append($otherDrivable).append($nonDrivable);
        }
        $dropDown.before($container);
    }

    function addRoutingTypeButtons() {
        const $dropDown = $(ROUTING_TYPE_DROPDOWN_SELECTOR);
        if ($dropDown.length > 0) {
            const options = $dropDown.children();
            if (options.length === 3) {
                const buttonInfos = [
                    ['-1', options[0].value, options[0].text],
                    [options[1].text, options[1].value, ''],
                    ['+1', options[2].value, options[2].text]
                ];
                $('#csRoutingTypeContainer').remove();
                // TODO css
                const $form = $('<div>', { id: 'csRoutingTypeContainer', style: 'height:16px;padding-top:0px' });
                for (let i = 0; i < buttonInfos.length; i++) {
                    const btnInfo = buttonInfos[i];
                    const $input = $('<input>', {
                        type: 'radio', name: 'routingRoadType', id: `routingRoadType${i}`, value: btnInfo[1]
                    }).click(function onRouteTypeClick() {
                        $(ROUTING_TYPE_DROPDOWN_SELECTOR).val($(this).attr('value')).change();
                    });
                    if (String(btnInfo[1]) === String($dropDown.val())) $input.prop('checked', 'true');
                    $form.append(
                        // TODO css
                        $('<div>', {
                            class: 'controls-container',
                            style: 'float: left; margin-right: 10px;margin-left: 0px;padding-top: 0px;'
                        }).append(
                            $input,
                            $('<label>', {
                                // TODO css
                                for: `routingRoadType${i}`, style: 'padding-left: 20px;', title: btnInfo[2]
                            }).text(btnInfo[0])
                        )
                    );
                }
                $dropDown.before($form);
                $dropDown.hide();
            }
        }
    }

    function isPLA(item) {
        return (item.model.type === 'venue') && item.model.attributes.categories.indexOf('PARKING_LOT') > -1;
    }

    function addParkingSpacesButtons() {
        const $dropDown = $(PARKING_SPACES_DROPDOWN_SELECTOR);
        const selItems = W.selectionManager.getSelectedFeatures();
        const item = selItems[0];

        // If it's not a PLA, exit.
        if (!isPLA(item)) return;

        $('#csParkingSpacesContainer').remove();
        const $div = $('<div>', { id: 'csParkingSpacesContainer' });
        const dropdownDisabled = $dropDown.attr('disabled') === 'disabled';
        const optionNodes = $(`${PARKING_SPACES_DROPDOWN_SELECTOR} option`);

        for (let i = 0; i < optionNodes.length; i++) {
            const $option = $(optionNodes[i]);
            const text = $option.text();
            const selected = $option.val() === $dropDown.val();
            $div.append(
                // TODO css
                $('<div>', {
                    class: `btn waze-btn waze-btn-white${selected ? ' waze-btn-blue' : ''}${
                        dropdownDisabled ? ' disabled' : ''}`,
                    style: 'margin-bottom: 5px; height: 22px; padding: 2px 8px 0px 8px; margin-right: 3px;'
                })
                    .text(text)
                    .data('val', $option.val())
                    // eslint-disable-next-line func-names
                    .hover(() => { })
                    .click(function onParkingSpacesButtonClick() {
                        if (!dropdownDisabled) {
                            $(PARKING_SPACES_DROPDOWN_SELECTOR).val($(this).data('val')).change();
                            addParkingSpacesButtons();
                        }
                    })
            );
        }

        $dropDown.before($div);
        $dropDown.hide();
    }

    function addParkingCostButtons() {
        const $dropDown = $(PARKING_COST_DROPDOWN_SELECTOR);
        const selItems = W.selectionManager.getSelectedFeatures();
        const item = selItems[0];

        // If it's not a PLA, exit.
        if (!isPLA(item)) return;

        $('#csParkingCostContainer').remove();
        const $div = $('<div>', { id: 'csParkingCostContainer' });
        const dropdownDisabled = $dropDown.attr('disabled') === 'disabled';
        const optionNodes = $(`${PARKING_COST_DROPDOWN_SELECTOR} option`);
        for (let i = 0; i < optionNodes.length; i++) {
            const $option = $(optionNodes[i]);
            const text = $option.text();
            const selected = $option.val() === $dropDown.val();
            $div.append(
                $('<div>', {
                    class: `btn waze-btn waze-btn-white${selected ? ' waze-btn-blue' : ''}${
                        dropdownDisabled ? ' disabled' : ''}`,
                    // TODO css
                    style: 'margin-bottom: 5px; height: 22px; padding: 2px 8px 0px 8px; margin-right: 4px;'
                })
                    .text(text !== '' ? text : '?')
                    .data('val', $option.val())
                    // eslint-disable-next-line func-names
                    .hover(() => { })
                    .click(function onParkingCostButtonClick() {
                        if (!dropdownDisabled) {
                            $(PARKING_COST_DROPDOWN_SELECTOR).val($(this).data('val')).change();
                            addParkingCostButtons();
                        }
                    })
            );
        }

        $dropDown.before($div);
        $dropDown.hide();
    }

    function addElevationButtons() {
        const id = 'csElevationButtonsContainer';
        if ($(`#${id}`).length === 0) {
            const $dropDown = $(ELEVATION_DROPDOWN_SELECTOR);
            const baseClass = `btn waze-btn waze-btn-white${$dropDown.attr('disabled') ? ' disabled' : ''}`;
            // TODO css
            const style = 'height: 20px;padding-left: 8px;padding-right: 8px;margin-right: 4px;padding-top: 1px;';
            // TODO css
            const $div = $('<div>', { id, style: 'margin-bottom: 5px;' }).append(
                $('<div>', { class: baseClass, style }).text('-').click(() => {
                    const level = parseInt($(ELEVATION_DROPDOWN_SELECTOR).val(), 10);
                    if (level > -5) { $(ELEVATION_DROPDOWN_SELECTOR).val(level - 1).change(); }
                })
            ).append(
                $('<div>', { class: baseClass, style }).text(_trans.groundButtonText)
                    .click(() => {
                        const level = parseInt($(ELEVATION_DROPDOWN_SELECTOR).val(), 10);
                        if (level !== 0) { $(ELEVATION_DROPDOWN_SELECTOR).val(0).change(); }
                    })
            ).append(
                $('<div>', { class: baseClass, style }).text('+').click(() => {
                    const level = parseInt($(ELEVATION_DROPDOWN_SELECTOR).val(), 10);
                    if (level < 9) { $(ELEVATION_DROPDOWN_SELECTOR).val(level + 1).change(); }
                })
            );
            // TODO css
            $dropDown.css({ display: 'inline-block', width: '120px', marginRight: '10px' });
            $dropDown.before($div);
            $dropDown.detach();
            $div.prepend($dropDown);
        }
    }

    function addAddAltCityButton() {
        const id = 'csAddAltCityButton';
        if (W.selectionManager.getSelectedFeatures()[0].model.type === 'segment' && $(`#${id}`).length === 0) {
            $('label.control-label').filter(filterAddressElem).append(
                $('<a>', {
                    href: '#',
                    // TODO css
                    style: 'float: right;text-transform: none;'
                        + 'font-family: "Helvetica Neue", Helvetica, "Open Sans", sans-serif;color: #26bae8;'
                        + 'font-weight: normal;'
                }).text('Add alt city').click(onAddAltCityButtonClick)
            );
        }
    }

    function addSwapPedestrianButton() {
        const id = 'csSwapPedestrianContainer';
        $(`#${id}`).remove();
        if (W.selectionManager.getSelectedFeatures().length === 1) {
            if (W.selectionManager.getSelectedFeatures()[0].model.type === 'segment') {
                // TODO css
                const $container = $('<div>', { id, style: 'white-space: nowrap;float: right;display: inline;' });
                const $button = $('<div>', {
                    id: 'csBtnSwapPedestrianRoadType',
                    title: '',
                    // TODO css
                    style: 'display:inline-block;cursor:pointer;'
                });
                $button.append('<span class="fa fa-arrows-h" style="font-size:20px; color:#e84545;"></span>')
                    .attr({
                        title: 'Swap between driving-type and walking-type segments.\nWARNING!'
                            + ' This will DELETE and recreate the segment.  Nodes may need to be reconnected.'
                    });
                $container.append($button);
                const $label = $('select[name="roadType"]').closest('.form-group').children('label').first();
                // TODO css
                $label.css({ display: 'inline' }).after($container);

                $('#csBtnSwapPedestrianRoadType').click(() => {
                    if (_settings.warnOnPedestrianTypeSwap) {
                        _settings.warnOnPedestrianTypeSwap = false;
                        saveSettingsToStorage();
                        if (!confirm('This will DELETE the segment and recreate it. Any speed data will be lost,'
                            + ' and nodes will need to be reconnected (if applicable).'
                            + ' This message will only be displayed once. Continue?')) {
                            return;
                        }
                    }

                    const multiaction = new MultiAction();
                    multiaction.setModel(W.model);

                    // delete the selected segment
                    let segment = W.selectionManager.getSelectedFeatures()[0];
                    const oldGeom = segment.geometry.clone();
                    multiaction.doSubAction(new DelSeg(segment.model));

                    // create the replacement segment in the other segment type (pedestrian -> road & vice versa)
                    const newRoadType = isPedestrianTypeSegment(segment.model) ? 1 : 5;
                    segment = new Segment({ geometry: oldGeom, roadType: newRoadType });
                    segment.state = OL.State.INSERT;
                    multiaction.doSubAction(new AddSeg(segment, {
                        createNodes: !0,
                        openAllTurns: W.prefs.get('enableTurnsByDefault'),
                        createTwoWay: W.prefs.get('twoWaySegmentsByDefault'),
                        snappedFeatures: [null, null]
                    }));
                    W.model.actionManager.add(multiaction);
                    const newId = W.model.repos.segments.idGenerator.lastValue;
                    const newSegment = W.model.segments.getObjectById(newId);
                    W.selectionManager.setSelectedModels([newSegment]);
                });
            }
        }
    }

    function showScriptInfoAlert() {
        /* Check version and alert on update */
        if (ALERT_UPDATE && argsObject.scriptVersion !== _lastScriptVersion) {
            alert(SCRIPT_VERSION_CHANGES);
        }
    }

    /* eslint-disable no-bitwise, no-mixed-operators */
    function shadeColor2(color, percent) {
        const f = parseInt(color.slice(1), 16);
        const t = percent < 0 ? 0 : 255;
        const p = percent < 0 ? percent * -1 : percent;
        const R = f >> 16;
        const G = f >> 8 & 0x00FF;
        const B = f & 0x0000FF;
        return `#${(0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G)
            * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1)}`;
    }
    /* eslint-enable no-bitwise, no-mixed-operators */

    function buildRoadTypeButtonCss() {
        const lines = [];
        const useOldColors = _settings.useOldRoadColors;
        Object.keys(ROAD_TYPES).forEach(roadTypeAbbr => {
            const roadType = ROAD_TYPES[roadTypeAbbr];
            const bgColor = useOldColors ? roadType.svColor : roadType.wmeColor;
            let output = `.rth-btn-container .btn-rth-${roadTypeAbbr} {background-color:${
                bgColor};box-shadow:0 2px ${shadeColor2(bgColor, -0.5)};border-color:${shadeColor2(bgColor, -0.15)};}`;
            output += ` .rth-btn-container .btn-rth-${roadTypeAbbr}:hover {background-color:${
                shadeColor2(bgColor, 0.2)}}`;
            lines.push(output);
        });
        return lines.join(' ');
    }

    function injectCss() {
        const css = [
            // Road type button formatting
            '.csRoadTypeButtonsCheckBoxContainer {margin-left:15px;}',
            '.rth-btn-container {margin-bottom:5px;}',
            '.rth-btn-container .btn-rth {font-size:11px;line-height:20px;color:black;padding:0px 4px;height:20px;'
            + 'margin-right:2px;border-style:solid;border-width:1px;}',
            buildRoadTypeButtonCss(),
            '.btn.btn-rth:active {box-shadow:none;transform:translateY(2px)}',
            'div .cs-rt-btn-container {float:left; margin: 0px 5px 5px 0px;}',
            '#sidepanel-clicksaver .controls-container {padding:0px;}',
            '#sidepanel-clicksaver .controls-container label {white-space: normal;}',

            // Lock button formatting
            '.btn-lh {cursor:pointer;padding:1px 6px;height:22px;border:solid 1px #c1c1c1;margin-right:3px;}',
            '.btn.btn-lh.btn-lh-selected {background-color:#6999ae;color:white}',
            '.btn.btn-lh.btn-lh-selected:hover {color:white}',
            '.btn.btn-lh.disabled {color:#909090;background-color:#f7f7f7;}',
            '.btn.btn-lh.btn-lh-selected.disabled {color:white;background-color:#6999ae;}',
            '.cs-group-label {font-size: 11px; width: 100%; font-family: Poppins, sans-serif;'
            + ' text-transform: uppercase; font-weight: 700; color: #354148; margin-bottom: 6px;}'
        ].join(' ');
        $(`<style type="text/css">${css}</style>`).appendTo('head');
    }

    function onModeChanged(model, modeId) {
        if (!modeId || modeId === 1) {
            initUserPanel();
            loadSettingsFromStorage();
        }
    }

    function createSettingsCheckbox(id, settingName, labelText, titleText, divCss, labelCss, optionalAttributes) {
        const $container = $('<div>', { class: 'controls-container' });
        const $input = $('<input>', {
            type: 'checkbox', class: 'csSettingsCheckBox', name: id, id, 'data-setting-name': settingName
        }).appendTo($container);
        const $label = $('<label>', { for: id }).text(labelText).appendTo($container);
        // TODO css
        if (divCss) $container.css(divCss);
        // TODO css
        if (labelCss) $label.css(labelCss);
        if (titleText) $container.attr({ title: titleText });
        if (optionalAttributes) $input.attr(optionalAttributes);
        return $container;
    }

    function initUserPanel() {
        const $roadTypesDiv = $('<div>', { class: 'csRoadTypeButtonsCheckBoxContainer' });
        $roadTypesDiv.append(
            createSettingsCheckbox('csUseOldRoadColorsCheckBox', 'useOldRoadColors', _trans.prefs.useOldRoadColors)
        );
        Object.keys(ROAD_TYPES).forEach(roadTypeAbbr => {
            const roadType = ROAD_TYPES[roadTypeAbbr];
            const id = `cs${roadTypeAbbr}CheckBox`;
            $roadTypesDiv.append(
                createSettingsCheckbox(id, 'roadType', roadType.title, null, null, null, {
                    'data-road-type': roadTypeAbbr
                })
            );
            if (roadTypeAbbr === 'PLR' || roadTypeAbbr === 'PR') {
                $roadTypesDiv.append(
                    // TODO css
                    createSettingsCheckbox(`csClearNew${roadTypeAbbr}CheckBox`, `setNew${roadTypeAbbr}StreetToNone`,
                        _trans.prefs.setStreetCityToNone, _trans.prefs.setStreetCityToNone_Title,
                        { paddingLeft: '20px', display: 'inline', marginRight: '4px' }, { fontStyle: 'italic' }),
                    createSettingsCheckbox(`csSetNew${roadTypeAbbr}CityCheckBox`, `setNew${roadTypeAbbr}City`,
                        _trans.prefs.setCityToConnectedSegCity, '',
                        { paddingLeft: '30px', marginRight: '4px' }, { fontStyle: 'italic' })
                );
            }
        });

        const $tab = $('<li>', { title: argsObject.scriptName }).append(
            $('<a>', { 'data-toggle': 'tab', href: '#sidepanel-clicksaver' }).append($('<span>').text('CS'))
        );

        const $panel = $('<div>', { class: 'tab-pane', id: 'sidepanel-clicksaver' }).append(
            $('<div>', { class: 'side-panel-section>' }).append(
                // TODO css
                $('<div>', { style: 'margin-bottom:8px;' }).append(
                    $('<div>', { class: 'form-group' }).append(
                        $('<label>', { class: 'cs-group-label' }).text(_trans.prefs.dropdownHelperGroup),
                        $('<div>').append(
                            createSettingsCheckbox('csRoadTypeButtonsCheckBox', 'roadButtons',
                                _trans.prefs.roadTypeButtons)
                        ).append($roadTypesDiv),
                        createSettingsCheckbox('csRoutingTypeCheckBox', 'routingTypeButtons',
                            _trans.prefs.routingTypeButtons),
                        createSettingsCheckbox('csElevationButtonsCheckBox', 'elevationButtons',
                            _trans.prefs.elevationButtons),
                        createSettingsCheckbox('csParkingCostButtonsCheckBox', 'parkingCostButtons',
                            _trans.prefs.parkingCostButtons),
                        createSettingsCheckbox('csParkingSpacesButtonsCheckBox', 'parkingSpacesButtons',
                            _trans.prefs.parkingSpacesButtons)
                    ),
                    $('<label>', { class: 'cs-group-label' }).text('Time Savers'),
                    $('<div>', { style: 'margin-bottom:8px;' }).append(
                        createSettingsCheckbox('csAddAltCityButtonCheckBox', 'addAltCityButton',
                            'Show "Add alt city" button'),
                        W.loginManager.user.rank >= 3 ? createSettingsCheckbox('csAddSwapPedestrianButtonCheckBox',
                            'addSwapPedestrianButton', 'Show "Swap driving<->walking segment type" button') : ''
                    )
                )
            )
        );

        $panel.append(
            // TODO css
            $('<div>', { style: 'margin-top:20px;font-size:10px;color:#999999;' }).append(
                $('<div>').text(`version ${argsObject.scriptVersion}${
                    argsObject.scriptName.toLowerCase().indexOf('beta') > -1 ? ' beta' : ''}`),
                $('<div>').append(
                    $('<a>', { href: 'https://www.waze.com/forum/viewtopic.php?f=819&t=199894', target: '__blank' })
                        .text(_trans.prefs.discussionForumLinkText)
                )
            )
        );

        $('#user-tabs > .nav-tabs').append($tab);
        $('#user-info > .flex-parent > .tab-content').append($panel);

        // Add change events
        $('#csRoadTypeButtonsCheckBox').change(function onRoadTypeButtonCheckChanged() {
            if (this.checked) {
                $('.csRoadTypeButtonsCheckBoxContainer').show();
            } else {
                $('.csRoadTypeButtonsCheckBoxContainer').hide();
            }
            saveSettingsToStorage();
        });
        $('.csSettingsCheckBox').change(function onSettingsCheckChanged() {
            const { checked } = this;
            const settingName = $(this).data('setting-name');
            if (settingName === 'roadType') {
                const roadType = $(this).data('road-type');
                const array = _settings.roadTypeButtons;
                const index = array.indexOf(roadType);
                if (checked && index === -1) {
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
        if ($(ROAD_TYPE_DROPDOWN_SELECTOR).length > 0) {
            if (isChecked('csRoadTypeButtonsCheckBox')) addRoadTypeButtons();
        }
        if ($(ROUTING_TYPE_DROPDOWN_SELECTOR && isChecked('csRoutingTypeCheckBox')).length > 0) {
            addRoutingTypeButtons();
        }
        if ($(ELEVATION_DROPDOWN_SELECTOR).length > 0 && isChecked('csElevationButtonsCheckBox')) {
            addElevationButtons();
        }
        if ($(PARKING_SPACES_DROPDOWN_SELECTOR).length > 0 && isChecked('csParkingSpacesButtonsCheckBox')) {
            addParkingSpacesButtons(); // TODO - add option setting
        }
        if ($(PARKING_COST_DROPDOWN_SELECTOR).length > 0 && isChecked('csParkingCostButtonsCheckBox')) {
            addParkingCostButtons(); // TODO - add option setting
        }
    }

    function replaceWord(target, searchWord, replaceWithWord) {
        return target.replace(new RegExp(`\\b${searchWord}\\b`, 'g'), replaceWithWord);
    }

    function titleCase(word) {
        return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
    }
    function mcCase(word) {
        return word.charAt(0).toUpperCase() + word.charAt(1).toLowerCase()
            + word.charAt(2).toUpperCase() + word.substring(3).toLowerCase();
    }
    function upperCase(word) {
        return word.toUpperCase();
    }

    function processSubstring(target, substringRegex, processFunction) {
        const substrings = target.match(substringRegex);
        if (substrings) {
            for (let idx = 0; idx < substrings.length; idx++) {
                const substring = substrings[idx];
                const newSubstring = processFunction(substring);
                target = replaceWord(target, substring, newSubstring);
            }
        }
        return target;
    }

    function onPaste(e) {
        const targetNode = e.target;
        if (targetNode.name === 'streetName' || targetNode.className.indexOf('street-name') > -1) {
            // Get the text that's being pasted.
            let pastedText = e.clipboardData.getData('text/plain');

            // If pasting text in ALL CAPS...
            if (/^[^a-z]*$/.test(pastedText)) {
                [
                    // Title case all words first.
                    [/\b[a-zA-Z]+(?:'S)?\b/g, titleCase],

                    // Then process special cases.
                    [/\bMC\w+\b/ig, mcCase], // e.g. McCaulley
                    [/\b(?:I|US|SH|SR|CH|CR|CS|PR|PS)\s*-?\s*\d+\w*\b/ig, upperCase], // e.g. US-25, US25
                    /* eslint-disable-next-line max-len */
                    [/\b(?:AL|AK|AS|AZ|AR|CA|CO|CT|DE|DC|FM|FL|GA|GU|HI|ID|IL|IN|IA|KS|KY|LA|ME|MH|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|MP|OH|OK|OR|PW|PA|PR|RI|SC|SD|TN|TX|UT|VT|VI|VA|WA|WV|WI|WY)\s*-?\s*\d+\w*\b/ig, upperCase], // e.g. WV-52
                    [/\b(?:NE|NW|SE|SW)\b/ig, upperCase]
                ].forEach(item => {
                    pastedText = processSubstring(pastedText, item[0], item[1]);
                });

                // Insert new text in the focused node.
                document.execCommand('insertText', false, pastedText);

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
        }
        let locale = I18n.currentLocale().toLowerCase();
        if (!argsObject.translations.hasOwnProperty(locale)) {
            locale = 'en-us';
        }
        return argsObject.translations[locale];
    }

    function errorHandler(callback) {
        try {
            callback();
        } catch (ex) {
            console.error(`${argsObject.scriptName}:`, ex);
        }
    }

    function init() {
        _trans = getTranslationObject();
        Object.keys(ROAD_TYPES).forEach(rtName => {
            ROAD_TYPES[rtName].title = _trans.roadTypeButtons[rtName].title;
            ROAD_TYPES[rtName].text = _trans.roadTypeButtons[rtName].text;
        });
        Object.keys(DIRECTIONS).forEach(d => {
            DIRECTIONS[d].text = _trans.directionButtons[d].text;
            DIRECTIONS[d].title = _trans.directionButtons[d].title;
        });

        document.addEventListener('paste', onPaste);
        _lastScriptVersion = localStorage.getItem('wmeClickSaver_lastVersion');
        localStorage.setItem('wmeClickSaver_lastVersion', argsObject.scriptVersion);
        showScriptInfoAlert();
        // check for changes in the edit-panel
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const addedNode = mutation.addedNodes[i];

                    if (addedNode.nodeType === Node.ELEMENT_NODE) {
                        if (addedNode.querySelector(ROAD_TYPE_DROPDOWN_SELECTOR)) {
                            if (isChecked('csRoadTypeButtonsCheckBox')) addRoadTypeButtons();
                            if (W.loginManager.user.rank >= 3 && isChecked('csAddSwapPedestrianButtonCheckBox')) {
                                addSwapPedestrianButton();
                            }
                        }
                        if (addedNode.querySelector(ROUTING_TYPE_DROPDOWN_SELECTOR)
                            && isChecked('csRoutingTypeCheckBox')) {
                            addRoutingTypeButtons();
                        }
                        if (addedNode.querySelector(ELEVATION_DROPDOWN_SELECTOR)
                            && isChecked('csElevationButtonsCheckBox')) {
                            addElevationButtons();
                        }
                        if (addedNode.querySelector(PARKING_SPACES_DROPDOWN_SELECTOR)
                            && isChecked('csParkingSpacesButtonsCheckBox')) {
                            addParkingSpacesButtons(); // TODO - add option setting
                        }
                        if (addedNode.querySelector(PARKING_COST_DROPDOWN_SELECTOR)
                            && isChecked('csParkingCostButtonsCheckBox')) {
                            addParkingCostButtons(); // TODO - add option setting
                        }
                        if ($(addedNode).find('label').filter(filterAddressElem).length
                            && isChecked('csAddAltCityButtonCheckBox')) {
                            addAddAltCityButton();
                        }
                    }
                }
            });
        });

        observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
        initUserPanel();
        loadSettingsFromStorage();
        injectCss();
        W.app.modeController.model.bind('change:mode', () => errorHandler(onModeChanged));
        W.prefs.on('change:isImperial', () => errorHandler(() => { initUserPanel(); loadSettingsFromStorage(); }));
        updateControls(); // In case of PL w/ segments selected.
        W.selectionManager.events.register('selectionchanged', null, () => errorHandler(updateControls));

        log('Initialized', 1);
    }

    //---------------------------------------------------------------------------------------------
    // The following code (Quick Alt Delete) was originally written by jangliss.
    // Huge thanks to him for the help!
    //---------------------------------------------------------------------------------------------

    function wmeAltStreetRemove(elemClicked) {
        const altID = parseInt($(elemClicked.currentTarget).data('id'), 10);
        const selectedObjs = W.selectionManager.getSelectedFeatures();
        selectedObjs.forEach(element => {
            if (element.model.type === 'segment') {
                const segment = element.model;
                if (segment.attributes.streetIDs.indexOf(altID) !== -1) {
                    const newStreets = [];
                    segment.attributes.streetIDs.forEach(sID => {
                        if (altID !== sID) newStreets.push(sID);
                    });
                    const sUpdate = new UpdateObject(segment, { streetIDs: newStreets });
                    W.model.actionManager.add(sUpdate);
                    updateAltStreetCtrls();
                }
            }
        });
    }

    function initWmeQuickAltDel() {
        W.selectionManager.events.register('selectionchanged', null,
            () => errorHandler(updateAltStreetCtrls));
        W.model.actionManager.events.register('afterundoaction', null,
            () => errorHandler(updateAltStreetCtrls));
        W.model.actionManager.events.register('hasActions', null,
            () => errorHandler(() => setTimeout(updateAltStreetCtrls, 250)));
        W.model.actionManager.events.register('noActions', null,
            () => errorHandler(() => setTimeout(updateAltStreetCtrls, 250)));
        W.model.actionManager.events.register('afteraction', null,
            () => errorHandler(updateAltStreetCtrls));

        const observer = new MutationObserver((mutations => {
            mutations.forEach(mutation => {
                if ($(mutation.target).hasClass('preview')) updateAltStreetCtrls();
            });
        }));
        observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
    }

    function updateAltStreetCtrls() {
        if (W.selectionManager.getSelectedFeatures().length > 0) {
            const selItems = W.selectionManager.getSelectedFeatures();
            if (selItems.length > 0 && selItems[0].model.type === 'segment') {
                const $idElements = $('.add-alt-street-form .alt-street');
                const $liElements = $('li.alt-street');
                for (let i = 0; i < $idElements.length; i++) {
                    const $idElem = $idElements.eq(i);
                    const $liElem = $liElements.eq(i);
                    if ($liElem.find('i').length === 0) { // prevent duplicate entries
                        $liElem.append(
                            $('<i>', { class: 'fa fa-times-circle' })
                                // TODO css
                                .css({ cursor: 'pointer' })
                                .data('id', $idElem.data('id'))
                                .click(wmeAltStreetRemove)
                        );
                    }
                }
            }
        }
    }

    function bootstrap() {
        if (require && W && W.loginManager && W.loginManager.events.register && W.map && W.loginManager.user) {
            log('Initializing...', 1);
            init();
            initWmeQuickAltDel();
        } else {
            log('Bootstrap failed. Trying again...', 1);
            setTimeout(bootstrap, 250);
        }
    }

    log('Bootstrap...', 1);
    bootstrap();
} // END Main function (code to be injected)

function injectMain(argsObject) {
    const scriptElem = document.createElement('script');
    scriptElem.textContent = `(function(){${main.toString()}\n main(${
        JSON.stringify(argsObject).replace('\'', '\\\'')})})();`;
    scriptElem.setAttribute('type', 'application/javascript');
    document.body.appendChild(scriptElem);
}

function setValue(object, path, value) {
    const pathParts = path.split('.');
    for (let i = 0; i < pathParts.length - 1; i++) {
        const pathPart = pathParts[i];
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
    const translations = {};
    let iRow;
    let iCol;
    const languages = arrayIn[0].map(lang => lang.toLowerCase());
    for (iCol = 1; iCol < languages.length; iCol++) {
        translations[languages[iCol]] = {};
    }
    for (iRow = 1; iRow < arrayIn.length; iRow++) {
        const row = arrayIn[iRow];
        const propertyPath = row[0];
        for (iCol = 1; iCol < row.length; iCol++) {
            setValue(translations[languages[iCol]], propertyPath, row[iCol]);
        }
    }
    return translations;
}

// This call retrieves the data from the translations spreadsheet and then injects
// the main code into the page.  If the spreadsheet call fails, the default English
// translation is used.
$.getJSON(`${TRANSLATIONS_URL}?${DEC(API_KEY)}`).then(res => {
    const args = {
        scriptName: GM_info.script.name,
        scriptVersion: GM_info.script.version,
        translations: convertTranslationsArrayToObject(res.values)
    };
    injectMain(args);
}).fail(() => {
    console.error('ClickSaver: Error loading translations spreadsheet. Using default translation (English).');
    injectMain({
        scriptName: GM_info.script.name,
        scriptVersion: GM_info.script.version,
        useDefaultTranslation: true
    });
});
