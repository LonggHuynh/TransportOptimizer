import React, { useState, useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Switch } from '@mui/material';
import PlaceTag from './PlaceTag';
import './RouteForm.css';
import { toast } from 'react-toastify';
import { useIntermediateListStore } from '../hooks/store/useIntermediateListStore';
import { useRequirementsStore } from '../hooks/store/useRequirementsStore';
import { useComputePathAndTime } from '../hooks/queries/useComputePathAndTime';
import { useLocateAddress } from '../hooks/queries/useLocateAddressMutation';

interface RouteFormProps {
  toggleRequirements: () => void;


}

const RouteForm = ({
  toggleRequirements,
}: RouteFormProps) => {
  const [sameDestination, setSameDestination] = useState(false);
  const originRef = useRef<HTMLInputElement>(null);
  const destinationRef = useRef<HTMLInputElement>(null);
  const intermediateRef = useRef<HTMLInputElement>(null);

  const intermediateList = useIntermediateListStore((state) => state.intermediateList);
  const addToIntermediateList = useIntermediateListStore((state) => state.addToIntermediateList);
  const removeFromIntermediateList = useIntermediateListStore((state) => state.removeFromIntermediateList);
  const resetRequirements = useRequirementsStore((state) => state.resetRequirements);

  const { mutate: locateAddress } = useLocateAddress();
  const { mutate: computePath } = useComputePathAndTime();

  const handleLocate = async (address: string) => {
    locateAddress(address);
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
    resetRequirements();
    removeFromIntermediateList(item);
  };

  const handleCompute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!originRef.current) {
      toast('Origin is not set');
      return;
    }

    const originValue = originRef.current.value;
    const destinationValue = sameDestination
      ? originValue
      : destinationRef.current?.value;

    if (!destinationValue) {
      toast('Destination is not set');
      return;
    }

    const places = [originValue, ...intermediateList, destinationValue];

    computePath({ places })
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
