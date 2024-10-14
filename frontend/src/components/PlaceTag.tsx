import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import './PlaceTag.css';

interface PlaceTagProps {
    name: string;
    removeItem: () => void;
    locatePlace: () => void;
}

const PlaceTag = (props:PlaceTagProps) => {

    const { name, removeItem, locatePlace } = props;
    return (
        <div className="place-tag-container">
            <div>{name}</div>
            <button type="button" onClick={locatePlace}>
                <LocationOnIcon />
            </button>
            <button
                className="remove-button"
                type="button"
                onClick={removeItem}
            >
                <CloseIcon />
            </button>
        </div>
    );
};

export default PlaceTag;
