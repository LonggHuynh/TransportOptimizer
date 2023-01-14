
import './App.css'

import {
  useJsApiLoader,
  GoogleMap,
  Marker,
  Autocomplete,
  DirectionsRenderer,
} from '@react-google-maps/api'
import { useRef, useState } from 'react'
import RouteDetails from './components/RouteDetails'
import PlaceTag from './components/PlaceTag'


const center = { lat: 48.8584, lng: 2.2945 }
const libraries = ['places'];


function App() {




  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  })



  const [map, setMap] = useState(/** @type google.maps.Map */(null))
  const [directionsResponse, setDirectionsResponse] = useState(null)
  const [betweenList, setBetweenList] = useState([])



  const [estimatedTime, setEstimatedTime] = useState(0)
  const [routes, setRoutes] = useState([])



  const originRef = useRef()
  const destinationRef = useRef()
  const betweenRef = useRef()




  if (!isLoaded) {
    return <></>
  }

  console.log(betweenList)
  const handleAdd = () => {
    const newLocation = betweenRef.current.value.trim()
    if (newLocation !== '' && !betweenList.includes(newLocation)) {
      setBetweenList(prev => (newLocation !== '' && !betweenList.includes(newLocation)) ? [...prev, newLocation] : prev)
    }
    betweenRef.current.value = ''

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

  const handleCompute = (e) => {
    e.preventDefault()
    // eslint-disable-next-line no-undef
    let directionsService = new google.maps.DistanceMatrixService()
    directionsService.getDistanceMatrix({
      destinations: [originRef.current.value, ...betweenList, destinationRef.current.value],
      origins: [originRef.current.value, ...betweenList, destinationRef.current.value],
      travelMode: 'TRANSIT'
    }, (response, status) => {
      if (status === 'OK') {
        console.log(response)
        const adjMatrix = response.rows.map(row => row.elements.map(elem => elem.duration?.value || 0))
        computeRoute(adjMatrix, response.destinationAddresses)
      } else {
        alert('Api errors')
      }
    })

  }



  //TSP algorithm 
  const computeRoute = (dist, places) => {
    let n = dist.length

    let dp = [...Array(1 << n)].map(() => Array(n).fill(Infinity))
    let prevVisit = [...Array(1 << n)].map(() => Array(n).fill(0))

    dp[1][0] = 0;
    for (let mask = 0; mask < (1 << n); mask++) {

      for (let last = 0; last < n; last++) {
        if (((mask >> last) & 1) === 0) continue;

        for (let next = 0; next < n; next++) {
          if (next === last) continue
          if (((mask >> next) & 1) === 1) continue;
          let newMask = mask | (1 << next);

          if (dp[newMask][next] > dp[mask][last] + dist[last][next]) {
            dp[newMask][next] = dp[mask][last] + dist[last][next]
            prevVisit[newMask][next] = last
          }
        }
      }
    }
    let cur = n - 1
    let curMask = (1 << n) - 1


    let routes = []
    while (cur !== 0) {
      let prev = prevVisit[curMask][cur]
      curMask = curMask ^ (1 << cur)
      routes.push([places[prev], places[cur]])
      cur = prev
    }

    setRoutes(routes.reverse())
    setEstimatedTime(dp[(1 << n) - 1][n - 1])

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
          onLoad={map => setMap(map)}>
          <Marker position={center} />
          {directionsResponse && (<DirectionsRenderer directions={directionsResponse} />)}
        </GoogleMap>
      </div>
      <div className='container'>
        <div className='console'  >
          <form onSubmit={handleCompute}>
            <div >
              <Autocomplete>
                <input type='text' required placeholder='Origin' ref={originRef} onInput={e => console.log(e.target.value)} />
              </Autocomplete>
            </div>
            <div>
              <Autocomplete>
                <input type='text' required placeholder='Destination' ref={destinationRef} />
              </Autocomplete>
            </div>
            <div>
              <Autocomplete>
                <input type='text' placeholder='Between' ref={betweenRef} />
              </Autocomplete>
              <button type='button' onClick={handleAdd}>Add</button>
            </div>

            <button type='submit'> Calculate Route </button>
            <div className='tags'>
              {betweenList.map((item, ind) => <PlaceTag name={item} key={ind} removeItem={() => setBetweenList(prev => prev.filter(otherItem => otherItem !== item))} />)}

            </div>
          </form>


        </div>

        <div className='result'>
          <p>Estimated time: {Math.round(estimatedTime / 6)} minutes </p>
          {/* <FaLocationArrow onClick={() => { map.panTo(center); map.setZoom(15) }} /> */}


          {
            routes.map((route, ind) => <RouteDetails route={route} key={ind} displayRoute={displayRoute} />)
          }

        </div>
      </div>
    </>
  )
}

export default App
