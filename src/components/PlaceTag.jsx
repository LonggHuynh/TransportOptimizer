import React from 'react'
import CloseIcon from '@mui/icons-material/Close';
const PlaceTag = ({ name, removeItem }) => {
    return (
        <div style={{ display: 'flex' }}>
            <div>{name}</div>
            <button onClick={removeItem}><CloseIcon /></button>
        </div>
    )
}

export default PlaceTag