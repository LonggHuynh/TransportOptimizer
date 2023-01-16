import React from 'react'
import CloseIcon from '@mui/icons-material/Close';
const PlaceTag = ({ name, removeItem }) => {
    return (
        <div style={{ display: 'flex',  overflow:'hidden', marginTop:'10px' }}>
            <div>{name}</div>
            <button style={{marginLeft:'auto'}}type='button' onClick={removeItem}><CloseIcon /></button>
        </div>
    )
}

export default PlaceTag