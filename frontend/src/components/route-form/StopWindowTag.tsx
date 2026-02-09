import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import './StopWindowTag.scss';
import { useStopWindowsStore } from '../../hooks/store/useStopWindowsStore';
import { useIntermediateListStore } from '../../hooks/store/useIntermediateListStore';
import { StopWindow } from '../../models/stopWindow';

interface StopWindowTagProps {
    stopWindow: StopWindow;
}

const formatWindowTime = (minutes: number) => {
    const safe = Math.max(0, Math.min(1439, minutes));
    const hours = String(Math.floor(safe / 60)).padStart(2, '0');
    const mins = String(safe % 60).padStart(2, '0');
    return `${hours}:${mins}`;
};

const StopWindowTag = ({ stopWindow }: StopWindowTagProps) => {
    const removeStopWindow = useStopWindowsStore((state) => state.removeStopWindow);
    const intermediateList = useIntermediateListStore((state) => state.intermediateList);

    return (
        <div className="tagContainer">
            <span>{intermediateList.at(stopWindow.stopIndex - 1) ?? `Stop ${stopWindow.stopIndex}`}</span>
            <strong>
                {formatWindowTime(stopWindow.windowStartMinutes)}
                {' - '}
                {formatWindowTime(stopWindow.windowEndMinutes)}
            </strong>
            <button
                className="tagCloseButton"
                type="button"
                onClick={() => removeStopWindow(stopWindow.stopIndex)}
            >
                <CloseIcon />
            </button>
        </div>
    );
};

export default StopWindowTag;
