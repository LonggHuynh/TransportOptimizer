import React from 'react'
import CloseIcon from '@mui/icons-material/Close';

const RequirementTag = ({ from, to, removeItem }) => {
    return (
        <div style={{ display: 'flex' }}>
            <span>{from}</span>
            <span style={{ marginLeft: 'auto' }} >{to}</span>
            <button style={{ marginLeft: 'auto' }} type='button' onClick={removeItem}><CloseIcon /></button>
        </div>
    )
}

export default RequirementTag