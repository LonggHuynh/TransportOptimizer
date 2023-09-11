// Will be put to backend later.
const computeRoute = (dist, places, requirements) => {
  const reqMap = new Map();
  requirements.forEach((pair) => {
    const [from, to] = pair;
    if (!reqMap.get(from)) reqMap.set(from, new Set());
    reqMap.get(from).add(to);
  });

  let n = dist.length;

  let minimumTime = [...Array(1 << n)].map(() => Array(n).fill(Infinity));
  let prevVisit = [...Array(1 << n)].map(() => Array(n).fill(0));

  minimumTime[1][0] = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    for (let last = 0; last < n; last++) {
      if (((mask >> last) & 1) === 0) continue;

      out: for (let next = 0; next < n; next++) {
        for (let visited = 0; visited < n; visited++)
          if (
            ((mask >> visited) & 1) === 1 &&
            reqMap.get(next) &&
            reqMap.get(next).has(visited)
          )
            continue out;

        if (next === last) continue;
        if (((mask >> next) & 1) === 1) continue;
        let newMask = mask | (1 << next);

        if (
          minimumTime[newMask][next] >
          minimumTime[mask][last] + dist[last][next]
        ) {
          minimumTime[newMask][next] =
            minimumTime[mask][last] + dist[last][next];
          prevVisit[newMask][next] = last;
        }
      }
    }
  }
  let cur = n - 1;
  let curMask = (1 << n) - 1;

  const bestRoutes = [];
  while (cur !== 0) {
    let prev = prevVisit[curMask][cur];
    curMask = curMask ^ (1 << cur);
    bestRoutes.push([places[prev], places[cur]]);
    cur = prev;
  }

  return {
    bestRoutes: bestRoutes.reverse(),
    totalTime: minimumTime[(1 << n) - 1][n - 1],
  };
};

export const computePathAndTime = (places, requirements) => {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line no-undef
    let directionsService = new google.maps.DistanceMatrixService();
    directionsService.getDistanceMatrix(
      {
        destinations: places,
        origins: places,
        travelMode: 'TRANSIT',
      },
      (response, status) => {
        if (status === 'OK') {
          const adjMatrix = response.rows.map((row) =>
            row.elements.map((elem) => elem.duration?.value || Infinity),
          );
          const { bestRoutes, totalTime } = computeRoute(
            adjMatrix,
            places,
            requirements,
          );
          resolve({ bestRoutes, totalTime });
        } else {
          reject('Api errors');
        }
      },
    );
  });
};
