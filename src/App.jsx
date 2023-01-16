
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
import LocationOnIcon from '@mui/icons-material/LocationOn';
import RequirementTag from './components/RequirementTag'
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
const libraries = ['places'];



function App() {
  const [center, setCenter] = useState({ lat: 48.8584, lng: 2.2945 })





  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  })







  const [directionsResponse, setDirectionsResponse] = useState(null)
  const [intermediateList, setIntermediateList] = useState([])



  const [estimatedTime, setEstimatedTime] = useState(0)
  const [routes, setRoutes] = useState([])


  const [fromReq, setFromReq] = useState(0)
  const [toReq, setToReq] = useState(0)

  const [showReq, setShowReq] = useState(false)





  const [requirements, setRequirements] = useState([])

  const originRef = useRef()
  const destinationRef = useRef()
  const intermediateRef = useRef()




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


  const handleAddRequirement = () => {
    if (fromReq === toReq) return
    setRequirements(prev => {

      if (prev.find(item => item[0] === fromReq + 1 && item[1] === toReq + 1))
        return prev
      return [...prev, [fromReq + 1, toReq + 1]]

    })
  }


  const handleLocate = async (address) => {

    // eslint-disable-next-line no-undef
    const geoCoder = new google.maps.Geocoder()

    geoCoder.geocode({ address }, (results, status) => {
      if (status === 'OK') {
        setCenter(results[0].geometry.location)
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

  const handleCompute = (e) => {
    e.preventDefault()

    const places = [originRef.current.value, ...intermediateList, destinationRef.current.value]
    // eslint-disable-next-line no-undef
    let directionsService = new google.maps.DistanceMatrixService()
    directionsService.getDistanceMatrix({
      destinations: places,
      origins: [originRef.current.value, ...intermediateList, destinationRef.current.value],
      travelMode: 'TRANSIT'
    }, (response, status) => {
      if (status === 'OK') {
        const adjMatrix = response.rows.map(row => row.elements.map(elem => elem.duration?.value || 0))
        const { bestRoutes, totalTime } = computeRoute(adjMatrix, places)
        setRoutes(bestRoutes)
        setEstimatedTime(totalTime)
      } else {
        alert('Api errors')
      }
    })



  }



  //TSP algorithm 
  const computeRoute = (dist, places) => {



    const reqMap = new Map()
    requirements.forEach(pair => {
      const [from, to] = pair
      if (!reqMap.get(from)) reqMap.set(from, new Set())
      reqMap.get(from).add(to)
    })

    let n = dist.length

    let dp = [...Array(1 << n)].map(() => Array(n).fill(Infinity))
    let prevVisit = [...Array(1 << n)].map(() => Array(n).fill(0))

    dp[1][0] = 0;
    for (let mask = 0; mask < (1 << n); mask++) {

      for (let last = 0; last < n; last++) {
        if (((mask >> last) & 1) === 0) continue;

        out: for (let next = 0; next < n; next++) {

          for (let visited = 0; visited < n; visited++)
            if (((mask >> visited) & 1) === 1 && reqMap.get(next) && reqMap.get(next).has(visited))
              continue out;

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


    let bestRoutes = []
    while (cur !== 0) {
      let prev = prevVisit[curMask][cur]
      curMask = curMask ^ (1 << cur)
      bestRoutes.push([places[prev], places[cur]])
      cur = prev
    }

    return { bestRoutes: bestRoutes.reverse(), totalTime: dp[(1 << n) - 1][n - 1] }


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
          <Marker position={center} />
          {directionsResponse && (<DirectionsRenderer directions={directionsResponse} />)}
        </GoogleMap>
      </div>
      <div className='container'>
        <div className='console'  >


          <form onSubmit={handleCompute}>


            <div className='inputLine'>
              <Autocomplete className='input'>
                <input type='text' required placeholder='Origin' ref={originRef} />
              </Autocomplete>
              <button type='button' onClick={() => handleLocate(originRef.current.value)}><LocationOnIcon /></button>

            </div>
            <div className='inputLine'>
              <Autocomplete className='input'>
                <input type='text' required placeholder='Destination' ref={destinationRef} />
              </Autocomplete>
              <button type='button' onClick={() => handleLocate(destinationRef.current.value)}><LocationOnIcon /></button>

            </div>
            <div className='inputLine'>
              <Autocomplete className='input'>
                <input type='text' placeholder='Intermediate' ref={intermediateRef} />
              </Autocomplete>
              <button type='button' onClick={handleAdd} className='addButton'><AddIcon /></button>
            </div>




            <div className='tags'>
              {intermediateList.map((item, ind) => <PlaceTag name={item} key={ind} removeItem={() => setIntermediateList(prev => prev.filter(otherItem => otherItem !== item))} />)}
            </div>
            <button className='viewRequirementsButton' type='button' onClick={() => setShowReq(prev => !prev)}> Set requirements </button>

            <button className='calculateRouteButton' type='submit'> Calculate Route </button>



          </form>


          {
            showReq &&
            <div className='requirements'>
              <div className='closeIcon' onClick={() => setShowReq(false)}> <CloseIcon /></div>
              {intermediateList.length > 1 ?
                <>
                  <div className='settingLine'>
                    <select onChange={e => setFromReq(Number(e.target.value))}>
                      {
                        intermediateList.map((item, ind) => <option key={ind} value={ind}>{item}</option>)
                      }
                    </select>
                    before
                    <select onChange={e => setToReq(Number(e.target.value))}>
                      {
                        intermediateList.map((item, ind) => <option key={ind} value={ind}>{item}</option>)
                      }
                    </select>

                    <button onClick={handleAddRequirement}><AddIcon /></button>

                  </div>

                  <div>
                    {requirements.map(item => (<RequirementTag from={intermediateList[item[0] - 1]} to={intermediateList[item[1] - 1]} removeItem={() => setRequirements(prev => prev.filter(otherItem => otherItem[0] !== item[0] || otherItem[1] !== item[1]))} />))}
                  </div>
                </> :
                <div>
                  Have at least 2 intermediate locations to set requirements.
                </div>}
            </div>
          }


        </div>

        <div className='result'>
          <h1>Estimated time: {Math.round(estimatedTime / 6) / 10} minutes </h1>


          {
            routes.map((route, ind) => <RouteDetails route={route} key={ind} displayRoute={displayRoute} />)
          }

        </div>
      </div>
    </>
  )
}

export default App
