import React from 'react'
import RequirementTag from '../components/RequirementTag'
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import './Requirements.css'

const Requirements = ({setShowReq, intermediateList, fromReq, toReq, setFromReq, setToReq, requirements, setRequirements,handleAddRequirement}) => {
    
    return (
        <div className='requirements'>
            <div className='closeIcon' onClick={() => setShowReq(false)}> <CloseIcon /></div>
            {intermediateList.length > 1 ?
                <>
                    <div className='settingLine'>
                        <select value={fromReq} onChange={e => setFromReq(e.target.value)}>
                            {
                                intermediateList.map((item, ind) => <option key={ind} value={ind}>{item}</option>)
                            }
                        </select>
                        before
                        <select value={toReq} onChange={e => setToReq(e.target.value)}>
                            {
                                intermediateList.map((item, ind) => <option key={ind} value={ind}>{item}</option>)
                            }
                        </select>

                        <button onClick={handleAddRequirement} className='addButton'><AddIcon /></button>

                    </div>

                    <div>
                        {requirements.map((item, ind) => (<RequirementTag key={ind} from={intermediateList[item[0] - 1]} to={intermediateList[item[1] - 1]} removeItem={() => setRequirements(prev => prev.filter(otherItem => otherItem[0] !== item[0] || otherItem[1] !== item[1]))} />))}
                    </div>
                </> :
                <div>
                    Please have at least 2 intermediate locations to set requirements.
                </div>}
        </div>
    )
}

export default Requirements