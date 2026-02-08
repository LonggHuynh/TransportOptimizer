import React, { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Autocomplete, CircularProgress, Switch, TextField } from '@mui/material';
import './RouteForm.scss';
import { toast } from 'react-toastify';
import { useIntermediateListStore } from '../hooks/store/useIntermediateListStore';
import { useStopWindowsStore } from '../hooks/store/useStopWindowsStore';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { MapboxSuggestion, useMapboxSuggestions } from '../hooks/queries/useMapboxSuggestions';
import { parseCoordinateKey } from '../utils/coordinates';
import { useCenterStore } from '../hooks/store/useCenterStore';
import { useLocationLabelsStore } from '../hooks/store/useLocationLabelsStore';

interface RouteFormProps {
    onCompute: (places: string[]) => void;
    className?: string;
}

interface LocationInput {
    value: string;
    coordinateKey: string | null;
}

interface IntermediateStopInputValue extends LocationInput {
    deadlineMinutes: string;
    serviceMinutes: string;
}

interface NormalizedIntermediateStop {
    label: string;
    coordinateKey: string | null;
    index: number;
    deadlineMinutes: number | null;
    serviceMinutes: number;
}

interface DemoLocation {
    label: string;
    coordinateKey: string;
}

interface DemoStop extends DemoLocation {
    deadlineMinutes: string;
    serviceMinutes: string;
}

interface IntermediateStopInputProps {
    value: string;
    placeholder: string;
    hasCoordinate: boolean;
    deadlineMinutes: string;
    serviceMinutes: string;
    onChange: (value: string) => void;
    onChangeDeadline: (value: string) => void;
    onChangeServiceMinutes: (value: string) => void;
    onSelectSuggestion: (value: MapboxSuggestion) => void;
    onLocate: () => void;
    onRemove: () => void;
}

const DEMO_SCENARIO: {
    returnToStart: boolean;
    origin: DemoLocation;
    destination: DemoLocation;
    stops: DemoStop[];
} = {
    returnToStart: false,
    origin: {
        label: 'Seattle Center',
        coordinateKey: '-122.350395,47.621067',
    },
    destination: {
        label: 'Seattle-Tacoma International Airport',
        coordinateKey: '-122.308817,47.450249',
    },
    stops: [
        {
            label: 'Pike Place Market',
            coordinateKey: '-122.342089,47.609386',
            deadlineMinutes: '45',
            serviceMinutes: '20',
        },
        {
            label: 'Capitol Hill Clinic',
            coordinateKey: '-122.320849,47.617371',
            deadlineMinutes: '90',
            serviceMinutes: '25',
        },
        {
            label: 'Fremont Service Hub',
            coordinateKey: '-122.349274,47.651444',
            deadlineMinutes: '150',
            serviceMinutes: '15',
        },
    ],
};

const normalizeIntermediateStops = (
    intermediateInputs: IntermediateStopInputValue[],
): NormalizedIntermediateStop[] =>
    intermediateInputs.reduce<NormalizedIntermediateStop[]>((acc, item, index) => {
        const label = item.value.trim();
        if (!label) {
            return acc;
        }

        const rawDeadline = Number(item.deadlineMinutes);
        const parsedDeadline = Number.isFinite(rawDeadline) && rawDeadline > 0
            ? Math.min(1439, Math.floor(rawDeadline))
            : null;
        const rawServiceMinutes = Number(item.serviceMinutes);
        const parsedServiceMinutes = Number.isFinite(rawServiceMinutes) && rawServiceMinutes > 0
            ? Math.min(1439, Math.floor(rawServiceMinutes))
            : 0;

        acc.push({
            label,
            coordinateKey: item.coordinateKey,
            index,
            deadlineMinutes: parsedDeadline,
            serviceMinutes: parsedServiceMinutes,
        });
        return acc;
    }, []);

const toStopWindows = (normalizedStops: NormalizedIntermediateStop[]) =>
    normalizedStops.flatMap((item, index) => {
        const hasWindow = item.deadlineMinutes !== null;
        const hasService = item.serviceMinutes > 0;
        if (!hasWindow && !hasService) {
            return [];
        }

        return [{
            stopIndex: index + 1,
            windowStartMinutes: 0,
            windowEndMinutes: item.deadlineMinutes ?? 1439,
            serviceMinutes: item.serviceMinutes,
        }];
    });

const IntermediateStopInput = ({
    value,
    placeholder,
    hasCoordinate,
    deadlineMinutes,
    serviceMinutes,
    onChange,
    onChangeDeadline,
    onChangeServiceMinutes,
    onSelectSuggestion,
    onLocate,
    onRemove,
}: IntermediateStopInputProps) => {
    const debouncedValue = useDebouncedValue(value, 300);
    const { suggestions, loading } = useMapboxSuggestions(debouncedValue);

    return (
        <div className="inputLine stopLine">
            <div className="stopLineTop">
                <Autocomplete
                    className="route-autocomplete"
                    disablePortal
                    freeSolo
                    options={suggestions}
                    getOptionLabel={(option) =>
                        typeof option === 'string' ? option : option.label
                    }
                    inputValue={value}
                    onInputChange={(_, nextValue) => onChange(nextValue)}
                    onChange={(_, selected) => {
                        if (selected && typeof selected !== 'string') {
                            onSelectSuggestion(selected);
                        }
                    }}
                    loading={loading}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder={placeholder}
                            variant="outlined"
                            size="small"
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loading ? (
                                            <CircularProgress color="inherit" size={16} />
                                        ) : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                />
                {hasCoordinate ? (
                    <button type="button" className="stopIconButton inputLocateButton" onClick={onLocate}>
                        <LocationOnIcon />
                    </button>
                ) : null}
                <button
                    type="button"
                    className="removeStopButton stopIconButton"
                    onClick={onRemove}
                >
                    <CloseIcon />
                </button>
            </div>

            <div className="stopLineBottom">
                <label className="stopEndWindow">
                    <span className="stopEndPrefix">in</span>
                    <input
                        type="number"
                        className="stopDeadlineInput"
                        min={1}
                        max={1439}
                        step={5}
                        placeholder="30"
                        value={deadlineMinutes}
                        aria-label={`${placeholder} end in minutes`}
                        onChange={(e) => onChangeDeadline(e.target.value)}
                    />
                    <span className="stopEndSuffix">min</span>
                </label>
                <label className="stopEndWindow stopStayWindow">
                    <span className="stopEndPrefix">for</span>
                    <input
                        type="number"
                        className="stopDeadlineInput stopServiceInput"
                        min={0}
                        max={1439}
                        step={5}
                        placeholder="15"
                        value={serviceMinutes}
                        aria-label={`${placeholder} stay in minutes`}
                        onChange={(e) => onChangeServiceMinutes(e.target.value)}
                    />
                    <span className="stopEndSuffix">min</span>
                </label>
            </div>
        </div>
    );
};

const RouteForm = ({ onCompute, className }: RouteFormProps) => {
    const [sameDestination, setSameDestination] = useState(false);
    const [origin, setOrigin] = useState<LocationInput>({ value: '', coordinateKey: null });
    const [destination, setDestination] = useState<LocationInput>({ value: '', coordinateKey: null });
    const [intermediateInputs, setIntermediateInputs] = useState<IntermediateStopInputValue[]>([]);
    const debouncedOrigin = useDebouncedValue(origin.value, 300);
    const debouncedDestination = useDebouncedValue(destination.value, 300);
    const { suggestions: originSuggestions, loading: originLoading } = useMapboxSuggestions(debouncedOrigin);
    const { suggestions: destinationSuggestions, loading: destinationLoading } = useMapboxSuggestions(debouncedDestination);

    const setIntermediateList = useIntermediateListStore(
        (state) => state.setIntermediateList,
    );
    const setStopWindows = useStopWindowsStore(
        (state) => state.setStopWindows,
    );
    const setCenter = useCenterStore((state) => state.setCenter);
    const rememberLocation = useLocationLabelsStore((state) => state.rememberLocation);

    const handleRememberLocation = (suggestion: MapboxSuggestion) => {
        if (!suggestion.coordinateKey) {
            return;
        }

        rememberLocation({
            coordinateKey: suggestion.coordinateKey,
            label: suggestion.label,
        });
    };

    const handleLocate = (location: LocationInput) => {
        if (!location.coordinateKey) {
            toast('Select a suggestion first to use coordinates');
            return;
        }

        const coordinates = parseCoordinateKey(location.coordinateKey);
        if (!coordinates) {
            toast('Selected location has invalid coordinates');
            return;
        }

        setCenter({ lat: coordinates.latitude, lng: coordinates.longitude });
    };

    useEffect(() => {
        const normalizedStops = normalizeIntermediateStops(intermediateInputs);

        setIntermediateList(normalizedStops.map((item) => item.label));
        setStopWindows(toStopWindows(normalizedStops));
    }, [intermediateInputs, setIntermediateList, setStopWindows]);

    const handleAddStop = () => {
        setIntermediateInputs((prev) => [...prev, {
            value: '',
            coordinateKey: null,
            deadlineMinutes: '',
            serviceMinutes: '',
        }]);
    };

    const handleUpdateStop = (index: number, value: string) => {
        setIntermediateInputs((prev) =>
            prev.map((item, idx) =>
                idx === index
                    ? {
                        value,
                        coordinateKey: item.value === value ? item.coordinateKey : null,
                        deadlineMinutes: item.deadlineMinutes,
                        serviceMinutes: item.serviceMinutes,
                    }
                    : item),
        );
    };

    const handleUpdateStopDeadline = (index: number, value: string) => {
        setIntermediateInputs((prev) =>
            prev.map((item, idx) =>
                idx === index
                    ? { ...item, deadlineMinutes: value }
                    : item),
        );
    };

    const handleUpdateStopServiceMinutes = (index: number, value: string) => {
        setIntermediateInputs((prev) =>
            prev.map((item, idx) =>
                idx === index
                    ? { ...item, serviceMinutes: value }
                    : item),
        );
    };

    const handleSelectOrigin = (suggestion: MapboxSuggestion) => {
        if (!suggestion.coordinateKey) {
            toast('Selected suggestion has no coordinates');
            return;
        }

        handleRememberLocation(suggestion);
        setOrigin({
            value: suggestion.label,
            coordinateKey: suggestion.coordinateKey,
        });
    };

    const handleSelectDestination = (suggestion: MapboxSuggestion) => {
        if (!suggestion.coordinateKey) {
            toast('Selected suggestion has no coordinates');
            return;
        }

        handleRememberLocation(suggestion);
        setDestination({
            value: suggestion.label,
            coordinateKey: suggestion.coordinateKey,
        });
    };

    const handleSelectIntermediate = (index: number, suggestion: MapboxSuggestion) => {
        if (!suggestion.coordinateKey) {
            toast('Selected suggestion has no coordinates');
            return;
        }

        handleRememberLocation(suggestion);
        setIntermediateInputs((prev) =>
            prev.map((item, idx) =>
                idx === index
                    ? {
                        value: suggestion.label,
                        coordinateKey: suggestion.coordinateKey,
                        deadlineMinutes: item.deadlineMinutes,
                        serviceMinutes: item.serviceMinutes,
                    }
                    : item,
            ),
        );
    };

    const handleRemoveStop = (index: number) => {
        setIntermediateInputs((prev) =>
            prev.filter((_, idx) => idx !== index),
        );
    };

    const handleRunDemoScenario = () => {
        const demoOrigin: LocationInput = {
            value: DEMO_SCENARIO.origin.label,
            coordinateKey: DEMO_SCENARIO.origin.coordinateKey,
        };
        const demoDestination: LocationInput = {
            value: DEMO_SCENARIO.destination.label,
            coordinateKey: DEMO_SCENARIO.destination.coordinateKey,
        };
        const demoStops: IntermediateStopInputValue[] = DEMO_SCENARIO.stops.map((stop) => ({
            value: stop.label,
            coordinateKey: stop.coordinateKey,
            deadlineMinutes: stop.deadlineMinutes,
            serviceMinutes: stop.serviceMinutes,
        }));
        const normalizedStops = normalizeIntermediateStops(demoStops);
        const places = [
            demoOrigin.coordinateKey,
            ...normalizedStops.map((stop) => stop.coordinateKey as string),
            demoDestination.coordinateKey,
        ];

        setSameDestination(DEMO_SCENARIO.returnToStart);
        setOrigin(demoOrigin);
        setDestination(demoDestination);
        setIntermediateInputs(demoStops);
        setIntermediateList(normalizedStops.map((item) => item.label));
        setStopWindows(toStopWindows(normalizedStops));

        [DEMO_SCENARIO.origin, DEMO_SCENARIO.destination, ...DEMO_SCENARIO.stops].forEach(
            (location) => {
                rememberLocation({
                    coordinateKey: location.coordinateKey,
                    label: location.label,
                });
            },
        );

        const coordinates = parseCoordinateKey(DEMO_SCENARIO.origin.coordinateKey);
        if (coordinates) {
            setCenter({ lat: coordinates.latitude, lng: coordinates.longitude });
        }

        onCompute(places);
        toast('Running demo scenario');
    };

    const handleCompute = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const originLabel = origin.value.trim();
        if (!originLabel) {
            toast('Start location is required');
            return;
        }

        if (!origin.coordinateKey) {
            toast('Start location must be selected from suggestions');
            return;
        }

        const destinationValue = sameDestination ? origin : destination;
        const destinationLabel = destinationValue.value.trim();

        if (!destinationLabel) {
            toast('End location is required');
            return;
        }

        if (!destinationValue.coordinateKey) {
            toast('End location must be selected from suggestions');
            return;
        }

        const intermediateStops = normalizeIntermediateStops(intermediateInputs);

        const missingCoordinateStop = intermediateStops.find((stop) => !stop.coordinateKey);
        if (missingCoordinateStop) {
            toast(`Job stop ${missingCoordinateStop.index + 1} must be selected from suggestions`);
            return;
        }

        const places = [
            origin.coordinateKey,
            ...intermediateStops.map((stop) => stop.coordinateKey as string),
            destinationValue.coordinateKey,
        ];

        onCompute(places);
    };

    return (
        <div
            className={`routePanel${className ? ` ${className}` : ''}`}
        >
            <form
                className="routeForm"
                onSubmit={handleCompute}
            >
                <div className="panel-handle">
                    <span>Dispatch Planner</span>
                    <span className="panel-handle__hint">Drag</span>
                </div>
                <h1 className="title">Field Service Route Planner</h1>
                <p className="subtitle">
                    Optimize technician job order with stop deadlines and map preview.
                </p>
                <div className="demoActions">
                    <button
                        type="button"
                        className="demoButton"
                        onClick={handleRunDemoScenario}
                    >
                        Run Demo Scenario
                    </button>
                </div>

                <div className="inputLine">
                    <Autocomplete
                        className="route-autocomplete"
                        disablePortal
                        freeSolo
                        options={originSuggestions}
                        getOptionLabel={(option) =>
                            typeof option === 'string' ? option : option.label
                        }
                        inputValue={origin.value}
                        onInputChange={(_, value) =>
                            setOrigin((prev) => ({
                                value,
                                coordinateKey: prev.value === value ? prev.coordinateKey : null,
                            }))}
                        onChange={(_, selected) => {
                            if (selected && typeof selected !== 'string') {
                                handleSelectOrigin(selected);
                            }
                        }}
                        loading={originLoading}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Start depot or first job"
                                required
                                variant="outlined"
                                size="small"
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {originLoading ? (
                                                <CircularProgress color="inherit" size={16} />
                                            ) : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                    />
                    {origin.coordinateKey ? (
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
                            freeSolo
                            options={destinationSuggestions}
                            getOptionLabel={(option) =>
                                typeof option === 'string' ? option : option.label
                            }
                            inputValue={destination.value}
                            onInputChange={(_, value) =>
                                setDestination((prev) => ({
                                    value,
                                    coordinateKey: prev.value === value ? prev.coordinateKey : null,
                                }))}
                            onChange={(_, selected) => {
                                if (selected && typeof selected !== 'string') {
                                    handleSelectDestination(selected);
                                }
                            }}
                            loading={destinationLoading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="End depot or shift finish"
                                    required
                                    variant="outlined"
                                    size="small"
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {destinationLoading ? (
                                                    <CircularProgress color="inherit" size={16} />
                                                ) : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                        />
                        {destination.coordinateKey ? (
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
                    <label>Return to start depot</label>
                    <div className="toggleSwitch">
                        <Switch
                            checked={sameDestination}
                            onChange={() => setSameDestination((prev) => !prev)}
                            inputProps={{ 'aria-label': 'controlled' }}
                        />
                    </div>
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

                {intermediateInputs.length === 0 ? (
                    <p className="emptyHint">No intermediate job stops yet.</p>
                ) : (
                    <div className="intermediateList">
                        {intermediateInputs.map((item, index) => (
                            <IntermediateStopInput
                                key={index}
                                value={item.value}
                                placeholder={`Job stop ${index + 1}`}
                                hasCoordinate={Boolean(item.coordinateKey)}
                                deadlineMinutes={item.deadlineMinutes}
                                serviceMinutes={item.serviceMinutes}
                                onChange={(value) => handleUpdateStop(index, value)}
                                onChangeDeadline={(value) =>
                                    handleUpdateStopDeadline(index, value)}
                                onChangeServiceMinutes={(value) =>
                                    handleUpdateStopServiceMinutes(index, value)}
                                onSelectSuggestion={(suggestion) =>
                                    handleSelectIntermediate(index, suggestion)}
                                onLocate={() => handleLocate(item)}
                                onRemove={() => handleRemoveStop(index)}
                            />
                        ))}
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
