import React from 'react'
import CloseIcon from '@mui/icons-material/Close';
const RequirementTag = ({ from, to, removeItem }) => {
    return (
        <div style={{ display: 'flex', gap: '28px' }}>
            <span>{from}</span>
            <strong>before</strong>
            <span >{to}</span>
            <button style={{ marginLeft: 'auto' }} type='button' onClick={removeItem}><CloseIcon /></button>
        </div>
    )
}

export default RequirementTag