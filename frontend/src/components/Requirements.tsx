import React from 'react';
import RequirementTag from './RequirementTag';
import './Requirements.css';
import { useState } from 'react';
import { useIntermediateListStore } from '../hooks/store/useIntermediateListStore';
import { useRequirementsStore } from '../hooks/store/useRequirementsStore';
import { toast } from 'react-toastify';




const Requirements = () => {
    const [fromReq, setFromReq] = useState('0');
    const [toReq, setToReq] = useState('0');
    const intermediateList = useIntermediateListStore((state) => state.intermediateList);
    const requirements = useRequirementsStore((state) => state.requirements);
    const addRequirement = useRequirementsStore((state) => state.addRequirement);
    const handleAddRequirement = () => {
        if (fromReq === toReq) {
            toast('Places must be different.');
        }

        const newReq = { from: Number(fromReq) + 1, to: Number(toReq) + 1 }
        addRequirement(newReq);
    };
    return (
        <>
            {intermediateList.length > 1 ? (
                <>
                    <div className="settingLine">
                        <select
                            value={fromReq}
                            onChange={(e) => setFromReq(e.target.value)}
                        >
                            {intermediateList.map((item, ind) => (
                                <option key={ind} value={ind}>
                                    {item}
                                </option>
                            ))}
                        </select>
                        before
                        <select
                            value={toReq}
                            onChange={(e) => setToReq(e.target.value)}
                        >
                            {intermediateList.map((item, ind) => (
                                <option key={ind} value={ind}>
                                    {item}
                                </option>
                            ))}
                        </select>
                        <button onClick={handleAddRequirement} className="addButton">
                            ADD
                        </button>
                    </div>

                    <div>
                        {requirements.map((requirement, ind) => (
                            <RequirementTag
                                key={ind}
                                requirement={requirement}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <div>Please have at least 2 intermediate locations to set requirements.</div>
            )}
        </>
    );
    ;
};

export default Requirements;
