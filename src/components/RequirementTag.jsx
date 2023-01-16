import React from 'react'
import CloseIcon from '@mui/icons-material/Close';

const RequirementTag = ({ from, to, removeItem }) => {
    return (
        <div style={{ display: 'flex' }}>
            <div>{from}</div>
            <div>{to}</div>
            <button type='button' onClick={removeItem}><CloseIcon /></button>
        </div>
    )
}

export default RequirementTag