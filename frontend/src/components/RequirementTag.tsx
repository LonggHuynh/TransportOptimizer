import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import './RequirementTag.css';

interface RequirementTagProps {
    from: string;
    to: string;
    removeItem: () => void;
}
const RequirementTag = ({ from, to, removeItem }:RequirementTagProps) => {
    return (
        <div className="tagContainer">
            <span>{from}</span>
            <strong>before</strong>
            <span>{to}</span>
            <button
                className="tagCloseButton"
                type="button"
                onClick={removeItem}
            >
                <CloseIcon />
            </button>
        </div>
    );
};

export default RequirementTag;
