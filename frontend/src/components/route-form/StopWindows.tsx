import React, { useEffect, useState } from 'react';
import './StopWindows.scss';
import { useIntermediateListStore } from '../../hooks/store/useIntermediateListStore';
import { useStopWindowsStore } from '../../hooks/store/useStopWindowsStore';
import StopWindowTag from './StopWindowTag';
import { notify } from '../../utils/notify';

const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '17:00';

const parseTimeToMinutes = (value: string): number | null => {
    const parts = value.split(':');
    if (parts.length !== 2) {
        return null;
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }

    return hours * 60 + minutes;
};

const minutesToTime = (value: number) => {
    const safe = Math.max(0, Math.min(1439, value));
    const hours = String(Math.floor(safe / 60)).padStart(2, '0');
    const minutes = String(safe % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const StopWindows = () => {
    const [selectedStop, setSelectedStop] = useState(0);
    const [windowStart, setWindowStart] = useState(DEFAULT_START_TIME);
    const [windowEnd, setWindowEnd] = useState(DEFAULT_END_TIME);
    const intermediateList = useIntermediateListStore(
        (state) => state.intermediateList,
    );
    const stopWindows = useStopWindowsStore((state) => state.stopWindows);
    const upsertStopWindow = useStopWindowsStore(
        (state) => state.upsertStopWindow,
    );

    useEffect(() => {
        if (selectedStop >= intermediateList.length) {
            setSelectedStop(Math.max(0, intermediateList.length - 1));
        }
    }, [intermediateList.length, selectedStop]);

    useEffect(() => {
        if (intermediateList.length === 0) {
            return;
        }

        const existing = stopWindows.find(
            (item) => item.stopIndex === selectedStop + 1,
        );
        if (!existing) {
            setWindowStart(DEFAULT_START_TIME);
            setWindowEnd(DEFAULT_END_TIME);
            return;
        }

        setWindowStart(minutesToTime(existing.windowStartMinutes));
        setWindowEnd(minutesToTime(existing.windowEndMinutes));
    }, [selectedStop, stopWindows, intermediateList.length]);

    const handleSetWindow = () => {
        if (intermediateList.length === 0) {
            notify.info('Add at least 1 job stop to set a time window.');
            return;
        }

        const startMinutes = parseTimeToMinutes(windowStart);
        const endMinutes = parseTimeToMinutes(windowEnd);
        if (startMinutes === null || endMinutes === null) {
            notify.warning('Please provide valid start and end times.');
            return;
        }

        if (startMinutes >= endMinutes) {
            notify.warning('Window start must be earlier than window end.');
            return;
        }

        upsertStopWindow({
            stopIndex: selectedStop + 1,
            windowStartMinutes: startMinutes,
            windowEndMinutes: endMinutes,
            serviceMinutes: 0,
        });
    };

    return (
        <div className="stopWindowsInline">
            {intermediateList.length > 0 ? (
                <div className="stopWindowsInline__editor">
                    <select
                        value={selectedStop}
                        onChange={(e) =>
                            setSelectedStop(Number(e.target.value))
                        }
                    >
                        {intermediateList.map((item, index) => (
                            <option key={index} value={index}>
                                Stop {index + 1}: {item}
                            </option>
                        ))}
                    </select>
                    <input
                        type="time"
                        value={windowStart}
                        onChange={(e) => setWindowStart(e.target.value)}
                    />
                    <span className="stopWindowsInline__label">to</span>
                    <input
                        type="time"
                        value={windowEnd}
                        onChange={(e) => setWindowEnd(e.target.value)}
                    />
                    <button
                        onClick={handleSetWindow}
                        className="stopWindowsInline__saveButton"
                        type="button"
                    >
                        Set
                    </button>
                </div>
            ) : (
                <p className="stopWindowsInline__hint">
                    Add at least 1 job stop to define time windows.
                </p>
            )}

            {stopWindows.length > 0 && (
                <div className="stopWindowsInline__list">
                    {stopWindows.map((stopWindow) => (
                        <StopWindowTag
                            key={stopWindow.stopIndex}
                            stopWindow={stopWindow}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default StopWindows;
