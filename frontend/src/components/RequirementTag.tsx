import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import './RequirementTag.css';
import { useRequirementsStore } from '../hooks/store/useRequirementsStore';
import { useIntermediateListStore } from '../hooks/store/useIntermediateListStore';

interface RequirementTagProps {
    requirement: Requirement
}
const RequirementTag = ({ requirement }: RequirementTagProps) => {
    const removeRequirement = useRequirementsStore((state) => state.removeRequirement);
    const intermediateList = useIntermediateListStore((state) => state.intermediateList);
    return (
        <div className="tagContainer">
            <span>{intermediateList.at(requirement.from - 1)}</span>
            <strong>before</strong>
            <span>{intermediateList.at(requirement.to - 1)}</span>
            <button
                className="tagCloseButton"
                type="button"
                onClick={() => removeRequirement(requirement)}
            >
                <CloseIcon />
            </button>
        </div>
    );
};

export default RequirementTag;
