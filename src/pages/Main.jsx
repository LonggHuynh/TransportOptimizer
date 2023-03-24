
import computeRoute from '../utils/modifiedTSP'
import {
    useJsApiLoader,
    GoogleMap,
    Marker,
    Autocomplete,
    DirectionsRenderer,
} from '@react-google-maps/api'
import { useEffect, useRef, useState } from 'react'
import RouteDetails from '../components/RouteDetails'
import PlaceTag from '../components/PlaceTag'
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Switch } from '@mui/material';
import './Main.css'
import { useAlert } from "react-alert";
import Requirements from '../components/Requirements'
const libraries = ['places'];

var baseUrl = "https://www.google.com/maps/dir/?api=1";

const Main = () => {

    const alert = useAlert()
    const [center, setCenter] = useState({ lat: 59.4370, lng: 24.7536 })

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
        libraries,
    })


    const [directionsResponse, setDirectionsResponse] = useState(null)
    const [intermediateList, setIntermediateList] = useState([])
    const [estimatedTime, setEstimatedTime] = useState(0)
    const [routes, setRoutes] = useState([])
    const [fromReq, setFromReq] = useState('0')
    const [toReq, setToReq] = useState('0')
    const [showReq, setShowReq] = useState(false)
    const [sameDestination, setSameDistination] = useState(false)
    const [requirements, setRequirements] = useState([])
    const originRef = useRef()
    const destinationRef = useRef()
    const intermediateRef = useRef()


    useEffect(() => {
        setDirectionsResponse(null)
        setEstimatedTime(0)
        setRoutes([])
    }, [intermediateList, requirements])

    if (!isLoaded) {
        return <></>
    }

    const handleAdd = () => {
        const newLocation = intermediateRef.current.value.trim()
        if (newLocation !== '' && !intermediateList.includes(newLocation)) {
            setIntermediateList(prev => (newLocation !== '' && !intermediateList.includes(newLocation)) ? [...prev, newLocation] : prev)
        }
        intermediateRef.current.value = ''

    }

    const removeFromIntermediate = (item) => {
        setRequirements([])
        setIntermediateList(prev => prev.filter(otherItem => otherItem !== item))
    }

    const handleAddRequirement = () => {
        if (fromReq === toReq) {
            alert.error('Places must be different')
        }
        setRequirements(prev => {
            if ((fromReq === toReq) || (prev.find(item => item[0] === Number(fromReq) + 1 && item[1] === Number(toReq) + 1))) {
                return prev
            }
            return [...prev, [Number(fromReq) + 1, Number(toReq) + 1]]

        })
    }

    const handleLocate = async (address) => {
        // eslint-disable-next-line no-undef
        const geoCoder = new google.maps.Geocoder()

        geoCoder.geocode({ address }, (results, status) => {
            if (status === 'OK') {
                setCenter(results[0].geometry.location)
                // eslint-disable-next-line no-undef
            } else {
                console.error(`Error: ${status}`)
            }
        })

    }

    async function displayRoute(from, to) {

        // eslint-disable-next-line no-undef
        const directionsService = new google.maps.DirectionsService()
        const results = await directionsService.route({
            origin: from,
            destination: to,
            // eslint-disable-next-line no-undef
            travelMode: google.maps.TravelMode.TRANSIT,
        })
        setDirectionsResponse(results)
    }

    async function showOnGoogleMaps(from, to) {
        
        const origin = `origin=${encodeURIComponent(from)}`;
        const destination = `destination=${encodeURIComponent(to)}`;
        const travelMode = "travelmode=transit";
        const url = `${baseUrl}&${origin}&${destination}&${travelMode}`;

        // Open Google Maps in a new tab with the generated URL
        window.open(url, "_blank");
    }


    const handleCompute = (e) => {
        e.preventDefault()
        const places = [originRef.current.value, ...intermediateList, sameDestination ? originRef.current.value : destinationRef.current.value]
        // eslint-disable-next-line no-undef
        let directionsService = new google.maps.DistanceMatrixService()
        directionsService.getDistanceMatrix({
            destinations: places,
            origins: places,
            travelMode: 'TRANSIT'
        }, (response, status) => {
            if (status === 'OK') {
                const adjMatrix = response.rows.map(row => row.elements.map(elem => elem.duration?.value || Infinity))
                const { bestRoutes, totalTime } = computeRoute(adjMatrix, places, requirements)
                setRoutes(bestRoutes)
                if (totalTime === Infinity) alert.error('No routes available')
                else alert.success('Routes computed')
                setEstimatedTime(totalTime)
            } else {
                alert.error('Api errors')
            }
        })
    }

    return (
        <>

            <div className='mapContainer'>
                <GoogleMap
                    center={center} zoom={15} mapContainerStyle={{ width: '100%', height: '100%' }}
                    options={{
                        zoomControl: true,
                        streetViewControl: true,
                        mapTypeControl: true,
                        fullscreenControl: true,
                    }}
                >
                    {<Marker position={center} />}
                    {directionsResponse && (<DirectionsRenderer directions={directionsResponse} />)}
                </GoogleMap>
            </div>
            <div className='container'>
                <div className='console'>
                    <form onSubmit={handleCompute} onKeyDown={(e) => { if (e.keyCode === 13) e.preventDefault() }} >
                        <h1 className='title'>Path Planner</h1>
                        <div className='inputLine'>
                            <Autocomplete className='input'>
                                <input type='text' required placeholder='Origin' ref={originRef} />
                            </Autocomplete>
                            <button type='button' onClick={() => handleLocate(originRef.current.value)}><LocationOnIcon /></button>

                        </div>

                        {
                            sameDestination ||
                            <>
                                <div className='inputLine'>
                                    <Autocomplete className='input'>
                                        <input type='text' required placeholder='Destination' ref={destinationRef} />
                                    </Autocomplete>
                                    <button type='button' onClick={() => handleLocate(destinationRef.current.value)}><LocationOnIcon /></button>

                                </div>
                            </>
                        }

                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label >Return to the origin</label>
                            <div style={{ marginLeft: 'auto' }}>
                                <Switch
                                    checked={sameDestination}
                                    onChange={() => setSameDistination(prev => !prev)}
                                    inputProps={{ 'aria-label': 'controlled' }}
                                />
                            </div>
                        </div>
                        <div className='inputLine'>
                            <Autocomplete className='input'>
                                <input type='text' placeholder='Places I also want to visit' ref={intermediateRef} />
                            </Autocomplete>
                            <button type='button' onClick={handleAdd} className='addButton'>ADD</button>
                        </div>

                        <div className='tags'>
                            {intermediateList.map((item, ind) => <PlaceTag name={item} key={ind} removeItem={() => removeFromIntermediate(item)} locatePlace={() => handleLocate(item)} />)}
                        </div>
                        <button className='viewRequirementsButton' type='button' onClick={() => setShowReq(prev => !prev)}> Set requirements </button>
                        <button className='calculateRouteButton' type='submit'> Calculate Route </button>
                    </form>

                    {
                        showReq &&
                        <Requirements setShowReq={setShowReq}
                            intermediateList={intermediateList}
                            fromReq={fromReq}
                            setFromReq={setFromReq}
                            setToReq={setToReq}
                            requirements={requirements}
                            setRequirements={setRequirements}
                            handleAddRequirement={handleAddRequirement} />
                    }

                </div>

                <div className='result'>
                    <h1>Estimated time: {estimatedTime === Infinity ? 0 : (Math.round(estimatedTime / 60))} minutes </h1>
                    {
                        estimatedTime === Infinity ?
                            <>
                                <p>No route available</p>
                            </>
                            :
                            routes.map((route, ind) => <RouteDetails route={route} key={ind} displayRoute={displayRoute} showOnGoogleMaps={showOnGoogleMaps} />)
                    }
                </div>
            </div>


        </>
    )
}

export default Main
