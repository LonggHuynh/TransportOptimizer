import React, { useEffect } from 'react';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import {
    Autocomplete,
    CircularProgress,
    Switch,
    TextField,
} from '@mui/material';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import './RouteForm.scss';
import { DEFAULT_STOP } from './constants';
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
    MapboxSuggestion,
    useMapboxSuggestions,
} from '../../hooks/queries/useMapboxSuggestions';
import { useCenterStore } from '../../hooks/store/useCenterStore';
import { useIntermediateListStore } from '../../hooks/store/useIntermediateListStore';
import { useLocationLabelsStore } from '../../hooks/store/useLocationLabelsStore';
import { useStopWindowsStore } from '../../hooks/store/useStopWindowsStore';
import { useRouteFormSubmission } from './hooks/useRouteFormSubmission';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { TRAVEL_MODES, TravelMode } from '../../models/routeOptions';
import { toCoordinateKey } from '../../utils/coordinates';

const RouteForm = () => {
    const setIntermediateList = useIntermediateListStore(
        (state) => state.setIntermediateList,
    );
    const setStopWindows = useStopWindowsStore((state) => state.setStopWindows);
    const setCenter = useCenterStore((state) => state.setCenter);
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
    } = useFieldArray({
        control,
        name: 'stops',
    });

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
    const { suggestions: originSuggestions, loading: originLoading } =
        useMapboxSuggestions(debouncedOrigin);
    const { suggestions: destinationSuggestions, loading: destinationLoading } =
        useMapboxSuggestions(debouncedDestination);

    useEffect(() => {
        const routeStartLocal = toLocalDateTimeFromTime(departTimeLocal);
        const normalizedStops = normalizeIntermediateStops(
            stops,
            routeStartLocal,
        );

        setIntermediateList(normalizedStops.map((item) => item.label));
        setStopWindows(toStopWindows(normalizedStops));
    }, [departTimeLocal, setIntermediateList, setStopWindows, stops]);

    const handleRememberLocation = (suggestion: MapboxSuggestion) => {
        if (!suggestion.coordinate) {
            return;
        }

        rememberLocation({
            coordinateKey: toCoordinateKey(suggestion.coordinate),
            label: suggestion.label,
        });
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

    const handleSelectOrigin = (suggestion: MapboxSuggestion) => {
        if (!suggestion.coordinate) {
            return;
        }

        handleRememberLocation(suggestion);
        setValue(
            'origin',
            {
                value: suggestion.label,
                coordinate: suggestion.coordinate,
            },
            { shouldDirty: true },
        );
    };

    const handleSelectDestination = (suggestion: MapboxSuggestion) => {
        if (!suggestion.coordinate) {
            return;
        }

        handleRememberLocation(suggestion);
        setValue(
            'destination',
            {
                value: suggestion.label,
                coordinate: suggestion.coordinate,
            },
            { shouldDirty: true },
        );
    };

    const handleSelectIntermediate = (
        index: number,
        suggestion: MapboxSuggestion,
    ) => {
        const coordinate = suggestion.coordinate;
        if (!coordinate) {
            return;
        }

        handleRememberLocation(suggestion);
        updateStopAtIndex(index, (item) => ({
            ...item,
            value: suggestion.label,
            coordinate,
        }));
    };

    const renderSuggestionOption = (
        props: React.HTMLAttributes<HTMLLIElement>,
        option: MapboxSuggestion,
    ) => {
        const { key: _key, ...optionProps } =
            props as React.HTMLAttributes<HTMLLIElement> & {
                key?: React.Key;
            };
        const optionKey = option.coordinate
            ? toCoordinateKey(option.coordinate)
            : option.label;

        return (
            <li key={optionKey} {...optionProps}>
                {option.label}
            </li>
        );
    };

    return (
        <div className="routePanel">
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
                    Optimize technician job order with stop deadlines and map
                    preview.
                </p>

                <div className="inputLine">
                    <Autocomplete
                        className="route-autocomplete"
                        disablePortal
                        disableClearable
                        freeSolo
                        options={originSuggestions}
                        getOptionLabel={(option) =>
                            typeof option === 'string' ? option : option.label
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
                            if (selected && typeof selected !== 'string') {
                                handleSelectOrigin(selected);
                            }
                        }}
                        loading={originLoading}
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
                                            {originLoading ? (
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
                                if (selected && typeof selected !== 'string') {
                                    handleSelectDestination(selected);
                                }
                            }}
                            loading={destinationLoading}
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
                                                {destinationLoading ? (
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
                                setValue('sameDestination', !sameDestination, {
                                    shouldDirty: true,
                                })
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
                        <span className="travelOptionLabel">Travel mode</span>
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
                    <p className="emptyHint">No intermediate job stops yet.</p>
                ) : (
                    <div className="intermediateList">
                        {stopFields.map((field, index) => {
                            const stop = stops[index] ?? DEFAULT_STOP;
                            return (
                                <IntermediateStopInput
                                    key={field.id}
                                    value={stop.value}
                                    placeholder={`Job stop ${index + 1}`}
                                    hasCoordinate={Boolean(stop.coordinate)}
                                    deadlineTimeLocal={stop.deadlineTimeLocal}
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
                                        handleSelectIntermediate(
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
    );
};

export default RouteForm;
