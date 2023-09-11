import React from 'react';
import { Autocomplete } from '@react-google-maps/api';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Switch } from '@mui/material';
import PlaceTag from './PlaceTag';
import { useAlert } from 'react-alert';
import { useState, useRef } from 'react';
import { locateAddress } from '../services/mapService';
import { computePathAndTime } from '../services/shortestRouteService';
import './Form.css';
const Form = ({
    setCenter,
    setIntermediateList,
    intermediateList,
    setRequirements,
    toggleRequirements,
    setEstimatedTime,
    setRoutes,
    requirements,
}) => {
    const [sameDestination, setSameDestination] = useState(false);
    const originRef = useRef();
    const destinationRef = useRef();
    const intermediateRef = useRef();

    const alert = useAlert();

    const handleLocate = async (address) => {
        try {
            const location = await locateAddress(address);
            setCenter(location);
        } catch (error) {
            alert.error(error);
        }
    };

    const handleAdd = () => {
        const newLocation = intermediateRef.current.value.trim();
        if (newLocation !== '' && !intermediateList.includes(newLocation)) {
            setIntermediateList((prev) =>
                newLocation !== '' && !intermediateList.includes(newLocation)
                    ? [...prev, newLocation]
                    : prev,
            );
        }
        intermediateRef.current.value = '';
    };

    const removeFromIntermediate = (item) => {
        setRequirements([]);
        setIntermediateList((prev) =>
            prev.filter((otherItem) => otherItem !== item),
        );
    };

    const handleCompute = async (e) => {
        e.preventDefault();
        const places = [
            originRef.current.value,
            ...intermediateList,
            sameDestination
                ? originRef.current.value
                : destinationRef.current.value,
        ];
        try {
            const { bestRoutes, totalTime } = await computePathAndTime(
                places,
                requirements,
            );
            if (totalTime < 1e8) {
                alert.success('Routes computed');
                setEstimatedTime(totalTime);
                setRoutes(bestRoutes);
            } else {
                alert.error('No routes available');
            }
        } catch (error) {
            alert.error(error);
        }
    };

    return (
        <form onSubmit={handleCompute}>
            <h1 className="title">Transport Optimizer</h1>

            <div className="inputLine">
                <Autocomplete className="input">
                    <input
                        type="text"
                        required
                        placeholder="Origin"
                        ref={originRef}
                    />
                </Autocomplete>
                <button
                    type="button"
                    onClick={() => handleLocate(originRef.current.value)}
                >
                    <LocationOnIcon />
                </button>
            </div>

            {sameDestination || (
                <div className="inputLine">
                    <Autocomplete className="input">
                        <input
                            type="text"
                            required
                            placeholder="Destination"
                            ref={destinationRef}
                        />
                    </Autocomplete>
                    <button
                        type="button"
                        onClick={() =>
                            handleLocate(destinationRef.current.value)
                        }
                    >
                        <LocationOnIcon />
                    </button>
                </div>
            )}

            <div className="toggleOrigin">
                <label>Return to the origin</label>
                <div className="toggleSwitch">
                    <Switch
                        checked={sameDestination}
                        onChange={() => setSameDestination((prev) => !prev)}
                        inputProps={{ 'aria-label': 'controlled' }}
                    />
                </div>
            </div>

            <div className="inputLine">
                <Autocomplete className="input">
                    <input
                        type="text"
                        placeholder="Places I also want to visit"
                        ref={intermediateRef}
                    />
                </Autocomplete>
                <button type="button" onClick={handleAdd} className="addButton">
                    ADD
                </button>
            </div>

            <div className="tags">
                {intermediateList.map((item, ind) => (
                    <PlaceTag
                        name={item}
                        key={ind}
                        removeItem={() => removeFromIntermediate(item)}
                        locatePlace={() => handleLocate(item)}
                    />
                ))}
            </div>

            <button
                className="viewRequirementsButton"
                type="button"
                onClick={toggleRequirements}
            >
                Set requirements
            </button>

            <button className="calculateRouteButton" type="submit">
                Calculate Route
            </button>
        </form>
    );
};

export default Form;
