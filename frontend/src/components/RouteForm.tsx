import React, { useState, useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Switch } from '@mui/material';
import PlaceTag from './PlaceTag';
import { locateAddress } from '../services/mapService';
import { computePathAndTime } from '../services/shortestRouteService';
import './RouteForm.css';

interface RouteFormProps {
  setCenter: (center: google.maps.LatLngLiteral | undefined) => void;
  intermediateList: string[];
  setRequirements: (requirements: number[][]) => void;
  toggleRequirements: () => void;
  setEstimatedTime: (estimatedTime: number) => void;
  setRoutes: (routes: any) => void;
  requirements: number[][];

  addToIntermediateList: (newLocation: string) => void;
  removeFromIntermediateList: (item: string) => void;
}

const RouteForm = ({
  setCenter,
  intermediateList,
  setRequirements,
  toggleRequirements,
  setEstimatedTime,
  setRoutes,
  requirements,
  addToIntermediateList,
  removeFromIntermediateList

}:RouteFormProps) => {
  const [sameDestination, setSameDestination] = useState(false);
  const originRef = useRef<HTMLInputElement>(null);
  const destinationRef = useRef<HTMLInputElement>(null);
  const intermediateRef = useRef<HTMLInputElement>(null);


  const handleLocate = async (address: string) => {
    try {
      const location = await locateAddress(address);
      setCenter(location);
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert(String(error));
      }
    }
  };

  const handleAdd = () => {
    if (intermediateRef.current) {
      const newLocation = intermediateRef.current.value.trim();
      if (newLocation !== '') {
        addToIntermediateList(newLocation);
      }
      intermediateRef.current.value = '';
    }
  };

  const removeFromIntermediate = (item: string) => {
    setRequirements([]);
    removeFromIntermediateList(item);
  };

  const handleCompute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!originRef.current) {
      alert('Origin is not set');
      return;
    }

    const originValue = originRef.current.value;
    const destinationValue = sameDestination
      ? originValue
      : destinationRef.current?.value;

    if (!destinationValue) {
      alert('Destination is not set');
      return;
    }

    const places = [originValue, ...intermediateList, destinationValue];

    try {
      const { bestRoutes, totalTime } = await computePathAndTime(places, requirements);

      if (totalTime < 1e8) {
        alert('Routes computed');
        setEstimatedTime(totalTime);
        setRoutes(bestRoutes);
      } else {
        alert('No routes available');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert(String(error));
      }
    }
  };

  return (
    <form onSubmit={handleCompute}>
      <h1 className="title">Transport Optimizer</h1>

      <div className="inputLine">
        <Autocomplete>
          <input type="text" required placeholder="Origin" ref={originRef} />
        </Autocomplete>
        <button
          type="button"
          onClick={() => originRef.current && handleLocate(originRef.current.value)}
        >
          <LocationOnIcon />
        </button>
      </div>

      {!sameDestination && (
        <div className="inputLine">
          <Autocomplete>
            <input type="text" required placeholder="Destination" ref={destinationRef} />
          </Autocomplete>
          <button
            type="button"
            onClick={() =>
              destinationRef.current && handleLocate(destinationRef.current.value)
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
        <Autocomplete>
          <input
            type="text"
            placeholder="Intermediate places (unordered)"
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

export default RouteForm;
