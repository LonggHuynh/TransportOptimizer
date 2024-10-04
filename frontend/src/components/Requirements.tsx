import React from 'react';
import RequirementTag from './RequirementTag';
import CloseIcon from '@mui/icons-material/Close';
import './Requirements.css';
import { useState } from 'react';


interface RequirementsProps {
    setShowReq: (value: boolean) => void;
    intermediateList: string[];
    requirements: number[][];
    setRequirements: React.Dispatch<React.SetStateAction<number[][]>>;
}
const Requirements = ({
    setShowReq,
    intermediateList,
    requirements,
    setRequirements,
}:RequirementsProps) => {
    const [fromReq, setFromReq] = useState('0');
    const [toReq, setToReq] = useState('0');

    console.log(intermediateList);
    const handleAddRequirement = () => {
        if (fromReq === toReq) {
            alert.call('Places must be different');
        }
        setRequirements((prev:number[][]) => {
            if (
                fromReq === toReq ||
                prev.find(
                    (item) =>
                        item[0] === Number(fromReq) + 1 &&
                        item[1] === Number(toReq) + 1,
                )
            ) {
                return prev;
            }
            return [...prev, [Number(fromReq) + 1, Number(toReq) + 1]];
        });
    };
    return (
        <div className="requirements">
            <div className="closeIcon" onClick={() => setShowReq(false)}>
                {' '}
                <CloseIcon />
            </div>
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
                        <button
                            onClick={handleAddRequirement}
                            className="addButton"
                        >
                            ADD
                        </button>
                    </div>

                    <div>
                        {requirements.map((item, ind) => (
                            <RequirementTag
                                key={ind}
                                from={intermediateList[item[0] - 1]}
                                to={intermediateList[item[1] - 1]}
                                removeItem={() =>
                                    setRequirements((prev) =>
                                        prev.filter(
                                            (otherItem) =>
                                                otherItem[0] !== item[0] ||
                                                otherItem[1] !== item[1],
                                        ),
                                    )
                                }
                            />
                        ))}
                    </div>
                </>
            ) : (
                <div>
                    Please have at least 2 intermediate locations to set
                    requirements.
                </div>
            )}
        </div>
    );
};

export default Requirements;
