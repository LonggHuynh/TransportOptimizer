import React from 'react';
import RequirementTag from '../components/RequirementTag';
import CloseIcon from '@mui/icons-material/Close';
import './Requirements.css';
import { useState } from 'react';

const Requirements = ({
  setShowReq,
  intermediateList,
  requirements,
  setRequirements,
}) => {
  const [fromReq, setFromReq] = useState('0');
  const [toReq, setToReq] = useState('0');
  const handleAddRequirement = () => {
    if (fromReq === toReq) {
      alert.error('Places must be different');
    }
    setRequirements((prev) => {
      if (
        fromReq === toReq ||
        prev.find(
          (item) =>
            item[0] === Number(fromReq) + 1 && item[1] === Number(toReq) + 1,
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
            <select value={toReq} onChange={(e) => setToReq(e.target.value)}>
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
            {requirements.map((item, ind) => (
              <RequirementTag
                key={ind}
                from={intermediateList[item[0] - 1]}
                to={intermediateList[item[1] - 1]}
                removeItem={() =>
                  setRequirements((prev) =>
                    prev.filter(
                      (otherItem) =>
                        otherItem[0] !== item[0] || otherItem[1] !== item[1],
                    ),
                  )
                }
              />
            ))}
          </div>
        </>
      ) : (
        <div>
          Please have at least 2 intermediate locations to set requirements.
        </div>
      )}
    </div>
  );
};

export default Requirements;
