import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { GeocodeSuggestion, useGeocodeSuggestions } from '../../hooks/queries/useGeocodeSuggestions';
import { useDebouncedValue } from './hooks/useDebouncedValue';

interface IntermediateStopInputProps {
    value: string;
    placeholder: string;
    hasCoordinate: boolean;
    deadlineTimeLocal: string;
    serviceMinutes: string;
    onChange: (value: string) => void;
    onChangeDeadlineTime: (value: string) => void;
    onChangeServiceMinutes: (value: string) => void;
    onSelectSuggestion: (value: GeocodeSuggestion) => void;
    onLocate: () => void;
    onRemove: () => void;
}

const IntermediateStopInput = ({
    value,
    placeholder,
    hasCoordinate,
    deadlineTimeLocal,
    serviceMinutes,
    onChange,
    onChangeDeadlineTime,
    onChangeServiceMinutes,
    onSelectSuggestion,
    onLocate,
    onRemove,
}: IntermediateStopInputProps) => {
    const debouncedValue = useDebouncedValue(value, 300);
    const { suggestions, loading } = useGeocodeSuggestions(debouncedValue);

    const renderSuggestionOption = (
        props: React.HTMLAttributes<HTMLLIElement>,
        option: GeocodeSuggestion,
    ) => {
        const { key: _key, ...optionProps } = props as React.HTMLAttributes<HTMLLIElement> & {
            key?: React.Key;
        };

        return (
            <li key={option.id} {...optionProps}>
                {option.label}
            </li>
        );
    };

    return (
        <div className="inputLine stopLine">
            <div className="stopLineTop">
                <Autocomplete
                    className="route-autocomplete"
                    disablePortal
                    disableClearable
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
                    renderOption={renderSuggestionOption}
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
                    <span className="stopEndPrefix">arrive before</span>
                    <input
                        type="time"
                        className="stopDeadlineInput stopDeadlineTimeInput"
                        value={deadlineTimeLocal}
                        aria-label={`${placeholder} arrive before at local time`}
                        onChange={(e) => onChangeDeadlineTime(e.target.value)}
                    />
                </label>
                <label className="stopEndWindow stopStayWindow">
                    <span className="stopEndPrefix">stay for</span>
                    <input
                        type="number"
                        className="stopDeadlineInput stopServiceInput"
                        min={0}
                        max={1439}
                        step={5}
                        placeholder=""
                        value={serviceMinutes}
                        aria-label={`${placeholder} stay for minutes`}
                        onChange={(e) => onChangeServiceMinutes(e.target.value)}
                    />
                    <span className="stopEndSuffix">min</span>
                </label>
            </div>
        </div>
    );
};

export default IntermediateStopInput;
