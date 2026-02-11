import React, { useEffect, useRef, useState } from 'react';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import {
    Autocomplete,
    CircularProgress,
    Switch,
    TextField,
} from '@mui/material';
import Draggable from 'react-draggable';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import './RouteForm.scss';
import { DEFAULT_STOP } from './constants';
import {
    DEMO_SCENARIOS,
    parseDemoScenario,
} from './demoScenarios';
import IntermediateStopInput from './IntermediateStopInput';
import {
    IntermediateStopInputValue,
    LocationInput,
    RouteFormValues,
} from './types';
import {
    normalizeIntermediateStops,
    toLocalDateTimeFromTime,
    toStopDeadlineTimeLocalValue,
    toStopWindows,
    toTimeLocalValue,
} from './utils';
import {
    GeocodeSuggestion,
    useGeocodeSuggestions,
} from '../../hooks/queries/useGeocodeSuggestions';
import { useGeocodeLookup } from '../../hooks/queries/useGeocodeLookup';
import { useCenterStore } from '../../hooks/store/useCenterStore';
import { useIntermediateListStore } from '../../hooks/store/useIntermediateListStore';
import { useLocationLabelsStore } from '../../hooks/store/useLocationLabelsStore';
import { useStopWindowsStore } from '../../hooks/store/useStopWindowsStore';
import { useRouteFormSubmission } from './hooks/useRouteFormSubmission';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { TRAVEL_MODES, TravelMode } from '../../models/routeOptions';
import { Coordinate } from '../../models/coordinate';
import { toCoordinateKey } from '../../utils/coordinates';
import { notify } from '../../utils/notify';

const RouteForm = () => {
    const setIntermediateList = useIntermediateListStore(
        (state) => state.setIntermediateList,
    );
    const setStopWindows = useStopWindowsStore((state) => state.setStopWindows);
    const setCenter = useCenterStore((state) => state.setCenter);
    const center = useCenterStore((state) => state.center);
    const rememberLocation = useLocationLabelsStore(
        (state) => state.rememberLocation,
    );

    const { control, clearErrors, getValues, handleSubmit, setValue } =
        useForm<RouteFormValues>({
            defaultValues: {
                sameDestination: true,
                origin: { value: '', coordinate: null },
                destination: { value: '', coordinate: null },
                stops: [],
                departTimeLocal: toTimeLocalValue(new Date()),
                travelMode: 'driving',
            },
        });

    const submitRouteRequest = useRouteFormSubmission({
        clearErrors,
    });

    const {
        fields: stopFields,
        append: appendStop,
        remove: removeStop,
        replace: replaceStops,
    } = useFieldArray({
        control,
        name: 'stops',
    });
    const [activeDemoFile, setActiveDemoFile] = useState<string | null>(null);
    const plannerPanelRef = useRef<HTMLDivElement>(null);

    const sameDestination =
        useWatch({ control, name: 'sameDestination' }) ?? false;
    const origin = useWatch({ control, name: 'origin' }) ?? {
        value: '',
        coordinate: null,
    };
    const destination = useWatch({ control, name: 'destination' }) ?? {
        value: '',
        coordinate: null,
    };
    const stops = useWatch({ control, name: 'stops' }) ?? [];
    const departTimeLocal =
        useWatch({ control, name: 'departTimeLocal' }) ?? '';
    const travelMode = useWatch({ control, name: 'travelMode' }) ?? 'driving';

    const debouncedOrigin = useDebouncedValue(origin.value, 300);
    const debouncedDestination = useDebouncedValue(destination.value, 300);
    const { data: originSuggestions = [], isPending: originLoading } =
        useGeocodeSuggestions(debouncedOrigin, center);
    const { data: destinationSuggestions = [], isPending: destinationLoading } =
        useGeocodeSuggestions(debouncedDestination, center);
    const geocodeLookup = useGeocodeLookup();

    useEffect(() => {
        const routeStartLocal = toLocalDateTimeFromTime(departTimeLocal);
        const normalizedStops = normalizeIntermediateStops(
            stops,
            routeStartLocal,
        );

        setIntermediateList(normalizedStops.map((item) => item.label));
        setStopWindows(toStopWindows(normalizedStops));
    }, [departTimeLocal, setIntermediateList, setStopWindows, stops]);

    const handleRememberLocation = (label: string, coordinate: Coordinate) => {
        rememberLocation({
            coordinateKey: toCoordinateKey(coordinate),
            label,
        });
    };

    const resolveSuggestionCoordinate = async (
        suggestion: GeocodeSuggestion,
    ): Promise<Coordinate | null> => {
        const coordinate = await geocodeLookup.mutateAsync({
            address: suggestion.label,
            placeId: suggestion.placeId,
        });

        if (!coordinate) {
            notify.error('Failed to resolve selected location.');
            return null;
        }

        return coordinate;
    };

    const handleLocate = (location: LocationInput) => {
        if (!location.coordinate) {
            return;
        }

        setCenter({
            lat: location.coordinate.latitude,
            lng: location.coordinate.longitude,
        });
    };

    const updateStopAtIndex = (
        index: number,
        updater: (
            current: IntermediateStopInputValue,
        ) => IntermediateStopInputValue,
    ) => {
        const path = `stops.${index}` as const;
        const current = getValues(path);
        if (!current) {
            return;
        }

        setValue(path, updater(current), { shouldDirty: true });
    };

    const handleAddStop = () => {
        appendStop({ ...DEFAULT_STOP });
    };

    const handleLoadDemoScenario = async (fileName: string) => {
        setActiveDemoFile(fileName);
        try {
            const response = await fetch(`/demos/${fileName}.json`);
            if (!response.ok) {
                notify.error('Failed to load demo scenario.');
                return;
            }

            const parsed = parseDemoScenario(await response.json());
            if (!parsed) {
                notify.error('Demo scenario file is invalid.');
                return;
            }

            setValue('sameDestination', parsed.sameDestination, {
                shouldDirty: true,
            });
            setValue(
                'origin',
                {
                    value: parsed.origin.label,
                    coordinate: parsed.origin.coordinate,
                },
                { shouldDirty: true },
            );
            setValue(
                'destination',
                {
                    value: parsed.destination.label,
                    coordinate: parsed.destination.coordinate,
                },
                { shouldDirty: true },
            );
            setValue('departTimeLocal', parsed.departTimeLocal, {
                shouldDirty: true,
            });
            setValue('travelMode', parsed.travelMode, {
                shouldDirty: true,
            });
            replaceStops(
                parsed.stops.map((stop) => ({
                    value: stop.label,
                    coordinate: stop.coordinate,
                    deadlineTimeLocal: stop.deadlineTimeLocal ?? '',
                    serviceMinutes:
                        stop.serviceMinutes === undefined
                            ? ''
                            : String(Math.floor(stop.serviceMinutes)),
                })),
            );

            handleRememberLocation(parsed.origin.label, parsed.origin.coordinate);
            handleRememberLocation(
                parsed.destination.label,
                parsed.destination.coordinate,
            );
            parsed.stops.forEach((stop) =>
                handleRememberLocation(stop.label, stop.coordinate),
            );

            notify.success(`Loaded demo case: ${parsed.name}`);
        } catch {
            notify.error('Failed to load demo scenario.');
        } finally {
            setActiveDemoFile(null);
        }
    };

    const handleSelectOrigin = async (suggestion: GeocodeSuggestion) => {
        setValue(
            'origin',
            {
                value: suggestion.label,
                coordinate: null,
            },
            { shouldDirty: true },
        );

        const coordinate = await resolveSuggestionCoordinate(suggestion);
        if (!coordinate) {
            return;
        }

        handleRememberLocation(suggestion.label, coordinate);
        setValue(
            'origin',
            {
                value: suggestion.label,
                coordinate,
            },
            { shouldDirty: true },
        );
    };

    const handleSelectDestination = async (suggestion: GeocodeSuggestion) => {
        setValue(
            'destination',
            {
                value: suggestion.label,
                coordinate: null,
            },
            { shouldDirty: true },
        );

        const coordinate = await resolveSuggestionCoordinate(suggestion);
        if (!coordinate) {
            return;
        }

        handleRememberLocation(suggestion.label, coordinate);
        setValue(
            'destination',
            {
                value: suggestion.label,
                coordinate,
            },
            { shouldDirty: true },
        );
    };

    const handleSelectIntermediate = (
        index: number,
        suggestion: GeocodeSuggestion,
    ) => {
        updateStopAtIndex(index, (item) => ({
            ...item,
            value: suggestion.label,
            coordinate: null,
        }));

        void (async () => {
            const coordinate = await resolveSuggestionCoordinate(suggestion);
            if (!coordinate) {
                return;
            }

            handleRememberLocation(suggestion.label, coordinate);
            updateStopAtIndex(index, (item) => ({
                ...item,
                value: suggestion.label,
                coordinate,
            }));
        })();
    };

    const renderSuggestionOption = (
        props: React.HTMLAttributes<HTMLLIElement>,
        option: GeocodeSuggestion,
    ) => {
        const { key: _key, ...optionProps } =
            props as React.HTMLAttributes<HTMLLIElement> & {
                key?: React.Key;
            };

        return (
            <li key={option.id} {...optionProps}>
                {option.label}
            </li>
        );
    };

    const suggestionLoading = geocodeLookup.isPending;
    const handleSelectOriginChange = (suggestion: GeocodeSuggestion) => {
        void handleSelectOrigin(suggestion);
    };

    const handleSelectDestinationChange = (suggestion: GeocodeSuggestion) => {
        void handleSelectDestination(suggestion);
    };

    const handleSelectIntermediateChange = (
        index: number,
        suggestion: GeocodeSuggestion,
    ) => {
        handleSelectIntermediate(index, suggestion);
    };

    return (
        <Draggable
            nodeRef={plannerPanelRef}
            handle=".panel-handle"
            cancel="input,textarea,button,select,option,.MuiSwitch-root,.MuiAutocomplete-root,.MuiAutocomplete-popper,.MuiAutocomplete-option"
            bounds="parent"
        >
            <div
                ref={plannerPanelRef}
                className="draggable-panel dragPanel dragPanel--planner routePanel"
            >
                <form
                    className="routeForm"
                    onSubmit={handleSubmit(submitRouteRequest)}
                >
                    <div className="panel-handle">
                        <span>Dispatch Planner</span>
                        <span className="panel-handle__hint">Drag</span>
                    </div>
                    <h1 className="title">Route Planner</h1>
                    <p className="subtitle">
                        Optimize technician job order with stop deadlines and
                        map preview.
                    </p>
                    <div className="demoScenarioBar">
                        <span className="demoScenarioBar__title">Examples</span>
                        <div className="demoScenarioBar__actions">
                            {DEMO_SCENARIOS.map((scenario) => (
                                <button
                                    key={scenario.fileName}
                                    type="button"
                                    className="demoScenarioButton"
                                    onClick={() =>
                                        void handleLoadDemoScenario(
                                            scenario.fileName,
                                        )
                                    }
                                    disabled={activeDemoFile !== null}
                                >
                                    {activeDemoFile === scenario.fileName
                                        ? 'Loading...'
                                        : scenario.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="inputLine">
                        <Autocomplete
                            className="route-autocomplete"
                            disablePortal
                            disableClearable
                            freeSolo
                            options={originSuggestions}
                            getOptionLabel={(option) =>
                                typeof option === 'string'
                                    ? option
                                    : option.label
                            }
                            inputValue={origin.value}
                            onInputChange={(_, nextValue) => {
                                setValue(
                                    'origin',
                                    {
                                        value: nextValue,
                                        coordinate:
                                            origin.value === nextValue
                                                ? origin.coordinate
                                                : null,
                                    },
                                    { shouldDirty: true },
                                );
                            }}
                            onChange={(_, selected) => {
                                if (
                                    selected &&
                                    typeof selected !== 'string'
                                ) {
                                    handleSelectOriginChange(selected);
                                }
                            }}
                            loading={originLoading || suggestionLoading}
                            renderOption={renderSuggestionOption}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Origin"
                                    variant="outlined"
                                    size="small"
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {originLoading || suggestionLoading ? (
                                                    <CircularProgress
                                                        color="inherit"
                                                        size={16}
                                                    />
                                                ) : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                        />
                        {origin.coordinate ? (
                            <button
                                type="button"
                                className="inputLocateButton"
                                onClick={() => handleLocate(origin)}
                            >
                                <LocationOnIcon />
                            </button>
                        ) : null}
                    </div>

                    {!sameDestination && (
                        <div className="inputLine">
                            <Autocomplete
                                className="route-autocomplete"
                                disablePortal
                                disableClearable
                                freeSolo
                                options={destinationSuggestions}
                                getOptionLabel={(option) =>
                                    typeof option === 'string'
                                        ? option
                                        : option.label
                                }
                                inputValue={destination.value}
                                onInputChange={(_, nextValue) => {
                                    setValue(
                                        'destination',
                                        {
                                            value: nextValue,
                                            coordinate:
                                                destination.value === nextValue
                                                    ? destination.coordinate
                                                    : null,
                                        },
                                        { shouldDirty: true },
                                    );
                                }}
                                onChange={(_, selected) => {
                                    if (
                                        selected &&
                                        typeof selected !== 'string'
                                    ) {
                                        handleSelectDestinationChange(
                                            selected,
                                        );
                                    }
                                }}
                                loading={
                                    destinationLoading || suggestionLoading
                                }
                                renderOption={renderSuggestionOption}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder="Destination"
                                        variant="outlined"
                                        size="small"
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {destinationLoading || suggestionLoading ? (
                                                        <CircularProgress
                                                            color="inherit"
                                                            size={16}
                                                        />
                                                    ) : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                            />
                            {destination.coordinate ? (
                                <button
                                    type="button"
                                    className="inputLocateButton"
                                    onClick={() => handleLocate(destination)}
                                >
                                    <LocationOnIcon />
                                </button>
                            ) : null}
                        </div>
                    )}

                    <div className="toggleOrigin">
                        <label>Return to origin</label>
                        <div className="toggleSwitch">
                            <Switch
                                checked={sameDestination}
                                onChange={() =>
                                    setValue(
                                        'sameDestination',
                                        !sameDestination,
                                        {
                                            shouldDirty: true,
                                        },
                                    )
                                }
                                inputProps={{ 'aria-label': 'controlled' }}
                            />
                        </div>
                    </div>

                    <div className="travelOptions">
                        <label
                            className="travelOptionField"
                            htmlFor="route-start-time"
                        >
                            <span className="travelOptionLabel">Depart at</span>
                            <input
                                id="route-start-time"
                                className="travelOptionInput"
                                type="time"
                                value={departTimeLocal}
                                onChange={(event) =>
                                    setValue(
                                        'departTimeLocal',
                                        event.target.value,
                                        {
                                            shouldDirty: true,
                                        },
                                    )
                                }
                            />
                        </label>
                        <label
                            className="travelOptionField"
                            htmlFor="route-travel-mode"
                        >
                            <span className="travelOptionLabel">
                                Travel mode
                            </span>
                            <select
                                id="route-travel-mode"
                                className="travelOptionInput travelOptionSelect"
                                value={travelMode}
                                onChange={(event) =>
                                    setValue(
                                        'travelMode',
                                        event.target.value as TravelMode,
                                        {
                                            shouldDirty: true,
                                        },
                                    )
                                }
                            >
                                {TRAVEL_MODES.map((mode) => (
                                    <option key={mode} value={mode}>
                                        {mode.charAt(0).toUpperCase() +
                                            mode.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="inputLine">
                        <button
                            type="button"
                            onClick={handleAddStop}
                            className="addButton"
                        >
                            Add job stop
                        </button>
                    </div>

                    {stopFields.length === 0 ? (
                        <p className="emptyHint">
                            No intermediate job stops yet.
                        </p>
                    ) : (
                        <div className="intermediateList">
                            {stopFields.map((field, index) => {
                                const stop = stops[index] ?? DEFAULT_STOP;
                                return (
                                    <IntermediateStopInput
                                        key={field.id}
                                        value={stop.value}
                                        placeholder={`Stop`}
                                        hasCoordinate={Boolean(stop.coordinate)}
                                        deadlineTimeLocal={
                                            stop.deadlineTimeLocal
                                        }
                                        serviceMinutes={stop.serviceMinutes}
                                        onChange={(value) => {
                                            updateStopAtIndex(index, (item) => ({
                                                ...item,
                                                value,
                                                coordinate:
                                                    item.value === value
                                                        ? item.coordinate
                                                        : null,
                                            }));
                                        }}
                                        onChangeDeadlineTime={(value) => {
                                            updateStopAtIndex(index, (item) => ({
                                                ...item,
                                                deadlineTimeLocal: value,
                                            }));
                                        }}
                                        onChangeServiceMinutes={(value) => {
                                            updateStopAtIndex(index, (item) => ({
                                                ...item,
                                                serviceMinutes: value,
                                            }));
                                        }}
                                        onSelectSuggestion={(suggestion) =>
                                            handleSelectIntermediateChange(
                                                index,
                                                suggestion,
                                            )
                                        }
                                        onLocate={() => handleLocate(stop)}
                                        onRemove={() => removeStop(index)}
                                    />
                                );
                            })}
                        </div>
                    )}

                    <button className="calculateRouteButton" type="submit">
                        Optimize Route
                    </button>
                </form>
            </div>
        </Draggable>
    );
};

export default RouteForm;
