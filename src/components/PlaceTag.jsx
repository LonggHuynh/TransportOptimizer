import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import './PlaceTag.css';

const PlaceTag = ({ name, removeItem, locatePlace }) => {
  return (
    <div className="place-tag-container">
      <div>{name}</div>
      <button type="button" onClick={locatePlace}>
        <LocationOnIcon />
      </button>
      <button className="remove-button" type="button" onClick={removeItem}>
        <CloseIcon />
      </button>
    </div>
  );
};

export default PlaceTag;
