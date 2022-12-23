// ==UserScript==
// @name            WME ClickSaver
// @namespace       https://greasyfork.org/users/45389
// @version         2022.12.22.004
// @description     Various UI changes to make editing faster and easier.
// @author          MapOMatic
// @include         /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @license         GNU GPLv3
// @connect         sheets.googleapis.com
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// @grant           GM_xmlhttpRequest
// @grant           GM_addElement
// @require         https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// ==/UserScript==

/* global GM_info */
/* global W */
/* global I18n */
/* global OL */
/* global $ */
/* global WazeWrap */
/* global GM_addElement */

(function() {
    'use strict';

    const UPDATE_MESSAGE = '';

    const SCRIPT_NAME = GM_info.script.name;
    const SCRIPT_VERSION = GM_info.script.version;
    const FORUM_URL = 'https://www.waze.com/forum/viewtopic.php?f=819&t=199894';
    const TRANSLATIONS_URL = 'https://sheets.googleapis.com/v4/spreadsheets/1ZlE9yhNncP9iZrPzFFa-FCtYuK58wNOEcmKqng4sH1M/values/ClickSaver';
    const API_KEY = 'YTJWNVBVRkplbUZUZVVGMFl6aFVjMjVOTW0wNU5GaG5kVE40TUZoNWJVZEhWbU5rUjNacVdtdFlWUT09';
    const DEC = s => atob(atob(s));
    const EXTERNAL_SETTINGS = {
        toggleTwoWaySegDrawingShortcut: null
    };
    const EXTERNAL_SETTINGS_NAME = 'clicksaver_settings_ext';

    // This function is injected into the page.
    function main(argsObject) {
        /* eslint-disable object-curly-newline */
        const ROAD_TYPE_DROPDOWN_SELECTOR = 'wz-select[name="roadType"]';
        const ROAD_TYPE_CHIP_SELECTOR = 'wz-chip-select[class="road-type-chip-select"]';
        // const PARKING_SPACES_DROPDOWN_SELECTOR = 'select[name="estimatedNumberOfSpots"]';
        // const PARKING_COST_DROPDOWN_SELECTOR = 'select[name="costType"]';
        const SETTINGS_STORE_NAME = 'clicksaver_settings';
        const DEFAULT_TRANSLATION = {
            roadTypeButtons: {
                St: { text: 'St' },
                PS: { text: 'PS' },
                mH: { text: 'mH' },
                MH: { text: 'MH' },
                Fw: { text: 'Fw' },
                Rmp: { text: 'Rmp' },
                OR: { text: 'OR' },
                PLR: { text: 'PLR' },
                PR: { text: 'PR' },
                Fer: { text: 'Fer' },
                WT: { text: 'WT' },
                PB: { text: 'PB' },
                Sw: { text: 'Sw' },
                RR: { text: 'RR' },
                RT: { text: 'RT' },
                Pw: { text: 'Pw' }
            },
            prefs: {
                dropdownHelperGroup: 'DROPDOWN HELPERS',
                roadTypeButtons: 'Add road type buttons',
                useOldRoadColors: 'Use old road colors (requires refresh)',
                setStreetCityToNone: 'Set Street/City to None (new seg\'s only)',
                setStreetCityToNone_Title: 'NOTE: Only works if connected directly or indirectly'
                    + ' to a segment with State / Country already set.',
                setCityToConnectedSegCity: 'Set City to connected segment\'s City',
                parkingCostButtons: 'Add PLA cost buttons',
                parkingSpacesButtons: 'Add PLA estimated spaces buttons',
                timeSaversGroup: 'TIME SAVERS',
                discussionForumLinkText: 'Discussion Forum',
                showAddAltCityButton: 'Show "Add alt city" button',
                showSwapDrivingWalkingButton: 'Show "Swap driving<->walking segment type" button',
                showSwapDrivingWalkingButton_Title: 'Swap between driving-type and walking-type segments. WARNING! This will DELETE and recreate the segment. Nodes may need to be reconnected.',
                addCompactColors: 'Add colors to compact mode road type buttons'
            },
            swapSegmentTypeWarning: 'This will DELETE the segment and recreate it. Any speed data will be lost, and nodes will need to be reconnected. This message will only be displayed once. Continue?',
            swapSegmentTypeError_Paths: 'Paths must be removed from segment before changing between driving and pedestrian road type.',
            addAltCityButtonText: 'Add alt city'
        };
        const ROAD_TYPES = {
            St: { val: 1, wmeColor: '#ffffeb', svColor: '#ffffff', category: 'streets', visible: true },
            PS: { val: 2, wmeColor: '#f0ea58', svColor: '#cba12e', category: 'streets', visible: true },
            Pw: { val: 22, wmeColor: '#64799a', svColor: '#64799a', category: 'streets', visible: false },
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

        /* eslint-enable object-curly-newline */
        let _settings = {};
        let _trans; // Translation object

        // Do not make these const values.  They may get assigned before require() is defined.  Trust me.  Don't do it.
        let UpdateObject;
        let UpdateFeatureAddress;
        let MultiAction;
        let AddSeg;
        let Segment;
        let DelSeg;

        // function log(message) {
        //     console.log('ClickSaver:', message);
        // }

        function logDebug(message) {
            console.debug('ClickSaver:', message);
        }

        // function logWarning(message) {
        //     console.warn('ClickSaver:', message);
        // }

        // function logError(message) {
        //     console.error('ClickSaver:', message);
        // }

        function isChecked(checkboxId) {
            return $(`#${checkboxId}`).is(':checked');
        }

        function isSwapPedestrianPermitted() {
            const { user } = W.loginManager;
            const rank = user.rank + 1;
            return rank >= 4 || (rank === 3 && user.isAreaManager);
        }

        function setChecked(checkboxId, checked) {
            $(`#${checkboxId}`).prop('checked', checked);
        }
        function loadSettingsFromStorage() {
            const loadedSettings = $.parseJSON(localStorage.getItem(SETTINGS_STORE_NAME));
            const defaultSettings = {
                lastVersion: null,
                roadButtons: true,
                roadTypeButtons: ['St', 'PS', 'mH', 'MH', 'Fw', 'Rmp', 'PLR', 'PR', 'PB'],
                parkingCostButtons: true,
                parkingSpacesButtons: true,
                setNewPLRStreetToNone: true,
                setNewPLRCity: true,
                setNewPRStreetToNone: false,
                setNewPRCity: false,
                setNewRRStreetToNone: true, // added by jm6087
                setNewRRCity: false, // added by jm6087
                setNewPBStreetToNone: true, // added by jm6087
                setNewPBCity: true, // added by jm6087
                setNewORStreetToNone: false,
                setNewORCity: false,
                addAltCityButton: true,
                addSwapPedestrianButton: false,
                useOldRoadColors: false,
                warnOnPedestrianTypeSwap: true,
                addCompactColors: true
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
            // setChecked('csParkingSpacesButtonsCheckBox', _settings.parkingSpacesButtons);
            // setChecked('csParkingCostButtonsCheckBox', _settings.parkingCostButtons);
            setChecked('csSetNewPLRCityCheckBox', _settings.setNewPLRCity);
            setChecked('csClearNewPLRCheckBox', _settings.setNewPLRStreetToNone);
            setChecked('csSetNewPRCityCheckBox', _settings.setNewPRCity);
            setChecked('csClearNewPRCheckBox', _settings.setNewPRStreetToNone);
            setChecked('csSetNewRRCityCheckBox', _settings.setNewRRCity);
            setChecked('csClearNewRRCheckBox', _settings.setNewRRStreetToNone); // added by jm6087
            setChecked('csSetNewPBCityCheckBox', _settings.setNewPBCity);
            setChecked('csClearNewPBCheckBox', _settings.setNewPBStreetToNone); // added by jm6087
            setChecked('csSetNewORCityCheckBox', _settings.setNewORCity);
            setChecked('csClearNewORCheckBox', _settings.setNewORStreetToNone);
            setChecked('csUseOldRoadColorsCheckBox', _settings.useOldRoadColors);
            setChecked('csAddAltCityButtonCheckBox', _settings.addAltCityButton);
            setChecked('csAddSwapPedestrianButtonCheckBox', _settings.addSwapPedestrianButton);
            setChecked('csAddCompactColorsCheckBox', _settings.addCompactColors);
        }

        function saveSettingsToStorage() {
            if (localStorage) {
                const settings = {
                    lastVersion: argsObject.scriptVersion,
                    roadButtons: _settings.roadButtons,
                    parkingCostButtons: _settings.parkingCostButtons,
                    parkingSpacesButtons: _settings.parkingSpacesButtons,
                    setNewPLRCity: _settings.setNewPLRCity,
                    setNewPLRStreetToNone: _settings.setNewPLRStreetToNone,
                    setNewPRCity: _settings.setNewPRCity,
                    setNewPRStreetToNone: _settings.setNewPRStreetToNone,
                    setNewRRCity: _settings.setNewRRCity,
                    setNewRRStreetToNone: _settings.setNewRRStreetToNone, // added by jm6087
                    setNewPBCity: _settings.setNewPBCity,
                    setNewPBStreetToNone: _settings.setNewPBStreetToNone, // added by jm6087
                    setNewORCity: _settings.setNewORCity,
                    setNewORStreetToNone: _settings.setNewORStreetToNone,
                    useOldRoadColors: _settings.useOldRoadColors,
                    addAltCityButton: _settings.addAltCityButton,
                    addSwapPedestrianButton: _settings.addSwapPedestrianButton,
                    warnOnPedestrianTypeSwap: _settings.warnOnPedestrianTypeSwap,
                    addCompactColors: _settings.addCompactColors
                };
                settings.roadTypeButtons = [];
                Object.keys(ROAD_TYPES).forEach(roadTypeAbbr => {
                    if (_settings.roadTypeButtons.indexOf(roadTypeAbbr) !== -1) {
                        settings.roadTypeButtons.push(roadTypeAbbr);
                    }
                });
                localStorage.setItem(SETTINGS_STORE_NAME, JSON.stringify(settings));
                logDebug('Settings saved');
            }
        }

        function isPedestrianTypeSegment(segment) {
            return [5, 10, 16].includes(segment.attributes.roadType);
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

        function getFirstConnectedSegmentAddress(startSegment) {
            const nonMatches = [];
            const segmentIDsToSearch = [startSegment.getID()];
            while (segmentIDsToSearch.length > 0) {
                const startSegmentID = segmentIDsToSearch.pop();
                startSegment = W.model.segments.getObjectById(startSegmentID);
                const connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
                for (let i = 0; i < connectedSegmentIDs.length; i++) {
                    const addr = W.model.segments.getObjectById(connectedSegmentIDs[i]).getAddress();
                    if (!addr.isEmpty()) {
                        return addr;
                    }
                }

                nonMatches.push(startSegmentID);
                connectedSegmentIDs.forEach(segmentID => {
                    if (nonMatches.indexOf(segmentID) === -1 && segmentIDsToSearch.indexOf(segmentID) === -1) {
                        segmentIDsToSearch.push(segmentID);
                    }
                });
            }
            return undefined;
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
                    const addr = getFirstConnectedSegmentAddress(segModel);
                    if (addr && !addr.isEmpty()) {
                        const cityNameToSet = setCity && !addr.getCity().isEmpty() ? addr.getCityName() : '';
                        const action = new UpdateFeatureAddress(segModel, {
                            countryID: addr.getCountry().id,
                            stateID: addr.getState().id,
                            cityName: cityNameToSet,
                            emptyStreet: true,
                            emptyCity: !setCity
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

        function waitForElem(selector, callback) {
            const elem = document.querySelector(selector);
            setTimeout(() => {
                if (!elem) {
                    waitForElem(selector, callback);
                } else {
                    callback(elem);
                }
            }, 10);
        }

        function waitForShadowElem(parentElemSelector, shadowElemSelector, callback) {
            setTimeout(() => {
                const parentElem = document.querySelector(parentElemSelector);
                const sRoot = parentElem ? parentElem.shadowRoot : null;
                const shadowElem = sRoot ? sRoot.querySelector(shadowElemSelector) : null;
                if (!shadowElem) {
                    waitForShadowElem(parentElemSelector, shadowElemSelector, callback);
                } else {
                    callback(shadowElem, parentElem);
                }
            }, 10);
        }

        // eslint-disable-next-line no-unused-vars
        function onAddAltCityButtonClick() {
            const streetID = W.selectionManager.getSelectedFeatures()[0].model.attributes.primaryStreetID;
            $('wz-button[class="add-alt-street-btn"]').click();
            waitForElem('wz-autocomplete.alt-street-name', elem => {
                elem.focus();
                waitForShadowElem('wz-autocomplete.alt-street-name', `wz-menu-item[item-id="${streetID}"]`, shadowElem => {
                    shadowElem.click();
                    const emptyCityCheckbox = $('wz-checkbox.empty-city');
                    if (emptyCityCheckbox[0].checked) { emptyCityCheckbox.click(); }
                    waitForShadowElem('wz-autocomplete.alt-city-name', 'wz-text-input', (cityTextElem, cityAutocompleteElem) => {
                        cityTextElem.value = null;
                        cityAutocompleteElem.focus();
                    });
                });
            });
        }

        function onRoadTypeButtonClick(roadTypeVal) {
            const segments = W.selectionManager.getSelectedFeatures();
            let action;
            if (segments.length > 1) {
                action = new MultiAction();
                action.setModel(W.model);
                segments.forEach(segment => {
                    const subAction = new UpdateObject(segment.model, { roadType: roadTypeVal });
                    action.doSubAction(subAction);
                });
                action._description = I18n.t(
                    'save.changes_log.actions.UpdateObject.changed',
                    {
                        propertyName: I18n.t('objects.segment.fields.roadType'),
                        objectsString: I18n.t('objects.segment.multi', { count: segments.length }),
                        value: I18n.t('segment.road_types')[roadTypeVal]
                    }
                );
            } else {
                action = new UpdateObject(segments[0].model, { roadType: roadTypeVal });
            }
            W.model.actionManager.add(action);

            if (roadTypeVal === 20 && isChecked('csClearNewPLRCheckBox') && typeof require !== 'undefined') {
                setStreetAndCity(isChecked('csSetNewPLRCityCheckBox'));
            } else if (roadTypeVal === 17 && isChecked('csClearNewPRCheckBox') && typeof require !== 'undefined') {
                setStreetAndCity(isChecked('csSetNewPRCityCheckBox'));
            } else if (roadTypeVal === 18 && isChecked('csClearNewRRCheckBox') && typeof require !== 'undefined') { // added by jm6087
                setStreetAndCity(isChecked('csSetNewRRCityCheckBox')); // added by jm6087
            } else if (roadTypeVal === 10 && isChecked('csClearNewPBCheckBox') && typeof require !== 'undefined') { // added by jm6087
                setStreetAndCity(isChecked('csSetNewPBCityCheckBox')); // added by jm6087
            } else if (roadTypeVal === 8 && isChecked('csClearNewORCheckBox') && typeof require !== 'undefined') {
                setStreetAndCity(isChecked('csSetNewORCityCheckBox'));
            }
        }

        function addRoadTypeButtons() {
            let seg = W.selectionManager.getSelectedFeatures()[0];
            if (!seg) return;
            seg = seg.model;
            if (seg.type !== 'segment') return;
            const isPed = isPedestrianTypeSegment(seg);
            const $dropDown = $(ROAD_TYPE_DROPDOWN_SELECTOR);
            $('#csRoadTypeButtonsContainer').remove();
            const $container = $('<div>', { id: 'csRoadTypeButtonsContainer', class: 'cs-rt-buttons-container', style: 'display: inline-table;' });
            const $street = $('<div>', { id: 'csStreetButtonContainer', class: 'cs-rt-buttons-group' });
            const $highway = $('<div>', { id: 'csHighwayButtonContainer', class: 'cs-rt-buttons-group' });
            const $otherDrivable = $('<div>', { id: 'csOtherDrivableButtonContainer', class: 'cs-rt-buttons-group' });
            const $nonDrivable = $('<div>', { id: 'csNonDrivableButtonContainer', class: 'cs-rt-buttons-group' });
            const $pedestrian = $('<div>', { id: 'csPedestrianButtonContainer', class: 'cs-rt-buttons-group' });
            const divs = {
                streets: $street,
                highways: $highway,
                otherDrivable: $otherDrivable,
                nonDrivable: $nonDrivable,
                pedestrian: $pedestrian
            };
            Object.keys(ROAD_TYPES).forEach(roadTypeKey => {
                if (_settings.roadTypeButtons.includes(roadTypeKey)) {
                    const roadType = ROAD_TYPES[roadTypeKey];
                    const isDisabled = $dropDown[0].hasAttribute('disabled') && $dropDown[0].getAttribute('disabled') === 'true';
                    if (!isDisabled && ((roadType.category === 'pedestrian' && isPed) || (roadType.category !== 'pedestrian' && !isPed))) {
                        const $div = divs[roadType.category];
                        $div.append(
                            $('<div>', {
                                class: `btn cs-rt-button cs-rt-button-${roadTypeKey} btn-positive`,
                                title: I18n.t('segment.road_types')[roadType.val]
                            })
                                .text(_trans.roadTypeButtons[roadTypeKey].text)
                                .prop('checked', roadType.visible)
                                .data('val', roadType.val)
                                .click(function rtbClick() { onRoadTypeButtonClick($(this).data('val')); })
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

        // Function to add an event listener to the chip select for the road type in compact mode
        function addCompactRoadTypeChangeEvents() {
            const chipSelect = document.getElementsByClassName('road-type-chip-select')[0];
            chipSelect.addEventListener('chipSelected', evt => {
                const rtValue = evt.detail.value;
                onRoadTypeButtonClick(rtValue);
            });
        }

        // Function to add road type colors to the chips in compact mode
        function addCompactRoadTypeColors() {
            const useOldColors = _settings.useOldRoadColors;
            $('.road-type-chip-select wz-checkable-chip').addClass('cs-compact-button');
            Object.keys(ROAD_TYPES).forEach(roadTypeKey => {
                const roadType = ROAD_TYPES[roadTypeKey];
                const bgColor = useOldColors ? roadType.svColor : roadType.wmeColor;
                const rtChip = $(`.road-type-chip-select wz-checkable-chip[value=${roadType.val}]`);
                if (rtChip.length !== 1) return;
                waitForShadowElem(`.road-type-chip-select wz-checkable-chip[value='${roadType.val}']`, 'div', shadowElem => {
                    const $elem = $(shadowElem);
                    $elem.css({ backgroundColor: bgColor, padding: '0px 8px' });
                });
            });
            waitForShadowElem('.road-type-chip-select wz-checkable-chip[checked=""]', 'div', shadowElem => {
                $(shadowElem).css({ border: 'black 2px solid' });
            });
        }

        // function isPLA(item) {
        //     return (item.model.type === 'venue') && item.model.attributes.categories.includes('PARKING_LOT');
        // }

        // function addParkingSpacesButtons() {
        //     const $dropDown = $(PARKING_SPACES_DROPDOWN_SELECTOR);
        //     const selItems = W.selectionManager.getSelectedFeatures();
        //     const item = selItems[0];

        //     // If it's not a PLA, exit.
        //     if (!isPLA(item)) return;

        //     $('#csParkingSpacesContainer').remove();
        //     const $div = $('<div>', { id: 'csParkingSpacesContainer' });
        //     const dropdownDisabled = $dropDown.attr('disabled') === 'disabled';
        //     const optionNodes = $(`${PARKING_SPACES_DROPDOWN_SELECTOR} option`);

        //     for (let i = 0; i < optionNodes.length; i++) {
        //         const $option = $(optionNodes[i]);
        //         const text = $option.text();
        //         const selected = $option.val() === $dropDown.val();
        //         $div.append(
        //             // TODO css
        //             $('<div>', {
        //                 class: `btn waze-btn waze-btn-white${selected ? ' waze-btn-blue' : ''}${dropdownDisabled ? ' disabled' : ''}`,
        //                 style: 'margin-bottom: 5px; height: 22px; padding: 2px 8px 0px 8px; margin-right: 3px;'
        //             })
        //                 .text(text)
        //                 .data('val', $option.val())
        //                 // eslint-disable-next-line func-names
        //                 .hover(() => { })
        //                 .click(function onParkingSpacesButtonClick() {
        //                     if (!dropdownDisabled) {
        //                         $(PARKING_SPACES_DROPDOWN_SELECTOR).val($(this).data('val')).change();
        //                         addParkingSpacesButtons();
        //                     }
        //                 })
        //         );
        //     }

        //     $dropDown.before($div);
        //     $dropDown.hide();
        // }

        // function addParkingCostButtons() {
        //     const $dropDown = $(PARKING_COST_DROPDOWN_SELECTOR);
        //     const selItems = W.selectionManager.getSelectedFeatures();
        //     const item = selItems[0];

        //     // If it's not a PLA, exit.
        //     if (!isPLA(item)) return;

        //     $('#csParkingCostContainer').remove();
        //     const $div = $('<div>', { id: 'csParkingCostContainer' });
        //     const dropdownDisabled = $dropDown.attr('disabled') === 'disabled';
        //     const optionNodes = $(`${PARKING_COST_DROPDOWN_SELECTOR} option`);
        //     for (let i = 0; i < optionNodes.length; i++) {
        //         const $option = $(optionNodes[i]);
        //         const text = $option.text();
        //         const selected = $option.val() === $dropDown.val();
        //         $div.append(
        //             $('<div>', {
        //                 class: `btn waze-btn waze-btn-white${selected ? ' waze-btn-blue' : ''}${dropdownDisabled ? ' disabled' : ''}`,
        //                 // TODO css
        //                 style: 'margin-bottom: 5px; height: 22px; padding: 2px 8px 0px 8px; margin-right: 4px;'
        //             })
        //                 .text(text !== '' ? text : '?')
        //                 .data('val', $option.val())
        //                 // eslint-disable-next-line func-names
        //                 .hover(() => { })
        //                 .click(function onParkingCostButtonClick() {
        //                     if (!dropdownDisabled) {
        //                         $(PARKING_COST_DROPDOWN_SELECTOR).val($(this).data('val')).change();
        //                         addParkingCostButtons();
        //                     }
        //                 })
        //         );
        //     }

        //     $dropDown.before($div);
        //     $dropDown.hide();
        // }

        function addAddAltCityButton() {
            const selFeatures = W.selectionManager.getSelectedFeatures();
            const streetID = selFeatures[0].model.attributes.primaryStreetID;
            // Only show the button if every segment has the same primary city and street.
            if (selFeatures.length > 1 && !selFeatures.every(f => f.model.attributes.primaryStreetID === streetID)) return;

            const id = 'csAddAltCityButton';
            if (selFeatures[0].model.type === 'segment' && $(`#${id}`).length === 0) {
                $('div.address-edit').prev('wz-label').append(
                    $('<a>', {
                        href: '#',
                        // TODO css
                        style: 'float: right;text-transform: none;'
                            + 'font-family: "Helvetica Neue", Helvetica, "Open Sans", sans-serif;color: #26bae8;'
                            + 'font-weight: normal;'
                    }).text(_trans.addAltCityButtonText).click(onAddAltCityButtonClick)
                );
            }
        }

        function addSwapPedestrianButton(displayMode) { // Added displayMode argument to identify compact vs. regular mode.
            const id = 'csSwapPedestrianContainer';
            $(`#${id}`).remove();
            const selectedFeatures = W.selectionManager.getSelectedFeatures();
            if (selectedFeatures.length === 1 && selectedFeatures[0].model.type === 'segment') {
                // TODO css
                const $container = $('<div>', { id, style: 'white-space: nowrap;float: right;display: inline;' });
                const $button = $('<div>', {
                    id: 'csBtnSwapPedestrianRoadType',
                    title: '',
                    // TODO css
                    style: 'display:inline-block;cursor:pointer;'
                });
                $button.append('<i class="fa fa-blind fa-lg"></i><i class="fa fa-arrows-h fa-lg" style="color:#e84545"></i><i class="fa fa-car fa-lg"></i>')
                    .attr({
                        title: _trans.prefs.showSwapDrivingWalkingButton_Title
                    });
                $container.append($button);

                // Insert swap button in the correct location based on display mode.
                if (displayMode === 'compact') {
                    const $label = $('#segment-edit-general > form > div.road-type-control.form-group > wz-label');
                    $label.css({ display: 'inline' }).append($container);
                } else {
                    const $label = $('#segment-edit-general > form > div.road-type-control.form-group > wz-label');
                    $label.css({ display: 'inline' }).append($container);
                }
                // TODO css

                $('#csBtnSwapPedestrianRoadType').click(() => {
                    if (_settings.warnOnPedestrianTypeSwap) {
                        _settings.warnOnPedestrianTypeSwap = false;
                        saveSettingsToStorage();
                        if (!confirm(_trans.swapSegmentTypeWarning)) {
                            return;
                        }
                    }

                    // Check for paths before deleting.
                    let segment = W.selectionManager.getSelectedFeatures()[0];
                    if (segment.model.hasPaths()) {
                        WazeWrap.Alerts.error('Clicksaver', _trans.swapSegmentTypeError_Paths);
                        return;
                    }

                    // delete the selected segment
                    const oldGeom = segment.geometry.clone();
                    W.model.actionManager.add(new DelSeg(segment.model));

                    // create the replacement segment in the other segment type (pedestrian -> road & vice versa)
                    // Note: this doesn't work in a MultiAction for some reason.
                    const newRoadType = isPedestrianTypeSegment(segment.model) ? 1 : 5;
                    segment = new Segment({ geometry: oldGeom, roadType: newRoadType });
                    segment.state = OL.State.INSERT;
                    W.model.actionManager.add(new AddSeg(segment, {
                        createNodes: !0,
                        openAllTurns: W.prefs.get('enableTurnsByDefault'),
                        createTwoWay: W.prefs.get('twoWaySegmentsByDefault'),
                        snappedFeatures: [null, null]
                    }));
                    const newId = W.model.repos.segments.idGenerator.lastValue;
                    const newSegment = W.model.segments.getObjectById(newId);
                    W.selectionManager.setSelectedModels([newSegment]);
                });
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
                let output = `.cs-rt-buttons-container .cs-rt-button-${roadTypeAbbr} {background-color:${
                    bgColor};box-shadow:0 2px ${shadeColor2(bgColor, -0.5)};border-color:${shadeColor2(bgColor, -0.15)};}`;
                output += ` .cs-rt-buttons-container .cs-rt-button-${roadTypeAbbr}:hover {background-color:${
                    shadeColor2(bgColor, 0.2)}}`;
                lines.push(output);
            });
            return lines.join(' ');
        }

        function injectCss() {
            const css = [
                // Road type button formatting
                '.csRoadTypeButtonsCheckBoxContainer {margin-left:15px;}',
                '.cs-rt-buttons-container {margin-bottom:5px;height:21px;}',
                '.cs-rt-buttons-container .cs-rt-button {font-size:11px;line-height:20px;color:black;padding:0px 4px;height:20px;'
                + 'margin-right:2px;border-style:solid;border-width:1px;}',
                buildRoadTypeButtonCss(),
                '.btn.cs-rt-button:active {box-shadow:none;transform:translateY(2px)}',
                'div .cs-rt-buttons-group {float:left; margin: 0px 5px 5px 0px;}',
                '#sidepanel-clicksaver .controls-container {padding:0px;}',
                '#sidepanel-clicksaver .controls-container label {white-space: normal;}',
                '#sidepanel-clicksaver {font-size:13px;}',

                // Compact moad road type button formatting.
                '.cs-compact-button[checked="false"] {opacity: 0.65;}',

                // Lock button formatting
                '.cs-group-label {font-size: 11px; width: 100%; font-family: Poppins, sans-serif;'
                + ' text-transform: uppercase; font-weight: 700; color: #354148; margin-bottom: 6px;}'
            ].join(' ');
            $(`<style type="text/css">${css}</style>`).appendTo('head');
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
                const title = I18n.t('segment.road_types')[roadType.val];
                $roadTypesDiv.append(
                    createSettingsCheckbox(id, 'roadType', title, null, null, null, {
                        'data-road-type': roadTypeAbbr
                    })
                );
                if (['PLR', 'PR', 'RR', 'PB', 'OR'].includes(roadTypeAbbr)) { // added RR & PB by jm6087
                    $roadTypesDiv.append(
                        // TODO css
                        createSettingsCheckbox(`csClearNew${roadTypeAbbr}CheckBox`, `setNew${roadTypeAbbr}StreetToNone`,
                            _trans.prefs.setStreetCityToNone, _trans.prefs.setStreetCityToNone_Title,
                            { paddingLeft: '20px', marginRight: '4px' }, { fontStyle: 'italic' }),
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
                            createSettingsCheckbox('csAddCompactColorsCheckBox', 'addCompactColors',
                                _trans.prefs.addCompactColors)// ,
                            // createSettingsCheckbox('csParkingCostButtonsCheckBox', 'parkingCostButtons',
                            //     _trans.prefs.parkingCostButtons),
                            // createSettingsCheckbox('csParkingSpacesButtonsCheckBox', 'parkingSpacesButtons',
                            //     _trans.prefs.parkingSpacesButtons)
                        ),
                        $('<label>', { class: 'cs-group-label' }).text(_trans.prefs.timeSaversGroup),
                        $('<div>', { style: 'margin-bottom:8px;' }).append(
                            createSettingsCheckbox('csAddAltCityButtonCheckBox', 'addAltCityButton',
                                _trans.prefs.showAddAltCityButton),
                            isSwapPedestrianPermitted() ? createSettingsCheckbox('csAddSwapPedestrianButtonCheckBox',
                                'addSwapPedestrianButton', _trans.prefs.showSwapDrivingWalkingButton) : ''
                        )
                    )
                )
            );

            $panel.append(
                // TODO css
                $('<div>', { style: 'margin-top:20px;font-size:10px;color:#999999;' }).append(
                    $('<div>').text(`v. ${argsObject.scriptVersion}${argsObject.scriptName.toLowerCase().includes('beta') ? ' beta' : ''}`),
                    $('<div>').append(
                        $('<a>', { href: argsObject.forumUrl, target: '__blank' }).text(_trans.prefs.discussionForumLinkText)
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
            // if ($(PARKING_SPACES_DROPDOWN_SELECTOR).length > 0 && isChecked('csParkingSpacesButtonsCheckBox')) {
            //     addParkingSpacesButtons(); // TODO - add option setting
            // }
            // if ($(PARKING_COST_DROPDOWN_SELECTOR).length > 0 && isChecked('csParkingCostButtonsCheckBox')) {
            //     addParkingCostButtons(); // TODO - add option setting
            // }
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
            if (targetNode.name === 'streetName' || targetNode.className.includes('street-name')) {
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
            UpdateObject = require('Waze/Action/UpdateObject');
            UpdateFeatureAddress = require('Waze/Action/UpdateFeatureAddress');
            MultiAction = require('Waze/Action/MultiAction');
            AddSeg = require('Waze/Action/AddSegment');
            Segment = require('Waze/Feature/Vector/Segment');
            DelSeg = require('Waze/Action/DeleteSegment');

            _trans = getTranslationObject();
            Object.keys(ROAD_TYPES).forEach(rtName => {
                ROAD_TYPES[rtName].text = _trans.roadTypeButtons[rtName].text;
            });

            document.addEventListener('paste', onPaste);

            // This is a hack that updates the border style of all compact road type buttons whenever
            // a segment property change is detected. This is mostly needed when the user isn't clicking
            // the button, i.e. when using Undo/Redo.  There might be a better way, but I coulnd't figure
            // it out because we're dealing with Shadow DOM here. For example, a style sheet isn't an option.
            W.model.segments.on('objectschanged', () => {
                if (W.prefs.attributes.compactDensity && isChecked('csAddCompactColorsCheckBox')) {
                    const selectedItems = W.selectionManager.getSelectedFeatures().map(feature => feature.model);
                    if (selectedItems.length && selectedItems[0].type === 'segment') {
                        setTimeout(() => {
                            // Do not change to an arrow function. function() is required to access "this".
                            $('.road-type-chip-select wz-checkable-chip').each(function() {
                                let borderStyle;
                                if (this.getAttribute('checked') === 'false') {
                                    borderStyle = '';
                                } else {
                                    borderStyle = 'black 2px solid';
                                }
                                $(this.shadowRoot.querySelector('div')).css('border', borderStyle);
                            });
                        }, 100);
                    }
                }
            });

            // check for changes in the edit-panel
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const addedNode = mutation.addedNodes[i];

                        if (addedNode.nodeType === Node.ELEMENT_NODE) {
                            // Checks to identify if this is a segment in regular display mode.
                            if (addedNode.querySelector(ROAD_TYPE_DROPDOWN_SELECTOR)) {
                                if (isChecked('csRoadTypeButtonsCheckBox')) addRoadTypeButtons();
                                if (isSwapPedestrianPermitted() && isChecked('csAddSwapPedestrianButtonCheckBox')) {
                                    addSwapPedestrianButton('regular');
                                }
                            }
                            // Checks to identify if this is a segment in compact display mode.
                            if (addedNode.querySelector(ROAD_TYPE_CHIP_SELECTOR)) {
                                if (isChecked('csRoadTypeButtonsCheckBox')) addCompactRoadTypeChangeEvents();
                                if (isChecked('csAddCompactColorsCheckBox')) addCompactRoadTypeColors();
                                if (isSwapPedestrianPermitted() && isChecked('csAddSwapPedestrianButtonCheckBox')) {
                                    addSwapPedestrianButton('compact');
                                }
                            }
                            // if (addedNode.querySelector(PARKING_SPACES_DROPDOWN_SELECTOR) && isChecked('csParkingSpacesButtonsCheckBox')) {
                            //     addParkingSpacesButtons();
                            // }
                            // if (addedNode.querySelector(PARKING_COST_DROPDOWN_SELECTOR)
                            //     && isChecked('csParkingCostButtonsCheckBox')) {
                            //     addParkingCostButtons();
                            // }
                            if (addedNode.querySelector('.side-panel-section') && isChecked('csAddAltCityButtonCheckBox')) {
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
            // W.prefs.on('change:isImperial', () => errorHandler(() => { initUserPanel(); loadSettingsFromStorage(); }));
            updateControls(); // In case of PL w/ segments selected.
            W.selectionManager.events.register('selectionchanged', null, () => errorHandler(updateControls));

            logDebug('Initialized');
        }

        function bootstrap() {
            if (typeof require !== 'undefined' && W && W.loginManager && W.loginManager.events.register && W.map && W.loginManager.user) {
                logDebug('Initializing...');
                init();
            } else {
                logDebug('Bootstrap failed. Trying again...');
                setTimeout(bootstrap, 250);
            }
        }

        // Not sure if the document.ready is necessary but I'm leaving it because of some random errors
        // that people were having with "require is not defined".  I tried several things to fix it and
        // I'm leaving those things, though all may not be needed.
        $(document).ready(() => {
            logDebug('Bootstrap...');
            bootstrap();
        });
    } // END Main function (code to be injected)

    function injectMain(argsObject) {
        if (typeof require !== 'undefined' && typeof $ !== 'undefined') {
            // const scriptElem = document.createElement('script');
            // scriptElem.textContent = `(function(){${main.toString()}\n main(${JSON.stringify(argsObject).replace('\'', '\\\'')})})();`;
            // scriptElem.setAttribute('type', 'application/javascript');
            // document.body.appendChild(scriptElem);

            GM_addElement('script', {
                textContent: `(function(){${main.toString()}\n main(${JSON.stringify(argsObject).replace('\'', '\\\'')})})();`
            });
        } else {
            setTimeout(() => injectMain(argsObject), 250);
        }
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

    function loadTranslations() {
        if (typeof $ === 'undefined') {
            setTimeout(loadTranslations, 250);
            console.debug('ClickSaver:', 'jQuery not ready. Retry loading translations...');
        } else {
            // This call retrieves the data from the translations spreadsheet and then injects
            // the main code into the page.  If the spreadsheet call fails, the default English
            // translation is used.
            const args = {
                scriptName: SCRIPT_NAME,
                scriptVersion: SCRIPT_VERSION,
                forumUrl: FORUM_URL
            };
            $.getJSON(`${TRANSLATIONS_URL}?${DEC(API_KEY)}`).then(res => {
                args.translations = convertTranslationsArrayToObject(res.values);
                console.debug('ClickSaver:', 'Translations loaded.');
            }).fail(() => {
                console.error('ClickSaver: Error loading translations spreadsheet. Using default translation (English).');
                args.useDefaultTranslation = true;
            }).always(() => {
                // Leave this document.ready function. Some people randomly get a "require is not defined" error unless the injectMain function
                // is called late enough.  Even with a "typeof require !== 'undefined'" check.
                $(document).ready(() => {
                    injectMain(args);
                });
            });
        }
    }

    // This function requires WazeWrap so it must be called outside of the injected code, as
    // WazeWrap is not guaranteed to be available in the page's scope.
    function addToggleDrawNewRoadsAsTwoWayShortcut() {
        new WazeWrap.Interface.Shortcut('ToggleTwoWayNewSeg', 'Toggle new segment two-way drawing',
            'editing', 'editToggleNewSegTwoWayDrawing', EXTERNAL_SETTINGS.toggleTwoWaySegDrawingShortcut,
            () => { $('wz-checkbox[name="twoWaySegmentsByDefault"]').click(); }, null).add();
    }

    function sandboxLoadSettings() {
        const loadedSettings = JSON.parse(localStorage.getItem(EXTERNAL_SETTINGS_NAME)) || {};
        EXTERNAL_SETTINGS.toggleTwoWaySegDrawingShortcut = loadedSettings.toggleTwoWaySegDrawingShortcut || '';
        addToggleDrawNewRoadsAsTwoWayShortcut();
        $(window).on('beforeunload', () => sandboxSaveSettings());
    }

    function sandboxSaveSettings() {
        let keys = '';
        const { shortcut } = W.accelerators.Actions.ToggleTwoWayNewSeg;
        if (shortcut) {
            if (shortcut.altKey) keys += 'A';
            if (shortcut.shiftKey) keys += 'S';
            if (shortcut.ctrlKey) keys += 'C';
            if (keys.length) keys += '+';
            if (shortcut.keyCode) keys += shortcut.keyCode;
        }
        EXTERNAL_SETTINGS.toggleTwoWaySegDrawingShortcut = keys;
        localStorage.setItem(EXTERNAL_SETTINGS_NAME, JSON.stringify(EXTERNAL_SETTINGS));
    }

    function sandboxBootstrap() {
        if (WazeWrap && WazeWrap.Ready) {
            WazeWrap.Interface.ShowScriptUpdate(SCRIPT_NAME, SCRIPT_VERSION, UPDATE_MESSAGE, FORUM_URL);
            sandboxLoadSettings();
        } else {
            setTimeout(sandboxBootstrap, 250);
        }
    }

    // Go ahead and start loading translations, and inject the main code into the page.
    loadTranslations();

    // Start the "sandboxed" code.
    sandboxBootstrap();
})();
