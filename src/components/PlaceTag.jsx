import React from 'react'
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const PlaceTag = ({ name, removeItem, locatePlace }) => {
    return (
        <div style={{ display: 'flex', overflow: 'hidden', marginTop: '10px', gap: '10px' }}>
            <div>{name}</div>
            <button type='button' onClick={locatePlace}><LocationOnIcon /></button>

            <button style={{ marginLeft: 'auto' }} type='button' onClick={removeItem}><CloseIcon /></button>
        </div>
    )
}

export default PlaceTag